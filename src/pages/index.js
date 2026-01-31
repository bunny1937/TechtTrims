// pages/index.js
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";
import { useLocation } from "../hooks/useLocation";
import { UserDataManager } from "../lib/userData";
import { getAuthToken, getUserData } from "../lib/cookieAuth";
// Dynamic import for map component
const SalonMap = dynamic(() => import("../components/Maps/SalonMap"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>,
});

const ManualLocationOverlay = dynamic(
  () => import("@/components/Maps/ManualLocationOverlay"),
  { ssr: false },
);

export default function Home({ initialSalons = [] }) {
  const router = useRouter();
  const [salons, setSalons] = useState(initialSalons || []);
  const [userOnboarding, setUserOnboarding] = useState(() => {
    // Load user data IMMEDIATELY from sessionStorage on mount
    if (typeof window === "undefined") return null;

    const onboardingData = sessionStorage.getItem("userOnboardingData");
    if (onboardingData) {
      try {
        return JSON.parse(onboardingData);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  const [nearbySalons, setNearbySalons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [filteredSalons, setFilteredSalons] = useState([]);
  const [isPrebook, setIsPrebook] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const {
    userLocation: liveUserLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
  } = useLocation();
  const [mapKey, setMapKey] = useState(0);
  // Radius marks for non-linear slider
  const [searchRadius, setSearchRadius] = useState(10000);
  const radiusMarks = [
    1, 3, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 400, 500, 600, 700,
    800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
  ]; // 1600 = 1500+
  const [salonLoadError, setSalonLoadError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);
  const [activeOverlay, setActiveOverlay] = useState("location");
  // "location" | "manual" | null

  const [locationCheckStatus, setLocationCheckStatus] = useState({
    deviceLocation: false,
    locationAccuracy: false,
    hasCoordinates: false,
    coordinates: null,
  }); // NEW: Track location status
  const [showManualLocation, setShowManualLocation] = useState(false);

  // ADD: Track if salons were loaded
  const salonsLoadedRef = useRef(false);
  const initializedRef = useRef(false);
  const initialLocationRef = useRef(null);
  const PLACEHOLDER_IMAGE = process.env.NEXT_PUBLIC_PLACEHOLDER_SALON_IMAGE;

  useEffect(() => {
    if (salons.length === 0) return;

    const isManual = sessionStorage.getItem("isManualMode") === "true";

    const manualDistances = sessionStorage.getItem("manualLocationDistances");

    if (isManual && manualDistances) {
      try {
        const distances = JSON.parse(manualDistances);
        const updatedSalons = salons.map((salon, idx) => ({
          ...salon,
          distance:
            distances[idx] !== undefined ? distances[idx] : salon.distance,
        }));
        setSalons(updatedSalons);
      } catch (e) {}
    }
  }, [salons.length]);

  useEffect(() => {
    const initializeUser = async () => {
      // Prevent double initialization
      if (initializedRef.current) {
        return;
      }

      initializedRef.current = true;

      if (typeof window === "undefined") {
        initializedRef.current = false;
        return;
      }

      // Check onboarding
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");

      if (!hasOnboarded) {
        router.push("/onboarding");
        return;
      }

      // Load user data from API
      const userToken = getAuthToken();
      if (userToken) {
        try {
          const userData = await UserDataManager.fetchAndStoreUserData();
          if (userData) {
            setUserOnboarding(userData);
          }
        } catch (error) {}
      }

      // Mark user data as ready
      setIsUserDataReady(true);

      // Check for cached location (SINGLE CHECK - no duplicates)
      const cached =
        sessionStorage.getItem("liveUserLocation") ||
        sessionStorage.getItem("userLocation") ||
        localStorage.getItem("cachedUserLocation");

      if (cached && !salonsLoadedRef.current) {
        try {
          const coords = JSON.parse(cached);
          const lat = coords.lat || coords.latitude;
          const lng = coords.lng || coords.longitude;

          // Reject bad accuracy
          if (coords.accuracy && coords.accuracy > 50000) {
            sessionStorage.removeItem("liveUserLocation");
            sessionStorage.removeItem("userLocation");
            localStorage.removeItem("cachedUserLocation");
            setActiveOverlay("location");
            return;
          }

          if (lat && lng) {
            salonsLoadedRef.current = true;
            setActiveOverlay(null);
            setIsLoading(true);
            await loadNearbySalons(lat, lng, userOnboarding?.gender || "all");
            setIsLoading(false);
          } else {
            setActiveOverlay(null);
          }
        } catch (e) {
          setActiveOverlay(null);
        }
      } else if (!cached) {
        setActiveOverlay("location");
      }
    };

    initializeUser();
  }, []);

  // Update location in session storage whenever it changes
  useEffect(() => {
    if (liveUserLocation) {
      const normalized = {
        lat: liveUserLocation.latitude || liveUserLocation.lat,
        lng: liveUserLocation.longitude || liveUserLocation.lng,
        latitude: liveUserLocation.latitude || liveUserLocation.lat,
        longitude: liveUserLocation.longitude || liveUserLocation.lng,
        accuracy: liveUserLocation.accuracy,
        timestamp: Date.now(),
      };

      sessionStorage.setItem("userLocation", JSON.stringify(normalized));
    }
  }, [liveUserLocation]);

  // Reset ref if we have location but 0 salons
  useEffect(() => {
    if (liveUserLocation && salons.length === 0 && salonsLoadedRef.current) {
      const timeoutId = setTimeout(() => {
        salonsLoadedRef.current = false;
      }, 3000); // 3 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [liveUserLocation, salons.length]);

  // Update location in session storage whenever it changes
  useEffect(() => {
    if (liveUserLocation) {
      const normalized = {
        lat: liveUserLocation.latitude || liveUserLocation.lat,
        lng: liveUserLocation.longitude || liveUserLocation.lng,
        latitude: liveUserLocation.latitude || liveUserLocation.lat,
        longitude: liveUserLocation.longitude || liveUserLocation.lng,
        accuracy: liveUserLocation.accuracy,
        timestamp: Date.now(),
      };

      sessionStorage.setItem("userLocation", JSON.stringify(normalized));
    }
  }, [liveUserLocation]);

  // Listen for gender filter changes from header
  useEffect(() => {
    const handleGenderChange = (event) => {
      const newGender = event.detail;

      // Reload salons with new gender filter
      if (liveUserLocation?.latitude && liveUserLocation?.longitude) {
        salonsLoadedRef.current = false;
        loadNearbySalons(
          liveUserLocation.latitude,
          liveUserLocation.longitude,
          userOnboarding?.gender || "all",
          newGender,
        );
        salonsLoadedRef.current = true;
      }
    };

    window.addEventListener("genderFilterChange", handleGenderChange);
    return () =>
      window.removeEventListener("genderFilterChange", handleGenderChange);
  }, [liveUserLocation, userOnboarding]);

  // NEW: Check device location status
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

      // fresh location check
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
  const handleManualLocationConfirm = ({ lat, lng }) => {
    if (!lat || !lng) return;

    const coords = { lat, lng };

    // ✅ update overlay status
    setLocationCheckStatus({
      deviceLocation: true,
      locationAccuracy: true,
      hasCoordinates: true,
      coordinates: coords,
    });

    // ✅ persist for rest of app
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
  };

  // NEW: Handle "Get Location" button
  const handleGetLocation = async () => {
    const coords = await checkLocationStatus();
    if (coords) {
      setActiveOverlay(null);
      setIsLoading(true);
      await loadNearbySalons(
        coords.lat,
        coords.lng,
        userOnboarding?.gender || "all",
      );
      setIsLoading(false);
    }
  };

  // NEW: Handle retry
  const handleRetry = () => {
    checkLocationStatus();
  };

  const loadNearbySalons = async (
    lat,
    lng,
    gender = "all",
    salonGender = "all",
  ) => {
    // Normalize coordinates
    const normalizedLat =
      lat || liveUserLocation?.latitude || liveUserLocation?.lat;
    const normalizedLng =
      lng || liveUserLocation?.longitude || liveUserLocation?.lng;

    if (
      !normalizedLat ||
      !normalizedLng ||
      isNaN(normalizedLat) ||
      isNaN(normalizedLng)
    ) {
      setSalonLoadError("Unable to load salons: Invalid location coordinates");
      return;
    }

    // ✅ ONLY skip if manual mode AND salons already exist
    const isManual = sessionStorage.getItem("isManualMode") === "true";
    if (isManual && salons.length > 0) {
      return;
    }

    try {
      // Get salonGender from sessionStorage if not provided
      const genderFilter =
        salonGender === "all"
          ? sessionStorage.getItem("selectedGender") || "all"
          : salonGender;

      const url = `/api/salons/nearby?latitude=${normalizedLat}&longitude=${normalizedLng}&radius=${searchRadius}&gender=${gender}&salonGender=${genderFilter}`;

      setDebugInfo({
        userLat: normalizedLat,
        userLng: normalizedLng,
        timestamp: new Date().toLocaleString(),
      });

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.salons && data.salons.length > 0) {
        data.salons.forEach((salon, idx) => {
          const salonLat = salon.location?.coordinates?.latitude;
          const salonLng = salon.location?.coordinates?.longitude;

          if (salonLat && salonLng) {
            // Haversine distance calculation
            const R = 6371; // Earth radius in km
            const dLat = ((salonLat - lat) * Math.PI) / 180;
            const dLng = ((salonLng - lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((salonLat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
          }
        });
      } else {
        setSalonLoadError(
          `No salons found within ${searchRadius}km of your location (${lat.toFixed(
            4,
          )}, ${lng.toFixed(
            4,
          )}). Try increasing search radius or check if salons exist in your area.`,
        );
      }

      const salonsArray = Array.isArray(data.salons) ? data.salons : [];

      setSalons(salonsArray);
      setNearbySalons(salonsArray);
      setFilteredSalons(salonsArray);
    } catch (error) {
      setSalonLoadError(
        `Failed to load salons: ${error.message}. Check your internet connection.`,
      );
      setNearbySalons([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // CHANGE 1: Replace handleLocationChange
  // ========================================
  // ✅ NEW - Client-side distance calculation ONLY
  const handleLocationChange = (newLocation) => {
    if (!newLocation?.latitude || !newLocation?.longitude) return;

    const userLat = newLocation.latitude || newLocation.lat;
    const userLng = newLocation.longitude || newLocation.lng;

    // Haversine distance calculation (client-side)
    const updatedSalons = salons.map((salon) => {
      if (
        !salon.location?.coordinates ||
        salon.location.coordinates.length !== 2
      ) {
        return salon;
      }

      const [salonLng, salonLat] = salon.location.coordinates;
      const R = 6371; // Earth radius in km

      const dLat = (salonLat - userLat) * (Math.PI / 180);
      const dLng = (salonLng - userLng) * (Math.PI / 180);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((salonLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return { ...salon, distance: Number(distance.toFixed(2)) };
    });

    // Sort by distance
    updatedSalons.sort((a, b) => (a.distance || 999) - (b.distance || 999));

    setSalons(updatedSalons);
    setNearbySalons(updatedSalons);
    setFilteredSalons(updatedSalons);
  };

  // ========================================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "isManualMode") {
        const isNowManual = e.newValue === "true";
        if (!isNowManual) {
          // Switched to live mode from another tab
          sessionStorage.removeItem("manualLocationDistances");
        }
      } else if (e.key === "manualLocationDistances") {
        if (salons.length > 0) {
          try {
            const distances = JSON.parse(e.newValue);
            const updatedSalons = salons.map((salon, idx) => ({
              ...salon,
              distance:
                distances[idx] !== undefined ? distances[idx] : salon.distance,
            }));
            setSalons(updatedSalons);
          } catch (err) {
            console.error("Error syncing distances:", err);
          }
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [salons.length]);

  const handleRevertToLive = () => {
    // ✅ CLEAR all manual data from storage
    sessionStorage.removeItem("isManualMode");
    sessionStorage.removeItem("manualLocation");
    sessionStorage.removeItem("manualLocationDistances");
    sessionStorage.removeItem("_pendingDistances");
  };

  const handleRefreshLocation = async () => {
    if (locationStatus === "denied" && !isManualMode()) {
      // Request permission from useLocation hook
      const granted = await requestLocationPermission();

      // Wait a bit for location to update
      setTimeout(() => {
        if (liveUserLocation) {
          loadNearbySalons(
            liveUserLocation.latitude,
            liveUserLocation.longitude,
            userOnboarding?.gender,
          );
        }
      }, 1000);
    } else if (liveUserLocation) {
      // Just reload with current location
      loadNearbySalons(
        liveUserLocation.latitude,
        liveUserLocation.longitude,
        userOnboarding?.gender,
      );
    }
  };

  // ADD: Manual refresh function
  const handleRefreshSalons = () => {
    if (liveUserLocation && userOnboarding) {
      salonsLoadedRef.current = false; // Allow reload
      const salonGender = sessionStorage.getItem("selectedGender") || "all";
      loadNearbySalons(
        liveUserLocation.latitude,
        liveUserLocation.longitude,
        userOnboarding?.gender,
        salonGender,
      );

      salonsLoadedRef.current = true;
    }
  };

  useEffect(() => {
    if (!salons.length) {
      setFilteredSalons([]);
      return;
    }

    let filtered = salons;

    // Filter by selected service
    if (selectedService) {
      filtered = filtered.filter((salon) =>
        salon.topServices?.some((service) =>
          service.name.toLowerCase().includes(selectedService.toLowerCase()),
        ),
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (salon) =>
          salon.salonName.toLowerCase().includes(searchLower) ||
          salon.location.address.toLowerCase().includes(searchLower) ||
          salon.topServices?.some((service) =>
            service.name.toLowerCase().includes(searchLower),
          ),
      );
    }

    setFilteredSalons(filtered);
  }, [nearbySalons, searchTerm, selectedService, salons]);

  // const toggleDarkMode = () => {
  //   const newMode = !isDarkMode;
  //   setIsDarkMode(newMode);
  //   localStorage.setItem("darkMode", newMode.toString());

  //   if (newMode) {
  //     document.documentElement.setAttribute("data-theme", "dark");
  //   } else {
  //     document.documentElement.removeAttribute("data-theme");
  //   }
  // };

  // Function to get salon status based on opening hours and current time
  const getSalonStatus = (salon) => {
    if (!salon.operatingHours && !salon.openingHours) return "Open Now";

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1430 for 14:30

    const hours = salon.operatingHours?.[currentDay] || salon.openingHours;

    if (!hours || hours.closed) {
      // Find next opening day
      const daysOrder = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const currentDayIndex = daysOrder.indexOf(currentDay);

      for (let i = 1; i <= 7; i++) {
        const nextDay = daysOrder[(currentDayIndex + i) % 7];
        const nextDayHours =
          salon.operatingHours?.[nextDay] || salon.openingHours;
        if (nextDayHours && !nextDayHours.closed) {
          return i === 1
            ? `Opens Tomorrow at ${formatTime(nextDayHours.open)}`
            : "Closed";
        }
      }
      return "Closed";
    }

    const openTime = parseInt(hours.open?.replace(":", "") || "0900");
    const closeTime = parseInt(hours.close?.replace(":", "") || "2100");

    if (currentTime < openTime) {
      const hoursUntil = Math.floor((openTime - currentTime) / 100);
      const minsUntil = (openTime - currentTime) % 100;
      if (hoursUntil < 1) {
        return `Opens in ${minsUntil}mins`;
      }
      return `Opens at ${formatTime(hours.open)}`;
    }

    if (currentTime >= closeTime) {
      return "Closed";
    }

    // Calculate time until closing
    const timeUntilClose = closeTime - currentTime;
    const hoursLeft = Math.floor(timeUntilClose / 100);
    const minsLeft = timeUntilClose % 100;

    if (hoursLeft < 2) {
      if (hoursLeft === 0 && minsLeft <= 20) {
        return `Closes in ${minsLeft}mins`;
      }
      if (hoursLeft === 1) {
        return `Closes in 1hr ${minsLeft}mins`;
      }
      return `Closes in ${hoursLeft}hrs`;
    }

    return "Open Now";
  };

  const formatTime = (time) => {
    if (!time) return "";

    // Remove any extra colons and normalize
    const cleaned = time.replace(/::+/g, ":").trim();

    let hours, mins;

    if (cleaned.includes(":")) {
      const [h, m] = cleaned.split(":");
      hours = parseInt(h) || 0;
      mins = (m || "00").padStart(2, "0");
    } else {
      hours = parseInt(cleaned.substring(0, cleaned.length - 2)) || 0;
      mins = cleaned.substring(cleaned.length - 2).padStart(2, "0");
    }

    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

    return `${displayHours}:${mins} ${ampm}`;
  };

  const handleSalonCardClick = (salonId, mode) => {
    setIsNavigating(true);
    router.push(`/salons/${salonId}?mode=${mode}`);
  };

  // Don't show location check until user data is ready
  if (!isUserDataReady) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.luxurySpinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerCore}></div>
        </div>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  // Location Check Screen - Shows FIRST
  if (activeOverlay === "location") {
    return (
      <div className={styles.locationCheckOverlay}>
        <div className={styles.locationCheckBox}>
          <h2 className={styles.locationCheckTitle}>📍 Location Required</h2>
          <p className={styles.locationCheckSubtitle}>
            We need your location to find nearby salons
          </p>

          <div className={styles.statusList}>
            <div
              className={`${styles.statusItem} ${
                locationCheckStatus.deviceLocation
                  ? styles.statusSuccess
                  : styles.statusPending
              }`}
            >
              <span className={styles.statusIcon}>
                {locationCheckStatus.deviceLocation ? "✅" : "⏳"}
              </span>
              <span className={styles.statusText}>Device Location</span>
            </div>

            <div
              className={`${styles.statusItem} ${
                locationCheckStatus.locationAccuracy
                  ? styles.statusSuccess
                  : styles.statusPending
              }`}
            >
              <span className={styles.statusIcon}>
                {locationCheckStatus.locationAccuracy ? "✅" : "⏳"}
              </span>
              <span className={styles.statusText}>Location Accuracy</span>
            </div>

            <div
              className={`${styles.statusItem} ${
                locationCheckStatus.hasCoordinates
                  ? styles.statusSuccess
                  : styles.statusPending
              }`}
            >
              <span className={styles.statusIcon}>
                {locationCheckStatus.hasCoordinates ? "✅" : "⏳"}
              </span>
              <span className={styles.statusText}>Location Data Received</span>
            </div>
          </div>

          {locationCheckStatus.coordinates && (
            <div className={styles.coordsDisplay}>
              <p>📌 Lat: {locationCheckStatus.coordinates.lat.toFixed(6)}</p>
              <p>📌 Lng: {locationCheckStatus.coordinates.lng.toFixed(6)}</p>
            </div>
          )}

          <div className={styles.locationCheckActions}>
            {!locationCheckStatus.hasCoordinates ? (
              <>
                <button
                  onClick={handleGetLocation}
                  className={styles.getLocationBtn}
                >
                  📍 Get My Location
                </button>

                <button
                  onClick={() => {
                    setActiveOverlay("manual");
                  }}
                  className={styles.manualLocationBtn}
                >
                  🗺️ Enter Location Manually
                </button>

                <button onClick={handleRetry} className={styles.retryBtn}>
                  🔄 Retry
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setActiveOverlay(null);
                  setIsLoading(true);
                  loadNearbySalons(
                    locationCheckStatus.coordinates.lat,
                    locationCheckStatus.coordinates.lng,
                    userOnboarding?.gender || "all",
                  ).finally(() => setIsLoading(false));
                }}
                className={styles.continueBtn}
              >
                ✨ Continue to Salons
              </button>
            )}
          </div>

          {!locationCheckStatus.deviceLocation && (
            <div className={styles.helpText}>
              <p>⚠️ Location is turned off</p>
              <p className={styles.helpSubtext}>
                Please enable location in your device settings, then tap
                &quot;Get My Location&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (activeOverlay === "manual") {
    return (
      <ManualLocationOverlay
        onConfirm={({ lat, lng }) => {
          handleManualLocationConfirm({ lat, lng });
          setActiveOverlay("location"); // go back to location box WITH coords
        }}
        onClose={() => setActiveOverlay("location")}
      />
    );
  }

  // Main Loading Screen - Shows AFTER location check
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.luxurySpinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerCore}></div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={styles.loadingText}
        >
          Crafting your luxury experience...
        </motion.p>
      </div>
    );
  }

  if (isNavigating) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.luxurySpinner}>
          <div className={styles.spinnerRing}></div>
          <div className={styles.spinnerCore}></div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={styles.loadingText}
        >
          Loading salon details...
        </motion.p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Enhanced Header */}
      {/* Hero Section */}
      <main id="main-content">
        {/* MOBILE DEBUG PANEL - REMOVE AFTER FIXING */}

        {/* <div style={{ width: '100%', height: '600px', position: 'relative' }}>
  <DarkVeil />  
</div> */}
        <section className={styles.heroSection}>
          <div className={styles.heroBackground}></div>

          <div className={styles.heroBackground}>
            <div className={styles.heroPattern}></div>
            <div className={styles.floatingElements}>
              <div className={`${styles.floatingElement} ${styles.element1}`}>
                ✨
              </div>
              <div className={`${styles.floatingElement} ${styles.element2}`}>
                💎
              </div>
              <div className={`${styles.floatingElement} ${styles.element3}`}>
                👑
              </div>
              <div className={`${styles.floatingElement} ${styles.element4}`}>
                🌟
              </div>
            </div>
          </div>

          <div className={styles.heroContent}>
            <div className={styles.heroLeft}>
              <motion.div
                className={styles.heroTextContainer}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <motion.h1
                  className={styles.heroTitle}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.2 }}
                >
                  Welcome back,
                  <br />
                  <span className={styles.heroNameHighlight}>
                    {userOnboarding?.name || "Guest"} ✨{" "}
                  </span>
                </motion.h1>

                <motion.p
                  className={styles.heroSubtitle}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.4 }}
                >
                  Discover luxury salon experiences and premium beauty services
                  near{" "}
                  <span className={styles.locationHighlight}>
                    {userOnboarding?.location?.address || "you"}{" "}
                  </span>
                </motion.p>
                {/* <TextMorph/> */}
                <motion.div
                  className={styles.heroStats}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6 }}
                >
                  <div className={styles.heroStat}>
                    <div className={styles.statIcon}>
                      🏪{" "}
                      <span className={styles.statNumber}>{salons.length}</span>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>Premium Salons</span>
                    </div>
                  </div>
                  <div className={styles.heroStat}>
                    <div className={styles.statIcon}>
                      💆{" "}
                      <span className={styles.statNumber}>
                        {Array.isArray(salons)
                          ? salons.reduce(
                              (total, salon) =>
                                total + (salon.topServices?.length || 0),
                              0,
                            )
                          : 0}
                      </span>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>Expert Services</span>
                    </div>
                  </div>
                  <div className={styles.heroStat}>
                    <div className={styles.statIcon}>
                      ⭐
                      <span className={styles.statNumber}>
                        {Array.isArray(salons)
                          ? salons.reduce(
                              (total, salon) =>
                                total + (salon.stats?.totalBookings || 0),
                              0,
                            )
                          : 0}
                      </span>
                    </div>
                    <div className={styles.statContent}>
                      <span className={styles.statLabel}>Happy Clients</span>
                    </div>
                  </div>
                </motion.div>

                {/* <motion.div
                  className={styles.heroActions}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  <button className={${styles.heroCta} ${styles.primary}}>
                    <span className={styles.ctaIcon}>🔍</span>
                    Find Salons Near Me
                  </button>
                  <button className={${styles.heroCta} ${styles.secondary}}>
                    <span className={styles.ctaIcon}>📅</span>
                    Book Appointment
                  </button>
                </motion.div> */}
              </motion.div>
            </div>
            {/* Login/Onboard Banner */}

            <div className={styles.heroRight}>
              <motion.div
                className={styles.heroVisuals}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
              >
                <div className={styles.visualsContainer}>
                  <div className={styles.mainImage}>
                    <img
                      src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop&crop=face"
                      alt="Luxury salon interior"
                      width={600}
                      height={400}
                      className={styles.heroImage}
                      unoptimized
                    />

                    <div className={styles.imageGradient}></div>
                  </div>

                  <div className={styles.floatingCards}>
                    <motion.div
                      className={`${styles.floatingCard} ${styles.card1}`}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <div className={styles.cardIcon}>💇‍♀</div>
                      <div className={styles.cardText}>
                        <span className={styles.cardTitle}>Hair Styling</span>
                        <span className={styles.cardPrice}>from ₹299</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className={`${styles.floatingCard} ${styles.card2}`}
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    >
                      <div className={styles.cardIcon}>✨</div>
                      <div className={styles.cardText}>
                        <span className={styles.cardTitle}>
                          Facial Treatment
                        </span>
                        <span className={styles.cardPrice}>from ₹599</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className={`${styles.floatingCard} ${styles.card3} `}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 2 }}
                    >
                      <div className={styles.cardIcon}>💅</div>
                      <div className={styles.cardText}>
                        <span className={styles.cardTitle}>Manicure</span>
                        <span className={styles.cardPrice}>from ₹399</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Decorative Elements */}
                  <div className={styles.decorativeShapes}>
                    <div className={`${styles.shape} ${styles.shape1}`}></div>
                    <div className={`${styles.shape} ${styles.shape2}`}></div>
                    <div className={`${styles.shape} ${styles.shape3}`}></div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        {/* Enhanced Search Section */}
        <motion.section
          className={styles.searchSection}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className={styles.searchContainer}>
            <motion.div
              className={styles.searchBox}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className={styles.searchInputWrapper}>
                <input
                  type="text"
                  placeholder="Search for services, salons, or treatments..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className={styles.searchIcon}>🔍</span>
                {/* <motion.button
                  className={styles.searchButton}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Search
                </motion.button> */}
              </div>
            </motion.div>

            <div className={styles.quickFilters}>
              <span className={styles.filtersLabel}>Popular:</span>
              {[
                { icon: "💇", label: "Haircut", color: "#FF6B6B" },
                { icon: "🧔", label: "Beard Trim", color: "#4ECDC4" },
                { icon: "💅", label: "Manicure", color: "#45B7D1" },
                { icon: "✨", label: "Facial", color: "#96CEB4" },
                { icon: "🎨", label: "Hair Color", color: "#FECA57" },
                { icon: "💆", label: "Massage", color: "#FF9FF3" },
              ].map((filter, index) => (
                <motion.button
                  key={filter.label}
                  className={`${styles.filterChip} ${
                    selectedService === filter.label ? styles.activeFilter : ""
                  }`}
                  style={{ "--filter-color": filter.color }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => {
                    if (selectedService === filter.label) {
                      setSelectedService(""); // Deselect if already selected
                    } else {
                      setSelectedService(filter.label);
                    }
                  }}
                >
                  <span className={styles.filterIcon}>{filter.icon}</span>
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Salons Section with Booking Type Tabs */}
        {/* Location Status Feedback */}
        {locationStatus === "requesting" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.locationAlert}
          >
            <div className={styles.locationAlertContent}>
              <span className={styles.locationIcon}>📍</span>
              <p>Getting your location to find nearby salons...</p>
            </div>
          </motion.div>
        )}

        {locationError && locationStatus === "denied" && !isManualMode() && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.locationAlertError}
          >
            <div className={styles.locationAlertContent}>
              <span className={styles.locationIcon}>⚠</span>
              <div>
                <p>
                  <strong>Location Access Needed</strong>
                </p>
                <p>{locationError}</p>
                <button
                  className={styles.retryButton}
                  onClick={async () => {
                    try {
                      // Clear old cache first
                      sessionStorage.removeItem("liveUserLocation");
                      localStorage.removeItem("cachedUserLocation");

                      // Request fresh location permission
                      await requestLocationPermission();

                      // Reload after getting permission
                      window.location.reload();
                    } catch (error) {
                      alert("Please enable location in browser settings");
                    }
                  }}
                >
                  🔐 Enable Location Access
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {locationError && locationStatus === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.locationAlertWarning}
          >
            <div className={styles.locationAlertContent}>
              <span className={styles.locationIcon}>⏱</span>
              <p>{locationError}</p>
            </div>
          </motion.div>
        )}

        {/* {liveUserLocation && locationStatus === "granted" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.locationAlertSuccess}
          >
            <div className={styles.locationAlertContent}>
              <span className={styles.locationIcon}>✅</span>
              <p>Location detected! Showing salons near you</p>
            </div>
          </motion.div>
        )} */}

        <motion.section
          className={styles.salonsSection}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleContainer}>
              <h3 className={styles.sectionTitle}>Premium Salons Near You</h3>
              <p className={styles.sectionSubtitle}>
                Handpicked luxury experiences in your area
              </p>
            </div>
          </div>
          {/* ✅ BANNER ABOVE TABS - Show when NO location */}
          {!liveUserLocation && (
            <div className={styles.fallbackBanner}>
              <div className={styles.bannerContent}>
                <div className={styles.bannerIcon}>📍</div>
                <h3 className={styles.bannerTitle}>
                  Want to see nearby salons?
                </h3>

                <p className={styles.loginNotice}>
                  Please login or complete onboarding to view salons near you
                </p>
                <div className={styles.bannerActions}>
                  <button
                    onClick={() => router.push("/auth/login")}
                    className={styles.bannerBtnPrimary}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push("/onboarding")}
                    className={styles.bannerBtnSecondary}
                  >
                    Complete Onboarding
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Booking Mode Tabs */}
          <div className={styles.bookingModeToggle}>
            <button
              className={`${styles.modeButton} ${
                !isPrebook ? styles.activeModeButton : ""
              }`}
              onClick={() => setIsPrebook(false)}
            >
              ⚡ Walk-in <span className={styles.modeBadge}>INSTANT</span>
            </button>
            <button
              className={`${styles.modeButton} ${
                isPrebook ? styles.activeModeButton : ""
              }`}
              onClick={() => setIsPrebook(true)}
            >
              📅 Pre-book <span className={styles.modeBadge}>ADVANCE</span>
            </button>
          </div>
          {/* Radius Control */}
          <div className={styles.radiusControl}>
            <label className={styles.radiusLabel}>
              📍 Search Radius:{" "}
              <strong>
                {searchRadius >= 1600 ? "1500+ km" : `${searchRadius} km`}
              </strong>
            </label>
            <input
              type="range"
              min={0}
              max={25}
              value={radiusMarks.indexOf(searchRadius)}
              onChange={(e) =>
                setSearchRadius(radiusMarks[Number(e.target.value)])
              }
              step={1}
              className={styles.radiusSlider}
            />
            <div className={styles.radiusMarkers}>
              <span>1km</span>
              <span>50km</span>
              <span>500km</span>
              <span>1500+km</span>
            </div>
          </div>

          {/* Walk-in Instruction - ONLY show on Walk-in tab
          {!isPrebook && (
            <div className={styles.walkInInstruction}>
              <span className={styles.instructionIcon}>⚡</span>
              <p className={styles.instructionText}>
                Select a salon below to see real-time chair availability and
                queue status
              </p>
            </div>
          )} */}
          <div className={styles.salonsControlsBar}>
            {/* View toggle (only show for pre-book with location) */}
            {salons.length > 0 && (
              <div className={styles.SalonControls}>
                <div className={styles.viewOptions}>
                  <motion.button
                    className={`${styles.viewToggle} ${
                      !showMapView ? styles.active : ""
                    }`}
                    onClick={() => setShowMapView(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={styles.viewIcon}>⊞</span>
                    Grid View
                  </motion.button>

                  <motion.button
                    className={`${styles.viewToggle} ${
                      showMapView ? styles.active : ""
                    }`}
                    onClick={() => setShowMapView(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={styles.viewIcon}>🗺</span>
                    Map View
                  </motion.button>
                </div>
              </div>
            )}
            <button
              onClick={handleRefreshSalons}
              className={styles.refreshButton}
              disabled={isLoadingSalons}
            >
              🔄 Refresh
            </button>
          </div>
          {/* Salons Display */}
          {isLoadingSalons ? (
            <div className={styles.loadingSalons}>
              <div className={styles.luxurySpinner}>
                <div className={styles.spinnerRing}></div>
                <div className={styles.spinnerCore}></div>
              </div>
              <p>Discovering premium salons near you...</p>
            </div>
          ) : salons.length === 0 ? (
            <div className={styles.errorSection}>
              <h3>No Salons Found</h3>

              {salonLoadError && (
                <p className={styles.errorMessage}>{salonLoadError}</p>
              )}

              {debugInfo && (
                <details className={styles.debugInfo}>
                  <summary>🔍 Debug Info (tap to expand)</summary>
                  <pre>
                    {`Your Location: ${debugInfo.userLat}, ${debugInfo.userLng}
${
  liveUserLocation
    ? `Accuracy: ${(liveUserLocation.accuracy / 1000).toFixed(1)}km`
    : ""
}
${
  liveUserLocation
    ? `Location Type: ${
        liveUserLocation.accuracy > 50000
          ? "IP-based (approximate)"
          : "GPS (precise)"
      }`
    : ""
}
Time: ${debugInfo.timestamp}`}
                  </pre>
                </details>
              )}

              <div className={styles.suggestions}>
                <h4>Try this:</h4>
                <ul>
                  <li>Check if location permission is enabled for this site</li>
                  <li>
                    On mobile: Enable &quot;High accuracy&quot; GPS in phone
                    settings
                  </li>
                  <li>
                    On desktop: Use the map pin to manually set your location
                  </li>
                  <li>Refresh the page to retry location detection</li>
                </ul>
              </div>

              <button
                className={styles.retryButton}
                onClick={() => {
                  if (liveUserLocation) {
                    loadNearbySalons(
                      liveUserLocation.latitude || liveUserLocation.lat,
                      liveUserLocation.longitude || liveUserLocation.lng,
                      userOnboarding?.gender,
                    );
                  } else {
                    requestLocationPermission();
                  }
                }}
              >
                🔄 Retry Location & Reload Salons
              </button>
            </div>
          ) : showMapView ? (
            <div className={styles.mapViewWrapper}>
              <SalonMap
                key={mapKey}
                salons={salons}
                userLocation={liveUserLocation}
                onRevertToLive={handleRevertToLive}
                onLocationChange={handleLocationChange}
                onRefreshSalons={(lat, lng) => {
                  // This loads fresh salons from API
                  loadNearbySalons(lat, lng, userOnboarding?.gender);
                }}
                selectedSalon={selectedSalon}
                onSalonSelect={setSelectedSalon}
                onBookNow={handleSalonCardClick}
                userGender={userOnboarding?.gender}
              />
            </div>
          ) : (
            <div className={styles.salonsGrid}>
              {(Array.isArray(filteredSalons) && filteredSalons.length > 0
                ? filteredSalons
                : Array.isArray(salons)
                  ? salons
                  : []
              ).map(
                // ✅ CHANGE nearbySalons to salons
                (salon, index) => (
                  <motion.div
                    key={String(salon._id)}
                    className={styles.salonCard}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ y: -12, scale: 1.02 }}
                    onClick={() => {
                      const salonId = salon._id?.oid || salon._id;
                      handleSalonCardClick(
                        salonId,
                        isPrebook ? "prebook" : "walkin",
                      );
                    }}
                  >
                    {/* Salon Image */}
                    <div className={styles.salonImageContainer}>
                      <img
                        src={salon.profilePicture || PLACEHOLDER_IMAGE}
                        alt={salon.salonName}
                        width={400}
                        height={250}
                        style={{ objectFit: "cover", borderRadius: "8px" }}
                        unoptimized
                      />
                      <div className={styles.salonImageOverlay}></div>

                      {/* Badges */}
                      <div className={styles.salonBadges}>
                        {!isPrebook ? (
                          <span
                            className={`${styles.salonBadge} ${styles.walkInBadge}`}
                          >
                            ⚡ Walk-in Ready
                          </span>
                        ) : (
                          <>
                            <span
                              className={`${styles.salonBadge} ${styles.primaryBadge}`}
                            >
                              {salon.distance < 2
                                ? "Very Close"
                                : salon.isVerified
                                  ? "Verified"
                                  : "Popular"}
                            </span>
                            <span
                              className={`${styles.salonBadge} ${styles.distanceBadge}`}
                            >
                              {salon.distance}km away
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Salon Info */}
                    <div className={styles.salonInfo}>
                      <div className={styles.salonHeader}>
                        <h4 className={styles.salonName}>{salon.salonName}</h4>
                        <div className={styles.salonRating}>
                          <span className={styles.ratingStars}>⭐</span>
                          <span className={styles.ratingNumber}>
                            {salon.ratings?.overall ?? salon.rating ?? 4.5}
                          </span>
                        </div>
                      </div>

                      <p className={styles.salonLocation}>
                        {salon.location?.address}
                      </p>

                      <div className={styles.salonMetrics}>
                        <div className={styles.metric}>
                          <span className={styles.metricIcon}>📍</span>
                          <span className={styles.metricValue}>
                            {salon.distance
                              ? salon.distance < 1
                                ? `${Math.round(salon.distance * 10000)}m away`
                                : `${salon.distance}km away`
                              : "N/A"}
                          </span>
                        </div>
                        <div className={styles.metric}>
                          <span className={styles.metricIcon}>🕐</span>
                          <span className={styles.metricValue}>
                            {getSalonStatus(salon)}
                          </span>
                        </div>
                        <div className={styles.metric}>
                          <span className={styles.metricIcon}>⭐</span>
                          <span className={styles.metricValue}>
                            {salon.ratings?.totalReviews || 0} reviews
                          </span>
                        </div>
                      </div>

                      <div className={styles.salonServices}>
                        {salon.topServices?.slice(0, 3).map((service, idx) => (
                          <span key={idx} className={styles.serviceTag}>
                            {service.name}
                          </span>
                        ))}
                      </div>

                      {isPrebook && (
                        <div className={styles.salonServices}>
                          {salon.topServices
                            ?.slice(0, 3)
                            .map((service, idx) => (
                              <span key={idx} className={styles.serviceTag}>
                                {service.name}
                              </span>
                            ))}
                        </div>
                      )}

                      <motion.button
                        className={
                          !isPrebook ? styles.walkInButton : styles.bookButton
                        }
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {!isPrebook ? "View Live Availability" : "Book Now"}
                      </motion.button>
                    </div>
                  </motion.div>
                ),
              )}
            </div>
          )}
        </motion.section>

        {/* Testimonials Section */}
        <motion.section
          className={styles.testimonialsSection}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>What Our Clients Say</h3>
            <p className={styles.sectionSubtitle}>
              Real experiences from real people
            </p>
          </div>

          <div className={styles.testimonialsGrid}>
            {[
              {
                name: "Priya Sharma",
                service: "Hair Styling & Color",
                rating: 5,
                text: "Absolutely amazing experience! The staff was professional and the results exceeded my expectations.",
                image:
                  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
              },
              {
                name: "Rajesh Kumar",
                service: "Beard Styling",
                rating: 5,
                text: "Best grooming experience I've had in Mumbai. Clean, professional, and great attention to detail.",
                image:
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
              },
              {
                name: "Anita Patel",
                service: "Facial & Manicure",
                rating: 5,
                text: "Such a relaxing and luxurious experience. I feel completely refreshed and beautiful!",
                image:
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
              },
            ].map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className={styles.testimonialCard}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{ y: -5, scale: 1.02 }}
              >
                <div className={styles.testimonialHeader}>
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={80}
                    height={80}
                    className={styles.testimonialAvatar}
                    unoptimized
                  />
                  <div className={styles.testimonialMeta}>
                    <h5 className={styles.testimonialName}>
                      {testimonial.name}
                    </h5>
                    <p className={styles.testimonialService}>
                      {testimonial.service}
                    </p>
                    <div className={styles.testimonialRating}>
                      {"⭐".repeat(testimonial.rating)}
                    </div>
                  </div>
                </div>
                <p className={styles.testimonialText}>
                  &quot;{testimonial.text}&quot;
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>
        {/* Enhanced Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerMain}>
              <div className={styles.footerBrand}>
                <div className={styles.footerLogo}>
                  <div className={styles.footerLogoIcon}>✨</div>
                  <h4>TechTrims</h4>
                </div>
                <p className={styles.footerTagline}>
                  Elevating beauty experiences through technology and luxury
                </p>
                <div className={styles.footerSocials}>
                  <button className={styles.socialButton}>📘</button>
                  <button className={styles.socialButton}>📸</button>
                  <button className={styles.socialButton}>🐦</button>
                  <button className={styles.socialButton}>💼</button>
                </div>
              </div>

              <div className={styles.footerLinks}>
                <div className={styles.footerColumn}>
                  <h5 className={styles.footerColumnTitle}>Services</h5>
                  <ul className={styles.footerList}>
                    <li>
                      <a href="#haircut">Hair Styling</a>
                    </li>
                    <li>
                      <a href="#facial">Facial Treatments</a>
                    </li>
                    <li>
                      <a href="#manicure">Nail Care</a>
                    </li>
                    <li>
                      <a href="#massage">Spa & Massage</a>
                    </li>
                  </ul>
                </div>

                <div className={styles.footerColumn}>
                  <h5 className={styles.footerColumnTitle}>For Business</h5>
                  <ul className={styles.footerList}>
                    <li>
                      <a href="#register">Register Your Salon</a>
                    </li>
                    <li>
                      <a href="#partner">Partner with Us</a>
                    </li>
                    <li>
                      <a href="#business">Business Solutions</a>
                    </li>
                    <li>
                      <a href="#support">Business Support</a>
                    </li>
                  </ul>
                </div>

                <div className={styles.footerColumn}>
                  <h5 className={styles.footerColumnTitle}>Support</h5>
                  <ul className={styles.footerList}>
                    <li>
                      <a href="#help">Help Center</a>
                    </li>
                    <li>
                      <a href="#contact">Contact Us</a>
                    </li>
                    <li>
                      <a href="#terms">Terms of Service</a>
                    </li>
                    <li>
                      <a href="#privacy">Privacy Policy</a>
                    </li>
                  </ul>
                </div>

                <div className={styles.footerColumn}>
                  <h5 className={styles.footerColumnTitle}>Connect</h5>
                  <div className={styles.footerContact}>
                    <p>📞 +91 98765 43210</p>
                    <p>✉ hello@techtrims.com</p>
                    <p>📍 Mumbai, Maharashtra</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.footerBottom}>
              <div className={styles.footerBottomContent}>
                <p>&copy; 2025 TechTrims. All rights reserved.</p>
                <div className={styles.footerBadges}>
                  <span className={styles.footerBadge}>🔒 Secure</span>
                  <span className={styles.footerBadge}>⭐ Verified</span>
                  <span className={styles.footerBadge}>💎 Premium</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Helper function to highlight search text
function highlightText(text, highlight) {
  if (!highlight) return text;

  const regex = new RegExp(`(${highlight})`, "gi");
  return text.split(regex).map((part, index) =>
    regex.test(part) ? (
      <mark key={index} style={{ background: "#ffd700", padding: "0 2px" }}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export async function getStaticProps() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/salons/nearby?latitude=28.6139&longitude=77.2090&radius=50&static=true`,
    );

    if (!response.ok) {
      return {
        props: {
          initialSalons: [], // ✅ Empty array
        },
        revalidate: 300,
      };
    }

    const data = await response.json();
    return {
      props: {
        initialSalons: Array.isArray(data.salons) ? data.salons : [], // ✅ Safe check
      },
      revalidate: 300,
    };
  } catch (error) {
    console.error("SSG fetch error:", error);
    return {
      props: {
        initialSalons: [], // ✅ Empty array
      },
      revalidate: 300,
    };
  }
}
