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
import { Toaster } from "react-hot-toast";
import { showConfirm, showSuccess } from "@/lib/toast";
import { SunIcon } from "@/components/ui/sun";
import { MoonIcon } from "@/components/ui/moon";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [selectedGender, setSelectedGender] = useState("all");

  // Don't show header on onboarding AND auth pages
  // Check if user needs onboarding on route change
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip check for auth and onboarding pages
    if (
      router.pathname.startsWith("/auth") ||
      router.pathname.startsWith("/onboarding")
    ) {
      return;
    }

    // Check for userAuth cookie (readable by JavaScript)
    const getCookie = (name) => {
      const matches = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)")
      );
      return matches ? decodeURIComponent(matches[1]) : null;
    };

    const userAuth = getCookie("userAuth");
    if (userAuth === "true") {
      // Authenticated users - check if they have completed onboarding
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");
      if (!hasOnboarded) {
        // Force onboarding for authenticated users who haven't completed it
        sessionStorage.setItem("hasOnboarded", "true");
      }
    } else {
      // Guest users - must complete onboarding
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");
      if (!hasOnboarded && router.pathname === "/") {
        router.push("/onboarding");
      }
    }
  }, [router]);

  // Dont show header on onboarding AND auth pages
  const hideHeader =
    router.pathname.startsWith("/onboarding") ||
    router.pathname.startsWith("/auth");

  useEffect(() => {
    setMounted(true);
    const darkMode = localStorage.getItem("darkMode") === "true";
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  // NEW: Load user gender from session storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Small delay to ensure sessionStorage is ready
    const timer = setTimeout(() => {
      // Try userData first (for logged in users)
      let userData = sessionStorage.getItem("userData");

      // Fallback to onboardingData (for guests)
      if (!userData || !JSON.parse(userData)?.gender) {
        userData = sessionStorage.getItem("userOnboardingData");
      }

      if (userData) {
        try {
          const parsedData = JSON.parse(userData);
          if (parsedData?.gender) {
            console.log("✅ Setting user gender:", parsedData.gender);
            setUserGender(parsedData.gender);

            const storedGender = sessionStorage.getItem("selectedGender");
            if (storedGender) {
              setSelectedGender(storedGender);
            } else {
              const initialGender =
                parsedData.gender === "Male" ? "Male" : "Female";
              setSelectedGender(initialGender);
              sessionStorage.setItem("selectedGender", initialGender);
            }
          } else {
            console.log("⚠ No gender found in userData");
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      } else {
        console.log("⚠ No user data found in sessionStorage");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Prompt existing users to set gender if missing
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userData = sessionStorage.getItem("userData");
    if (userData) {
      try {
        const parsedData = JSON.parse(userData);

        // If user is logged in but has no gender or gender is 'other'
        if (
          parsedData.id &&
          (!parsedData.gender || parsedData.gender === "other")
        ) {
          // Show a one-time prompt
          const hasPrompted = sessionStorage.getItem("genderPromptShown");
          if (!hasPrompted) {
            const userChoice = confirm(
              "To provide better salon recommendations, please update your gender in your profile settings."
            );
            if (userChoice) {
              router.push("/user/dashboard");
            }
            sessionStorage.setItem("genderPromptShown", "true");
          }
        }
      } catch (error) {
        console.error("Error checking user gender:", error);
      }
    }
  }, [router]);

  const toggleDarkMode = async (event) => {
    if (!document.startViewTransition) {
      // fallback (instant toggle)
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      localStorage.setItem("darkMode", newMode.toString());
      if (newMode) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      return;
    }

    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());

    // find button position
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // start native View Transition
    const transition = document.startViewTransition(() => {
      if (newMode) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    });

    // when ready, animate the clip-path ripple
    transition.ready.then(() => {
      const radius = Math.hypot(window.innerWidth, window.innerHeight);

      // Custom easing and duration for a slower, smoother expansion
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],

          filter: [
            newMode
              ? "drop-shadow(0 0 25px rgba(255, 215, 0, 0.25))"
              : "drop-shadow(0 0 15px rgba(0, 0, 0, 0.15))",
            "none",
          ],
        },
        {
          duration: 1800, // was 900 — now slower & smoother
          easing: "cubic-bezier(0.4, 0, 0.2, 1)", // smooth ease-in-out curve
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  const navigateToAuth = (type, role) => {
    router.push(`/auth/${role}/${type}`);
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDarkMode ? "#faf6ef" : "#1a0f00", // Opposite!
            color: isDarkMode ? "#1a0f00" : "#faf6ef", // Opposite!
            padding: "16px",
            borderRadius: "12px",
            border: `1px solid ${isDarkMode ? "#c9a961" : "#d4af37"}`,
            boxShadow: isDarkMode
              ? "0 4px 12px rgba(212, 175, 55, 0.2)"
              : "0 4px 12px rgba(212, 175, 55, 0.4)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: isDarkMode ? "#faf6ef" : "#1a0f00", // Icon bg opposite
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: isDarkMode ? "#faf6ef" : "#1a0f00", // Icon bg opposite
            },
          },
        }}
      />

      <NetworkStatus />
      {mounted && !hideHeader && (
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
            {/* <motion.button
              className={styles.themeToggle}
              onClick={toggleDarkMode}
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              title={
                isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
              }
            >
              <span className={styles.themeIcon}>
                {isDarkMode ? "☀" : "🌙"}
              </span>
            </motion.button> */}
            {/* Desktop Navigation */}
            <nav className={styles.desktopNav}>
              <div className={styles.navLinks}>
                <OnboardingLogoutButton />
                {/* <button className={styles.navLink}>Services</button>
                <button className={styles.navLink}>Salons</button>
                <button className={styles.navLink}>About</button> */}
              </div>

              <div className={styles.headerActions}>
                {/* ✅ NEW THEME TOGGLE BUTTON */}
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
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                  </span>
                </motion.button>

                {userGender && (
                  <div className={styles.genderToggle}>
                    <button
                      className={`${styles.genderOption} ${
                        selectedGender === userGender ? styles.active : ""
                      }`}
                      onClick={() => {
                        setSelectedGender(userGender);
                        sessionStorage.setItem("selectedGender", userGender);
                        window.dispatchEvent(
                          new CustomEvent("genderFilterChange", {
                            detail: userGender,
                          })
                        );
                      }}
                    >
                      {userGender === "Male" ? "👨" : "👩 "}
                    </button>

                    <button
                      className={`${styles.genderOption} ${
                        selectedGender === "Unisex" ? styles.active : ""
                      }`}
                      onClick={() => {
                        setSelectedGender("Unisex");
                        sessionStorage.setItem("selectedGender", "Unisex");
                        window.dispatchEvent(
                          new CustomEvent("genderFilterChange", {
                            detail: "Unisex",
                          })
                        );
                      }}
                    >
                      ⚥
                    </button>
                  </div>
                )}

                {/* ✅ SHOW DASHBOARD ONLY IF LOGGED IN */}
                {UserDataManager.isLoggedIn() && (
                  <motion.button
                    className={`${styles.actionButton} ${styles.bookingButton}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push("/user/dashboard")}
                  >
                    Dashboard
                  </motion.button>
                )}

                {/* SHOW LOGOUT ONLY IF LOGGED IN */}
                {UserDataManager.isLoggedIn() && (
                  <motion.button
                    className={`${styles.actionButton} ${styles.logoutButton}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      showConfirm("Are you sure you want to logout?", () => {
                        // Call UserDataManager logout (synchronous, no await needed)
                        UserDataManager.clearUserData();

                        // Clear other storage items
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("salonToken");
                          localStorage.removeItem("ownerToken");
                        }

                        showSuccess("Logged out successfully!");

                        // Force redirect to home page
                        window.location.href = "/";
                      });
                    }}
                  >
                    Logout
                  </motion.button>
                )}

                {/* ✅ SHOW REGISTER SALON ONLY IF NOT LOGGED IN */}
                {!UserDataManager.isLoggedIn() && (
                  <motion.button
                    className={`${styles.actionButton} ${styles.ownerButton}`}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigateToAuth("register", "salon")}
                  >
                    Register Salon
                  </motion.button>
                )}

                {/* ✅ SHOW LOGIN ONLY IF NOT LOGGED IN */}
                {!UserDataManager.isLoggedIn() && (
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
                )}
              </div>
            </nav>
            <div className={styles.rightControls}>
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
                  {isDarkMode ? "☀" : "🌙"}
                </span>
              </motion.button>

              {userGender && (
                <div className={styles.genderToggle}>
                  <button
                    className={`${styles.genderOption} ${
                      selectedGender === userGender ? styles.active : ""
                    }`}
                    onClick={() => {
                      setSelectedGender(userGender);
                      sessionStorage.setItem("selectedGender", userGender);
                      window.dispatchEvent(
                        new CustomEvent("genderFilterChange", {
                          detail: userGender,
                        })
                      );
                    }}
                  >
                    {userGender === "Male" ? "👨" : "👩 "}
                  </button>

                  <button
                    className={`${styles.genderOption} ${
                      selectedGender === "Unisex" ? styles.active : ""
                    }`}
                    onClick={() => {
                      setSelectedGender("Unisex");
                      sessionStorage.setItem("selectedGender", "Unisex");
                      window.dispatchEvent(
                        new CustomEvent("genderFilterChange", {
                          detail: "Unisex",
                        })
                      );
                    }}
                  >
                    ⚥
                  </button>
                </div>
              )}

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
            </div>
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
                  {/* <button className={styles.mobileNavLink}>Services</button>
                  <button className={styles.mobileNavLink}>Salons</button>
                  <button className={styles.mobileNavLink}>About</button> */}
                  <div className={styles.mobileNavDivider}></div>

                  {/* Show Dashboard if logged in */}
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

                  {/* Show Login options only if NOT logged in */}
                  {!UserDataManager.isLoggedIn() && (
                    <>
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
                    </>
                  )}

                  {/* Show Logout if logged in */}
                  {UserDataManager.isLoggedIn() && (
                    <button
                      className={styles.mobileNavLink}
                      onClick={() => {
                        showConfirm("Are you sure you want to logout?", () => {
                          // Call UserDataManager logout (synchronous)
                          UserDataManager.clearUserData();

                          // Clear other storage
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("salonToken");
                            localStorage.removeItem("ownerToken");
                          }

                          showSuccess("Logged out successfully!");
                          window.location.href = "/";
                        });
                      }}
                    >
                      Logout
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </header>
      )}

      <Component {...pageProps} theme={isDarkMode ? "dark" : "light"} />
    </>
  );
}

export default MyApp;
