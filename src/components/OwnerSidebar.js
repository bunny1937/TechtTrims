import { useRouter } from "next/router";
import styles from "../styles/OwnerSidebar.module.css";
import { showSuccess, showConfirm } from "@/lib/toast";

export default function OwnerSidebar({ closeSidebar }) {
  const router = useRouter();

  const menuItems = [
    { icon: "🏠", label: "Home", path: "/salons/dashboard" },
    { icon: "👤", label: "Profile", path: "/salons/profile" },
    { icon: "📅", label: "Bookings", path: "/salons/bookings" },
    { icon: "👨‍💼", label: "Barbers", path: "/salons/barbers" },
    { icon: "👥", label: "Staff", path: "/salons/staff" },
    { icon: "✂️", label: "Services", path: "/salons/services" },
    { icon: "💰", label: "Payments", path: "/salons/payments" },
    { icon: "⭐", label: "Reviews", path: "/salons/reviews" },
    { icon: "📈", label: "Analytics", path: "/salons/analytics" },
    { icon: "⚙️", label: "Settings", path: "/salons/settings" },
  ];

  const handleLogout = () => {
    showConfirm("Are you sure you want to logout?", async () => {
      try {
        // ✅ Call logout API to clear cookies
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Logout API error:", error);
      }

      // ✅ Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      showSuccess("Logged out successfully!");

      // ✅ Redirect to unified login
      router.push("/auth/login");
    });
  };

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <h2 className={styles.logo}>Tech Trims</h2>
          <p className={styles.subtitle}>Owner Dashboard</p>
        </div>
        {closeSidebar && (
          <button onClick={closeSidebar} className={styles.closeButton}>
            ❌
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              router.push(item.path);
              if (closeSidebar) closeSidebar();
            }}
            className={`${styles.navButton} ${
              router.pathname === item.path ||
              router.pathname.startsWith(item.path)
                ? styles.navButtonActive
                : styles.navButtonInactive
            }`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutButton}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
