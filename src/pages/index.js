// pages/index.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";
import { useLocation } from "../hooks/useLocation";
import { UserDataManager } from "../lib/userData";
import { getAuthToken, getUserData } from "../lib/cookieAuth";

export default function Home() {
  const router = useRouter();
  const [salons, setSalons] = useState([]);
  const [userOnboarding, setUserOnboarding] = useState(null);
  const [nearbySalons, setNearbySalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // ADD: Track if salons were loaded
  const salonsLoadedRef = useRef(false);
  const initialLocationRef = useRef(null);
  const PLACEHOLDER_IMAGE = process.env.NEXT_PUBLIC_PLACEHOLDER_SALON_IMAGE;

  // Dynamic import for map component
  const SalonMap = dynamic(() => import("../components/Maps/SalonMap"), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  });

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
        console.log(
          "✅ Applied manual distances immediately after salons load"
        );
      } catch (e) {
        console.error("❌ Error applying distances:", e);
      }
    }
  }, [salons.length]);

  useEffect(() => {
    const initializeUser = async () => {
      if (typeof window === "undefined") return;

      // Check if user has completed onboarding
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");

      // If not onboarded, redirect to onboarding
      if (!hasOnboarded) {
        router.push("/onboarding");
        return;
      }

      // USE COOKIE INSTEAD OF LOCALSTORAGE for auth
      const userToken = getAuthToken();

      if (userToken) {
        try {
          // Fetch fresh user data from API
          const userData = await UserDataManager.fetchAndStoreUserData();
          if (userData) {
            setUserOnboarding(userData);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        // Check session onboarding data for guest users
        const onboardingData = sessionStorage.getItem("userOnboardingData");
        if (onboardingData) {
          try {
            const userData = JSON.parse(onboardingData);
            setUserOnboarding(userData);
          } catch (error) {
            console.error("Error parsing onboarding data:", error);
          }
        }
      }

      // Get location from session storage (persistent location)
      const storedLocation = sessionStorage.getItem("userLocation");
      if (storedLocation) {
        try {
          const locationData = JSON.parse(storedLocation);
          // Use stored location to load salons
          if (!salonsLoadedRef.current) {
            await loadNearbySalons(
              locationData.lat, // Uses 'lat' not 'latitude'
              locationData.lng, // Uses 'lng' not 'longitude'
              userOnboarding?.gender || "all"
            );

            salonsLoadedRef.current = true;
          }
        } catch (error) {
          console.error("Error parsing stored location:", error);
        }
      } else if (liveUserLocation && !salonsLoadedRef.current) {
        // PRIORITY: Use live location if available
        await loadNearbySalons(
          liveUserLocation.latitude,
          liveUserLocation.longitude,
          userOnboarding?.gender || "all"
        );
        salonsLoadedRef.current = true;
      } else if (!liveUserLocation && !salonsLoadedRef.current) {
        // FALLBACK: Use cached location from localStorage if live location not available
        const cachedLocation = localStorage.getItem("cachedUserLocation");
        if (cachedLocation) {
          try {
            const locationData = JSON.parse(cachedLocation);
            await loadNearbySalons(
              locationData.latitude,
              locationData.longitude,
              userOnboarding?.gender || "all"
            );
            salonsLoadedRef.current = true;
          } catch (error) {
            console.error("Error using cached location:", error);
          }
        }
      }

      setIsLoading(false);
    };

    // ONLY run when location is first available
    if (liveUserLocation && !salonsLoadedRef.current) {
      initializeUser();
    }
  }, [liveUserLocation, router]); // Dependency on location only for initial load
  // Update location in session storage whenever it changes
  useEffect(() => {
    if (liveUserLocation) {
      sessionStorage.setItem(
        "userLocation",
        JSON.stringify({
          lat: liveUserLocation.latitude,
          lng: liveUserLocation.longitude,
          timestamp: Date.now(),
        })
      );
    }
  }, [liveUserLocation]);

  // useEffect(() => {
  //   const stored = sessionStorage.getItem("manualLocation");
  //   const isManual = sessionStorage.getItem("isManualMode") === "true";

  //   if (stored && isManual) {
  //     try {
  //       const parsed = JSON.parse(stored);
  //       if (!parsed.latitude && parsed.lat) {
  //         parsed.latitude = parsed.lat;
  //         parsed.longitude = parsed.lng;
  //       }
  //       console.log("📍 Manual location loaded from storage in parent");
  //       // ✅ Just log it - SalonMap will handle the recalc
  //     } catch (e) {
  //       console.error("Error:", e);
  //     }
  //   }
  // }, []);

  const loadNearbySalons = async (lat, lng, gender = "all") => {
    // ✅ ONLY skip if manual mode AND salons already exist
    const isManual = sessionStorage.getItem("isManualMode") === "true";
    if (isManual && salons.length > 0) {
      console.log(
        "⏭️ Skipping salon reload - manual mode with existing salons"
      );
      return;
    }

    try {
      console.log("🔍 Loading salons for coordinates:", lat, lng);

      const url = `/api/salons/nearby?latitude=${lat}&longitude=${lng}&radius=100&gender=${gender}`;
      console.log("📡 Fetching from:", url);

      const response = await fetch(url);

      console.log("📦 Response status:", response.status);
      console.log("📦 Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      console.log("📦 Raw API response:", data);
      console.log("📦 Data type:", typeof data);
      console.log("📦 Is array:", Array.isArray(data));
      console.log("📦 Data length:", data?.length);

      const salonsArray = Array.isArray(data.salons) ? data.salons : [];

      console.log("✅ Loaded salons:", salonsArray.length);
      console.log("🏢 First salon:", salonsArray[0]);

      setSalons(salonsArray);
      setNearbySalons(salonsArray);
      setFilteredSalons(salonsArray);

      console.log("✅ State updated - salons count:", salonsArray.length);
    } catch (error) {
      console.error("❌ Error loading salons:", error.message);
      console.error("❌ Full error:", error);
      setSalons([]);
      setFilteredSalons([]);
    }
  };

  // ========================================
  // CHANGE 1: Replace handleLocationChange
  // ========================================
  const handleLocationChange = (newLocation) => {
    console.log("🔄 handleLocationChange triggered:", newLocation);

    const isManual = sessionStorage.getItem("isManualMode") === "true";
    const hasManualDistances = sessionStorage.getItem(
      "manualLocationDistances"
    );

    // ✅ BLOCK LIVE GPS ONLY if manual mode WITH existing saved distances
    if (isManual && hasManualDistances) {
      console.log("📍 BLOCKED: Manual mode active with existing distances");
      return;
    }

    console.log("📍 CALCULATING distances for:", {
      isManual,
      hasManualDistances: !!hasManualDistances,
    });

    if (salons.length === 0) {
      console.log("⚠️ No salons loaded yet");
      return;
    }

    const updatedSalons = salons.map((salon) => {
      const salonLat = salon.location.coordinates[1];
      const salonLng = salon.location.coordinates[0];

      const userLat = newLocation.latitude || newLocation.lat;
      const userLng = newLocation.longitude || newLocation.lng;

      const R = 6371;
      const dLat = (salonLat - userLat) * (Math.PI / 180);
      const dLng = (salonLng - userLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * (Math.PI / 180)) *
          Math.cos(salonLat * (Math.PI / 180)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        ...salon,
        distance: parseFloat(distance.toFixed(2)),
      };
    });

    setSalons([...updatedSalons]);
    setMapKey((prev) => prev + 1);

    // 👇 ADD THIS 3 LINES
    const distances = updatedSalons.map((s) => s.distance);
    sessionStorage.setItem(
      "manualLocationDistances",
      JSON.stringify(distances)
    );

    console.log(
      "✅ Updated distances:",
      updatedSalons.map((s) => s.distance)
    );
  };

  // ========================================
  // CHANGE 2: ADD useEffect #1 - Load manual mode on mount
  // ========================================
  // useEffect(() => {
  //   const isManual = sessionStorage.getItem("isManualMode") === "true";
  //   const manualDistances = sessionStorage.getItem("manualLocationDistances");

  //   if (isManual && manualDistances && salons.length > 0) {
  //     try {
  //       const distances = JSON.parse(manualDistances);
  //       const updatedSalons = salons.map((salon, idx) => ({
  //         ...salon,
  //         distance:
  //           distances[idx] !== undefined ? distances[idx] : salon.distance,
  //       }));
  //       setSalons(updatedSalons);
  //       console.log("✅ Restored manual distances from storage:", distances);
  //     } catch (e) {
  //       console.error("❌ Error restoring distances:", e);
  //     }
  //   }
  // }, [salons.length]);

  // ========================================
  // CHANGE 3: ADD useEffect #2 - Listen for storage changes (cross-tab sync)
  // ========================================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "isManualMode") {
        console.log("🔄 Manual mode changed to:", e.newValue);
        const isNowManual = e.newValue === "true";
        if (!isNowManual) {
          // Switched to live mode from another tab
          sessionStorage.removeItem("manualLocationDistances");
        }
      } else if (e.key === "manualLocationDistances") {
        console.log("🔄 Distances updated from another tab");
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
    console.log("🔄 Reverting to live location");

    setIsManualMode(false);
    setManualLocation(null);

    // ✅ CLEAR all manual data from storage
    sessionStorage.removeItem("isManualMode");
    sessionStorage.removeItem("manualLocation");
    sessionStorage.removeItem("manualLocationDistances");
    sessionStorage.removeItem("_pendingDistances");

    // ✅ Force reload salons from live GPS
    if (liveUserLocation?.latitude && liveUserLocation?.longitude) {
      loadNearbySalons(
        liveUserLocation.latitude,
        liveUserLocation.longitude,
        selectedGender
      );
    }
  };

  const handleRefreshLocation = async () => {
    if (locationStatus === "denied") {
      // Request permission from useLocation hook
      const granted = await requestLocationPermission();

      // Wait a bit for location to update
      setTimeout(() => {
        if (liveUserLocation) {
          loadNearbySalons(
            liveUserLocation.latitude,
            liveUserLocation.longitude,
            userOnboarding?.gender
          );
        }
      }, 1000);
    } else if (liveUserLocation) {
      // Just reload with current location
      loadNearbySalons(
        liveUserLocation.latitude,
        liveUserLocation.longitude,
        userOnboarding?.gender
      );
    }
  };

  // ADD: Manual refresh function
  const handleRefreshSalons = () => {
    if (liveUserLocation && userOnboarding) {
      salonsLoadedRef.current = false; // Allow reload
      loadNearbySalons(
        liveUserLocation.latitude,
        liveUserLocation.longitude,
        userOnboarding?.gender
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
          service.name.toLowerCase().includes(selectedService.toLowerCase())
        )
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
            service.name.toLowerCase().includes(searchLower)
          )
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
            : `Closed`;
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
        <section className={styles.heroSection}>
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
                        {salons.reduce(
                          (total, salon) =>
                            total + (salon.topServices?.length || 0),
                          0
                        )}
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
                        {salons.reduce(
                          (total, salon) =>
                            total + (salon.stats?.totalBookings || 0),
                          0
                        )}
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
                  <button className={`${styles.heroCta} ${styles.primary}`}>
                    <span className={styles.ctaIcon}>🔍</span>
                    Find Salons Near Me
                  </button>
                  <button className={`${styles.heroCta} ${styles.secondary}`}>
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
                      src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop&crop=face"
                      alt="Luxury salon interior"
                      className={styles.heroImage}
                    />
                    <div className={styles.imageGradient}></div>
                  </div>

                  <div className={styles.floatingCards}>
                    <motion.div
                      className={`${styles.floatingCard} ${styles.card1}`}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <div className={styles.cardIcon}>💇‍♀️</div>
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
                      className={`${styles.floatingCard} ${styles.card3}`}
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
        {/* <motion.section
        className={styles.servicesSection}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleContainer}>
            <motion.h3
              className={styles.sectionTitle}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {userOnboarding
                ? `Perfect for ${userOnboarding.gender || "Everyone"}`
                : "Perfect Services for You"}
            </motion.h3>
            <motion.p
              className={styles.sectionSubtitle}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Curated services designed just for you
            </motion.p>
          </div>
        </div>

        <div className={styles.servicesGrid}>
          {getGenderBasedServices(userOnboarding?.gender || "Other").map(
            (service, index) => (
              <motion.div
                key={service.name}
                className={styles.serviceCard}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 300 },
                }}
              >
                <div className={styles.serviceCardBackground}></div>
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h4 className={styles.serviceName}>{service.name}</h4>
                <div className={styles.serviceDetails}>
                  <p className={styles.servicePrice}>₹{service.price}</p>
                  <p className={styles.serviceDuration}>
                    ⏱ {service.duration} min
                  </p>
                </div>
                <motion.button
                  className={styles.serviceBookButton}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Book Now
                </motion.button>
              </motion.div>
            )
          )}
        </div>
      </motion.section>
      ; */}
        {/* Salons Section with Booking Type Tabs */}
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

        {locationError && locationStatus === "denied" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.locationAlertError}
          >
            <div className={styles.locationAlertContent}>
              <span className={styles.locationIcon}>⚠️</span>
              <div>
                <p>
                  <strong>Location Access Needed</strong>
                </p>
                <p>{locationError}</p>
                <button
                  className={styles.retryButton}
                  onClick={() => window.location.reload()}
                >
                  Refresh to Allow Location
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
              <span className={styles.locationIcon}>⏱️</span>
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
                <p className={styles.bannerText}>
                  Please login or complete onboarding to view salons near you
                </p>
                <div className={styles.bannerActions}>
                  <button
                    onClick={() => router.push("/auth/user/login")}
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

              <button
                onClick={handleRefreshSalons}
                className={styles.refreshButton}
                disabled={isLoadingSalons}
              >
                🔄 Refresh Salons
              </button>
            </div>
          )}

          {/* Salons Display */}
          {isLoadingSalons ? (
            <div className={styles.loadingSalons}>
              <div className={styles.luxurySpinner}>
                <div className={styles.spinnerRing}></div>
                <div className={styles.spinnerCore}></div>
              </div>
              <p>Discovering premium salons near you...</p>
            </div>
          ) : salons.length === 0 ? ( // ✅ CHANGE nearbySalons to salons
            <div className={styles.noSalons}>
              <p>
                No salons found in your area. Try adjusting your search filters.
              </p>
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
              {(filteredSalons.length > 0 ? filteredSalons : salons).map(
                // ✅ CHANGE nearbySalons to salons
                (salon, index) => (
                  <motion.div
                    key={salon._id?.oid || salon._id?.toString() || index}
                    className={styles.salonCard}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ y: -12, scale: 1.02 }}
                    onClick={() => {
                      const salonId = salon._id?.oid || salon._id;
                      handleSalonCardClick(
                        salonId,
                        isPrebook ? "prebook" : "walkin"
                      );
                    }}
                  >
                    {/* Salon Image */}
                    <div className={styles.salonImageContainer}>
                      <img
                        src={salon.profilePicture || PLACEHOLDER_IMAGE}
                        alt={salon.salonName}
                        style={{ objectFit: "cover", borderRadius: "8px" }}
                        unoptimized // ðŸ‘ˆ Add this if using external CDN
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
                            📍{" "}
                            {salon.distance
                              ? salon.distance < 1
                                ? `${Math.round(salon.distance * 1000)}m away`
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
                )
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
                  "https://images.unsplash.com/photo-1494790108755-2616b612b742?w=80&h=80&fit=crop&crop=face",
              },
              {
                name: "Rajesh Kumar",
                service: "Beard Styling",
                rating: 5,
                text: "Best grooming experience I've had in Mumbai. Clean, professional, and great attention to detail.",
                image:
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
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
                    className={styles.testimonialAvatar}
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
                    <p>✉️ hello@techtrims.com</p>
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
    )
  );
}

function getGenderBasedServices(gender) {
  const maleServices = [
    { name: "Premium Haircut", price: 299, duration: 45, icon: "✂️" },
    { name: "Beard Styling", price: 199, duration: 30, icon: "🧔" },
    { name: "Hair Styling", price: 349, duration: 35, icon: "💇‍♂️" },
    { name: "Face Treatment", price: 449, duration: 60, icon: "🧴" },
  ];

  const femaleServices = [
    { name: "Hair Styling", price: 599, duration: 90, icon: "💇‍♀️" },
    { name: "Hair Coloring", price: 1299, duration: 150, icon: "🎨" },
    { name: "Facial Glow", price: 799, duration: 90, icon: "✨" },
    { name: "Luxury Manicure", price: 499, duration: 60, icon: "💅" },
  ];

  const otherServices = [
    { name: "Hair Treatment", price: 699, duration: 75, icon: "🌿" },
    { name: "Scalp Therapy", price: 449, duration: 45, icon: "💆" },
    { name: "Hair Wash & Dry", price: 199, duration: 30, icon: "🚿" },
    { name: "Style Consultation", price: 499, duration: 60, icon: "💫" },
  ];

  switch (gender) {
    case "Male":
      return maleServices;
    case "Female":
      return femaleServices;
    default:
      return otherServices;
  }
}
