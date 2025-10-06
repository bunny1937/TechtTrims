import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import styles from "../../styles/Admin/AdminAnalytics.module.css";

export default function AdminAnalytics() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading analytics...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Analytics & Insights</h1>

        {/* Trends Section */}
        <div className={styles.section}>
          <h2>Customer Behavior Trends</h2>
          <div className={styles.trendsGrid}>
            <div className={styles.trendCard}>
              <h3>Peak Booking Hours</h3>
              <ul>
                {analytics?.peakHours?.map((hour) => (
                  <li key={hour.hour}>
                    <strong>{hour.hour}</strong> - {hour.count} bookings
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.trendCard}>
              <h3>Popular Services</h3>
              <ul>
                {analytics?.popularServices?.map((service) => (
                  <li key={service.name}>
                    <strong>{service.name}</strong> - {service.count} bookings
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.trendCard}>
              <h3>Day-wise Trends</h3>
              <ul>
                {analytics?.dayTrends?.map((day) => (
                  <li key={day.day}>
                    <strong>{day.day}</strong> - {day.bookings} bookings
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Top Salons Section */}
        <div className={styles.section}>
          <h2>Top Performing Salons</h2>
          <div className={styles.topSalons}>
            {analytics?.topSalons?.map((salon, index) => (
              <div key={salon._id} className={styles.salonRankCard}>
                <div className={styles.rank}>#{index + 1}</div>
                <div className={styles.salonInfo}>
                  <h3>{salon.salonName}</h3>
                  <p>📅 {salon.totalBookings} bookings</p>
                  <p>⭐ {salon.rating.toFixed(1)} rating</p>
                  <p>📍 {salon.location?.address || "Location not set"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Insights */}
        <div className={styles.section}>
          <h2>Customer Insights</h2>
          <div className={styles.insights}>
            <div className={styles.insightCard}>
              <h3>Repeat Customer Rate</h3>
              <p className={styles.percentage}>{analytics?.repeatRate}%</p>
            </div>
            <div className={styles.insightCard}>
              <h3>Average Booking Value</h3>
              <p className={styles.amount}>₹{analytics?.avgBookingValue}</p>
            </div>
            <div className={styles.insightCard}>
              <h3>Customer Satisfaction</h3>
              <p className={styles.rating}>⭐ {analytics?.avgRating}/5</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
