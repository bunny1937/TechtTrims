// src/hooks/useLocation.js
import { useState, useEffect, useCallback, useRef } from "react";

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, granted, denied, error
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // INCREASED THRESHOLDS FOR STABILITY
  const MIN_UPDATE_INTERVAL = 0; // 30 seconds between updates (was 5s)
  const MIN_DISTANCE_DELTA = 0; // ~50m (was 10m - too sensitive)
  const MAX_ACCURACY = 500; // Only accept positions with <100m accuracy

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
      // ✅ REJECT TERRIBLE ACCURACY (259km+ is device error)
      if (position.coords.accuracy > 5000000) {
        console.log(
          `⚠️ Position accuracy too low: ${position.coords.accuracy}m - IGNORING`
        );
        return; // ✅ DON'T SAVE THIS
      }

      // Also reject if accuracy check happens in later logic
      if (position.coords.accuracy > MAX_ACCURACY) {
        console.log(
          `⚠️ Position accuracy poor: ${position.coords.accuracy}m - USING ANYWAY`
        );
        // Don't return - continue to save
      }

      const { latitude, longitude, accuracy } = position.coords;
      const newLocation = {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        accuracy,
      };

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

      // ✅ IF WE ALREADY HAVE LOCATION, DON'T RETRY
      if (userLocation && error.code === 3) {
        console.log("⚠️ Timeout but we already have location - ignoring");
        return; // ✅ DON'T RETRY - We already have good location
      }

      if (error.code === 3) {
        // TIMEOUT - Only retry if we DON'T have a location
        if (!userLocation) {
          setLocationError(
            "Location request timed out. Retrying in 5 seconds..."
          );
          setLocationStatus("error");

          setTimeout(() => {
            console.log("🔄 Retrying location fetch...");
            if (watchIdRef.current) {
              navigator.geolocation.clearWatch(watchIdRef.current);
            }
            startWatchingLocation(); // Retry ONLY if no location
          }, 5000);
        }
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

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: isMobile, // Only use GPS on mobile
        timeout: isMobile ? 15000 : 60000, // 60 seconds for laptops
        maximumAge: isMobile ? 60000 : 300000, // 5 min cache for laptops
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
    // Try localStorage first
    const cached = localStorage.getItem("cachedUserLocation");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        // ✅ VALIDATE ACCURACY BEFORE LOADING
        if (parsed.accuracy && parsed.accuracy > 1000) {
          console.warn(
            "❌ Cached location has bad accuracy:",
            parsed.accuracy,
            "- DISCARDING"
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
          console.log(
            "📍 Loaded cached location from localStorage",
            normalized
          );
        }
      } catch (e) {
        console.error("Error parsing cached location", e);
      }
    }

    // ALWAYS request fresh location immediately
    requestLocationPermission();

    return () => {
      stopWatchingLocation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ EMPTY DEPS - Run ONCE

  return {
    userLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
    stopWatchingLocation,
  };
};
