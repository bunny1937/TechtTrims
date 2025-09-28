import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/User.module.css";
import Link from "next/link";
import { UserDataManager } from "../../lib/userData";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem("userToken");

        if (!token) {
          router.push("/auth/user/login");
          return;
        }

        setIsLoading(true);

        // Simple profile load
        try {
          const userRes = await fetch("/api/user/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
          }
        } catch (err) {
          console.error("Profile error:", err);
        }

        // Simple bookings load
        try {
          const bookingsRes = await fetch("/api/user/bookings", {
            headers: { Authorization: `Bearer ${token}` },
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
        try {
          const paymentsRes = await fetch("/api/user/payments", {
            headers: { Authorization: `Bearer ${token}` },
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

  const handleLogout = () => {
    // Confirm logout
    if (window.confirm("Are you sure you want to logout?")) {
      UserDataManager.clearUserData();
      alert("Logged out successfully!");
      router.push("/");
    }
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
          <p>{user?.email || "No email"}</p>
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
              activeTab === "feedback" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("feedback")}
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
        </nav>

        <button className={styles.logoutButton} onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      <div className={styles.content}>
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
                  <h3>{booking.service}</h3>
                  <p>
                    📅 {booking.date} at {booking.time}
                  </p>
                  <p>🏪 {booking.salonName}</p>
                  <p>
                    Status:{" "}
                    <span className={`status-${booking.status}`}>
                      {booking.status}
                    </span>
                  </p>
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

        {activeTab === "bookings" && (
          <div className={styles.bookings}>
            <h1>My Bookings ({bookings.length})</h1>
            <div className={styles.bookingsList}>
              {bookings.map((booking) => (
                <div key={booking._id} className={styles.bookingCard}>
                  <div className={styles.bookingHeader}>
                    <h3>{booking.service}</h3>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[booking.status]
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className={styles.bookingDetails}>
                    <p>
                      📅 <strong>Date:</strong> {booking.date}
                    </p>
                    <p>
                      🕐 <strong>Time:</strong> {booking.time}
                    </p>
                    <p>
                      🏪 <strong>Salon:</strong> {booking.salonName}
                    </p>
                    {booking.barber && (
                      <p>
                        👤 <strong>Barber:</strong> {booking.barber}
                      </p>
                    )}
                    <p>
                      💰 <strong>Price:</strong> ₹{booking.price || 0}
                    </p>
                    {booking.feedback?.submitted && (
                      <p>
                        ⭐ <strong>Your Rating:</strong>{" "}
                        {booking.feedback.ratings?.overall}/5
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

        {activeTab === "payments" && (
          <div className={styles.payments}>
            <h1>Payment History ({payments.length})</h1>
            <div className={styles.paymentsList}>
              {payments.map((payment) => (
                <div key={payment._id} className={styles.paymentCard}>
                  <div className={styles.paymentHeader}>
                    <h3>₹{payment.amount}</h3>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[payment.status]
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                  <div className={styles.paymentDetails}>
                    <p>
                      <strong>Service:</strong> {payment.service}
                    </p>
                    <p>
                      <strong>Date:</strong> {payment.date}
                    </p>
                    <p>
                      <strong>Payment Date:</strong>{" "}
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <div className={styles.emptyState}>
                  <p>💳 No payments found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className={styles.feedback}>
            <h1>My Reviews</h1>
            <div className={styles.feedbackList}>
              {bookings
                .filter((b) => b.feedback?.submitted)
                .map((booking) => (
                  <div key={booking._id} className={styles.feedbackCard}>
                    <div className={styles.feedbackHeader}>
                      <h3>{booking.service}</h3>
                      <div className={styles.rating}>
                        <span>⭐ {booking.feedback.ratings?.overall}/5</span>
                      </div>
                    </div>
                    <div className={styles.feedbackDetails}>
                      <p>
                        <strong>Salon:</strong> {booking.salonName}
                      </p>
                      <p>
                        <strong>Date:</strong> {booking.date}
                      </p>
                      {booking.feedback.comment && (
                        <div className={styles.comment}>
                          <p>
                            <strong>Your Review:</strong>
                          </p>
                          <p>&quot;{booking.feedback.comment}&quot;</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {bookings.filter((b) => b.feedback?.submitted).length === 0 && (
                <div className={styles.emptyState}>
                  <p>⭐ No reviews submitted yet</p>
                </div>
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
                  <input type="text" value={user?.name || ""} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input type="email" value={user?.email || ""} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input type="tel" value={user?.phone || ""} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Gender</label>
                  <input type="text" value={user?.gender || ""} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Member Since</label>
                  <input
                    type="text"
                    value={
                      user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : ""
                    }
                    readOnly
                  />
                </div>
              </div>
              <div className={styles.profileActions}>
                <p className={styles.note}>
                  📝 Profile editing will be available in future updates
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
