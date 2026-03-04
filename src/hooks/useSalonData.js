// src/hooks/useSalonData.js

import { useState, useEffect, useRef } from "react";
import { getDistanceWorker } from "../utils/distanceWorkerSingleton";

/**
 * Hook to manage salon data, loading, and operations
 * Handles:
 * - Loading nearby salons from API with request deduplication
 * - Distance calculations via Web Worker
 * - Salon refresh and error handling
 * - Selected salon state
 */

export function useSalonData(userLocation, searchRadius, userOnboarding) {
  const [salons, setSalons] = useState([]);
  const [nearbySalons, setNearbySalons] = useState([]);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [salonLoadError, setSalonLoadError] = useState(null);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Track if salons have been loaded to prevent duplicate calls
  const salonsLoadedRef = useRef(false);
  const genderFetchInProgressRef = useRef(false);

  // ✅ NEW - Cache to prevent duplicate API requests
  const requestCacheRef = useRef(new Map());
  const inflightRequestsRef = useRef(new Map());

  /**
   * Load nearby salons from API with deduplication
   */
  const loadNearbySalons = async (
    lat,
    lng,
    gender = "all",
    salonGender = "all",
  ) => {
    // Normalize coordinates
    const normalizedLat = lat || userLocation?.latitude || userLocation?.lat;
    const normalizedLng = lng || userLocation?.longitude || userLocation?.lng;

    if (
      !normalizedLat ||
      !normalizedLng ||
      isNaN(normalizedLat) ||
      isNaN(normalizedLng)
    ) {
      setSalonLoadError("Unable to load salons: Invalid location coordinates");
      return;
    }

    // Skip if manual mode AND salons already exist
    const isManual = sessionStorage.getItem("isManualMode") === "true";
    if (isManual && salons.length > 0) {
      return;
    }

    // Get salonGender from sessionStorage if not provided
    const genderFilter =
      salonGender === "all"
        ? sessionStorage.getItem("selectedGender") || "all"
        : salonGender;

    // ✅ Generate cache key
    const cacheKey = `${normalizedLat.toFixed(4)}-${normalizedLng.toFixed(4)}-${searchRadius}-${gender}-${genderFilter}`;

    // ✅ Check if same request is already in flight
    if (inflightRequestsRef.current.has(cacheKey)) {
      console.log(
        "🔄 Duplicate request detected, waiting for existing request...",
      );
      return inflightRequestsRef.current.get(cacheKey);
    }

    // ✅ Check cache (5 minute TTL)
    const cached = requestCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      console.log("✅ Using cached salon data");
      setSalons(cached.data);
      setNearbySalons(cached.data);
      salonsLoadedRef.current = true;
      return cached.data;
    }

    setIsLoadingSalons(true);
    setSalonLoadError(null);

    const url = `/api/salons/nearby?latitude=${normalizedLat}&longitude=${normalizedLng}&radius=${searchRadius}&gender=${gender}&salonGender=${genderFilter}`;

    setDebugInfo({
      userLat: normalizedLat,
      userLng: normalizedLng,
      timestamp: new Date().toLocaleString(),
    });

    // ✅ Create promise and store in inflight map
    const requestPromise = (async () => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          let message = "Unable to load salons right now";
          try {
            const err = await response.json();
            message = err.message || message;
          } catch {}
          setSalonLoadError(message);
          setIsLoadingSalons(false);
          inflightRequestsRef.current.delete(cacheKey);
          return [];
        }

        const data = await response.json();
        const salonsArray = Array.isArray(data.salons) ? data.salons : [];

        // Normalize salon data
        const normalizedSalons = salonsArray.map((salon) => ({
          ...salon,
          operatingHours: salon.operatingHours || salon.openingHours || {},
          distance: salon.distance || null,
          topServices: salon.services
            ? Object.entries(salon.services)
                .filter(([, s]) => s?.enabled === true || s?.enabled !== false)
                .map(([key, s]) => ({
                  name: s?.name || key,
                }))
            : [],
        }));

        // ✅ Cache the result
        requestCacheRef.current.set(cacheKey, {
          data: normalizedSalons,
          timestamp: Date.now(),
        });

        setSalons(normalizedSalons);
        setNearbySalons(normalizedSalons);
        salonsLoadedRef.current = true;

        // ✅ Remove from inflight
        inflightRequestsRef.current.delete(cacheKey);

        return normalizedSalons;
      } catch (error) {
        console.error("Error loading salons:", error);
        setSalonLoadError(
          "We're having trouble connecting right now. Please check your internet or try again shortly.",
        );
        setNearbySalons([]);
        inflightRequestsRef.current.delete(cacheKey);
        return [];
      } finally {
        setIsLoadingSalons(false);
      }
    })();

    // ✅ Store promise in inflight map
    inflightRequestsRef.current.set(cacheKey, requestPromise);

    return requestPromise;
  };

  /**
   * Handle location change and recalculate distances
   */
  const handleLocationChange = (newLocation) => {
    if (!newLocation?.latitude || !newLocation?.longitude) return;
    if (!salons.length) return;

    const userLat = newLocation.latitude || newLocation.lat;
    const userLng = newLocation.longitude || newLocation.lng;

    const worker = getDistanceWorker();

    worker.onmessage = (e) => {
      const updated = e.data;
      setSalons(updated);
    };

    worker.postMessage({
      salons,
      userLat,
      userLng,
    });
  };

  /**
   * Refresh salons manually with current radius
   */
  const handleRefreshSalons = () => {
    if (userLocation && userOnboarding) {
      salonsLoadedRef.current = false; // Allow reload

      // ✅ Clear cache to force fresh data
      requestCacheRef.current.clear();

      const salonGender = sessionStorage.getItem("selectedGender") || "all";

      loadNearbySalons(
        userLocation.latitude,
        userLocation.longitude,
        userOnboarding?.gender,
        salonGender,
      );
    }
  };

  /**
   * Handle gender filter change from event
   */
  useEffect(() => {
    const handleGenderChange = (event) => {
      const newGender = event.detail;

      if (
        genderFetchInProgressRef.current ||
        !userLocation?.latitude ||
        !userLocation?.longitude
      ) {
        return;
      }

      genderFetchInProgressRef.current = true;

      // 🔥 FIX: Replace requestIdleCallback with setTimeout
      // requestIdleCallback causes infinite loops in Chrome during Fast Refresh
      setTimeout(() => {
        loadNearbySalons(
          userLocation.latitude,
          userLocation.longitude,
          userOnboarding?.gender || "all",
          newGender,
        ).finally(() => {
          genderFetchInProgressRef.current = false;
        });
      }, 0);
    };

    window.addEventListener("genderFilterChange", handleGenderChange);

    return () => {
      window.removeEventListener("genderFilterChange", handleGenderChange);
    };
  }, [userLocation?.latitude, userLocation?.longitude, userOnboarding?.gender]);

  /**
   * Reload salons when radius changes significantly
   */
  useEffect(() => {
    // Skip if no location or salons not loaded yet
    if (!userLocation || !salonsLoadedRef.current) return;

    // Skip if no salons loaded
    if (salons.length === 0) return;

    // Debounce radius changes (wait for user to stop dragging slider)
    const radiusChangeTimer = setTimeout(() => {
      console.log(
        "📍 Radius changed to:",
        searchRadius,
        "km - Reloading salons",
      );

      const salonGender = sessionStorage.getItem("selectedGender") || "all";

      // Reload with new radius
      loadNearbySalons(
        userLocation.latitude,
        userLocation.longitude,
        userOnboarding?.gender || "all",
        salonGender,
      );
    }, 500); // Wait 500ms after user stops dragging

    return () => clearTimeout(radiusChangeTimer);
  }, [searchRadius]); // ✅ Watch for radius changes

  /**
   * Reset salonsLoaded flag if we have location but 0 salons
   */
  useEffect(() => {
    if (userLocation && salons.length === 0) {
      salonsLoadedRef.current = false;
    }
  }, [userLocation, salons.length]);

  return {
    salons,
    setSalons,
    nearbySalons,
    setNearbySalons,
    isLoadingSalons,
    salonLoadError,
    setSalonLoadError,
    selectedSalon,
    setSelectedSalon,
    debugInfo,
    loadNearbySalons,
    handleLocationChange,
    handleRefreshSalons,
    salonsLoadedRef,
    genderFetchInProgressRef,
  };
}
