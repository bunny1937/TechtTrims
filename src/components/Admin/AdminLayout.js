import { useRouter } from "next/router";
import styles from "../../styles/Admin/AdminLayout.module.css";

export default function AdminLayout({ children }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // ✅ Call logout API to clear cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout API error:", error);
    }

    // ✅ Clear admin storage
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    sessionStorage.clear();

    // ✅ Redirect to admin login
    router.push("/admin/login");
  };

  const navigation = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    { name: "Salon Register", path: "/admin/salon-register", icon: "📝" },
    { name: "Salons", path: "/admin/salons", icon: "🏢" },
    { name: "Users", path: "/admin/users", icon: "👥" },
    { name: "Revenue", path: "/admin/revenue", icon: "💰" },
    { name: "Analytics", path: "/admin/analytics", icon: "📈" },
    { name: "Reports", path: "/admin/reports", icon: "📄" },
    { name: "Audit Logs", path: "/admin/audit-logs", icon: "📝" },
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>TechTrims Admin</h2>
        </div>

        <nav className={styles.nav}>
          {navigation.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${
                router.pathname === item.path ? styles.active : ""
              }`}
              onClick={() => router.push(item.path)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
