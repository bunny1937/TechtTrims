// src/pages/salons/reviews/index.js - COMPLETE NEW FILE
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonReviews.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";

export default function ReviewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Stats
  const [stats, setStats] = useState({
    totalReviews: 0,
    avgOverall: 0,
    avgServiceQuality: 0,
    avgTiming: 0,
    avgAmbience: 0,
    avgCleanliness: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0,
  });

  useEffect(() => {
    const loadReviews = async (salonId) => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/salons/bookings?salonId=${salonId}&date=all`
        );
        const bookings = await res.json();

        const reviewedBookings = bookings.filter(
          (b) => b.feedback && b.feedback.submitted
        );

        const reviewsData = reviewedBookings.map((b) => ({
          _id: b._id,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          service: b.service,
          barber: b.barber || "Unassigned",
          bookingDate: b.feedback.serviceDate || b.date || b.createdAt, // ✅ CORRECT - use serviceDate from feedback
          bookingCode: b.bookingCode,
          ratings: {
            overall: b.feedback.ratings?.overall || 0,
            serviceQuality: b.feedback.ratings?.serviceQuality || 0,
            timing: b.feedback.ratings?.timing || 0,
            ambience: b.feedback.ratings?.ambience || 0,
            cleanliness: b.feedback.ratings?.cleanliness || 0,
            barberPerformance: b.feedback.ratings?.barberPerformance || 0,
          },
          comment: b.feedback.comment || "",
          submittedAt: b.feedback.submittedAt || b.updatedAt,
        }));

        setReviews(reviewsData);
        setFilteredReviews(reviewsData);
        calculateStats(reviewsData);
      } catch (error) {
        console.error("Error loading reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    const salonId = salonData._id || salonData.id;
    loadReviews(salonId);
  }, [router]);

  const calculateStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setStats({
        totalReviews: 0,
        avgOverall: 0,
        avgServiceQuality: 0,
        avgTiming: 0,
        avgAmbience: 0,
        avgCleanliness: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      });
      return;
    }

    const totalReviews = reviewsData.length;

    const avgOverall = (
      reviewsData.reduce((sum, r) => sum + r.ratings.overall, 0) / totalReviews
    ).toFixed(1);
    const avgServiceQuality = (
      reviewsData.reduce((sum, r) => sum + r.ratings.serviceQuality, 0) /
      totalReviews
    ).toFixed(1);
    const avgTiming = (
      reviewsData.reduce((sum, r) => sum + r.ratings.timing, 0) / totalReviews
    ).toFixed(1);
    const avgAmbience = (
      reviewsData.reduce((sum, r) => sum + r.ratings.ambience, 0) / totalReviews
    ).toFixed(1);
    const avgCleanliness = (
      reviewsData.reduce((sum, r) => sum + r.ratings.cleanliness, 0) /
      totalReviews
    ).toFixed(1);

    const fiveStars = reviewsData.filter(
      (r) => r.ratings.overall >= 4.5
    ).length;
    const fourStars = reviewsData.filter(
      (r) => r.ratings.overall >= 3.5 && r.ratings.overall < 4.5
    ).length;
    const threeStars = reviewsData.filter(
      (r) => r.ratings.overall >= 2.5 && r.ratings.overall < 3.5
    ).length;
    const twoStars = reviewsData.filter(
      (r) => r.ratings.overall >= 1.5 && r.ratings.overall < 2.5
    ).length;
    const oneStar = reviewsData.filter((r) => r.ratings.overall < 1.5).length;

    setStats({
      totalReviews,
      avgOverall: parseFloat(avgOverall),
      avgServiceQuality: parseFloat(avgServiceQuality),
      avgTiming: parseFloat(avgTiming),
      avgAmbience: parseFloat(avgAmbience),
      avgCleanliness: parseFloat(avgCleanliness),
      fiveStars,
      fourStars,
      threeStars,
      twoStars,
      oneStar,
    });
  };

  useEffect(() => {
    let result = [...reviews];

    // Search filter
    if (searchTerm) {
      result = result.filter(
        (r) =>
          r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.customerPhone?.includes(searchTerm) ||
          r.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const rating = parseInt(ratingFilter);
      result = result.filter((r) => Math.floor(r.ratings.overall) === rating);
    }

    // Sort
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    } else if (sortBy === "highest") {
      result.sort((a, b) => b.ratings.overall - a.ratings.overall);
    } else if (sortBy === "lowest") {
      result.sort((a, b) => a.ratings.overall - b.ratings.overall);
    }

    setFilteredReviews(result);
  }, [searchTerm, ratingFilter, sortBy, reviews]);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={`full-${i}`} className={styles.starFilled}>
          ★
        </span>
      );
    }
    if (hasHalfStar) {
      stars.push(
        <span key="half" className={styles.starHalf}>
          ★
        </span>
      );
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className={styles.starEmpty}>
          ☆
        </span>
      );
    }
    return stars;
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
            <p>Loading reviews...</p>
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
          <h2 className={dashboardStyles.mobileTitle}>Reviews</h2>
        </div>

        <div className={styles.container}>
          {/* Header */}
          <div className={styles.headerCard}>
            <h1>⭐ Customer Reviews</h1>
            <p>View and manage all customer feedback</p>
          </div>

          {/* Rating Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>⭐</span>
              <h3 className={styles.statLabel}>Overall Rating</h3>
              <p className={styles.statValue}>{stats.avgOverall}</p>
              <div className={styles.stars}>
                {renderStars(stats.avgOverall)}
              </div>
              <p className={styles.statSubtext}>{stats.totalReviews} reviews</p>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>🎯</span>
              <h3 className={styles.statLabel}>Service Quality</h3>
              <p className={styles.statValue}>{stats.avgServiceQuality}</p>
              <div className={styles.stars}>
                {renderStars(stats.avgServiceQuality)}
              </div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>⏰</span>
              <h3 className={styles.statLabel}>Timing</h3>
              <p className={styles.statValue}>{stats.avgTiming}</p>
              <div className={styles.stars}>{renderStars(stats.avgTiming)}</div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>🏪</span>
              <h3 className={styles.statLabel}>Ambience</h3>
              <p className={styles.statValue}>{stats.avgAmbience}</p>
              <div className={styles.stars}>
                {renderStars(stats.avgAmbience)}
              </div>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>✨</span>
              <h3 className={styles.statLabel}>Cleanliness</h3>
              <p className={styles.statValue}>{stats.avgCleanliness}</p>
              <div className={styles.stars}>
                {renderStars(stats.avgCleanliness)}
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className={styles.distributionCard}>
            <h2 className={styles.sectionTitle}>Rating Distribution</h2>
            <div className={styles.distributionBars}>
              {[
                { stars: 5, count: stats.fiveStars },
                { stars: 4, count: stats.fourStars },
                { stars: 3, count: stats.threeStars },
                { stars: 2, count: stats.twoStars },
                { stars: 1, count: stats.oneStar },
              ].map((item) => (
                <div key={item.stars} className={styles.distributionRow}>
                  <span className={styles.distributionLabel}>
                    {item.stars} ⭐
                  </span>
                  <div className={styles.distributionBarWrapper}>
                    <div
                      className={styles.distributionBar}
                      style={{
                        width:
                          stats.totalReviews > 0
                            ? `${(item.count / stats.totalReviews) * 100}%`
                            : "0%",
                      }}
                    ></div>
                  </div>
                  <span className={styles.distributionCount}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filtersCard}>
            <h3 className={styles.filtersTitle}>🔍 Filters</h3>

            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name, phone, or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Rating</label>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className={styles.reviewsSection}>
            <h3 className={styles.sectionTitle}>
              Showing {filteredReviews.length} of {reviews.length} reviews
            </h3>

            {filteredReviews.length > 0 ? (
              <div className={styles.reviewsGrid}>
                {filteredReviews.map((review) => (
                  <div key={review._id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <span className={styles.bookingCode}>
                        #{review.bookingCode}
                      </span>
                      <span className={styles.reviewDate}>
                        {new Date(review.submittedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.avatar}>
                          {review.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4>{review.customerName}</h4>
                          <p className={styles.reviewerPhone}>
                            {review.customerPhone}
                          </p>
                        </div>
                      </div>
                      <div className={styles.overallRating}>
                        <span className={styles.ratingNumber}>
                          {review.ratings.overall.toFixed(1)}
                        </span>
                        <div className={styles.stars}>
                          {renderStars(review.ratings.overall)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.reviewDetails}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Service:</span>
                        <span>{review.service}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Barber:</span>
                        <span>{review.barber}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Date:</span>
                        <span>
                          {review.bookingDate
                            ? new Date(review.bookingDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.ratingsBreakdown}>
                      <div className={styles.ratingItem}>
                        <span>Service Quality</span>
                        <span>
                          {review.ratings.serviceQuality.toFixed(1)} ⭐
                        </span>
                      </div>
                      <div className={styles.ratingItem}>
                        <span>Timing</span>
                        <span>{review.ratings.timing.toFixed(1)} ⭐</span>
                      </div>
                      <div className={styles.ratingItem}>
                        <span>Ambience</span>
                        <span>{review.ratings.ambience.toFixed(1)} ⭐</span>
                      </div>
                      <div className={styles.ratingItem}>
                        <span>Cleanliness</span>
                        <span>{review.ratings.cleanliness.toFixed(1)} ⭐</span>
                      </div>
                      {review.ratings.barberPerformance > 0 && (
                        <div className={styles.ratingItem}>
                          <span>Barber Performance</span>
                          <span>
                            {review.ratings.barberPerformance.toFixed(1)} ⭐
                          </span>
                        </div>
                      )}
                    </div>

                    {review.comment && (
                      <div className={styles.reviewComment}>
                        <p>&quot;{review.comment}&quot;</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No reviews found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
