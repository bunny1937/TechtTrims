// pages/index.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [userOnboarding, setUserOnboarding] = useState(null);
  const [nearbySalons, setNearbySalons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSalons, setIsLoadingSalons] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);

  // Dynamic import for map component
  const SalonMap = dynamic(() => import("../components/Maps/SalonMap"), {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  });

  useEffect(() => {
    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem("hasOnboarded");
    const onboardingData = localStorage.getItem("userOnboardingData");

    if (!hasOnboarded) {
      router.push("/onboarding");
      return;
    }

    if (onboardingData) {
      const userData = JSON.parse(onboardingData);
      setUserOnboarding(userData);

      // Load nearby salons based on user location
      if (
        userData.location &&
        userData.location.latitude &&
        userData.location.longitude
      ) {
        loadNearbySalons(
          userData.location.latitude,
          userData.location.longitude,
          userData.gender
        );
      }
    }

    // Check theme preference
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    setIsLoading(false);
  }, [router]);

  const loadNearbySalons = async (latitude, longitude, gender) => {
    setIsLoadingSalons(true);

    try {
      const response = await fetch(
        `/api/salons/nearby?latitude=${latitude}&longitude=${longitude}&radius=10&gender=${gender}`
      );
      const data = await response.json();

      if (response.ok) {
        setNearbySalons(data.salons);
      } else {
        console.error("Error loading salons:", data.message);
      }
    } catch (error) {
      console.error("Error loading salons:", error);
    } finally {
      setIsLoadingSalons(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());

    if (newMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const navigateToAuth = (type, role) => {
    router.push(`/auth/${role}/${type}`);
  };

  const handleSalonCardClick = (salonId) => {
    router.push(`/salons/${salonId}`);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading your personalized experience...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <motion.h1
            className={styles.logo}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className={styles.goldText}>Luxe</span>Salon
          </motion.h1>

          <div className={styles.headerActions}>
            <button
              className={styles.themeToggle}
              onClick={toggleDarkMode}
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>

            <button
              className={styles.ownerButton}
              onClick={() => navigateToAuth("register", "salon")}
            >
              Register as Owner
            </button>

            <button
              className={styles.loginButton}
              onClick={() => navigateToAuth("login", "user")}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <motion.section
        className={styles.welcomeSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.welcomeContent}>
          <h2 className={styles.welcomeTitle}>
            Welcome back,{" "}
            <span className={styles.goldText}>{userOnboarding?.name}</span>! 👋
          </h2>
          <p className={styles.welcomeSubtitle}>
            Discover luxury salon experiences near{" "}
            {userOnboarding?.location?.address || "you"}
          </p>
        </div>

        <div className={styles.quickStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{nearbySalons.length}</span>
            <span className={styles.statLabel}>Nearby Salons</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {nearbySalons.reduce(
                (total, salon) => total + (salon.topServices?.length || 0),
                0
              )}
            </span>
            <span className={styles.statLabel}>Available Services</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {nearbySalons.reduce(
                (total, salon) => total + (salon.stats?.totalBookings || 0),
                0
              )}
            </span>
            <span className={styles.statLabel}>Happy Bookings</span>
          </div>
        </div>
      </motion.section>

      {/* Search Section */}
      <motion.section
        className={styles.searchSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search for services or salons..."
              className={styles.searchInput}
            />
            <button className={styles.searchButton}>🔍</button>
          </div>

          <div className={styles.quickFilters}>
            <button className={styles.filterChip}>💇 Haircut</button>
            <button className={styles.filterChip}>🧔 Beard Trim</button>
            <button className={styles.filterChip}>💅 Manicure</button>
            <button className={styles.filterChip}>✨ Facial</button>
          </div>
        </div>
      </motion.section>

      {/* Popular Services for Gender */}
      <motion.section
        className={styles.servicesSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <h3 className={styles.sectionTitle}>
          Popular Services for {userOnboarding?.gender}s
        </h3>

        <div className={styles.servicesGrid}>
          {getGenderBasedServices(userOnboarding?.gender).map(
            (service, index) => (
              <motion.div
                key={service.name}
                className={styles.serviceCard}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <div className={styles.serviceIcon}>{service.icon}</div>
                <h4 className={styles.serviceName}>{service.name}</h4>
                <p className={styles.servicePrice}>₹{service.price}</p>
                <p className={styles.serviceDuration}>{service.duration} min</p>
              </motion.div>
            )
          )}
        </div>
      </motion.section>

      {/* Nearby Salons - Dynamic */}
      <motion.section
        className={styles.salonsSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Nearby Luxury Salons</h3>
          <div className={styles.viewOptions}>
            <button
              className={`${styles.viewToggle} ${
                !showMapView ? styles.active : ""
              }`}
              onClick={() => setShowMapView(false)}
            >
              Grid View
            </button>
            <button
              className={`${styles.viewToggle} ${
                showMapView ? styles.active : ""
              }`}
              onClick={() => setShowMapView(true)}
            >
              Map View
            </button>
          </div>
        </div>

        {isLoadingSalons ? (
          <div className={styles.loadingSalons}>
            <div className={styles.spinner}></div>
            <p>Finding salons near you...</p>
          </div>
        ) : nearbySalons.length > 0 ? (
          showMapView ? (
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
          ) : (
            <div className={styles.salonsCarousel}>
              {nearbySalons.map((salon, index) => {
                return (
                  <motion.div
                    key={salon._id?.$oid || salon._id?.toString() || index}
                    className={styles.salonCard}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ y: -8 }}
                    onClick={() =>
                      handleSalonCardClick(salon._id?.$oid || salon._id)
                    }
                  >
                    <div className={styles.salonImage}>
                      <img
                        src={
                          typeof salon.salonImages?.[0] === "string"
                            ? salon.salonImages[0]
                            : salon.salonImages?.[0]?.url ||
                              "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop"
                        }
                        alt={salon.salonName || "Salon image"}
                        width={300}
                        height={200}
                        style={{ objectFit: "cover" }}
                      />

                      <div className={styles.salonBadge}>
                        {salon.distance < 2
                          ? "Very Close"
                          : salon.isVerified
                          ? "Verified"
                          : "Popular"}
                      </div>
                      <div className={styles.distanceBadge}>
                        {salon.distance}km away
                      </div>
                    </div>
                    <div className={styles.salonInfo}>
                      <h4 className={styles.salonName}>{salon.salonName}</h4>
                      <p className={styles.salonLocation}>
                        {salon.location.address}
                      </p>

                      <div className={styles.salonStats}>
                        <div className={styles.rating}>
                          ⭐{" "}
                          {(
                            salon.ratings?.overall ??
                            salon.rating ??
                            0
                          ).toFixed(1)}
                        </div>
                        <div className={styles.bookings}>
                          {salon.stats.totalBookings} bookings
                        </div>
                      </div>

                      <div className={styles.salonServices}>
                        {salon.topServices?.map((service, idx) => (
                          <span key={idx} className={styles.serviceTag}>
                            {String(service?.name)} ₹{String(service?.price)}
                          </span>
                        ))}
                      </div>

                      <button
                        className={styles.bookButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSalonCardClick(salon._id);
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          <div className={styles.noSalons}>
            <p>
              No salons found near your location. Try expanding the search
              radius or register a salon in your area!
            </p>
            <button
              className={styles.registerSalonButton}
              onClick={() => navigateToAuth("register", "salon")}
            >
              Register Your Salon
            </button>
          </div>
        )}
      </motion.section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>LuxeSalon</h4>
            <p>Premium salon booking experience</p>
          </div>

          <div className={styles.footerSection}>
            <h5>Quick Links</h5>
            <ul>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#services">Services</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>

          <div className={styles.footerSection}>
            <h5>For Business</h5>
            <ul>
              <li>
                <a href="#register-salon">Register Your Salon</a>
              </li>
              <li>
                <a href="#partner">Partner with Us</a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>&copy; 2025 LuxeSalon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function getGenderBasedServices(gender) {
  const maleServices = [
    { name: "Haircut", price: 200, duration: 30, icon: "✂️" },
    { name: "Beard Trim", price: 150, duration: 20, icon: "🧔" },
    { name: "Hair Styling", price: 250, duration: 25, icon: "💇‍♂️" },
    { name: "Face Cleanup", price: 300, duration: 45, icon: "🧴" },
  ];

  const femaleServices = [
    { name: "Haircut & Style", price: 400, duration: 60, icon: "💇‍♀️" },
    { name: "Hair Coloring", price: 800, duration: 120, icon: "🎨" },
    { name: "Facial Treatment", price: 600, duration: 75, icon: "✨" },
    { name: "Manicure", price: 350, duration: 45, icon: "💅" },
  ];

  const otherServices = [
    { name: "Hair Treatment", price: 500, duration: 60, icon: "🌿" },
    { name: "Scalp Massage", price: 300, duration: 30, icon: "💆" },
    { name: "Hair Wash", price: 150, duration: 20, icon: "🚿" },
    { name: "Styling", price: 350, duration: 40, icon: "💫" },
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
