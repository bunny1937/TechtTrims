import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../components/OwnerSidebar";
import styles from "../../styles/SalonDashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadBookings = useCallback(async (salonId, dateString) => {
    try {
      setLoading(true);
      let dateParam = "";

      if (dateString === "all") {
        dateParam = ""; // No filter
      } else {
        dateParam = `&date=${dateString}`;
      }

      const response = await fetch(
        `/api/salons/bookings?salonId=${salonId}${dateParam}`,
        { cache: "no-store", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error loading bookings: " + err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }
    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    loadBookings(salonData._id, selectedDate);
  }, [router, router.isReady, loadBookings, selectedDate]);

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (salon) {
      loadBookings(salon._id, newDate);
    }
  };

  // Quick date buttons
  const setQuickDate = (daysOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const dateString = date.toISOString().split("T")[0];
    handleDateChange(dateString);
  };

  // Get display text for current date
  const getDateDisplayText = () => {
    if (selectedDate === "all") return "All Time";

    const selected = new Date(selectedDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((selected - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today's Bookings";
    if (diffDays === -1) return "Yesterday's Bookings";
    if (diffDays === 1) return "Tomorrow's Bookings";

    return selected.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch("/api/bookings/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            (b._id || b.id) === bookingId
              ? { ...b, status, updatedAt: new Date() }
              : b
          )
        );
      } else {
        alert("Failed to update booking");
      }
    } catch {
      alert("Error updating booking");
    }
  };

  if (loading && !salon) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      {/* Sidebar Desktop */}
      <aside className={styles.sidebarDesktop}>
        <OwnerSidebar />
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className={styles.mobileOverlay}>
          <div
            className={styles.overlay}
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className={styles.drawer}>
            <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.contentContainer}>
          {/* Top Bar for mobile */}
          <div className={styles.mobileTopBar}>
            <button
              onClick={() => setSidebarOpen(true)}
              className={styles.menuButton}
            >
              ☰
            </button>
            <h1 className={styles.mobileTitle}>
              {salon?.salonName || "Dashboard"}
            </h1>
          </div>

          {/* Salon Info */}
          <div className={styles.card}>
            <h1 className={styles.salonTitle}>{salon?.salonName}</h1>
            <p className={styles.salonOwner}>Owner: {salon?.ownerName}</p>
          </div>

          {/* Date Picker Section */}
          <div className={styles.card}>
            <h2 className={styles.filterTitle}>📅 Select Date</h2>

            {/* Quick Date Buttons */}
            <div className={styles.filterButtons}>
              <button
                onClick={() => setQuickDate(-1)}
                className={styles.filterButton}
              >
                ⏮️ Yesterday
              </button>
              <button
                onClick={() => setQuickDate(0)}
                className={`${styles.filterButton} ${styles.filterButtonActive}`}
              >
                📅 Today
              </button>
              <button
                onClick={() => setQuickDate(1)}
                className={styles.filterButton}
              >
                ⏭️ Tomorrow
              </button>
              <button
                onClick={() => {
                  handleDateChange("all");
                  setShowDatePicker(false);
                }}
                className={`${styles.filterButton} ${
                  selectedDate === "all" ? styles.filterButtonActive : ""
                }`}
              >
                📊 All Time
              </button>

              {/* Pick a Date Button */}
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`${styles.filterButton} ${
                  showDatePicker ? styles.filterButtonActive : ""
                }`}
              >
                📆 Pick a Date
              </button>

              {/* Date Picker Input - Shows only when button clicked */}
              {showDatePicker && (
                <input
                  type="date"
                  value={selectedDate === "all" ? "" : selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={styles.datePickerInput}
                  autoFocus
                />
              )}
            </div>

            {/* Current Selection Display
            <div className={styles.currentDateDisplay}>
              <span className={styles.currentDateIcon}>🗓️</span>
              <span className={styles.currentDateText}>
                {getDateDisplayText()}
              </span>
            </div> */}
          </div>

          {/* Bookings */}
          <div className={styles.card}>
            <div className={styles.bookingsHeader}>
              <div className={styles.bookingsInfo}>
                <h2 className={styles.bookingsTitle}>
                  Bookings ({bookings.length})
                </h2>
                <span className={styles.bookingsDate}>
                  {getDateDisplayText()}
                </span>
              </div>
              <button
                onClick={() => loadBookings(salon._id, selectedDate)}
                className={styles.refreshButton}
                disabled={loading}
              >
                🔄 {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            {bookings.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <p className={styles.emptyText}>
                  No bookings found for{" "}
                  {selectedDate === "all" ? "all time" : "selected date"}
                </p>
                <button
                  onClick={() => handleDateChange("all")}
                  className={styles.viewAllButton}
                >
                  View All Bookings
                </button>
              </div>
            ) : (
              <div className={styles.bookingsGrid}>
                {bookings.map((b) => (
                  <div key={b._id || b.id} className={styles.bookingCard}>
                    <div className={styles.bookingDetails}>
                      <h3 className={styles.customerName}>{b.customerName}</h3>
                      <p className={styles.bookingInfo}>📞 {b.customerPhone}</p>
                      <p className={styles.bookingInfo}>✂️ {b.service}</p>
                      {b.barber && (
                        <p className={styles.bookingInfo}>👤 {b.barber}</p>
                      )}
                      <p className={styles.bookingInfo}>
                        📅 {b.date} at {b.time}
                      </p>
                      <p className={styles.bookingInfo}>💰 ₹{b.price}</p>
                    </div>

                    <div className={styles.bookingActions}>
                      <span
                        className={`${styles.statusBadge} ${getStatusClassName(
                          b.status
                        )}`}
                      >
                        {b.status}
                      </span>

                      <div className={styles.actionButtons}>
                        {b.status === "confirmed" && (
                          <button
                            onClick={() =>
                              updateBookingStatus(b._id, "started")
                            }
                            className={styles.actionButton}
                          >
                            Start Service
                          </button>
                        )}
                        {b.status === "started" && (
                          <button
                            onClick={() =>
                              updateBookingStatus(b._id, "completed")
                            }
                            className={styles.actionButton}
                          >
                            Mark Done
                          </button>
                        )}
                        {b.status !== "cancelled" &&
                          b.status !== "completed" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(b._id, "cancelled")
                              }
                              className={`${styles.actionButton} ${styles.cancelButton}`}
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getStatusClassName(status) {
  switch (status) {
    case "confirmed":
      return styles.statusConfirmed;
    case "started":
      return styles.statusStarted;
    case "completed":
      return styles.statusCompleted;
    case "cancelled":
      return styles.statusCancelled;
    default:
      return styles.statusDefault;
  }
}
