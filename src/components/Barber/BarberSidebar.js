// src/components/Barber/BarberSidebar.js
import { useRouter } from "next/router";
import { useState } from "react";
import styles from "../../styles/barber/BarberSidebar.module.css";
import {
  LayoutDashboard,
  Clock,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  Menu,
  X,
  User,
  Star,
} from "lucide-react";

export default function BarberSidebar({ barber, currentPage = "dashboard" }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/barber/dashboard",
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: ClipboardList,
      path: "/barber/bookings",
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: Clock,
      path: "/barber/attendance",
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: Calendar,
      path: "/barber/schedule",
    },
    {
      id: "earnings",
      label: "Earnings",
      icon: DollarSign,
      path: "/barber/earnings",
    },
    {
      id: "performance",
      label: "Performance",
      icon: BarChart3,
      path: "/barber/performance",
    },
    {
      id: "reviews",
      label: "Reviews",
      icon: Star,
      path: "/barber/reviews",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/barber/settings",
    },
  ];

  // Main menu items for mobile bottom nav (most used)
  const mobileMainItems = [
    menuItems.find((i) => i.id === "dashboard"),
    menuItems.find((i) => i.id === "bookings"),
    menuItems.find((i) => i.id === "attendance"),
    menuItems.find((i) => i.id === "schedule"),
  ].filter(Boolean);

  const handleLogout = () => {
    sessionStorage.removeItem("barberSession");
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "barberAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/auth/login");
  };

  const handleNavigate = (path) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR - Hidden on mobile */}
      <div className={styles.sidebar}>
        {/* Barber Profile */}
        <div className={styles.profile}>
          <div className={styles.profileImage}>
            {barber?.photo ? (
              <img src={barber.photo} alt={barber.name} />
            ) : (
              <div className={styles.placeholder}>
                {barber?.name?.charAt(0).toUpperCase() || "B"}
              </div>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.name}>{barber?.name || "Barber"}</h3>
            <div className={styles.rating}>
              <span className={styles.star}>⭐</span>
              <span className={styles.ratingValue}>
                {barber?.rating || "5.0"}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className={styles.menu}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                className={`${styles.menuItem} ${
                  isActive ? styles.active : ""
                }`}
                onClick={() => handleNavigate(item.path)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION - Visible only on mobile */}
      <nav className={styles.mobileBottomNav}>
        {mobileMainItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              className={`${styles.mobileNavItem} ${
                isActive ? styles.mobileNavActive : ""
              }`}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon size={22} />
              <span className={styles.mobileNavLabel}>{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Button */}
        <button
          className={`${styles.mobileNavItem} ${
            mobileMenuOpen ? styles.mobileNavActive : ""
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={22} />
          <span className={styles.mobileNavLabel}>More</span>
        </button>
      </nav>

      {/* MOBILE DRAWER MENU - Full screen menu */}
      {mobileMenuOpen && (
        <>
          <div
            className={styles.mobileOverlay}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className={styles.mobileDrawer}>
            {/* Header */}
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.mobileProfile}>
                <div className={styles.mobileProfileImage}>
                  {barber?.photo ? (
                    <img src={barber.photo} alt={barber.name} />
                  ) : (
                    <div className={styles.placeholder}>
                      {barber?.name?.charAt(0).toUpperCase() || "B"}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className={styles.mobileName}>
                    {barber?.name || "Barber"}
                  </h3>
                  <div className={styles.mobileRating}>
                    <span className={styles.star}>⭐</span>
                    <span>{barber?.rating || "5.0"}</span>
                  </div>
                </div>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* All Menu Items */}
            <nav className={styles.mobileDrawerMenu}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    className={`${styles.mobileDrawerItem} ${
                      isActive ? styles.mobileDrawerActive : ""
                    }`}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <Icon size={22} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Logout */}
              <button
                className={styles.mobileDrawerLogout}
                onClick={handleLogout}
              >
                <LogOut size={22} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
