// pages/_app.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import "leaflet/dist/leaflet.css";
import "../styles/globals.css";
import styles from "../styles/Home.module.css";
import { UserDataManager } from "../lib/userData";
import NetworkStatus from "../components/NetworkStatus";
import OnboardingLogoutButton from "../components/OnBoardingLogout";
import GradientBackground from "@/components/Background";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Don't show header on onboarding pages
  const hideHeader = router.pathname.startsWith("/onboarding");

  useEffect(() => {
    // Check theme preference
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

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

  return (
    <>
      <NetworkStatus />
      <GradientBackground />
      {!hideHeader && (
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <motion.div
              className={styles.logoContainer}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className={styles.logoIcon}>✨</div>
              <h1 className={styles.logo}>
                <span className={styles.goldText}>Tech</span>
                <span className={styles.trimText}>Trims</span>
              </h1>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className={styles.desktopNav}>
              <div className={styles.navLinks}>
                <OnboardingLogoutButton />
                <button className={styles.navLink}>Services</button>
                <button className={styles.navLink}>Salons</button>
                <button className={styles.navLink}>About</button>
              </div>

              <div className={styles.headerActions}>
                <motion.button
                  className={styles.themeToggle}
                  onClick={toggleDarkMode}
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.95 }}
                  title={
                    isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                >
                  <span className={styles.themeIcon}>
                    {isDarkMode ? "☀️" : "🌙"}
                  </span>
                </motion.button>

                {UserDataManager.isLoggedIn() && (
                  <motion.button
                    className={`${styles.actionButton} ${styles.bookingButton}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/user/dashboard")}
                  >
                    <span className={styles.buttonIcon}>📅</span>
                    Dashboard
                  </motion.button>
                )}

                <motion.button
                  className={`${styles.actionButton} ${styles.ownerButton}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateToAuth("register", "salon")}
                >
                  <span className={styles.buttonIcon}>🏪</span>
                  Register Salon
                </motion.button>

                <div className={styles.loginDropdown}>
                  <motion.button
                    className={`${styles.actionButton} ${styles.loginButton}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLoginMenu(!showLoginMenu)}
                  >
                    <span className={styles.buttonIcon}>👤</span>
                    Login
                    <span className={styles.dropdownArrow}>▼</span>
                  </motion.button>
                  {showLoginMenu && (
                    <motion.div
                      className={styles.loginMenu}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => {
                          router.push("/auth/user/login");
                          setShowLoginMenu(false);
                        }}
                      >
                        👤 User Login
                      </button>
                      <button
                        onClick={() => {
                          navigateToAuth("login", "salon");
                          setShowLoginMenu(false);
                        }}
                      >
                        🏪 Salon Login
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span
                className={`${styles.hamburgerLine} ${
                  isMobileMenuOpen ? styles.active : ""
                }`}
              ></span>
              <span
                className={`${styles.hamburgerLine} ${
                  isMobileMenuOpen ? styles.active : ""
                }`}
              ></span>
              <span
                className={`${styles.hamburgerLine} ${
                  isMobileMenuOpen ? styles.active : ""
                }`}
              ></span>
            </button>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
              <motion.div
                className={styles.mobileNav}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.mobileNavLinks}>
                  <OnboardingLogoutButton />
                  <button className={styles.mobileNavLink}>Services</button>
                  <button className={styles.mobileNavLink}>Salons</button>
                  <button className={styles.mobileNavLink}>About</button>
                  <div className={styles.mobileNavDivider}></div>
                  {UserDataManager.isLoggedIn() && (
                    <button
                      className={styles.mobileNavLink}
                      onClick={() => {
                        router.push("/user/dashboard");
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Dashboard
                    </button>
                  )}
                  <button
                    className={styles.mobileNavLink}
                    onClick={() => {
                      router.push("/auth/user/login");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    👤 User Login
                  </button>
                  <button
                    className={styles.mobileNavLink}
                    onClick={() => {
                      navigateToAuth("login", "salon");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    🏪 Salon Login
                  </button>
                  <button
                    className={styles.mobileNavLink}
                    onClick={() => {
                      navigateToAuth("register", "salon");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    🏪 Register Salon
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </header>
      )}

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
