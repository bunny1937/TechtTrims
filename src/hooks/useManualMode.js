// src/hooks/useManualMode.js

import { useState, useEffect } from "react";

/**
 * Hook to manage manual location mode
 * Handles:
 * - Check if in manual mode
 * - Enable/disable manual mode
 * - Get manual location from storage
 * - Sync across tabs
 */
export function useManualMode() {
  const [isManualMode, setIsManualMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("isManualMode") === "true";
  });

  /**
   * Enable manual mode with coordinates
   */
  const enableManualMode = (coords) => {
    if (!coords || !coords.lat || !coords.lng) {
      console.error("Invalid coordinates for manual mode");
      return false;
    }

    const normalizedCoords = {
      lat: coords.lat,
      lng: coords.lng,
      latitude: coords.lat,
      longitude: coords.lng,
    };

    sessionStorage.setItem("manualLocation", JSON.stringify(normalizedCoords));
    sessionStorage.setItem("isManualMode", "true");
    setIsManualMode(true);

    return true;
  };

  /**
   * Disable manual mode and clear data
   */
  const disableManualMode = () => {
    sessionStorage.removeItem("isManualMode");
    sessionStorage.removeItem("manualLocation");
    sessionStorage.removeItem("manualLocationDistances");
    sessionStorage.removeItem("_pendingDistances");
    setIsManualMode(false);
  };

  /**
   * Get manual location from storage
   */
  const getManualLocation = () => {
    if (typeof window === "undefined") return null;

    const manualLoc = sessionStorage.getItem("manualLocation");
    if (!manualLoc) return null;

    try {
      return JSON.parse(manualLoc);
    } catch {
      return null;
    }
  };

  /**
   * Sync manual mode state across tabs
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e) => {
      if (e.key === "isManualMode") {
        setIsManualMode(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    isManualMode,
    enableManualMode,
    disableManualMode,
    getManualLocation,
  };
}
