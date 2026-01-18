import { useState, useEffect } from "react";
import styles from "../../styles/ReviewsSection.module.css";

export default function ReviewsSection({ salonId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("relevant"); // 'relevant' or 'recent'
  const [displayCount, setDisplayCount] = useState(4); // Show 6 reviews initially
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const REVIEWS_PER_PAGE = 6;

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(
          `/api/salons/${salonId}/reviews-paginated?page=${currentPage}&limit=${REVIEWS_PER_PAGE}&filter=${filter}&sort=${sortBy}`
        );

        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews);
          setStats(data.stats);
          setTotalPages(data.totalPages);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [salonId, currentPage, filter, sortBy]);

  const getRatingCategory = (rating) => {
    if (rating >= 4) return "positive";
    if (rating >= 3) return "medium";
    return "critical";
  };

  const calculateRelevanceScore = (review) => {
    let score = 0;

    // Rating weight (40%)
    score += review.rating * 8;

    // Comment length weight (30%)
    const commentLength = review.comment?.length || 0;
    score += Math.min(commentLength / 10, 30);

    // Recency weight (30%)
    const daysSinceReview =
      (Date.now() - new Date(review.submittedAt)) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 30 - daysSinceReview / 3);
    score += recencyBonus;

    // Detailed ratings bonus (10%)
    const ratingsCount = Object.values(review.ratings || {}).filter(
      (r) => r > 0
    ).length;
    score += ratingsCount * 2.5;

    return score;
  };

  // Sort reviews based on selected option
  const getSortedReviews = () => {
    let sorted = [...reviews];

    if (sortBy === "recent") {
      // Sort by submission date (newest first)
      sorted.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } else {
      // Sort by relevance score (highest first)
      sorted.sort(
        (a, b) => calculateRelevanceScore(b) - calculateRelevanceScore(a)
      );
    }

    return sorted;
  };

  const sortedReviews = getSortedReviews();

  const filteredReviews =
    filter === "all"
      ? sortedReviews
      : sortedReviews.filter((r) => getRatingCategory(r.rating) === filter);

  const displayedReviews = filteredReviews.slice(0, displayCount);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setDisplayCount(REVIEWS_PER_PAGE);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setDisplayCount(REVIEWS_PER_PAGE);
  };

  if (loading) {
    return <div className={styles.loading}>Loading reviews...</div>;
  }

  if (!stats || reviews.length === 0) {
    return (
      <div className={styles.noReviews}>
        <p>No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className={styles.reviewsSection}>
      <h2 className={styles.mainTitle}>Customer Reviews & Ratings</h2>
      <div className={styles.reviewsContainer}>
        <div className={styles.reviewsContainerleft}>
          {/* Compact Stats Header */}
          <div className={styles.statsHeader}>
            {/* Overall Rating */}
            <div className={styles.overallBox}>
              <div className={styles.bigRating}>
                {Number(stats.averageRating || 0).toFixed(1)}
              </div>

              <div className={styles.stars}>
                {"⭐".repeat(Math.round(stats.averageRating))}
              </div>
              <div className={styles.reviewCount}>
                {stats.totalReviews} reviews
              </div>
            </div>

            {/* Compact Breakdown */}
            <div className={styles.breakdown}>
              <div className={styles.breakdownRow}>
                <span className={styles.label}>😊 Positive</span>
                <div className={styles.bar}>
                  <div
                    className={`${styles.fill} ${styles.positive}`}
                    style={{ width: `${stats.positivePercentage}%` }}
                  />
                </div>
                <span className={styles.percent}>
                  {stats.positivePercentage}%
                </span>
                <span className={styles.count}>({stats.positiveCount})</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.label}>😐 Average</span>
                <div className={styles.bar}>
                  <div
                    className={`${styles.fill} ${styles.medium}`}
                    style={{ width: `${stats.mediumPercentage}%` }}
                  />
                </div>
                <span className={styles.percent}>
                  {stats.mediumPercentage}%
                </span>
                <span className={styles.count}>({stats.mediumCount})</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.label}>😟 Critical</span>
                <div className={styles.bar}>
                  <div
                    className={`${styles.fill} ${styles.critical}`}
                    style={{ width: `${stats.criticalPercentage}%` }}
                  />
                </div>
                <span className={styles.percent}>
                  {stats.criticalPercentage}%
                </span>
                <span className={styles.count}>({stats.criticalCount})</span>
              </div>
            </div>
          </div>
          <div className={styles.controls}>
            {/* Category Filter Pills */}
            <div className={styles.filterPills}>
              <button
                className={`${styles.pill} ${
                  filter === "all" ? styles.active : ""
                }`}
                onClick={() => handleFilterChange("all")}
              >
                All ({reviews.length})
              </button>
              <button
                className={`${styles.pill} ${
                  filter === "positive" ? styles.active : ""
                }`}
                onClick={() => handleFilterChange("positive")}
              >
                Positive ({stats.positiveCount})
              </button>
              <button
                className={`${styles.pill} ${
                  filter === "medium" ? styles.active : ""
                }`}
                onClick={() => handleFilterChange("medium")}
              >
                Average ({stats.mediumCount})
              </button>
              <button
                className={`${styles.pill} ${
                  filter === "critical" ? styles.active : ""
                }`}
                onClick={() => handleFilterChange("critical")}
              >
                Critical ({stats.criticalCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className={styles.sortDropdown}>
              <div className={styles.sortLabel}>
                <label htmlFor="sort">Sort by:</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  <option value="relevant">Most Relevant</option>
                  <option value="recent">Most Recent</option>
                </select>
                {/* Show More */}
              </div>
              <div className={styles.pagination}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  ← Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
          {/* Reviews Grid - 3 Columns */}
          <div className={styles.reviewsGrid}>
            {displayedReviews.map((review) => (
              <div key={review._id} className={styles.reviewCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.user}>
                    <div className={styles.avatar}>
                      {review.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.name}>{review.customerName}</div>
                      <div className={styles.service}>{review.service}</div>
                    </div>
                  </div>
                  <div className={styles.badge}>{review.rating}⭐</div>
                </div>

                {review.comment && (
                  <p className={styles.comment}>&quot;{review.comment}&quot;</p>
                )}

                <div className={styles.meta}>
                  <span className={styles.date}>
                    {new Date(review.serviceDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.reviewsContainerright}></div>

        {displayedReviews.length === 0 && (
          <div className={styles.noResults}>
            No reviews found for this filter
          </div>
        )}
      </div>
    </div>
  );
}
