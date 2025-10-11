import { useRouter } from "next/router";
import styles from "../styles/OwnerSidebar.module.css";

export default function OwnerSidebar({ closeSidebar }) {
  const router = useRouter();

  const menuItems = [
    { icon: "👤", label: "Profile", path: "/salons/profile" },
    { icon: "📅", label: "Bookings", path: "/salons/bookings" },
    {
      icon: "👨‍💼",
      label: "Barber Management",
      href: "/salons/barbers",
      path: "/salons/barbers",
    },
    { icon: "👥", label: "Staff", path: "/salons/staff" },
    { icon: "✂️", label: "Services", path: "/salons/services" },
    { icon: "💰", label: "Payments", path: "/salons/payments" },
    { icon: "📈", label: "Analytics", path: "/salons/analytics" },
    { icon: "⚙️", label: "Settings", path: "/salons/settings" },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      // Clear all salon/owner authentication data
      localStorage.removeItem("ownerToken");
      localStorage.removeItem("salonToken");
      localStorage.removeItem("salonSession");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminData");

      alert("Logged out successfully!");

      // Redirect to HOME page (/)
      router.push("/").then(() => {
        window.location.href = "/";
      });
    }
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
              router.pathname === item.path
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
