// src/hooks/useLocationManager.js

import { useState, useRef } from "react";

/**
 * Hook to manage location overlays and manual location entry
 * Handles:
 * - Location permission overlays
 * - Manual location entry
 * - Location status checking
 * - Live location refresh
 */
export function useLocationManager() {
  const [activeOverlay, setActiveOverlay] = useState("location");
  const [locationCheckStatus, setLocationCheckStatus] = useState({
    deviceLocation: false,
    locationAccuracy: false,
    hasCoordinates: false,
    coordinates: null,
  });
  const [showManualLocation, setShowManualLocation] = useState(false);

  // Refs
  const locationSetRef = useRef(false);
  const initialLocationRef = useRef(null);

  /**
   * Check device location status
   */
  const checkLocationStatus = async () => {
    try {
      if (!navigator.geolocation) {
        setLocationCheckStatus({
          deviceLocation: false,
          locationAccuracy: false,
          hasCoordinates: false,
          coordinates: null,
        });
        return null;
      }

      // Fresh location check
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Network-based for laptops
          timeout: isMobile ? 15000 : 60000, // Longer timeout for laptops
          maximumAge: 0,
        });
      });

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: new Date().toISOString(),
      };

      setLocationCheckStatus({
        deviceLocation: true,
        locationAccuracy: true,
        hasCoordinates: true,
        coordinates: coords,
      });

      // Save to storage
      sessionStorage.setItem("liveUserLocation", JSON.stringify(coords));
      localStorage.setItem("cachedUserLocation", JSON.stringify(coords));

      return coords;
    } catch (error) {
      // Clear old cached locations if permission denied
      if (error.code === 1) {
        // PERMISSION_DENIED
        sessionStorage.removeItem("liveUserLocation");
        localStorage.removeItem("cachedUserLocation");
      }

      setLocationCheckStatus({
        deviceLocation: false,
        locationAccuracy: error.code !== 1, // Location might be off (code 2 or 3)
        hasCoordinates: false,
        coordinates: null,
      });
      return null;
    }
  };

  /**
   * Handle "Get Location" button click
   */
  const handleGetLocation = async (onSuccess) => {
    const coords = await checkLocationStatus();
    if (coords && onSuccess) {
      onSuccess(coords);
    }
    return coords;
  };

  /**
   * Handle manual location confirmation
   */
  const handleManualLocationConfirm = ({ lat, lng }) => {
    if (!lat || !lng) return;

    const coords = { lat, lng };

    // Update overlay status
    setLocationCheckStatus({
      deviceLocation: true,
      locationAccuracy: true,
      hasCoordinates: true,
      coordinates: coords,
    });

    // Persist for rest of app
    sessionStorage.setItem(
      "manualLocation",
      JSON.stringify({
        lat,
        lng,
        latitude: lat,
        longitude: lng,
      }),
    );
    sessionStorage.setItem("isManualMode", "true");

    setShowManualLocation(false);
    setActiveOverlay(null);
  };

  /**
   * Revert to live location from manual mode
   */
  const handleRevertToLive = () => {
    // Clear all manual data from storage
    sessionStorage.removeItem("isManualMode");
    sessionStorage.removeItem("manualLocation");
    sessionStorage.removeItem("manualLocationDistances");
    sessionStorage.removeItem("_pendingDistances");

    locationSetRef.current = false;
  };

  /**
   * Refresh location (request permission again if needed)
   */
  const handleRefreshLocation = async (
    locationStatus,
    requestLocationPermission,
    userLocation,
    onRefresh,
  ) => {
    const isManualMode = sessionStorage.getItem("isManualMode") === "true";

    if (locationStatus === "denied" && !isManualMode) {
      // Request permission from useLocation hook
      const granted = await requestLocationPermission();

      // Wait a bit for location to update
      setTimeout(() => {
        if (userLocation && onRefresh) {
          onRefresh(userLocation);
        }
      }, 1000);
    } else if (userLocation && onRefresh) {
      // Just reload with current location
      onRefresh(userLocation);
    }
  };

  /**
   * Handle retry button
   */
  const handleRetry = () => {
    checkLocationStatus();
  };

  return {
    activeOverlay,
    setActiveOverlay,
    locationCheckStatus,
    setLocationCheckStatus,
    showManualLocation,
    setShowManualLocation,
    locationSetRef,
    initialLocationRef,
    checkLocationStatus,
    handleGetLocation,
    handleManualLocationConfirm,
    handleRevertToLive,
    handleRefreshLocation,
    handleRetry,
  };
}
