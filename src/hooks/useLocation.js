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

    const handleSuccess = (position) => {
      const now = Date.now();

      // IGNORE UPDATES TOO SOON
      if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
        console.log("⏱️ Ignoring location update (too soon)");
        return;
      }

      // Only accept high-accuracy positions
      if (position.coords.accuracy > MAX_ACCURACY) {
        console.log(
          `⚠️ Position accuracy too low: ${position.coords.accuracy}m`
        );
        return;
      }

      const { latitude, longitude, accuracy } = position.coords;
      const newLocation = { latitude, longitude, accuracy };

      // Check if location has actually changed enough to warrant an update
      if (userLocation) {
        const latDiff = Math.abs(userLocation.latitude - latitude);
        const lngDiff = Math.abs(userLocation.longitude - longitude);

        if (latDiff < MIN_DISTANCE_DELTA && lngDiff < MIN_DISTANCE_DELTA) {
          console.log("📍 Location unchanged (within threshold)");
          return;
        }
      }

      // UPDATE STATE
      console.log(
        `✅ Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(
          6
        )} (±${accuracy.toFixed(0)}m)`
      );
      setUserLocation(newLocation);
      setLocationStatus("granted");
      setLocationError(null);
      lastUpdateRef.current = now;

      // SAVE TO STORAGE - both session and local for persistence
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));
      localStorage.setItem("cachedUserLocation", JSON.stringify(newLocation));
    };

    const handleError = (error) => {
      console.error("Watch position error:", error);

      if (error.code === 3) {
        // TIMEOUT - Retry after 5 seconds
        setLocationError(
          "Location request timed out. Retrying in 5 seconds..."
        );
        setLocationStatus("error");

        setTimeout(() => {
          console.log("🔄 Retrying location fetch...");
          if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          startWatchingLocation(); // Retry
        }, 5000);
      } else if (error.code === 1) {
        // PERMISSION DENIED
        setLocationError(
          "Please allow location access in your browser settings to find nearby salons."
        );
        setLocationStatus("denied");
      } else if (error.code === 2) {
        // POSITION UNAVAILABLE
        setLocationError(
          "Location unavailable. Please check your device settings."
        );
        setLocationStatus("error");
      } else {
        // UNKNOWN ERROR
        setLocationError("Unable to get your location. Please try again.");
        setLocationStatus("error");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 30000, // INCREASED to 30 seconds
        maximumAge: 60000, // INCREASED to 60 seconds cache
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

      // Save to SESSION STORAGE (persists across page refreshes but not logout)
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));
      localStorage.setItem("cachedUserLocation", JSON.stringify(newLocation)); // ADD THIS LINE

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
    // Try to load from SESSION STORAGE on mount
    const stored = sessionStorage.getItem("userLocation");

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
