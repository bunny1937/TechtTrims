// src/pages/barber/reviews.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BarberSidebar from "../../components/Barber/BarberSidebar";
import styles from "../../styles/barber/BarberReviews.module.css";
import { Star, MessageSquare, TrendingUp, Award } from "lucide-react";

export default function BarberReviews() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    avgRating: 0,
  });

  useEffect(() => {
    if (!router.isReady) return;

    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession || barberSession === "undefined") {
      router.push("/auth/login");
      return;
    }

    try {
      const barberData = JSON.parse(barberSession);
      if (!barberData || !barberData.id) {
        throw new Error("Invalid barber data");
      }
      setBarber(barberData);
      loadReviews(barberData.id);
    } catch (error) {
      console.error("Failed to parse barber session:", error);
      sessionStorage.removeItem("barberSession");
      router.push("/auth/login");
    }
  }, [router, router.isReady]);

  const loadReviews = async (barberId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/barber/reviews?barberId=${barberId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setStats({
          totalReviews: data.totalReviews,
          avgRating: data.avgRating,
        });
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            fill={star <= rating ? "#f59e0b" : "none"}
            color={star <= rating ? "#f59e0b" : "#cbd5e1"}
          />
        ))}
      </div>
    );
  };

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = Math.floor(review.barberRating || review.rating);
      if (rating >= 1 && rating <= 5) {
        dist[rating]++;
      }
    });
    return dist;
  };

  if (loading || !barber) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} currentPage="reviews" />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading reviews...</div>
        </main>
      </div>
    );
  }

  const distribution = getRatingDistribution();

  return (
    <div className={styles.dashboardWrapper}>
      <BarberSidebar barber={barber} currentPage="reviews" />

      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Customer Reviews</h1>
            <p className={styles.subtitle}>See what customers say about you</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#f59e0b" }}>
              <Star size={32} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Average Rating</p>
              <h3 className={styles.statValue}>{stats.avgRating}</h3>
              <div className={styles.stars}>
                {renderStars(Math.round(stats.avgRating))}
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#3b82f6" }}>
              <MessageSquare size={32} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Total Reviews</p>
              <h3 className={styles.statValue}>{stats.totalReviews}</h3>
              <p className={styles.statSubtext}>All-time feedback</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#10b981" }}>
              <TrendingUp size={32} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>5-Star Reviews</p>
              <h3 className={styles.statValue}>{distribution[5]}</h3>
              <p className={styles.statSubtext}>
                {stats.totalReviews > 0
                  ? ((distribution[5] / stats.totalReviews) * 100).toFixed(1)
                  : 0}
                % of total
              </p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: "#8b5cf6" }}>
              <Award size={32} />
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Performance Score</p>
              <h3 className={styles.statValue}>
                {stats.avgRating >= 4.5
                  ? "Excellent"
                  : stats.avgRating >= 4
                    ? "Great"
                    : stats.avgRating >= 3
                      ? "Good"
                      : "Average"}
              </h3>
              <p className={styles.statSubtext}>
                {stats.avgRating >= 4.5
                  ? "⭐ Top performer!"
                  : "Keep improving"}
              </p>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className={styles.distributionCard}>
          <h3 className={styles.sectionTitle}>Rating Distribution</h3>
          <div className={styles.distributionBars}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className={styles.distributionRow}>
                <span className={styles.ratingLabel}>{rating} ★</span>
                <div className={styles.barContainer}>
                  <div
                    className={styles.bar}
                    style={{
                      width: stats.totalReviews
                        ? `${(distribution[rating] / stats.totalReviews) * 100}%`
                        : "0%",
                    }}
                  ></div>
                </div>
                <span className={styles.countLabel}>
                  {distribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        <div className={styles.reviewsSection}>
          <h2 className={styles.sectionTitle}>
            All Reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare size={64} color="#cbd5e1" />
              <p>No reviews yet</p>
              <span>Complete more bookings to receive feedback</span>
            </div>
          ) : (
            <div className={styles.reviewsList}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.customerInfo}>
                      <div className={styles.avatar}>
                        {review.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className={styles.customerName}>
                          {review.customerName}
                        </h4>
                        <p className={styles.serviceTag}>{review.service}</p>
                      </div>
                    </div>
                    <div className={styles.reviewMeta}>
                      <div className={styles.ratingBadge}>
                        <Star size={16} fill="#f59e0b" color="#f59e0b" />
                        <span>{review.barberRating || review.rating}</span>
                      </div>
                      <p className={styles.reviewDate}>
                        {new Date(review.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {review.comment && (
                    <div className={styles.reviewComment}>
                      <MessageSquare size={18} color="#64748b" />
                      <p>&quot;{review.comment}&quot;</p>
                    </div>
                  )}

                  <div className={styles.reviewFooter}>
                    {renderStars(review.barberRating || review.rating)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
