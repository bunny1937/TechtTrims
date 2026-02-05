// pages/_app.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic"; // ✅ ADD THIS
import "../styles/globals.css";
import styles from "../styles/Home.module.css";
import { UserDataManager } from "../lib/userData";
import { SalonDataManager } from "../lib/salonData";
import { BarberDataManager } from "@/lib/barberData";
import Head from "next/head";
import { showConfirm, showSuccess } from "@/lib/toast";
import "leaflet/dist/leaflet.css";

// ✅ LAZY LOAD HEAVY COMPONENTS
const NetworkStatus = dynamic(() => import("../components/NetworkStatus"), {
  ssr: false,
});
const OnboardingLogoutButton = dynamic(
  () => import("../components/OnBoardingLogout"),
  { ssr: false },
);
const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => ({ default: mod.Toaster })),
  { ssr: false },
);
const SunIcon = dynamic(() => import("@/components/ui/sun"), { ssr: false });
const MoonIcon = dynamic(() => import("@/components/ui/moon"), { ssr: false });

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userGender, setUserGender] = useState(null);
  const [selectedGender, setSelectedGender] = useState("all");

  const hasCheckedOnboarding = useRef(false);
  // Check if user needs onboarding - RUN ONCE
  useEffect(() => {
    // Skip check for auth, onboarding, AND admin pages
    if (
      router.pathname.startsWith("/auth") ||
      router.pathname.startsWith("/onboarding") ||
      router.pathname.startsWith("/admin")
    ) {
      return;
    }

    hasCheckedOnboarding.current = true;

    const getCookie = (name) => {
      const matches = document.cookie.match(
        new RegExp(`(?:^|; )${name}=([^;]*)`),
      );
      return matches ? decodeURIComponent(matches[1]) : null;
    };

    const userAuth = getCookie("userAuth") === "true";
    const barberAuth = getCookie("barberAuth") === "true";
    const salonAuth = getCookie("salonAuth") === "true";
    const adminAuth = getCookie("adminToken") !== null;

    const isAuthenticated = userAuth || barberAuth || salonAuth || adminAuth;

    if (isAuthenticated) {
      const hasOnboarded = sessionStorage.getItem("hasOnboarded");
      if (!hasOnboarded && !adminAuth) {
        sessionStorage.setItem("hasOnboarded", "true");
      }

      if (barberAuth === true && !sessionStorage.getItem("barberSession")) {
        sessionStorage.removeItem("hasOnboarded");
        document.cookie =
          "barberAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        if (!router.pathname.startsWith("/auth")) {
          router.push("/auth/barber/login");
        }
      }
    } else {
      if (!router.pathname.startsWith("/auth")) {
        const hasOnboarded = sessionStorage.getItem("hasOnboarded");
        if (!hasOnboarded && router.pathname !== "/onboarding") {
          router.replace("/onboarding");
        }
      }
    }
  }, [router.pathname]);

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

  // Load user gender - RUN ONCE
  useEffect(() => {
    if (typeof window === "undefined") return;

    let userData = sessionStorage.getItem("userData");
    if (!userData || !JSON.parse(userData)?.gender) {
      userData = sessionStorage.getItem("userOnboardingData");
    }

    if (userData) {
      try {
        const parsedData = JSON.parse(userData);
        if (parsedData?.gender) {
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
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Prompt for gender - RUN ONCE
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userData = sessionStorage.getItem("userData");

    if (userData) {
      try {
        const parsedData = JSON.parse(userData);

        if (
          parsedData.id &&
          (!parsedData.gender || parsedData.gender === "other")
        ) {
          const hasPrompted = sessionStorage.getItem("genderPromptShown");
          if (!hasPrompted) {
            const userChoice = confirm(
              "To provide better salon recommendations, please update your gender in your profile settings.",
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
  }, []);

  const toggleDarkMode = async (event) => {
    if (!document.startViewTransition) {
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

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const transition = document.startViewTransition(() => {
      if (newMode) document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
    });

    transition.ready.then(() => {
      const radius = Math.hypot(window.innerWidth, window.innerHeight);

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
          duration: 1800,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  const navigateToAuth = (type, role) => {
    router.push(`/auth/${role}/${type}`);
  };

  return (
    <>
      <Head>
        <title>TechTrims - Premium Salon Booking Platform</title>
        <meta
          name="description"
          content="TechTrims - Find and book the best salons near you. Real-time availability, walk-in queues, professional barbers and stylists. Book appointments instantly or pre-book for later."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta
          name="keywords"
          content="salon booking, barber appointment, hair salon, walk-in queue, salon near me"
        />
        <link rel="canonical" href="https://yourdomain.com" />
      </Head>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDarkMode ? "#faf6ef" : "#1a0f00",
            color: isDarkMode ? "#1a0f00" : "#faf6ef",
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
              secondary: isDarkMode ? "#faf6ef" : "#1a0f00",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: isDarkMode ? "#faf6ef" : "#1a0f00",
            },
          },
        }}
      />

      <NetworkStatus />
      {mounted && !hideHeader && (
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.logoContainer}>
              <div className={styles.logoIcon}>✨</div>
              <h1 className={styles.logo}>
                <span className={styles.goldText}>Tech</span>
                <span className={styles.trimText}>Trims</span>
              </h1>
            </div>

            <nav className={styles.desktopNav}>
              <div className={styles.navLinks}>
                <OnboardingLogoutButton />
              </div>

              <div className={styles.headerActions}>
                <button
                  className={styles.themeToggle}
                  onClick={toggleDarkMode}
                  title={
                    isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                  }
                >
                  <span className={styles.themeIcon}>
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                  </span>
                </button>

                {userGender && (
                  <div
                    className={styles.genderToggle}
                    role="group"
                    aria-label="Filter salons by gender preference"
                  >
                    <button
                      className={`${styles.genderOption} ${selectedGender === userGender ? styles.active : ""}`}
                      onClick={() => {
                        setSelectedGender(userGender);
                        sessionStorage.setItem("selectedGender", userGender);
                        window.dispatchEvent(
                          new CustomEvent("genderFilterChange", {
                            detail: userGender,
                          }),
                        );
                      }}
                      aria-label={`Filter by ${userGender} salons`}
                      aria-pressed={selectedGender === userGender}
                    >
                      <span aria-hidden="true">
                        {userGender === "Male" ? "👨" : "👩"}
                      </span>{" "}
                      {userGender}
                    </button>

                    <button
                      className={`${styles.genderOption} ${selectedGender === "Unisex" ? styles.active : ""}`}
                      onClick={() => {
                        setSelectedGender("Unisex");
                        sessionStorage.setItem("selectedGender", "Unisex");
                        window.dispatchEvent(
                          new CustomEvent("genderFilterChange", {
                            detail: "Unisex",
                          }),
                        );
                      }}
                      aria-label="Filter by unisex salons"
                      aria-pressed={selectedGender === "Unisex"}
                    >
                      <span aria-hidden="true">⚥</span> Unisex
                    </button>
                  </div>
                )}

                {(UserDataManager.isLoggedIn() ||
                  BarberDataManager.isLoggedIn() ||
                  SalonDataManager.isLoggedIn()) && (
                  <button
                    className={`${styles.actionButton} ${styles.bookingButton}`}
                    onClick={() =>
                      router.push(
                        UserDataManager.isLoggedIn()
                          ? "/user/dashboard"
                          : BarberDataManager.isLoggedIn()
                            ? "/barber/dashboard"
                            : "/salons/dashboard",
                      )
                    }
                  >
                    Dashboard
                  </button>
                )}

                {(UserDataManager.isLoggedIn() ||
                  BarberDataManager.isLoggedIn() ||
                  SalonDataManager.isLoggedIn()) && (
                  <button
                    className={`${styles.actionButton} ${styles.logoutButton}`}
                    onClick={async () => {
                      showConfirm(
                        "Are you sure you want to logout?",
                        async () => {
                          try {
                            await fetch("/api/auth/logout", {
                              method: "POST",
                              credentials: "include",
                            });
                          } catch (error) {
                            console.error("Logout error:", error);
                          }

                          UserDataManager.clearUserData();
                          BarberDataManager.clearBarberData();
                          SalonDataManager.clearSalonData();
                          sessionStorage.clear();
                          localStorage.clear();
                          showSuccess("Logged out successfully!");
                          window.location.href = "/";
                        },
                      );
                    }}
                  >
                    Logout
                  </button>
                )}

                {!UserDataManager.isLoggedIn() &&
                  !BarberDataManager.isLoggedIn() &&
                  !SalonDataManager.isLoggedIn() && (
                    <button
                      className={`${styles.actionButton} ${styles.ownerButton}`}
                      onClick={() => navigateToAuth("register", "salon")}
                    >
                      Register Salon
                    </button>
                  )}

                {!UserDataManager.isLoggedIn() &&
                  !BarberDataManager.isLoggedIn() &&
                  !SalonDataManager.isLoggedIn() && (
                    <div className={styles.loginDropdown}>
                      <button
                        className={`${styles.actionButton} ${styles.loginButton}`}
                        onClick={() => setShowLoginMenu(!showLoginMenu)}
                      >
                        <span className={styles.buttonIcon}>👤</span>
                        Login
                        <span className={styles.dropdownArrow}>▼</span>
                      </button>
                      {showLoginMenu && (
                        <div className={styles.loginMenu}>
                          <button
                            onClick={() => {
                              router.push("/auth/login");
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
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </nav>

            <div className={styles.rightControls}>
              <button
                className={styles.themeToggle}
                onClick={toggleDarkMode}
                title={
                  isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
                }
              >
                <span className={styles.themeIcon}>
                  {isDarkMode ? "☀" : "🌙"}
                </span>
              </button>

              {userGender && (
                <div className={styles.genderToggle}>
                  <button
                    className={`${styles.genderOption} ${selectedGender === userGender ? styles.active : ""}`}
                    onClick={() => {
                      setSelectedGender(userGender);
                      sessionStorage.setItem("selectedGender", userGender);
                      window.dispatchEvent(
                        new CustomEvent("genderFilterChange", {
                          detail: userGender,
                        }),
                      );
                    }}
                  >
                    {userGender === "Male" ? "👨" : "👩"}
                  </button>

                  <button
                    className={`${styles.genderOption} ${selectedGender === "Unisex" ? styles.active : ""}`}
                    onClick={() => {
                      setSelectedGender("Unisex");
                      sessionStorage.setItem("selectedGender", "Unisex");
                      window.dispatchEvent(
                        new CustomEvent("genderFilterChange", {
                          detail: "Unisex",
                        }),
                      );
                    }}
                  >
                    ⚥
                  </button>
                </div>
              )}

              <button
                className={styles.mobileMenuButton}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={
                  isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"
                }
                aria-expanded={isMobileMenuOpen}
              >
                <span
                  className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.active : ""}`}
                ></span>
                <span
                  className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.active : ""}`}
                ></span>
                <span
                  className={`${styles.hamburgerLine} ${isMobileMenuOpen ? styles.active : ""}`}
                ></span>
              </button>
            </div>

            {isMobileMenuOpen && (
              <div className={styles.mobileNav}>
                <div className={styles.mobileNavLinks}>
                  <OnboardingLogoutButton />
                  <div className={styles.mobileNavDivider}></div>

                  {(UserDataManager.isLoggedIn() ||
                    BarberDataManager.isLoggedIn() ||
                    SalonDataManager.isLoggedIn()) && (
                    <button
                      className={styles.mobileNavLink}
                      onClick={() => {
                        router.push(
                          UserDataManager.isLoggedIn()
                            ? "/user/dashboard"
                            : BarberDataManager.isLoggedIn()
                              ? "/barber/dashboard"
                              : "/salons/dashboard",
                        );
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Dashboard
                    </button>
                  )}

                  {!UserDataManager.isLoggedIn() &&
                    !SalonDataManager.isLoggedIn() &&
                    !BarberDataManager.isLoggedIn() && (
                      <>
                        <button
                          className={styles.mobileNavLink}
                          onClick={() => {
                            router.push("/auth/login");
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
                            navigateToAuth("login", "barber");
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          🏪 Barber Login
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

                  {(UserDataManager.isLoggedIn() ||
                    BarberDataManager.isLoggedIn() ||
                    SalonDataManager.isLoggedIn()) && (
                    <button
                      className={styles.mobileNavLink}
                      onClick={async () => {
                        showConfirm(
                          "Are you sure you want to logout?",
                          async () => {
                            try {
                              await fetch("/api/auth/logout", {
                                method: "POST",
                                credentials: "include",
                              });
                            } catch (error) {
                              console.error("Logout error:", error);
                            }

                            UserDataManager.clearUserData();
                            SalonDataManager.clearSalonData();
                            BarberDataManager.clearBarberData();
                            sessionStorage.clear();
                            localStorage.clear();
                            showSuccess("Logged out successfully!");
                            window.location.href = "/";
                          },
                        );
                      }}
                    >
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      <Component {...pageProps} theme={isDarkMode ? "dark" : "light"} />
    </>
  );
}

export default MyApp;
