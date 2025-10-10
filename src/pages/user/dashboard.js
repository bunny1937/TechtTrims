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

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = () => {
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
        {activeTab === "bookings" && (
          <div className={styles.bookings}>
            <h1>My Bookings ({bookings.length})</h1>
            <div className={styles.bookingsList}>
              {bookings.map((booking) => (
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

        {/* Include payments and feedback tabs as they were */}
      </div>
    </div>
  );
}
