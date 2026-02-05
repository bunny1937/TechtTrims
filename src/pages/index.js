// pages/index.js
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";
import { useLocation } from "../hooks/useLocation";
import { UserDataManager } from "../lib/userData";
import { getAuthToken, getUserData } from "../lib/cookieAuth";
import IntroOverlay from "@/components/Intro/IntroOverlay";
import { getDistanceWorker } from "../utils/distanceWorkerSingleton";
// Dynamic import for map component
const SalonMap = dynamic(() => import("../components/Maps/SalonMap"), {
  ssr: false,
  loading: () => null,
});

const ManualLocationOverlay = dynamic(
  () => import("../components/Maps/ManualLocationOverlay"),
  {
    ssr: false,
  },
);

// Add lazy loading for heavy components
const TestimonialsSection = dynamic(
  () => import("../components/Testimonials"),
  {
    ssr: false,
    loading: () => null,
  },
);

const FooterSection = dynamic(() => import("../components/Footer"), {
  ssr: false,
});

export default function Home({ initialSalons = [] }) {
  const router = useRouter();
  const {
    userLocation: liveUserLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
  } = useLocation();

  // ✅ NEW - Memoize user location to prevent re-render loops
  const memoizedUserLocation = useMemo(() => {
    if (!liveUserLocation) return null;
    return {
      latitude: liveUserLocation.latitude,
      longitude: liveUserLocation.longitude,
      lat: liveUserLocation.lat,
      lng: liveUserLocation.lng,
      accuracy: liveUserLocation.accuracy,
    };
  }, [
    liveUserLocation?.latitude,
    liveUserLocation?.longitude,
    liveUserLocation?.accuracy,
  ]);
  const [salons, setSalons] = useState(
    Array.isArray(initialSalons) ? initialSalons : [],
  );

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
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use debouncedSearch in filtering logic instead of searchTerm
  const [selectedService, setSelectedService] = useState("");
  const [isPrebook, setIsPrebook] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

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
  // ✅ ADD THESE STATES:
  const [visibleSalons, setVisibleSalons] = useState(3); // Show 6 initially
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef(null); // For intersection observer
  const [locationCheckStatus, setLocationCheckStatus] = useState({
    deviceLocation: false,
    locationAccuracy: false,
    hasCoordinates: false,
    coordinates: null,
  }); // NEW: Track location status
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  // ADD: Track if salons were loaded
  const salonsLoadedRef = useRef(false);
  const initializedRef = useRef(false);
  const locationSetRef = useRef(false);
  const initialLocationRef = useRef(null);
  const PLACEHOLDER_IMAGE = process.env.NEXT_PUBLIC_PLACEHOLDER_SALON_IMAGE;
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const introShown = sessionStorage.getItem("introShown");
    setShowIntro(introShown !== "true");
  }, []);

  const handleAnimationEnd = () => {
    sessionStorage.setItem("introShown", "true");
    setShowIntro(false);
  };

  useEffect(() => {
    const initializeUser = async () => {
      // Prevent double initialization
      if (initializedRef.current) {
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      // Check onboarding
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");
      if (!hasOnboarded) {
        router.push("/onboarding");
        return;
      }

      // Mark as initialized EARLY to prevent double-runs
      initializedRef.current = true;

      // Fetch user data in parallel
      const userToken = getAuthToken();
      if (userToken) {
        // ✅ 1. Read immediately from sessionStorage
        const cachedUser = sessionStorage.getItem("userProfile");
        if (cachedUser) {
          try {
            setProfileUser(JSON.parse(cachedUser));
          } catch {}
        }

        // ✅ 2. Refresh in background (does NOT block UI)
        setTimeout(async () => {
          try {
            const freshUser = await UserDataManager.fetchAndStoreUserData();
            if (freshUser) {
              setProfileUser(freshUser);
              sessionStorage.setItem("userProfile", JSON.stringify(freshUser));
            }
          } catch {}
        }, 0);
      }

      setIsUserDataReady(true);

      // ✅ DON'T LOAD SALONS HERE - Let the next useEffect handle it
    };

    initializeUser();
  }, []);

  // ✅ NEW EFFECT - Load salons when memoizedUserLocation becomes available
  useEffect(() => {
    // Skip if already loaded or no location
    if (salonsLoadedRef.current || !memoizedUserLocation) {
      return;
    }

    const loadInitialSalons = async () => {
      if (!memoizedUserLocation) return;

      // Validate location
      if (!memoizedUserLocation.latitude || !memoizedUserLocation.longitude) {
        return;
      }

      // Check accuracy
      if (
        memoizedUserLocation.accuracy &&
        memoizedUserLocation.accuracy > 50000
      ) {
        sessionStorage.removeItem("liveUserLocation");
        sessionStorage.removeItem("userLocation");
        localStorage.removeItem("cachedUserLocation");
        setActiveOverlay("location");
        return;
      }
      setActiveOverlay(null);
      setIsLoading(true);

      try {
        const gender =
          userOnboarding?.gender ||
          sessionStorage.getItem("selectedGender") ||
          "all";

        await loadNearbySalons(
          memoizedUserLocation.latitude,
          memoizedUserLocation.longitude,
          gender,
        );
        salonsLoadedRef.current = true;
      } catch (error) {
        console.error("❌ Error loading initial salons:", error);
        salonsLoadedRef.current = false; // Reset on error
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSalons();
  }, [memoizedUserLocation, userOnboarding?.gender]); // ✅ Run when location OR gender becomes available

  // Reset ref if we have location but 0 salons
  useEffect(() => {
    if (memoizedUserLocation && salons.length === 0) {
      salonsLoadedRef.current = false;
    }
  }, [memoizedUserLocation, salons.length]);

  // Update location in session storage whenever it changes

  useEffect(() => {
    if (memoizedUserLocation && !locationSetRef.current) {
      locationSetRef.current = true; // ← Prevents multiple runs

      const normalized = {
        lat: memoizedUserLocation.latitude || memoizedUserLocation.lat,
        lng: memoizedUserLocation.longitude || memoizedUserLocation.lng,
        latitude: memoizedUserLocation.latitude || memoizedUserLocation.lat,
        longitude: memoizedUserLocation.longitude || memoizedUserLocation.lng,
        accuracy: memoizedUserLocation.accuracy,
        timestamp: Date.now(),
      };

      sessionStorage.setItem("userLocation", JSON.stringify(normalized));
    }
  }, [memoizedUserLocation?.latitude, memoizedUserLocation?.longitude]); // ← BETTER: Only re-run if coordinates actually change

  const genderFetchInProgressRef = useRef(false);

  useEffect(() => {
    const handleGenderChange = (event) => {
      const newGender = event.detail;

      if (
        genderFetchInProgressRef.current ||
        !memoizedUserLocation?.latitude ||
        !memoizedUserLocation?.longitude
      ) {
        return;
      }

      genderFetchInProgressRef.current = true;
      requestIdleCallback(() => {
        loadNearbySalons(
          memoizedUserLocation.latitude,
          memoizedUserLocation.longitude,
          userOnboarding?.gender || "all",
          newGender,
        ).finally(() => {
          genderFetchInProgressRef.current = false;
        });
      });
    };

    window.addEventListener("genderFilterChange", handleGenderChange);

    return () => {
      window.removeEventListener("genderFilterChange", handleGenderChange);
    };
  }, [memoizedUserLocation, userOnboarding?.gender]);

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
      lat || memoizedUserLocation?.latitude || memoizedUserLocation?.lat;
    const normalizedLng =
      lng || memoizedUserLocation?.longitude || memoizedUserLocation?.lng;

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
        let message = "Unable to load salons right now";

        try {
          const err = await response.json();
          message = err.message || message;
        } catch {}

        setSalonLoadError(message);
        setIsLoading(false);
        return; // 👈 STOP retry chain
      }

      const data = await response.json();

      const salonsArray = Array.isArray(data.salons) ? data.salons : [];

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

      setSalons(normalizedSalons);
      setNearbySalons(normalizedSalons);
    } catch (error) {
      setSalonLoadError(
        "We’re having trouble connecting right now. Please check your internet or try again shortly.",
      );
      setNearbySalons([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // CHANGE 1: Replace handleLocationChange
  // ========================================
  const handleLocationChange = (newLocation) => {
    if (!newLocation?.latitude || !newLocation?.longitude) return;
    if (!salons.length) return;

    const userLat = newLocation.latitude || newLocation.lat;
    const userLng = newLocation.longitude || newLocation.lng;

    // ✅ Create worker once WITH message handler
    const worker = getDistanceWorker();
    worker.onmessage = (e) => {
      const updated = e.data;
      updated.sort((a, b) => a.distance - b.distance);
      setSalons(updated);
    };

    // ✅ Send data to worker
    worker.postMessage({
      salons,
      userLat,
      userLng,
      radius: searchRadius,
    });
  };

  // ✅ AUTO-CALCULATE DISTANCE WHEN SALONS ARE LOADED
  useEffect(() => {
    // Only run when salons are first loaded (not on scroll)
    if (!salons.length || !memoizedUserLocation) {
      return;
    }

    if (!memoizedUserLocation.latitude || !memoizedUserLocation.longitude) {
      return;
    }

    // Check if salons already have distances
    const hasDistances = salons.some(
      (salon) => salon.distance !== null && salon.distance !== undefined,
    );

    handleLocationChange({
      latitude: memoizedUserLocation.latitude,
      longitude: memoizedUserLocation.longitude,
    });
  }, [salons.length, memoizedUserLocation]);

  // ✅ Reset distance flag when location changes
  useEffect(() => {
    if (memoizedUserLocation) {
      const prevLat = initialLocationRef.current?.latitude;
      const prevLng = initialLocationRef.current?.longitude;
      const currLat = memoizedUserLocation.latitude;
      const currLng = memoizedUserLocation.longitude;

      // If location changed significantly (more than 100m)
      if (prevLat && prevLng) {
        const latDiff = Math.abs(currLat - prevLat);
        const lngDiff = Math.abs(currLng - prevLng);

        if (latDiff > 0.001 || lngDiff > 0.001) {
          console.log("📍 Location changed - will recalculate distances");
        }
      }

      initialLocationRef.current = {
        latitude: currLat,
        longitude: currLng,
      };
    }
  }, [memoizedUserLocation]);

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
        if (memoizedUserLocation) {
          loadNearbySalons(
            memoizedUserLocation.latitude,
            memoizedUserLocation.longitude,
            userOnboarding?.gender,
          );
        }
      }, 1000);
    } else if (memoizedUserLocation) {
      // Just reload with current location
      loadNearbySalons(
        memoizedUserLocation.latitude,
        memoizedUserLocation.longitude,
        userOnboarding?.gender,
      );
    }
  };

  // ADD: Manual refresh function
  const handleRefreshSalons = () => {
    if (memoizedUserLocation && userOnboarding) {
      salonsLoadedRef.current = false; // Allow reload
      const salonGender = sessionStorage.getItem("selectedGender") || "all";
      loadNearbySalons(
        memoizedUserLocation.latitude,
        memoizedUserLocation.longitude,
        userOnboarding?.gender,
        salonGender,
      );

      salonsLoadedRef.current = true;
    }
  };

  const filteredSalons = useMemo(() => {
    if (!salons.length) return [];

    let list = [...salons];

    if (selectedService) {
      list = list.filter((salon) =>
        salon.topServices?.some((s) =>
          s.name.toLowerCase().includes(selectedService.toLowerCase()),
        ),
      );
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (salon) =>
          salon.salonName.toLowerCase().includes(q) ||
          salon.location?.address?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [salons, selectedService, debouncedSearch]);

  // Preload ONLY first salon image
  useEffect(() => {
    if (salons.length > 0 && salons[0].profilePicture) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = `${salons[0].profilePicture}?tr=w-400,h-250,q-70,f-webp`;
      document.head.appendChild(link);
    }
  }, [salons]);
  // ✅ NAMED CALLBACK FUNCTIONS
  useEffect(() => {
    const currentSalonsList =
      filteredSalons.length > 0 ? filteredSalons : salons;

    if (visibleSalons >= currentSalonsList.length) {
      return;
    }

    function handleIntersection(entries) {
      const firstEntry = entries[0];

      if (firstEntry.isIntersecting && !isLoadingMore) {
        setIsLoadingMore(true);

        setTimeout(function loadMoreSalons() {
          setVisibleSalons((prev) => {
            const newCount = prev + 6;
            setIsLoadingMore(false);
            return newCount;
          });
        }, 500);
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return function cleanup() {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleSalons, filteredSalons, salons, isLoadingMore]);

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
    if (!salon.operatingHours && !salon.openingHours) return "Closed";

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase()
      .trim();
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

    const openTime = parseInt(hours.open?.replace(/:/g, "")) || 900;
    const closeTime =
      hours.close === "24:00"
        ? 2359
        : parseInt(hours.close?.replace(/:/g, "")) || 2100;

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

    // Handle "01:00" or "0100" format
    const cleaned = time.replace(/:/g, "");
    const hours = parseInt(cleaned.substring(0, cleaned.length - 2)) || 0;
    const mins = cleaned.substring(cleaned.length - 2) || "00";

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
        <p>Crafting your luxury experience...</p>
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
        <p className={styles.loadingText}>Loading salon details...</p>
      </div>
    );
  }
  const salonsToRender =
    Array.isArray(filteredSalons) && filteredSalons.length > 0
      ? filteredSalons
      : Array.isArray(salons)
        ? salons
        : [];

  return (
    <>
      {showIntro ? (
        <IntroOverlay onAnimationEnd={handleAnimationEnd} />
      ) : (
        <div className={styles.container}>
          {/* Enhanced Header */}
          {/* Hero Section */}
          <main id="main-content">
            <section className={styles.heroSection}>
              <div className={styles.heroContent}>
                <div className={styles.heroLeft}>
                  <div className={styles.heroTextContainer}>
                    <h1 className={styles.heroTitle}>
                      Discover Premium Salons Near You ✨
                    </h1>
                    <p className={styles.heroGreeting}>
                      {profileUser ? `Welcome back, ${profileUser.name}` : ""}
                    </p>

                    <p className={styles.heroSubtitle}>
                      Discover luxury salon experiences and premium beauty
                      services near{" "}
                      <span className={styles.locationHighlight}>
                        {userOnboarding?.location?.address || "you"}{" "}
                      </span>
                    </p>
                    <div className={styles.heroStats}>
                      <div className={styles.heroStat}>
                        <div className={styles.statIcon}>
                          🏪{" "}
                          <span className={styles.statNumber}>
                            {salons.length}
                          </span>
                        </div>
                        <div className={styles.statContent}>
                          <span className={styles.statLabel}>
                            Premium Salons
                          </span>
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
                          <span className={styles.statLabel}>
                            Expert Services
                          </span>
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
                          <span className={styles.statLabel}>
                            Happy Clients
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.heroRight}>
                  {/* Enhanced Search Section */}
                  <section className={styles.searchSection}>
                    <div className={styles.searchContainer}>
                      <div className={styles.searchBox}>
                        <div className={styles.searchInputWrapper}>
                          <input
                            type="text"
                            placeholder="Search for services, salons, or treatments..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <span className={styles.searchIcon}>🔍</span>
                        </div>
                      </div>

                      <div className={styles.quickFilters}>
                        {[
                          { icon: "💇", label: "Haircut", color: "#FF6B6B" },
                          { icon: "🧔", label: "Beard Trim", color: "#4ECDC4" },
                          { icon: "💅", label: "Manicure", color: "#45B7D1" },
                          { icon: "✨", label: "Facial", color: "#96CEB4" },
                          { icon: "🎨", label: "Hair Color", color: "#FECA57" },
                          { icon: "💆", label: "Massage", color: "#FF9FF3" },
                        ].map((filter, index) => (
                          <button
                            key={filter.label}
                            className={`${styles.filterChip} ${
                              selectedService === filter.label
                                ? styles.activeFilter
                                : ""
                            }`}
                            style={{ "--filter-color": filter.color }}
                            onClick={() => {
                              if (selectedService === filter.label) {
                                setSelectedService(""); // Deselect if already selected
                              } else {
                                setSelectedService(filter.label);
                              }
                            }}
                          >
                            <span className={styles.filterIcon}>
                              {filter.icon}
                            </span>
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </section>

            {/* Salons Section with Booking Type Tabs */}
            {/* Location Status Feedback */}
            {locationStatus === "requesting" && (
              <div className={styles.locationAlert}>
                <div className={styles.locationAlertContent}>
                  <span className={styles.locationIcon}>📍</span>
                  <p>Getting your location to find nearby salons...</p>
                </div>
              </div>
            )}

            {locationError &&
              locationStatus === "denied" &&
              !isManualMode() && (
                <div className={styles.locationAlertError}>
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
                </div>
              )}

            {locationError && locationStatus === "error" && (
              <div className={styles.locationAlertWarning}>
                <div className={styles.locationAlertContent}>
                  <span className={styles.locationIcon}>⏱</span>
                  <p>{locationError}</p>
                </div>
              </div>
            )}

            <section className={styles.salonsSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleContainer}>
                  <h3 className={styles.sectionTitle}>
                    Premium Salons Near You
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Handpicked luxury experiences in your area
                  </p>
                </div>
              </div>
              {/* ✅ BANNER ABOVE TABS - Show when NO location */}
              {!memoizedUserLocation && (
                <div className={styles.fallbackBanner}>
                  <div className={styles.bannerContent}>
                    <div className={styles.bannerIcon}>📍</div>
                    <h3 className={styles.bannerTitle}>
                      Want to see nearby salons?
                    </h3>

                    <p className={styles.loginNotice}>
                      Please login or complete onboarding to view salons near
                      you
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
                <label htmlFor="radiusSlider" className={styles.radiusLabel}>
                  📍 Search Radius:{" "}
                  <strong>
                    {searchRadius >= 1600 ? "1500+ km" : `${searchRadius} km`}
                  </strong>
                </label>
                <input
                  id="radiusSlider"
                  type="range"
                  min="0"
                  max="25"
                  value={radiusMarks.indexOf(searchRadius)}
                  onChange={(e) =>
                    setSearchRadius(radiusMarks[Number(e.target.value)])
                  }
                  step="1"
                  className={styles.radiusSlider}
                  aria-label={`Adjust search radius: ${searchRadius >= 1600 ? "1500+ km" : searchRadius + " km"}`}
                  aria-valuemin="0"
                  aria-valuemax="25"
                  aria-valuenow={radiusMarks.indexOf(searchRadius)}
                  aria-valuetext={`${searchRadius >= 1600 ? "1500+ km" : searchRadius + " km"}`}
                />
                <div className={styles.radiusMarkers}>
                  <span>1km</span>
                  <span>50km</span>
                  <span>500km</span>
                  <span>1500km</span>
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
                      <button
                        className={`${styles.viewToggle} ${
                          !showMapView ? styles.active : ""
                        }`}
                        onClick={() => setShowMapView(false)}
                      >
                        <span className={styles.viewIcon}>⊞</span>
                        Grid View
                      </button>

                      <button
                        className={`${styles.viewToggle} ${
                          showMapView ? styles.active : ""
                        }`}
                        onClick={() => setShowMapView(true)}
                      >
                        <span className={styles.viewIcon}>🗺</span>
                        Map View
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleRefreshSalons}
                  className={styles.refreshButton}
                  disabled={isLoadingSalons}
                  aria-label="Refresh salon list"
                >
                  <span aria-hidden="true">🔄</span> Refresh
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
              ) : salonLoadError ? (
                <div className={styles.errorSection}>
                  <h3>Service temporarily unavailable</h3>
                  <p className={styles.errorMessage}>{salonLoadError}</p>
                  <button
                    className={styles.retryButton}
                    onClick={handleRefreshSalons}
                  >
                    🔄 Retry
                  </button>
                </div>
              ) : salons.length === 0 ? (
                <div className={styles.errorSection}>
                  <h3>No Salons Found</h3>
                  <button
                    className={styles.retryButton}
                    onClick={handleRefreshSalons}
                  >
                    🔄 Retry Location & Reload Salons
                  </button>
                </div>
              ) : showMapView ? (
                <div className={styles.mapViewWrapper}>
                  {typeof window !== "undefined" && (
                    <SalonMap
                      salons={salons}
                      userLocation={memoizedUserLocation}
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
                  )}
                </div>
              ) : (
                <div className={styles.salonsGrid}>
                  {salonsToRender
                    .slice(0, visibleSalons)
                    .map((salon, index) => {
                      // ✅ LOGS GO HERE BEFORE THE RETURN
                      if (index === 1) {
                        console.log("🎨 RENDER DATA:", {
                          salonName: salon.salonName,
                          distance: salon.distance,
                          "stats.rating": salon.stats?.rating,
                          "stats.totalRatings": salon.stats?.totalRatings,
                          "ratings.overall": salon.ratings?.overall,
                          "ratings.totalReviews": salon.ratings?.totalReviews,
                          operatingHours: salon.operatingHours,
                        });

                        console.log("💎 COMPUTED:", {
                          rating:
                            salon.stats?.rating || salon.ratings?.overall || 0,
                          reviews:
                            salon.stats?.totalRatings ||
                            salon.ratings?.totalReviews ||
                            0,
                          distance: salon.distance,
                          status: getSalonStatus(salon),
                        });
                      }

                      return (
                        <div
                          key={String(salon._id)}
                          className={styles.salonCard}
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
                              src={`${salon.profilePicture || PLACEHOLDER_IMAGE}?tr=w-400,h-250,q-75,f-webp,fo-auto`}
                              alt={salon.salonName || "Salon"}
                              width="400"
                              height="250"
                              style={{
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                              loading={index < 3 ? "eager" : "lazy"}
                              decoding="async"
                              fetchpriority={index < 3 ? "high" : "auto"}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = PLACEHOLDER_IMAGE;
                              }}
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
                                    {salon.distance}Km away
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Salon Info */}
                          <div className={styles.salonInfo}>
                            <div className={styles.salonHeader}>
                              <h4 className={styles.salonName}>
                                {salon.salonName}
                              </h4>
                              <div className={styles.salonRating}>
                                <span className={styles.ratingStars}>⭐</span>
                                <span className={styles.ratingNumber}>
                                  {salon.ratings?.overall ||
                                    salon.stats?.rating ||
                                    0}
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
                                      ? `${Math.round(salon.distance * 1000)}m away`
                                      : `${salon.distance.toFixed(1)}km away`
                                    : "Calculating..."}{" "}
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
                                  {(salon.ratings?.totalReviews ||
                                    salon.stats?.totalRatings ||
                                    0) > 0
                                    ? `${salon.ratings?.totalReviews || salon.stats?.totalRatings} reviews`
                                    : "New"}
                                </span>
                              </div>{" "}
                            </div>

                            <div className={styles.salonServices}>
                              {salon.topServices.map((service, idx) => (
                                <span key={idx} className={styles.serviceTag}>
                                  {service.name}
                                </span>
                              ))}
                            </div>

                            {isPrebook && (
                              <div className={styles.salonServices}>
                                {salon.topServices.map((service, idx) => (
                                  <span key={idx} className={styles.serviceTag}>
                                    {service.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            <button
                              className={
                                !isPrebook
                                  ? styles.walkInButton
                                  : styles.bookButton
                              }
                              onClick={() =>
                                handleSalonCardClick(
                                  salon._id,
                                  isPrebook ? "prebook" : "walkin",
                                )
                              }
                            >
                              {!isPrebook
                                ? "View Live Availability"
                                : "Book Now"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
              {/* ✅ INVISIBLE TRIGGER ELEMENT FOR INFINITE SCROLL */}
              {visibleSalons <
                (filteredSalons.length > 0 ? filteredSalons : salons)
                  .length && (
                <div
                  ref={loadMoreRef}
                  style={{
                    height: "100px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "20px 0",
                  }}
                >
                  {isLoadingMore && (
                    <div className={styles.loadingMore}>
                      <div className={styles.spinner}></div>
                      <p>Loading more salons...</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Testimonials Section */}
            <TestimonialsSection />
            {/* Enhanced Footer */}
            <FooterSection />
          </main>
        </div>
      )}
    </>
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

// ✅ Remove static props - salons are loaded client-side based on user location
export async function getStaticProps() {
  return {
    props: {
      initialSalons: [], // Always empty - salons loaded client-side
    },
  };
}
