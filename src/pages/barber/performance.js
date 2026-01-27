// src/pages/barber/performance.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/barber/BarberPerformance.module.css";
import {
  TrendingUp,
  Star,
  Users,
  Clock,
  Award,
  ChevronLeft,
  BarChart3,
  Calendar,
  Target,
  ThumbsUp,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import BarberSidebar from "@/components/Barber/BarberSidebar";

export default function BarberPerformance() {
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  // Performance data
  const [performanceData, setPerformanceData] = useState({
    rating: 0,
    totalReviews: 0,
    totalBookings: 0,
    completedBookings: 0,
    avgServiceTime: 0,
    customerSatisfaction: 0,
    repeatCustomers: 0,
    onTimeRate: 0,
  });

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [ratingDistribution, setRatingDistribution] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });

  // Monthly stats
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // week, month, year

  // Load barber session
  useEffect(() => {
    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession) {
      router.push("/auth/barber/login");
      return;
    }
    const barberData = JSON.parse(barberSession);
    setBarber(barberData);
    loadPerformance(barberData._id || barberData.id);
  }, []);

  // Reload on period change
  useEffect(() => {
    if (barber) {
      loadPerformance(barber._id || barber.id);
    }
  }, [selectedPeriod]);

  // Load performance data
  const loadPerformance = async (barberId) => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/barber/performance?barberId=${barberId}&period=${selectedPeriod}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load performance");
      }

      const data = await res.json();
      setPerformanceData(data.summary || {});
      setReviews(data.reviews || []);
      setRatingDistribution(data.ratingDistribution || {});
      setMonthlyStats(data.monthlyStats || []);
    } catch (err) {
      console.error("Error loading performance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render stars
  const renderStars = (rating) => {
    return Array(5)
      .fill(0)
      .map((_, idx) => (
        <Star
          key={idx}
          size={16}
          className={idx < rating ? styles.starFilled : styles.starEmpty}
          fill={idx < rating ? "currentColor" : "none"}
        />
      ));
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <BarberSidebar barber={barber} currentPage="performance" />

      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button
                className={styles.backButton}
                onClick={() => router.push("/barber/dashboard")}
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <div className={styles.headerTitle}>
                <BarChart3 className={styles.headerIcon} size={28} />
                <div>
                  <h1>Performance</h1>
                  <p>{barber?.name}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Period Selector */}
          <div className={styles.periodSelector}>
            <button
              className={`${styles.periodButton} ${
                selectedPeriod === "week" ? styles.periodActive : ""
              }`}
              onClick={() => setSelectedPeriod("week")}
            >
              This Week
            </button>
            <button
              className={`${styles.periodButton} ${
                selectedPeriod === "month" ? styles.periodActive : ""
              }`}
              onClick={() => setSelectedPeriod("month")}
            >
              This Month
            </button>
            <button
              className={`${styles.periodButton} ${
                selectedPeriod === "year" ? styles.periodActive : ""
              }`}
              onClick={() => setSelectedPeriod("year")}
            >
              This Year
            </button>
          </div>

          {/* Main Stats */}
          <div className={styles.mainStatsGrid}>
            <div className={`${styles.mainStatCard} ${styles.ratingCard}`}>
              <div className={styles.mainStatIcon}>
                <Star size={32} />
              </div>
              <div className={styles.mainStatContent}>
                <div className={styles.mainStatValue}>
                  {performanceData.rating.toFixed(1)}
                  <span className={styles.outOf}>/5.0</span>
                </div>
                <p className={styles.mainStatLabel}>Average Rating</p>
                <div className={styles.starsContainer}>
                  {renderStars(Math.round(performanceData.rating))}
                </div>
                <p className={styles.reviewCount}>
                  {performanceData.totalReviews} reviews
                </p>
              </div>
            </div>

            <div className={`${styles.mainStatCard} ${styles.bookingsCard}`}>
              <div className={styles.mainStatIcon}>
                <Users size={32} />
              </div>
              <div className={styles.mainStatContent}>
                <div className={styles.mainStatValue}>
                  {performanceData.completedBookings}
                </div>
                <p className={styles.mainStatLabel}>Bookings Completed</p>
                <p className={styles.subStat}>
                  Total: {performanceData.totalBookings}
                </p>
              </div>
            </div>

            <div className={`${styles.mainStatCard} ${styles.timeCard}`}>
              <div className={styles.mainStatIcon}>
                <Clock size={32} />
              </div>
              <div className={styles.mainStatContent}>
                <div className={styles.mainStatValue}>
                  {performanceData.avgServiceTime}
                  <span className={styles.unit}>min</span>
                </div>
                <p className={styles.mainStatLabel}>Avg. Service Time</p>
                <p className={styles.subStat}>
                  On-time: {performanceData.onTimeRate}%
                </p>
              </div>
            </div>

            <div
              className={`${styles.mainStatCard} ${styles.satisfactionCard}`}
            >
              <div className={styles.mainStatIcon}>
                <ThumbsUp size={32} />
              </div>
              <div className={styles.mainStatContent}>
                <div className={styles.mainStatValue}>
                  {performanceData.customerSatisfaction}%
                </div>
                <p className={styles.mainStatLabel}>Customer Satisfaction</p>
                <p className={styles.subStat}>
                  Repeat: {performanceData.repeatCustomers}%
                </p>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className={styles.distributionCard}>
            <div className={styles.cardHeader}>
              <Award className={styles.sectionIcon} />
              <h2>Rating Distribution</h2>
            </div>
            <div className={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingDistribution[rating] || 0;
                const percentage =
                  performanceData.totalReviews > 0
                    ? (count / performanceData.totalReviews) * 100
                    : 0;

                return (
                  <div key={rating} className={styles.ratingBarRow}>
                    <div className={styles.ratingLabel}>
                      {rating} <Star size={14} />
                    </div>
                    <div className={styles.ratingBar}>
                      <div
                        className={styles.ratingBarFill}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className={styles.ratingCount}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Performance Chart */}
          {monthlyStats.length > 0 && (
            <div className={styles.chartCard}>
              <div className={styles.cardHeader}>
                <Calendar className={styles.sectionIcon} />
                <h2>Monthly Performance Trend</h2>
              </div>
              <div className={styles.chart}>
                {monthlyStats.map((stat, idx) => {
                  const maxBookings = Math.max(
                    ...monthlyStats.map((s) => s.bookings),
                  );
                  const height = (stat.bookings / maxBookings) * 100;

                  return (
                    <div key={idx} className={styles.chartBar}>
                      <div className={styles.chartBarValue}>
                        {stat.bookings}
                      </div>
                      <div
                        className={styles.chartBarFill}
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className={styles.chartBarLabel}>{stat.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className={styles.achievementsCard}>
            <div className={styles.cardHeader}>
              <Target className={styles.sectionIcon} />
              <h2>Achievements</h2>
            </div>
            <div className={styles.achievementsGrid}>
              <div className={styles.achievementItem}>
                <div className={styles.achievementIcon}>
                  <CheckCircle size={32} />
                </div>
                <h3>100 Services</h3>
                <p>Completed 100+ bookings</p>
              </div>
              <div className={styles.achievementItem}>
                <div className={styles.achievementIcon}>
                  <Star size={32} />
                </div>
                <h3>Top Rated</h3>
                <p>Maintained 4.5+ rating</p>
              </div>
              <div className={styles.achievementItem}>
                <div className={styles.achievementIcon}>
                  <Users size={32} />
                </div>
                <h3>Customer Favorite</h3>
                <p>50+ repeat customers</p>
              </div>
              <div className={styles.achievementItem}>
                <div className={styles.achievementIcon}>
                  <Clock size={32} />
                </div>
                <h3>Punctual Pro</h3>
                <p>95%+ on-time rate</p>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className={styles.reviewsCard}>
            <div className={styles.cardHeader}>
              <MessageSquare className={styles.sectionIcon} />
              <h2>Recent Reviews</h2>
            </div>
            {reviews.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={64} />
                <p>No reviews yet</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((review, idx) => (
                  <div key={idx} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUser}>
                        <div className={styles.userAvatar}>
                          {review.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className={styles.userName}>
                            {review.customerName}
                          </h4>
                          <p className={styles.reviewDate}>
                            {new Date(review.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={styles.reviewRating}>
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    {review.comment && (
                      <p className={styles.reviewComment}>{review.comment}</p>
                    )}
                    <div className={styles.reviewService}>
                      Service: {review.service}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
