import { useState, useEffect, useCallback, useRef } from "react";

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, requesting, granted, denied, error
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const lastUpdateRef = useRef(0); // Track last update time
  const MIN_UPDATE_INTERVAL = 5000; // 5 seconds between updates
  const MIN_DISTANCE_DELTA = 0.0001; // Roughly 10m diff

  // ----------------- START WATCHING -----------------
  const startWatchingLocation = useCallback(() => {
    if (watchIdRef.current) return; // already active

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();

        if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) {
          return; // Ignore updates that come too soon
        }

        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;

        setUserLocation((prev) => {
          if (
            !prev ||
            Math.abs(prev.lat - newLat) > MIN_DISTANCE_DELTA ||
            Math.abs(prev.lng - newLng) > MIN_DISTANCE_DELTA
          ) {
            lastUpdateRef.current = now;

            const newLocation = {
              lat: newLat,
              lng: newLng,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };

            localStorage.setItem("userLocation", JSON.stringify(newLocation));
            return newLocation;
          }
          return prev;
        });
      },
      (error) => {
        console.error("Watch position error:", error);
        setLocationError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000, // Cache for 10s
      }
    );
  }, []);

  // ----------------- STOP WATCHING -----------------
  const stopWatchingLocation = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
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
          timeout: 10000,
          maximumAge: 0,
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
    const stored = localStorage.getItem("userLocation");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserLocation(parsed);
        setLocationStatus("granted");
      } catch (e) {
        console.error("Error parsing stored location", e);
      }
    }

    if (!stored) {
      requestLocationPermission();
    } else {
      startWatchingLocation();
    }

    return () => {
      stopWatchingLocation();
    };
  }, [requestLocationPermission, startWatchingLocation, stopWatchingLocation]);

  return {
    userLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
    stopWatchingLocation,
  };
};
