//pages/user/dashboard.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/User.module.css";
import Link from "next/link";
import { UserDataManager } from "../../lib/userData";
import { removeAuthToken } from "../../lib/cookieAuth";
import { getAuthToken } from "../../lib/cookieAuth";
import { showConfirm, showSuccess } from "@/lib/toast";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: "UPI", details: "example@upi", default: true },
    { id: 2, type: "Card", details: "**** **** **** 4532", default: false },
  ]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    phoneNumber: "",
    age: "",
    gender: "",
    location: null,
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push("/auth/user/login");
          return;
        }

        setIsLoading(true);

        // ✅ Simple profile load with credentials
        try {
          const userRes = await fetch("/api/user/profile", {
            credentials: "include", // ✅ Include HttpOnly cookies
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
            setFormData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || userData.phoneNumber || "",
              phoneNumber: userData.phoneNumber || userData.phone || "",
              age: userData.age || "",
              gender: userData.gender || "",
              location: userData.location || null,
            });
          }
        } catch (err) {
          console.error("Profile error:", err);
        }

        // Simple bookings load
        // ✅ Simple bookings load with credentials
        try {
          const bookingsRes = await fetch("/api/user/bookings", {
            credentials: "include", // ✅ Include HttpOnly cookies
          });

          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json();
            setBookings(Array.isArray(bookingsData) ? bookingsData : []);
          }
        } catch (err) {
          console.error("Bookings error:", err);
          setBookings([]);
        }

        // Simple payments load
        // ✅ Simple payments load with credentials
        try {
          const paymentsRes = await fetch("/api/user/payments", {
            credentials: "include", // ✅ Include HttpOnly cookies
          });

          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            setPayments(Array.isArray(paymentsData) ? paymentsData : []);
          }
        } catch (err) {
          console.error("Payments error:", err);
          setPayments([]);
        }
      } catch (error) {
        console.error("Overall error:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
    // Confirm logout
    showConfirm("Are you sure you want to logout?", () => {
      // ✅ Clear ALL authentication data
      UserDataManager.clearUserData(); // Clears HttpOnly cookie + session EXCEPT location

      if (typeof window !== "undefined") {
        // ✅ Clear other storage
        localStorage.removeItem("salonToken");
        localStorage.removeItem("ownerToken");
      }

      showSuccess("Logged out successfully!");
      // Force redirect to home page
      window.location.href = "/";
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <div className={styles.userProfile}>
          <h2>Welcome, {user?.name || "User"}</h2>
          <p>
            {user?.email || "No email"} || {user?.phoneNumber}
          </p>
        </div>

        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${
              activeTab === "overview" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`${styles.navItem} ${
              activeTab === "bookings" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("bookings")}
          >
            📅 My Bookings
          </button>
          <button
            className={`${styles.navItem} ${
              activeTab === "payments" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("payments")}
          >
            💳 Payments
          </button>
          <button
            className={`${styles.navItem} ${
              activeTab === "reviews" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("reviews")}
          >
            ⭐ My Reviews
          </button>
          <button
            className={`${styles.navItem} ${
              activeTab === "profile" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Profile
          </button>
          <button className={styles.logoutButton} onClick={handleLogout}>
            🚪 Logout
          </button>
        </nav>
      </div>

      <div className={styles.content}>
        {activeTab === "bookings" && (
          <div className={styles.bookings}>
            <h1>My Bookings ({bookings.length})</h1>
            <div className={styles.bookingsList}>
              {bookings.map((booking) => (
                <div
                  key={booking._id || booking.id || booking.bookingCode}
                  className={styles.bookingCard}
                  onClick={() =>
                    router.push(
                      `/walkin/confirmation?bookingId=${
                        booking._id || booking.id
                      }`
                    )
                  }
                  style={{ cursor: "pointer" }}
                >
                  <div key={booking._id} className={styles.bookingCard}>
                    <div className={styles.bookingHeader}>
                      <h3>{booking.service}</h3>
                      <div className={styles.badges}>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[booking.status]
                          }`}
                        >
                          {booking.status}
                        </span>
                        {booking.bookingType && (
                          <span
                            className={`${styles.typeBadge} ${
                              booking.bookingType === "WALKIN"
                                ? styles.walkin
                                : styles.prebook
                            }`}
                          >
                            {booking.bookingType === "WALKIN"
                              ? "🚶 Walk-in"
                              : "📅 Pre-book"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.bookingDetails}>
                      {booking.bookingType === "WALKIN" ? (
                        <>
                          <p>
                            <strong>📅 Date:</strong>{" "}
                            {booking.createdAt
                              ? new Date(booking.createdAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                          <p>
                            <strong>⏰ Time:</strong>{" "}
                            {booking.createdAt
                              ? new Date(booking.createdAt).toLocaleTimeString()
                              : "N/A"}
                          </p>
                          <p>
                            <strong>🏪 Salon:</strong> {booking.salonName}
                          </p>
                          <p>
                            <strong>💈 Barber:</strong>{" "}
                            {booking.barberName || "Not assigned"}
                          </p>
                          <p>
                            <strong>💰 Price:</strong>{" "}
                            {booking.price
                              ? `₹${booking.price}`
                              : "Paid at salon"}
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong>📅 Date:</strong> {booking.date}
                          </p>
                          <p>
                            <strong>⏰ Time:</strong> {booking.time}
                          </p>
                          <p>
                            <strong>🏪 Salon:</strong> {booking.salonName}
                          </p>
                          {booking.barber && (
                            <p>
                              <strong>💈 Barber:</strong> {booking.barber}
                            </p>
                          )}
                          <p>
                            <strong>💰 Price:</strong> ₹{booking.price || 0}
                          </p>
                        </>
                      )}
                      {booking.feedback?.ratings?.overall && (
                        <p>
                          <strong>⭐ Your Rating:</strong>{" "}
                          {booking.feedback.ratings.overall}/5
                        </p>
                      )}
                    </div>
                    {booking.status === "completed" &&
                      !booking.feedback?.submitted && (
                        <button
                          className={styles.feedbackButton}
                          onClick={() =>
                            router.push(`/feedback?bookingId=${booking._id}`)
                          }
                        >
                          📝 Give Feedback
                        </button>
                      )}
                  </div>
                </div>
              ))}
              {bookings.length === 0 && (
                <div className={styles.emptyState}>
                  <p>📅 No bookings found</p>
                  <button
                    onClick={() => router.push("/")}
                    className={styles.bookNowButton}
                  >
                    Book Your First Service
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keep all other tabs as-is */}
        {activeTab === "overview" && (
          <div>
            <div className={styles.overview}>
              <Link href="/" className={styles.backLink}>
                Home
              </Link>
              <h1>Dashboard Overview</h1>
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <h3>Total Bookings</h3>
                <p>{bookings.length}</p>
              </div>
              <div className={styles.statCard}>
                <h3>Upcoming</h3>
                <p>{bookings.filter((b) => b.status === "confirmed").length}</p>
              </div>
              <div className={styles.statCard}>
                <h3>Completed</h3>
                <p>{bookings.filter((b) => b.status === "completed").length}</p>
              </div>
              <div className={styles.statCard}>
                <h3>Total Spent</h3>
                <p>
                  ₹{payments.reduce((total, p) => total + (p.amount || 0), 0)}
                </p>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className={styles.recentSection}>
              <h2>Recent Bookings</h2>
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking._id} className={styles.bookingCard}>
                  <div className={styles.bookingHeader}>
                    <h3>{booking.service}</h3>
                    <div className={styles.badges}>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[booking.status]
                        }`}
                      >
                        {booking.status}
                      </span>
                      {booking.bookingType && (
                        <span
                          className={`${styles.typeBadge} ${
                            booking.bookingType === "WALKIN"
                              ? styles.walkin
                              : styles.prebook
                          }`}
                        >
                          {booking.bookingType === "WALKIN"
                            ? "🚶 Walk-in"
                            : "📅 Pre-book"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.bookingDetails}>
                    {booking.bookingType === "WALKIN" ? (
                      <>
                        <p>
                          📅{" "}
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString()
                            : "N/A"}{" "}
                          at{" "}
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleTimeString()
                            : "N/A"}
                        </p>
                        <p>🏪 {booking.salonName}</p>
                        <p>💈 {booking.barberName || "Not assigned"}</p>
                      </>
                    ) : (
                      <>
                        <p>
                          📅 {booking.date} at {booking.time}
                        </p>
                        <p>🏪 {booking.salonName}</p>
                        {booking.barber && <p>💈 {booking.barber}</p>}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {bookings.length === 0 && (
                <p className={styles.noData}>
                  No bookings yet.{" "}
                  <Link href="/">Book your first service!</Link>
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className={styles.profile}>
            <h1>Profile Settings</h1>
            <div className={styles.profileCard}>
              <div className={styles.profileForm}>
                <div className={styles.formGroup}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber || formData.phone}
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Age</label>
                  <input
                    type="text"
                    value={
                      formData.age ? `${formData.age} years` : "Not provided"
                    }
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Gender</label>
                  <input type="text" value={formData.gender} readOnly />
                </div>
                {formData.location && (
                  <div className={styles.formGroup}>
                    <label>Location</label>
                    <input
                      type="text"
                      value={formData.location.address || "Location set"}
                      readOnly
                    />
                  </div>
                )}
              </div>
              <div className={styles.profileActions}>
                <p className={styles.note}>
                  📝 Profile editing will be available in future updates
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {activeTab === "reviews" && (
          <div className={styles.reviewsSection}>
            <div className={styles.sectionHeader}>
              <h2>📝 My Reviews</h2>
              <p className={styles.subtitle}>
                {bookings.filter((b) => b.feedback?.submitted).length} reviews
                submitted
              </p>
            </div>

            {bookings.filter((b) => b.feedback?.submitted).length === 0 ? (
              <div className={styles.emptyState}>
                <p>🎭 No reviews yet</p>
                <p>Complete a booking and share your experience!</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {bookings
                  .filter((b) => b.feedback?.submitted)
                  .map((booking) => (
                    <div key={booking._id} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewSalon}>
                          <h3>{booking.salonName}</h3>
                          <p className={styles.reviewDate}>
                            {new Date(
                              booking.feedback.submittedAt
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(
                              booking.feedback.submittedAt
                            ).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className={styles.overallRating}>
                          <span className={styles.ratingNumber}>
                            {booking.feedback.ratings.overall}
                          </span>
                          <span className={styles.ratingStars}>⭐</span>
                        </div>
                      </div>

                      <div className={styles.reviewDetails}>
                        <p>
                          <strong>Service:</strong> {booking.service}
                        </p>
                        <p>
                          <strong>Barber:</strong> {booking.barberName}
                        </p>
                        <p>
                          <strong>Price:</strong> ₹{booking.price}
                        </p>
                      </div>

                      <div className={styles.ratingsGrid}>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>
                            Service Quality
                          </span>
                          <span className={styles.ratingValue}>
                            {booking.feedback.ratings.serviceQuality}/5 ⭐
                          </span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>Timing</span>
                          <span className={styles.ratingValue}>
                            {booking.feedback.ratings.timing}/5 ⭐
                          </span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>Barber</span>
                          <span className={styles.ratingValue}>
                            {booking.feedback.ratings.barberPerformance}/5 ⭐
                          </span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>Ambience</span>
                          <span className={styles.ratingValue}>
                            {booking.feedback.ratings.ambience}/5 ⭐
                          </span>
                        </div>
                        <div className={styles.ratingItem}>
                          <span className={styles.ratingLabel}>
                            Cleanliness
                          </span>
                          <span className={styles.ratingValue}>
                            {booking.feedback.ratings.cleanliness}/5 ⭐
                          </span>
                        </div>
                      </div>

                      {booking.feedback.comment && (
                        <div className={styles.reviewComment}>
                          <p className={styles.commentLabel}>
                            💬 Your Comment:
                          </p>
                          <p className={styles.commentText}>
                            {booking.feedback.comment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
        {/* Payments Section */}
        {activeTab === "payments" && (
          <div className={styles.paymentsSection}>
            <div className={styles.sectionHeader}>
              <h2>💳 Payment Methods</h2>
              <button
                className={styles.addPaymentBtn}
                onClick={() => setShowAddPayment(!showAddPayment)}
              >
                {showAddPayment ? "Cancel" : "+ Add Payment Method"}
              </button>
            </div>

            {/* Add Payment Form */}
            {showAddPayment && (
              <div className={styles.addPaymentForm}>
                <h3>Add New Payment Method</h3>
                <div className={styles.paymentOptions}>
                  <button className={styles.paymentOption}>
                    <span className={styles.paymentIcon}>📱</span>
                    <span>UPI</span>
                  </button>
                  <button className={styles.paymentOption}>
                    <span className={styles.paymentIcon}>💳</span>
                    <span>Credit/Debit Card</span>
                  </button>
                  <button className={styles.paymentOption}>
                    <span className={styles.paymentIcon}>💵</span>
                    <span>Cash</span>
                  </button>
                </div>

                {/* UPI Form Example */}
                <div className={styles.paymentForm}>
                  <label>UPI ID</label>
                  <input
                    type="text"
                    placeholder="yourname@upi"
                    className={styles.input}
                  />
                  <button className={styles.saveBtn}>Save UPI</button>
                </div>
              </div>
            )}

            {/* Saved Payment Methods */}
            <div className={styles.paymentMethodsList}>
              {paymentMethods.map((method) => (
                <div key={method.id} className={styles.paymentCard}>
                  <div className={styles.paymentCardHeader}>
                    <div className={styles.paymentType}>
                      <span className={styles.paymentIcon}>
                        {method.type === "UPI"
                          ? "📱"
                          : method.type === "Card"
                          ? "💳"
                          : "💵"}
                      </span>
                      <div>
                        <h4>{method.type}</h4>
                        <p className={styles.paymentDetails}>
                          {method.details}
                        </p>
                      </div>
                    </div>
                    {method.default && (
                      <span className={styles.defaultBadge}>Default</span>
                    )}
                  </div>
                  <div className={styles.paymentCardActions}>
                    {!method.default && (
                      <button className={styles.setDefaultBtn}>
                        Set as Default
                      </button>
                    )}
                    <button className={styles.removeBtn}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment History */}
            <div className={styles.paymentHistory}>
              <h3>💰 Payment History</h3>
              <div className={styles.historyList}>
                {bookings
                  .filter((b) => b.status === "completed")
                  .map((booking) => (
                    <div key={booking._id} className={styles.historyItem}>
                      <div className={styles.historyLeft}>
                        <p className={styles.historyService}>
                          {booking.service}
                        </p>
                        <p className={styles.historySalon}>
                          {booking.salonName}
                        </p>
                        <p className={styles.historyDate}>
                          {new Date(
                            booking.completedAt || booking.createdAt
                          ).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className={styles.historyRight}>
                        <p className={styles.historyAmount}>₹{booking.price}</p>
                        <span className={styles.historyStatus}>
                          {booking.paymentMethod || "Cash"}
                        </span>
                      </div>
                    </div>
                  ))}

                {bookings.filter((b) => b.status === "completed").length ===
                  0 && (
                  <div className={styles.emptyState}>
                    <p>💸 No payments yet</p>
                    <p>Your payment history will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Stats */}
            <div className={styles.paymentStats}>
              <div className={styles.statCard}>
                <h4>Total Spent</h4>
                <p className={styles.statValue}>
                  ₹
                  {bookings
                    .filter((b) => b.status === "completed")
                    .reduce((sum, b) => sum + (b.price || 0), 0)}
                </p>
              </div>
              <div className={styles.statCard}>
                <h4>Avg Per Visit</h4>
                <p className={styles.statValue}>
                  ₹
                  {Math.round(
                    bookings
                      .filter((b) => b.status === "completed")
                      .reduce((sum, b) => sum + (b.price || 0), 0) /
                      (bookings.filter((b) => b.status === "completed")
                        .length || 1)
                  )}
                </p>
              </div>
              <div className={styles.statCard}>
                <h4>Total Visits</h4>
                <p className={styles.statValue}>
                  {bookings.filter((b) => b.status === "completed").length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
