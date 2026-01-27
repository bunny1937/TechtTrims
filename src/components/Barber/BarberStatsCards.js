// src/components/Barber/BarberStatsCard.js
import { useRouter } from "next/router";
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
} from "lucide-react";

export default function BarberSidebar({ barber, currentPage = "dashboard" }) {
  const router = useRouter();

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
      label: "My Schedule",
      icon: Calendar,
      path: "/barber/my-schedule",
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
      id: "settings",
      label: "Settings",
      icon: Settings,
      path: "/barber/settings",
    },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("barberSession");
    document.cookie =
      "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "barberAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/auth/barber/login");
  };

  return (
    <aside className={styles.sidebar}>
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
              className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
              onClick={() => router.push(item.path)}
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
    </aside>
  );
}
