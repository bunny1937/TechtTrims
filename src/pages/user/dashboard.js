//pages/user/dashboard.js

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/User.module.css";
import Link from "next/link";
import { UserDataManager } from "../../lib/userData";
import { removeAuthToken } from "../../lib/cookieAuth";
import { getAuthToken } from "../../lib/cookieAuth";
import { showConfirm, showSuccess, showWarning, showError } from "@/lib/toast";

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
  // Offline booking code claim
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [bookingCode, setBookingCode] = useState("");
  const [claimName, setClaimName] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
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
          router.push("/auth/login");
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
    showConfirm("Are you sure you want to logout?", async () => {
      try {
        // ✅ Call logout API to clear cookies
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Logout API error:", error);
      }

      // ✅ Clear ALL authentication data
      UserDataManager.clearUserData();

      if (typeof window !== "undefined") {
        // ✅ Clear all storage
        localStorage.clear();
        sessionStorage.clear();
      }

      showSuccess("Logged out successfully!");

      // ✅ Redirect to unified login
      router.push("/auth/login");
    });
  };

  const handleClaimCode = async () => {
    if (bookingCode.length !== 6 || !claimName || !claimPhone) {
      showWarning("Please fill all fields. Code must be 6 digits.");
      return;
    }
    setClaimLoading(true);
    try {
      const res = await fetch("/api/dummy-user/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingCode: bookingCode.trim().toUpperCase(),
          name: claimName.trim(),
          phone: claimPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess("Booking successfully linked to your account!");
      // Only redirect after confirmed success
      setShowCodeEntry(false);
      setBookingCode("");
      setClaimName("");
      setClaimPhone("");
      router.push(
        `/walkin/confirmation?bookingCode=${bookingCode.trim().toUpperCase()}&isDummy=true`,
      );

      setShowCodeEntry(false);
      setBookingCode("");
      setClaimName("");
      setClaimPhone("");

      // Refresh bookings list
      const bookingsRes = await fetch("/api/user/bookings", {
        credentials: "include",
      });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (e) {
      showError(e.message);
    } finally {
      setClaimLoading(false);
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h1 style={{ margin: 0 }}>My Bookings ({bookings.length})</h1>
              <button
                onClick={() => setShowCodeEntry(true)}
                style={{
                  background: "#f97316",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Enter Booking Code
              </button>
            </div>

            {/* Offline Booking Code Entry Modal */}
            {showCodeEntry && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    padding: "24px",
                    width: "320px",
                    maxWidth: "92vw",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px", fontWeight: "700" }}>
                    Enter Booking Code
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      marginBottom: "16px",
                    }}
                  >
                    Enter the 6-digit code given to you at the salon to link
                    your visit to this account.
                  </p>
                  <input
                    type="text"
                    placeholder="6-digit Code"
                    value={bookingCode}
                    maxLength={6}
                    onChange={(e) =>
                      setBookingCode(e.target.value.replace(/\D/g, ""))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "15px",
                      boxSizing: "border-box",
                      letterSpacing: "4px",
                      textAlign: "center",
                      fontWeight: "700",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Your Name (as given at salon)"
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Your Phone Number"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: "16px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    onClick={handleClaimCode}
                    disabled={claimLoading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#f97316",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "15px",
                      cursor: "pointer",
                      marginBottom: "8px",
                      opacity: claimLoading ? 0.7 : 1,
                    }}
                  >
                    {claimLoading ? "Verifying..." : "Link to My Account"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCodeEntry(false);
                      setBookingCode("");
                      setClaimName("");
                      setClaimPhone("");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: "600",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className={styles.bookingsList}>
              {bookings.map((booking) => (
                <div
                  key={booking._id || booking.id || booking.bookingCode}
                  className={styles.bookingCard}
                  onClick={() =>
                    router.push(
                      `/walkin/confirmation?bookingId=${
                        booking._id || booking.id
                      }`,
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
              {/* Offline Booking Code Claim */}
              <div
                style={{
                  margin: "20px 0",
                  padding: "16px",
                  background: "#fff3e0",
                  borderRadius: "12px",
                  border: "2px solid #f97316",
                }}
              >
                <div
                  style={{
                    fontWeight: "700",
                    color: "#92400e",
                    marginBottom: "8px",
                  }}
                >
                  📋 Got a walk-in booking code from the salon?
                </div>
                {!showCodeEntry ? (
                  <button
                    onClick={() => setShowCodeEntry(true)}
                    style={{
                      background: "#f97316",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Enter Booking Code
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      maxWidth: "320px",
                    }}
                  >
                    <input
                      placeholder="6-digit Code"
                      maxLength={6}
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                    <input
                      placeholder="Your Name"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                    <input
                      placeholder="Your Phone"
                      value={claimPhone}
                      onChange={(e) => setClaimPhone(e.target.value)}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleClaimCode}
                        disabled={claimLoading}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#f97316",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {claimLoading ? "Linking..." : "Link Booking"}
                      </button>
                      <button
                        onClick={() => setShowCodeEntry(false)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#f3f4f6",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
                              booking.feedback.submittedAt,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(
                              booking.feedback.submittedAt,
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
                            booking.completedAt || booking.createdAt,
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
                        .length || 1),
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
