// pages/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";
import Image from "next/image";
import { UserDataManager } from "../lib/userData";
import OnboardingLogoutButton from "../components/OnBoardingLogout";

export default function Home() {
  const router = useRouter();
  const [userOnboarding, setUserOnboarding] = useState(null);
  const [nearbySalons, setNearbySalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [filteredSalons, setFilteredSalons] = useState([]);

  // Dynamic import for map component
  const SalonMap = dynamic(() => import("../components/Maps/SalonMap"), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  });

  useEffect(() => {
    const initializeUser = async () => {
      if (typeof window === "undefined") return;

      // Check if user has completed onboarding
      if (!UserDataManager.hasOnboarded()) {
        router.push("/onboarding");
        return;
      }

      const userToken = localStorage.getItem("userToken");

      if (userToken) {
        // User is logged in - get API data and use hardcoded location for now
        try {
          const response = await fetch("/api/user/profile", {
            headers: { Authorization: `Bearer ${userToken}` },
          });

          if (response.ok) {
            const apiUserData = await response.json();

            // Use API data with hardcoded location (temporary fix)
            const userData = {
              ...apiUserData,
              location: {
                latitude: 19.248192,
                longitude: 73.157593,
                address:
                  "Shahad, Ambivali, Kalyan-Dombivli, Kalyan Taluka, Thane, Maharashtra, 410209, India",
              },
            };

            setUserOnboarding(userData);

            // Load salons with the location
            loadNearbySalons(
              userData.location.latitude,
              userData.location.longitude,
              userData.gender
            );
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        // User not logged in - check onboarding data
        const onboardingData = localStorage.getItem("userOnboardingData");
        if (onboardingData) {
          try {
            const userData = JSON.parse(onboardingData);
            setUserOnboarding(userData);

            if (userData.location?.latitude && userData.location?.longitude) {
              loadNearbySalons(
                userData.location.latitude,
                userData.location.longitude,
                userData.gender
              );
            }
          } catch (error) {
            console.error("Error parsing onboarding data:", error);
          }
        }
      }

      // Check theme preference
      // const darkMode = localStorage.getItem("darkMode") === "true";
      // setIsDarkMode(darkMode);
      // if (darkMode) {
      //   document.documentElement.setAttribute("data-theme", "dark");
      // }

      setIsLoading(false);
    };

    initializeUser();
  }, [router]);
  useEffect(() => {
    if (!nearbySalons.length) {
      setFilteredSalons([]);
      return;
    }

    let filtered = nearbySalons;

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
  }, [nearbySalons, searchTerm, selectedService]);

  const loadNearbySalons = async (latitude, longitude, gender) => {
    setIsLoadingSalons(true);
    try {
      console.log("Loading salons for coordinates:", latitude, longitude);

      const response = await fetch(
        `/api/salons/nearby?latitude=${latitude}&longitude=${longitude}&radius=100&gender=${gender}`
      );

      const data = await response.json();
      console.log("Salon API response:", data);

      if (response.ok) {
        setNearbySalons(data.salons || []);
        console.log("Set nearby salons:", data.salons?.length || 0);
      } else {
        console.error("Error loading salons:", data.message);
        setNearbySalons([]);
      }
    } catch (error) {
      console.error("Error loading salons:", error);
      setNearbySalons([]);
    } finally {
      setIsLoadingSalons(false);
    }
  };

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

  const navigateToAuth = (type, role) => {
    router.push(`/auth/${role}/${type}`);
  };

  const handleSalonCardClick = (salonId) => {
    router.push({ pathname: "/salons/[id]", query: { id: salonId } });
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

  return (
    <div className={styles.container}>
      {/* Enhanced Header */}
      {/* Hero Section */}
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

              <motion.div
                className={styles.heroStats}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                <div className={styles.heroStat}>
                  <div className={styles.statIcon}>🏪</div>
                  <div className={styles.statContent}>
                    <span className={styles.statNumber}>
                      {nearbySalons.length}
                    </span>
                    <span className={styles.statLabel}>Premium Salons</span>
                  </div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.statIcon}>💆</div>
                  <div className={styles.statContent}>
                    <span className={styles.statNumber}>
                      {nearbySalons.reduce(
                        (total, salon) =>
                          total + (salon.topServices?.length || 0),
                        0
                      )}
                    </span>
                    <span className={styles.statLabel}>Expert Services</span>
                  </div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.statIcon}>⭐</div>
                  <div className={styles.statContent}>
                    <span className={styles.statNumber}>
                      {nearbySalons.reduce(
                        (total, salon) =>
                          total + (salon.stats?.totalBookings || 0),
                        0
                      )}
                    </span>
                    <span className={styles.statLabel}>Happy Clients</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
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
              </motion.div>
            </motion.div>
          </div>

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
                      <span className={styles.cardTitle}>Facial Treatment</span>
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
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search for services, salons, or treatments..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <motion.button
                className={styles.searchButton}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                Search
              </motion.button>
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
          <div className={styles.viewOptions}>
            <motion.button
              className={`${styles.viewToggle} ${
                !showMapView ? styles.active : ""
              }`}
              onClick={() => setShowMapView(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={styles.viewIcon}>🏗</span>
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

        {isLoadingSalons ? (
          <div className={styles.loadingSalons}>
            <div className={styles.luxurySpinner}>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerCore}></div>
            </div>
            <p>Discovering premium salons near you...</p>
          </div>
        ) : nearbySalons.length > 0 ? (
          showMapView ? (
            <div className={styles.mapContainer}>
              <SalonMap
                salons={nearbySalons}
                userLocation={{
                  lat: userOnboarding?.location?.latitude,
                  lng: userOnboarding?.location?.longitude,
                }}
                selectedSalon={selectedSalon}
                onSalonSelect={setSelectedSalon}
                onBookNow={handleSalonCardClick}
                userGender={userOnboarding?.gender}
              />
            </div>
          ) : (
            <div className={styles.salonsGrid}>
              {(filteredSalons.length > 0 ? filteredSalons : nearbySalons).map(
                (salon, index) => {
                  return (
                    <motion.div
                      key={salon._id?.$oid || salon._id?.toString() || index}
                      className={styles.salonCard}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.1 * index }}
                      whileHover={{
                        y: -12,
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 300 },
                      }}
                      onClick={() =>
                        handleSalonCardClick(salon._id?.$oid || salon._id)
                      }
                    >
                      <div className={styles.salonImageContainer}>
                        <img
                          src={
                            typeof salon.salonImages?.[0] === "string"
                              ? salon.salonImages[0]
                              : salon.salonImages?.[0]?.url ||
                                "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop"
                          }
                          alt={salon.salonName || "Salon image"}
                          className={styles.salonImage}
                        />
                        <div className={styles.salonImageOverlay}></div>

                        <div className={styles.salonBadges}>
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
                        </div>
                      </div>

                      <div className={styles.salonInfo}>
                        <div className={styles.salonHeader}>
                          <h4 className={styles.salonName}>
                            {highlightText(salon.salonName, searchTerm)}
                          </h4>{" "}
                          <div className={styles.salonRating}>
                            <span className={styles.ratingStars}>
                              ⭐⭐⭐⭐⭐
                            </span>
                            <span className={styles.ratingNumber}>
                              {(
                                salon.ratings?.overall ??
                                salon.rating ??
                                4.5
                              ).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <p className={styles.salonLocation}>
                          📍 {highlightText(salon.location.address, searchTerm)}
                        </p>

                        <div className={styles.salonMetrics}>
                          <div className={styles.metric}>
                            <span className={styles.metricIcon}>👥</span>
                            <span className={styles.metricValue}>
                              {salon.stats?.totalBookings || 0} bookings
                            </span>
                          </div>
                          <div className={styles.metric}>
                            <span className={styles.metricIcon}>⏰</span>
                            <span className={styles.metricValue}>Open Now</span>
                          </div>
                        </div>

                        <div className={styles.salonServices}>
                          {salon.topServices
                            ?.slice(0, 3)
                            .map((service, idx) => {
                              const isHighlighted =
                                selectedService &&
                                service.name
                                  .toLowerCase()
                                  .includes(selectedService.toLowerCase());
                              return (
                                <span
                                  key={idx}
                                  className={`${styles.serviceTag} ${
                                    isHighlighted
                                      ? styles.highlightedService
                                      : ""
                                  }`}
                                >
                                  {highlightText(
                                    String(service?.name),
                                    searchTerm
                                  )}{" "}
                                  <strong>₹{String(service?.price)}</strong>
                                </span>
                              );
                            })}
                        </div>

                        <motion.button
                          className={styles.salonBookButton}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSalonCardClick(salon._id);
                          }}
                        >
                          <span className={styles.bookButtonIcon}>📅</span>
                          Book Appointment
                          <span className={styles.bookButtonArrow}>→</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          )
        ) : searchTerm || selectedService ? (
          <div className={styles.noSalons}>
            <div className={styles.noSalonsIcon}>🔍</div>
            <h4 className={styles.noSalonsTitle}>No Results Found</h4>
            <p className={styles.noSalonsText}>
              No salons found matching &quot;{searchTerm || selectedService}
              &quot;. Try adjusting your search.
            </p>
            <motion.button
              className={styles.registerSalonButton}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSearchTerm("");
                setSelectedService("");
              }}
            >
              <span className={styles.registerIcon}>🔄</span>
              Clear Filters
            </motion.button>
          </div>
        ) : (
          <div className={styles.noSalons}>
            <div className={styles.noSalonsIcon}>🏪</div>
            <h4 className={styles.noSalonsTitle}>No Premium Salons Found</h4>
            <p className={styles.noSalonsText}>
              We couldn&#39;t find any salons in your area. Help us grow by
              registering your salon!
            </p>
            <motion.button
              className={styles.registerSalonButton}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigateToAuth("register", "salon")}
            >
              <span className={styles.registerIcon}>✨</span>
              Register Your Salon
            </motion.button>
          </div>
        )}
      </motion.section>
      ;{/* Testimonials Section */}
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
                  <h5 className={styles.testimonialName}>{testimonial.name}</h5>
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
