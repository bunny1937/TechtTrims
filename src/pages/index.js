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

import { useIntroAnimation } from "../hooks/useIntroAnimation";
import { useDarkMode } from "../hooks/useDarkMode";
import { useSearchFilters } from "../hooks/useSearchFilters";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { useUserProfile } from "../hooks/useUserProfile";
import { useSalonData } from "../hooks/useSalonData";
import { useLocationManager } from "../hooks/useLocationManager";
import { useSalonStatus } from "../hooks/useSalonStatus"; // ✅ NEW
import { useManualMode } from "../hooks/useManualMode"; // ✅ NEW
import { useSalonNavigation } from "../hooks/useSalonNavigation";
import SalonCard from "../components/Home/SalonCard";
import LocationCheckOverlay from "@/components/Home/LocationCheckOverlay";
import HeroSection from "@/components/Home/HeroSection";

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
  const hasCalculatedDistanceRef = useRef(false);
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
  const [selectedGender, setSelectedGender] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [isPrebook, setIsPrebook] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState(null);
  const PLACEHOLDER_IMAGE = process.env.NEXT_PUBLIC_PLACEHOLDER_SALON_IMAGE;
  const { showIntro, handleAnimationEnd } = useIntroAnimation();
  const {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    selectedService,
    setSelectedService,
    searchRadius,
    setSearchRadius,
    radiusMarks,
  } = useSearchFilters();

  const { profileUser, userOnboarding, isUserDataReady, initializedRef } =
    useUserProfile();
  // ✅ HYDRATE selectedGender FROM userProfile (FIRST LOAD SAFE)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!profileUser?.gender) return;

    const normalized =
      profileUser.gender.toLowerCase() === "male" ? "Male" : "Female";

    sessionStorage.setItem("selectedGender", normalized);
    setSelectedGender(normalized);
  }, [profileUser?.gender]);

  const { getSalonStatus, formatTime, isOpen } = useSalonStatus();
  const { isManualMode: isManual } = useManualMode();
  const { navigateToSalon, isNavigating: navIsNavigating } =
    useSalonNavigation();

  const {
    salons,
    setSalons,
    nearbySalons,
    setNearbySalons,
    isLoadingSalons,
    salonLoadError,
    setSalonLoadError,
    selectedSalon,
    setSelectedSalon,
    debugInfo,
    loadNearbySalons,
    handleLocationChange,
    handleRefreshSalons: hookRefreshSalons,
    salonsLoadedRef,
    genderFetchInProgressRef: hookGenderFetchRef,
  } = useSalonData(memoizedUserLocation, searchRadius, userOnboarding);

  const {
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
    handleRefreshLocation: hookRefreshLocation,
    handleRetry,
  } = useLocationManager();

  // ========================================
  // NOW filteredSalons can use salons (declared above)
  // ========================================
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

  // ✅ NOW useInfiniteScroll can use filteredSalons
  const {
    displayedItems: displayedSalons,
    isLoadingMore,
    loadMoreRef,
  } = useInfiniteScroll(filteredSalons, 6, 6);
  const handleRefreshSalons = hookRefreshSalons;

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
        if (!selectedGender) {
          return; // 🚫 STOP – gender not ready
        }

        const gender = selectedGender;

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
  }, [memoizedUserLocation, selectedGender]);

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

  // ✅ AUTO-CALCULATE DISTANCE WHEN SALONS ARE FIRST LOADED
  useEffect(() => {
    if (
      !salons.length ||
      !memoizedUserLocation ||
      hasCalculatedDistanceRef.current
    ) {
      return;
    }

    if (!memoizedUserLocation.latitude || !memoizedUserLocation.longitude) {
      return;
    }

    hasCalculatedDistanceRef.current = true; // 🔒 LOCK

    handleLocationChange({
      latitude: memoizedUserLocation.latitude,
      longitude: memoizedUserLocation.longitude,
    });
  }, [salons.length]);

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

  // 🔁 RESET DISTANCE CALC WHEN LOCATION CHANGES
  useEffect(() => {
    if (memoizedUserLocation?.latitude && memoizedUserLocation?.longitude) {
      hasCalculatedDistanceRef.current = false;
    }
  }, [memoizedUserLocation?.latitude, memoizedUserLocation?.longitude]);

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

  const handleRefreshLocation = async () => {
    if (locationStatus === "denied" && !isManual()) {
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
  // Location Check Screen - Shows FIRST
  if (activeOverlay === "location") {
    return (
      <LocationCheckOverlay
        locationCheckStatus={locationCheckStatus}
        handleGetLocation={handleGetLocation}
        setActiveOverlay={setActiveOverlay}
        handleRetry={handleRetry}
        loadNearbySalons={loadNearbySalons}
        setIsLoading={setIsLoading}
        userGender={userOnboarding?.gender}
      />
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

  if (navIsNavigating) {
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

  // ✅ Use displayedSalons from useInfiniteScroll hook
  const salonsToRender =
    Array.isArray(displayedSalons) && displayedSalons.length > 0
      ? displayedSalons
      : Array.isArray(salons) && salons.length > 0
        ? salons.slice(0, 6) // ✅ Show first 6 if displayedSalons is empty
        : [];

  return (
    <>
      {showIntro ? (
        <IntroOverlay onAnimationEnd={handleAnimationEnd} />
      ) : (
        <div className={styles.container}>
          {/* Hero Section */}
          <main id="main-content">
            <HeroSection
              profileUser={profileUser}
              userOnboarding={userOnboarding}
              salons={salons}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedService={selectedService}
              setSelectedService={setSelectedService}
            />

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

            {locationError && locationStatus === "denied" && !isManual() && (
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
                      onBookNow={navigateToSalon}
                      userGender={userOnboarding?.gender}
                    />
                  )}
                </div>
              ) : (
                <div className={styles.salonsGrid}>
                  {salonsToRender.map((salon, index) => (
                    <SalonCard
                      key={String(salon._id)}
                      salon={salon}
                      index={index}
                      isPrebook={isPrebook}
                      onNavigate={navigateToSalon}
                      getSalonStatus={getSalonStatus}
                      placeholderImage={PLACEHOLDER_IMAGE}
                    />
                  ))}
                </div>
              )}
              {/* ✅ INVISIBLE TRIGGER ELEMENT FOR INFINITE SCROLL */}

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

// ✅ Remove static props - salons are loaded client-side based on user location
export async function getStaticProps() {
  return {
    props: {
      initialSalons: [], // Always empty - salons loaded client-side
    },
  };
}
