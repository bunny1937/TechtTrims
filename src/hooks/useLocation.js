// src/hooks/useLocation.js
import { useState, useEffect, useCallback, useRef } from "react";

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, granted, denied, error
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const MANUAL_LOCATION_KEY = "manualLocation";
  const MANUAL_MODE_KEY = "isManualMode";

  // INCREASED THRESHOLDS FOR STABILITY
  const MIN_UPDATE_INTERVAL = 0; // 30 seconds between updates (was 5s)
  const MIN_DISTANCE_DELTA = 0; // ~50m (was 10m - too sensitive)
  const MAX_ACCURACY = 500; // Only accept positions with <100m accuracy
  const isManualMode = () =>
    typeof window !== "undefined" &&
    sessionStorage.getItem(MANUAL_MODE_KEY) === "true";

  const loadManualLocation = () => {
    try {
      const isManual = sessionStorage.getItem(MANUAL_MODE_KEY) === "true";
      const raw = sessionStorage.getItem(MANUAL_LOCATION_KEY);

      if (!isManual || !raw) return null;

      const parsed = JSON.parse(raw);

      return {
        latitude: parsed.latitude ?? parsed.lat,
        longitude: parsed.longitude ?? parsed.lng,
        lat: parsed.latitude ?? parsed.lat,
        lng: parsed.longitude ?? parsed.lng,
        accuracy: 0,
        source: "manual",
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  };

  // ----------------- START WATCHING -----------------
  const startWatchingLocation = useCallback(() => {
    const manual = loadManualLocation();
    if (manual) {
      return;
    }

    if (watchIdRef.current) return; // already active

    const handleSuccess = (position) => {
      const now = Date.now();

      // IGNORE UPDATES TOO SOON
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        return;
      }

      // Only accept high-accuracy positions
      // ✅ REJECT TERRIBLE ACCURACY (259km+ is device error)
      if (position.coords.accuracy > 5000000) {
        console.warn(
          `❌ Position accuracy extremely poor: ${position.coords.accuracy}m - REJECTING`,
        );
        return; // ✅ DON'T SAVE THIS
      }

      // Also reject if accuracy check happens in later logic
      if (position.coords.accuracy > MAX_ACCURACY) {
        console.warn(
          `⚠️ Position accuracy poor: ${position.coords.accuracy}m - USING ANYWAY`,
        );
        // Don't return - continue to save
      }

      const { latitude, longitude, accuracy } = position.coords;
      // Check if location has actually changed enough to warrant an update
      if (userLocation) {
        const latDiff = Math.abs(userLocation.latitude - latitude);
        const lngDiff = Math.abs(userLocation.longitude - longitude);
        const accDiff = Math.abs((userLocation.accuracy || 0) - accuracy);

        // ✅ PREVENT DUPLICATE UPDATES - Check lat, lng AND accuracy
        if (
          latDiff < MIN_DISTANCE_DELTA &&
          lngDiff < MIN_DISTANCE_DELTA &&
          accDiff < 5
        ) {
          return; // ✅ EXIT EARLY - NO UPDATE
        }
      }

      const newLocation = {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        accuracy,
      };

      // ✅ USE FUNCTIONAL UPDATE TO PREVENT STALE CLOSURES
      setUserLocation((prev) => {
        // Double-check one more time before updating
        if (
          prev &&
          Math.abs(prev.latitude - latitude) < MIN_DISTANCE_DELTA &&
          Math.abs(prev.longitude - longitude) < MIN_DISTANCE_DELTA
        ) {
          return prev; // Return same reference = no re-render
        }
        return newLocation;
      });
      setLocationStatus("granted");
      setLocationError(null);
      lastUpdateRef.current = now;
    };

    const handleError = (error) => {
      console.error("Watch position error:", error);

      // ✅ IF WE ALREADY HAVE LOCATION, DON'T RETRY
      if (userLocation && error.code === 3) {
        return; // ✅ DON'T RETRY - We already have good location
      }

      if (error.code === 3) {
        // TIMEOUT - Only retry if we DON'T have a location
        if (!userLocation) {
          setLocationError(
            "Location request timed out. Retrying in 5 seconds...",
          );
          setLocationStatus("error");

          setTimeout(() => {
            if (watchIdRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current);
            }
            startWatchingLocation(); // Retry ONLY if no location
          }, 5000);
        }
      } else if (error.code === 1) {
        // PERMISSION DENIED
        setLocationError(
          "Please allow location access in your browser settings to find nearby salons.",
        );
        setLocationStatus("denied");
      } else if (error.code === 2) {
        // POSITION UNAVAILABLE
        setLocationError(
          "Location unavailable. Please check your device settings.",
        );
        setLocationStatus("error");
      } else {
        // UNKNOWN ERROR
        setLocationError("Unable to get your location. Please try again.");
        setLocationStatus("error");
      }
    };

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: isMobile, // Only use GPS on mobile
        timeout: isMobile ? 15000 : 60000, // 60 seconds for laptops
        maximumAge: isMobile ? 60000 : 300000, // 5 min cache for laptops
      },
    );
  }, [userLocation]);

  const setManualLocation = (coords) => {
    if (!coords?.lat || !coords?.lng) return;

    const normalized = {
      latitude: coords.lat,
      longitude: coords.lng,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: 0,
      timestamp: Date.now(),
    };

    sessionStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(normalized));
    sessionStorage.setItem(MANUAL_MODE_KEY, "true");

    setUserLocation(normalized);
    setLocationStatus("granted");

    // 🛑 stop GPS watcher if running
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // ----------------- STOP WATCHING -----------------
  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // ----------------- REQUEST PERMISSION -----------------
  const requestLocationPermission = useCallback(async () => {
    // 🛑 HARD STOP IF MANUAL LOCATION IS ACTIVE
    if (isManualMode()) {
      setLocationStatus("granted");
      setLocationError(null);
      return true;
    }

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation not supported");
      return false;
    }

    try {
      setLocationStatus("requesting");

      const position = await new Promise((resolve, reject) => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Use network positioning for speed
          timeout: isMobile ? 30000 : 90000,
          maximumAge: isMobile ? 60000 : 600000, // 10-min cache for laptops
        });
      });

      // ✅ VALIDATE ACCURACY BEFORE SAVING
      if (position.coords.accuracy > 5000000) {
        // 2000km
        setLocationError("Location accuracy extremely poor. Retrying...");
        startWatchingLocation();
        return;
      }

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
      sessionStorage.removeItem(MANUAL_MODE_KEY);
      sessionStorage.removeItem(MANUAL_LOCATION_KEY);

      setUserLocation(newLocation);
      setLocationStatus("granted");

      lastUpdateRef.current = Date.now();

      // ✅ REMOVED - Storage saving now handled by useEffect
      // sessionStorage.setItem("userLocation", JSON.stringify(newLocation));
      // localStorage.setItem("cachedUserLocation", JSON.stringify(newLocation));

      // Start continuous monitoring
      startWatchingLocation();

      return true;
    } catch (error) {
      console.error("Location error:", error);

      // 🛑 DO NOT override manual location
      if (isManualMode()) {
        setLocationStatus("granted");
        setLocationError(null);
        return true;
      }

      setLocationStatus("denied");
      setLocationError(error.message);
      return false;
    }
  }, [startWatchingLocation]);

  const clearManualLocation = () => {
    sessionStorage.removeItem(MANUAL_LOCATION_KEY);
    sessionStorage.removeItem(MANUAL_MODE_KEY);
  };

  useEffect(() => {
    const manual = loadManualLocation();

    if (manual?.latitude && manual?.longitude) {
      setUserLocation(manual);
      setLocationStatus("granted");
      setLocationError(null);

      // 🚫 DO NOT start GPS watcher
      return;
    }
  }, []);

  // ----------------- SETUP ON MOUNT -----------------
  useEffect(() => {
    // Try localStorage first
    const manual = loadManualLocation();

    const cached = localStorage.getItem("cachedUserLocation");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        // ✅ VALIDATE ACCURACY BEFORE LOADING
        if (parsed.accuracy && parsed.accuracy > 1000) {
          console.warn(
            "❌ Cached location has bad accuracy:",
            parsed.accuracy,
            "- DISCARDING",
          );
          localStorage.removeItem("cachedUserLocation");
          // Don't load bad cache - let requestLocationPermission() get fresh location
        } else {
          // ✅ Only load if accuracy is reasonable
          const normalized = {
            latitude: parsed.latitude || parsed.lat,
            longitude: parsed.longitude || parsed.lng,
            lat: parsed.latitude || parsed.lat,
            lng: parsed.longitude || parsed.lng,
            accuracy: parsed.accuracy,
            timestamp: parsed.timestamp,
          };
          setUserLocation(normalized);
          setLocationStatus("granted");
        }
      } catch (e) {
        console.error("Error parsing cached location", e);
      }
    }

    if (!manual) {
      requestLocationPermission();
    }

    return () => {
      stopWatchingLocation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EMPTY DEPS - Run ONCE

  // ✅ NEW EFFECT - Save location to storage when it changes
  useEffect(() => {
    if (!userLocation) return;

    // Only save if we have valid coordinates
    if (!userLocation.latitude || !userLocation.longitude) return;

    // Skip saving if this is a manual location (already saved)
    if (userLocation.source === "manual") return;

    const locationData = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      accuracy: userLocation.accuracy,
      timestamp: Date.now(),
    };

    // ✅ Save to both storages ONCE per location change
    sessionStorage.setItem("userLocation", JSON.stringify(locationData));
    localStorage.setItem("cachedUserLocation", JSON.stringify(locationData));
  }, [userLocation?.latitude, userLocation?.longitude, userLocation?.accuracy]); // Only re-run if coords change

  return {
    userLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
    stopWatchingLocation,
    setManualLocation,
    clearManualLocation,
  };
};
