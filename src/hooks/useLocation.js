// src/hooks/useLocation.js
import { useState, useEffect, useCallback, useRef } from "react";

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, granted, denied, error
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // INCREASED THRESHOLDS FOR STABILITY
  const MIN_UPDATE_INTERVAL = 30000; // 30 seconds between updates (was 5s)
  const MIN_DISTANCE_DELTA = 0.0005; // ~50m (was 10m - too sensitive)
  const MAX_ACCURACY = 100; // Only accept positions with <100m accuracy

  // ----------------- START WATCHING -----------------
  const startWatchingLocation = useCallback(() => {
    if (watchIdRef.current) return; // already active

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();

        // IGNORE UPDATES TOO SOON
        if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
          console.log("⏱️ Ignoring location update (too soon)");
          return;
        }

        // FILTER OUT INACCURATE POSITIONS
        if (position.coords.accuracy > MAX_ACCURACY) {
          console.log(
            `🎯 Ignoring inaccurate position (${position.coords.accuracy}m)`
          );
          return;
        }

        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;

        setUserLocation((prev) => {
          // ONLY UPDATE IF MOVED SIGNIFICANTLY
          if (prev) {
            const latDiff = Math.abs(prev.lat - newLat);
            const lngDiff = Math.abs(prev.lng - newLng);

            if (latDiff < MIN_DISTANCE_DELTA && lngDiff < MIN_DISTANCE_DELTA) {
              console.log("📍 Ignoring minor location change");
              return prev; // No significant movement
            }
          }

          // SIGNIFICANT CHANGE - UPDATE
          lastUpdateRef.current = now;
          const newLocation = {
            lat: newLat,
            lng: newLng,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          console.log("✅ Location updated:", newLocation);
          return newLocation;
        });
      },
      (error) => {
        console.error("Watch position error:", error);
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 30000, // Cache for 30s - PREVENTS CONSTANT UPDATES
      }
    );
  }, []);

  // ----------------- STOP WATCHING -----------------
  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log("🛑 Stopped watching location");
    }
  }, []);

  // ----------------- REQUEST PERMISSION -----------------
  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationError("Geolocation not supported");
      return false;
    }

    try {
      setLocationStatus("requesting");

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Force fresh position on initial request
        });
      });

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setUserLocation(newLocation);
      setLocationStatus("granted");
      lastUpdateRef.current = Date.now();

      // Save to localStorage ONLY ONCE (not on every update)
      localStorage.setItem("userLocation", JSON.stringify(newLocation));

      // Start continuous monitoring
      startWatchingLocation();

      return true;
    } catch (error) {
      console.error("Location error:", error);
      setLocationStatus("denied");
      setLocationError(error.message);
      return false;
    }
  }, [startWatchingLocation]);

  // ----------------- SETUP ON MOUNT -----------------
  useEffect(() => {
    // Try to load from localStorage ONLY on mount
    const stored = localStorage.getItem("userLocation");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserLocation(parsed);
        setLocationStatus("granted");
        console.log("📍 Loaded cached location");
      } catch (e) {
        console.error("Error parsing stored location", e);
      }
    }

    // Always request fresh location on mount
    if (!stored) {
      requestLocationPermission();
    } else {
      // If we have cached location, start watching
      startWatchingLocation();
    }

    return () => {
      stopWatchingLocation();
    };
  }, [requestLocationPermission, startWatchingLocation, stopWatchingLocation]); // ONLY RUN ONCE ON MOUNT

  return {
    userLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
    stopWatchingLocation,
  };
};
