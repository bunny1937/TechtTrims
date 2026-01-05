import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import StatsCards from "../../components/Admin/StatsCards";
import styles from "../../styles/Admin/AdminDashboard.module.css";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [salons, setSalons] = useState([]); // ✅ ADD
  const [analytics, setAnalytics] = useState(null); // ✅ ADD
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    const admin = sessionStorage.getItem("adminData");

    if (!admin) {
      router.push("/admin/login");
      return;
    }

    setAdminData(JSON.parse(admin));
    fetchAllDashboardData(); // ✅ Changed function name
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ✅ NEW - Batch fetch all data in ONE request
  const fetchAllDashboardData = async () => {
    try {
      const response = await fetch("/api/admin/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          queries: [
            { id: "stats", type: "stats" },
            { id: "salons", type: "salons", params: { limit: 10 } },
            { id: "analytics", type: "analytics" },
            {
              id: "recentBookings",
              type: "recentBookings",
              params: { limit: 5 },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Batch fetch failed");
      }

      const { results } = await response.json();

      // ✅ Set all state from single response
      setStats(results.stats?.[0] || {});
      setSalons(results.salons || []);
      setAnalytics(results.analytics || []);

      // ✅ Update stats with recent bookings
      setStats((prev) => ({
        ...prev,
        recentBookings: results.recentBookings || [],
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      // ✅ Fallback to old method if batch fails
      await fetchDashboardStatsFallback();
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fallback method (keep for compatibility)
  const fetchDashboardStatsFallback = async () => {
    try {
      const response = await fetch("/api/admin/dashboard/stats", {
        credentials: "include",
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading dashboard...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Welcome back, {adminData?.name || "Admin"}
          </h1>
          <p className={styles.subtitle}>
            Here&#39;s what&#39;s happening with TechTrims today
          </p>
        </div>

        <StatsCards stats={stats} />

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <h2>Quick Actions</h2>
          <div className={styles.actionsGrid}>
            <button
              onClick={() => router.push("/admin/salons")}
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>🏢</span>
              <span>Manage Salons</span>
            </button>
            <button
              onClick={() => router.push("/admin/users")}
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>👥</span>
              <span>View Users</span>
            </button>
            <button
              onClick={() => router.push("/admin/revenue")}
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>💰</span>
              <span>Revenue</span>
            </button>
            <button
              onClick={() => router.push("/admin/reports")}
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>📊</span>
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={styles.recentActivity}>
          <h2>Recent Activity</h2>
          <div className={styles.activityList}>
            {stats?.recentBookings?.slice(0, 5).map((booking) => (
              <div key={booking._id} className={styles.activityItem}>
                <span className={styles.activityIcon}>📅</span>
                <div className={styles.activityDetails}>
                  <p className={styles.activityText}>
                    <strong>{booking.customerName}</strong> booked{" "}
                    {booking.service}
                  </p>
                  <p className={styles.activityTime}>
                    {new Date(booking.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
