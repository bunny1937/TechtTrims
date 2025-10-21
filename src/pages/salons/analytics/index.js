// src/pages/salons/analytics/index.js - COMPLETE REPLACEMENT
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonAnalytics.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salon, setSalon] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalBarbers: 0,
    totalServices: 0,
    avgRating: 0,
    totalReviews: 0,
    todayBookings: 0,
    todayRevenue: 0,
    weekBookings: 0,
    weekRevenue: 0,
    monthBookings: 0,
    monthRevenue: 0,
    yearBookings: 0,
    yearRevenue: 0,
    topService: "-",
    topBarber: "-",
    repeatCustomers: 0,
    completionRate: 0,
  });

  useEffect(() => {
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    const salonId = salonData._id || salonData.id;
    loadAnalytics(salonId);
  }, [router]);

  const loadAnalytics = async (salonId) => {
    try {
      setLoading(true);

      const bookingsRes = await fetch(
        `/api/salons/bookings?salonId=${salonId}&date=all`
      );
      const bookings = await bookingsRes.json();

      const barbersRes = await fetch(`/api/salons/barbers?salonId=${salonId}`);
      const barbers = await barbersRes.json();

      const salonRes = await fetch(`/api/salons/profile?salonId=${salonId}`);
      const salonData = await salonRes.json();

      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const todayBookings = bookings.filter((b) => b.date === today);
      const weekBookings = bookings.filter(
        (b) => new Date(b.createdAt) >= weekAgo
      );
      const monthBookings = bookings.filter(
        (b) => new Date(b.createdAt) >= monthStart
      );
      const yearBookings = bookings.filter(
        (b) => new Date(b.createdAt) >= yearStart
      );

      const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0);
      const todayRevenue = todayBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );
      const weekRevenue = weekBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );
      const monthRevenue = monthBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );
      const yearRevenue = yearBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0
      );

      const serviceCount = {};
      bookings.forEach((b) => {
        serviceCount[b.service] = (serviceCount[b.service] || 0) + 1;
      });
      const topService =
        Object.keys(serviceCount).sort(
          (a, b) => serviceCount[b] - serviceCount[a]
        )[0] || "-";

      const barberCount = {};
      bookings.forEach((b) => {
        if (b.barber) {
          barberCount[b.barber] = (barberCount[b.barber] || 0) + 1;
        }
      });
      const topBarber =
        Object.keys(barberCount).sort(
          (a, b) => barberCount[b] - barberCount[a]
        )[0] || "-";

      const customerPhones = bookings.map((b) => b.customerPhone);
      const uniqueCustomers = [...new Set(customerPhones)];
      const repeatCustomers = customerPhones.filter(
        (phone, index, arr) => arr.indexOf(phone) !== index
      ).length;

      const completedBookings = bookings.filter(
        (b) => b.status === "completed"
      ).length;
      const completionRate =
        bookings.length > 0
          ? ((completedBookings / bookings.length) * 100).toFixed(1)
          : 0;

      const services = salonData.services || {};
      const enabledServices = Object.values(services).filter(
        (s) => s.enabled
      ).length;

      setAnalytics({
        totalBookings: bookings.length,
        totalRevenue,
        totalBarbers: barbers.length,
        totalServices: enabledServices,
        avgRating: salonData.ratings?.overall || 0,
        totalReviews: salonData.ratings?.totalReviews || 0,
        todayBookings: todayBookings.length,
        todayRevenue,
        weekBookings: weekBookings.length,
        weekRevenue,
        monthBookings: monthBookings.length,
        monthRevenue,
        yearBookings: yearBookings.length,
        yearRevenue,
        topService,
        topBarber,
        repeatCustomers: uniqueCustomers.length - repeatCustomers,
        completionRate,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={dashboardStyles.dashboardWrapper}>
        <div className={dashboardStyles.sidebarDesktop}>
          <OwnerSidebar />
        </div>
        <main className={dashboardStyles.mainContent}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={dashboardStyles.dashboardWrapper}>
      {sidebarOpen && (
        <div
          className={dashboardStyles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={dashboardStyles.sidebarMobile}
            onClick={(e) => e.stopPropagation()}
          >
            <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className={dashboardStyles.sidebarDesktop}>
        <OwnerSidebar />
      </div>

      <main className={dashboardStyles.mainContent}>
        <div className={dashboardStyles.mobileTopBar}>
          <button
            className={dashboardStyles.menuButton}
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h2 className={dashboardStyles.mobileTitle}>Analytics</h2>
        </div>

        <div className={styles.container}>
          {/* Overview Stats */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>📈 Overview</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statIcon}>📊</span>
                <h3 className={styles.statLabel}>Total Bookings</h3>
                <p className={styles.statValue}>{analytics.totalBookings}</p>
                <p className={styles.statSubtext}>All time</p>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>💰</span>
                <h3 className={styles.statLabel}>Total Revenue</h3>
                <p className={styles.statValue}>₹{analytics.totalRevenue}</p>
                <p className={styles.statSubtext}>All time earnings</p>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>✂️</span>
                <h3 className={styles.statLabel}>Total Barbers</h3>
                <p className={styles.statValue}>{analytics.totalBarbers}</p>
                <p className={styles.statSubtext}>Active staff</p>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>🎯</span>
                <h3 className={styles.statLabel}>Total Services</h3>
                <p className={styles.statValue}>{analytics.totalServices}</p>
                <p className={styles.statSubtext}>Enabled</p>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>⭐</span>
                <h3 className={styles.statLabel}>Average Rating</h3>
                <p className={styles.statValue}>
                  {analytics.avgRating.toFixed(1)}
                </p>
                <p className={styles.statSubtext}>
                  {analytics.totalReviews} reviews
                </p>
              </div>

              <div className={styles.statCard}>
                <span className={styles.statIcon}>✅</span>
                <h3 className={styles.statLabel}>Completion Rate</h3>
                <p className={styles.statValue}>{analytics.completionRate}%</p>
                <p className={styles.statSubtext}>Success rate</p>
              </div>
            </div>
          </div>

          {/* Time-based Analytics */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>📅 Time-based Analytics</h2>
            <div className={styles.timeGrid}>
              <div className={styles.timeCard}>
                <h3>Today</h3>
                <div className={styles.timeStats}>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Bookings</span>
                    <span className={styles.timeValue}>
                      {analytics.todayBookings}
                    </span>
                  </div>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Revenue</span>
                    <span className={styles.timeValue}>
                      ₹{analytics.todayRevenue}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.timeCard}>
                <h3>This Week</h3>
                <div className={styles.timeStats}>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Bookings</span>
                    <span className={styles.timeValue}>
                      {analytics.weekBookings}
                    </span>
                  </div>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Revenue</span>
                    <span className={styles.timeValue}>
                      ₹{analytics.weekRevenue}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.timeCard}>
                <h3>This Month</h3>
                <div className={styles.timeStats}>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Bookings</span>
                    <span className={styles.timeValue}>
                      {analytics.monthBookings}
                    </span>
                  </div>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Revenue</span>
                    <span className={styles.timeValue}>
                      ₹{analytics.monthRevenue}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.timeCard}>
                <h3>This Year</h3>
                <div className={styles.timeStats}>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Bookings</span>
                    <span className={styles.timeValue}>
                      {analytics.yearBookings}
                    </span>
                  </div>
                  <div className={styles.timeStat}>
                    <span className={styles.timeLabel}>Revenue</span>
                    <span className={styles.timeValue}>
                      ₹{analytics.yearRevenue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🏆 Top Performers</h2>
            <div className={styles.performersGrid}>
              <div className={styles.performerCard}>
                <span className={styles.performerIcon}>🥇</span>
                <h3>Top Service</h3>
                <p className={styles.performerValue}>{analytics.topService}</p>
              </div>

              <div className={styles.performerCard}>
                <span className={styles.performerIcon}>✂️</span>
                <h3>Top Barber</h3>
                <p className={styles.performerValue}>{analytics.topBarber}</p>
              </div>

              <div className={styles.performerCard}>
                <span className={styles.performerIcon}>👥</span>
                <h3>Repeat Customers</h3>
                <p className={styles.performerValue}>
                  {analytics.repeatCustomers}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
