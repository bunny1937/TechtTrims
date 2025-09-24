import { useRouter } from "next/router";
import styles from "../styles/OwnerSidebar.module.css";

export default function OwnerSidebar() {
  const router = useRouter();

  const menuItems = [
    { icon: "profile", label: "profile", path: "/salons/profile" },
    { icon: "📊", label: "Dashboard", path: "/owner/dashboard" },
    { icon: "📅", label: "Bookings", path: "/owner/bookings" },
    { icon: "👥", label: "Staff", path: "/owner/staff" },
    { icon: "✂️", label: "Services", path: "/owner/services" },
    { icon: "💰", label: "Payments", path: "/owner/payments" },
    { icon: "📈", label: "Analytics", path: "/owner/analytics" },
    { icon: "⚙️", label: "Settings", path: "/owner/settings" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("ownerToken");
    router.push("/owner/login");
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>💈 SalonBook Pro</h2>
        <p>Owner Dashboard</p>
      </div>

      <nav className={styles.menu}>
        {menuItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`${styles.menuItem} ${
              router.pathname === item.path ? styles.active : ""
            }`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
