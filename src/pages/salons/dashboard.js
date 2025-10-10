//pages/salons/dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../components/OwnerSidebar";
import styles from "../../styles/SalonDashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [bookingToStart, setBookingToStart] = useState(null);
  const [scanResult, setScanResult] = useState(null);
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

      // ✅ Add bookingType=all to include walk-ins
      const response = await fetch(
        `/api/salons/bookings?salonId=${salonId}${dateParam}&includeWalkins=true`,

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

  const loadBarbers = useCallback(async (salonId) => {
    try {
      const response = await fetch(`/api/salons/barbers?salonId=${salonId}`);
      if (!response.ok) throw new Error("Failed to fetch barbers");
      const data = await response.json();
      setBarbers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading barbers:", err);
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
    loadBarbers(salonData._id);
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
  const handleVerifyArrival = async (bookingCode) => {
    try {
      const res = await fetch("/api/walkin/verify-arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode,
          salonId: salon._id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setScanResult({
          success: true,
          message: `✅ ${data.booking.customerName} checked in!`,
          queuePosition: data.booking.queuePosition,
        });
        // Refresh bookings
        loadBookings();
      } else {
        setScanResult({
          success: false,
          message: data.message,
        });
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: "Error verifying booking",
      });
    }
  };

  const updateBookingStatus = async (
    bookingId,
    newStatus,
    estimatedTime = null
  ) => {
    try {
      const queueStatusMap = {
        confirmed: "RED",
        arrived: "ORANGE",
        started: "GREEN",
        completed: "COMPLETED",
      };

      const payload = {
        bookingId,
        status: newStatus,
        queueStatus: queueStatusMap[newStatus],
      };

      // ✅ Add time estimate if starting service
      if (newStatus === "started" && estimatedTime) {
        payload.estimatedDuration = estimatedTime;
      }

      const response = await fetch("/api/bookings/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            (b._id || b.id) === bookingId
              ? {
                  ...b,
                  status: newStatus,
                  queueStatus: queueStatusMap[newStatus],
                  estimatedDuration: estimatedTime || b.estimatedDuration,
                  updatedAt: new Date(),
                }
              : b
          )
        );

        if (salon) {
          loadBookings(salon._id, selectedDate);
        }
      } else {
        alert("Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating status:", error);
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
            <div className={styles.headerActions}>
              <button
                onClick={() => setShowScanner(true)}
                className={styles.scannerBtn}
              >
                📷 Scan QR / Enter Code
              </button>
              {showScanner && (
                <div className={styles.scannerModal}>
                  <div className={styles.scannerContent}>
                    <button
                      onClick={() => {
                        setShowScanner(false);
                        setScanResult(null);
                        setManualCode("");
                      }}
                      className={styles.closeModal}
                    >
                      ✕
                    </button>

                    <h2>Check-in Customer</h2>

                    {!scanResult ? (
                      <>
                        <div className={styles.manualInput}>
                          <input
                            type="text"
                            placeholder="Enter booking code (e.g., ST-3842N)"
                            value={manualCode}
                            onChange={(e) =>
                              setManualCode(e.target.value.toUpperCase())
                            }
                            className={styles.codeInput}
                          />
                          <button
                            onClick={() => handleVerifyArrival(manualCode)}
                            disabled={!manualCode}
                            className={styles.verifyBtn}
                          >
                            Verify & Check-in
                          </button>
                        </div>

                        <div className={styles.divider}>OR</div>

                        <div className={styles.qrScanner}>
                          <p>📷 QR Scanner Coming Soon</p>
                          <p className={styles.note}>
                            For now, manually enter the code shown on
                            customer&apos;s screen
                          </p>
                        </div>
                      </>
                    ) : (
                      <div
                        className={`${styles.result} ${
                          scanResult.success ? styles.success : styles.error
                        }`}
                      >
                        <p>{scanResult.message}</p>
                        {scanResult.success && (
                          <p className={styles.queueInfo}>
                            Queue Position: #{scanResult.queuePosition}
                          </p>
                        )}
                        <button
                          onClick={() => {
                            setScanResult(null);
                            setManualCode("");
                          }}
                          className={styles.scanAgainBtn}
                        >
                          Check-in Another Customer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Time Estimate Modal */}
              {showTimeModal && (
                <div className={styles.scannerModal}>
                  <div className={styles.scannerContent}>
                    <button
                      onClick={() => {
                        setShowTimeModal(false);
                        setBookingToStart(null);
                        setTimeEstimate(30);
                      }}
                      className={styles.closeModal}
                    >
                      ✕
                    </button>

                    <h2>⏱️ Estimate Service Time</h2>
                    <p className={styles.modalSubtext}>
                      For: <strong>{bookingToStart?.customerName}</strong>
                    </p>

                    <div className={styles.timeInput}>
                      <label>How long will this service take?</label>
                      <div className={styles.timeButtons}>
                        {[15, 20, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setTimeEstimate(mins)}
                            className={`${styles.timeOption} ${
                              timeEstimate === mins ? styles.selected : ""
                            }`}
                          >
                            {mins} mins
                          </button>
                        ))}
                      </div>

                      <div className={styles.customTime}>
                        <input
                          type="number"
                          value={timeEstimate}
                          onChange={(e) =>
                            setTimeEstimate(parseInt(e.target.value) || 30)
                          }
                          min="5"
                          max="120"
                          className={styles.timeNumberInput}
                        />
                        <span>minutes</span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await updateBookingStatus(
                          bookingToStart._id,
                          "started",
                          timeEstimate
                        );
                        setShowTimeModal(false);
                        setBookingToStart(null);
                        setTimeEstimate(30);
                      }}
                      className={styles.verifyBtn}
                    >
                      Start Service ({timeEstimate} mins)
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <div>
                {/* Unassigned Bookings */}
                {bookings.filter((b) => !b.barberId).length > 0 && (
                  <div className={styles.unassignedSection}>
                    <h3 className={styles.sectionTitle}>
                      ⏳ Pending Assignment
                    </h3>
                    <div className={styles.bookingsGrid}>
                      {bookings
                        .filter((b) => !b.barberId)
                        .map((b) => (
                          <div
                            key={b._id || b.id}
                            className={styles.bookingCard}
                          >
                            <div className={styles.bookingDetails}>
                              <h3 className={styles.customerName}>
                                {b.customerName}
                              </h3>
                              <p className={styles.bookingInfo}>
                                📞 {b.customerPhone}
                              </p>
                              <p className={styles.bookingInfo}>
                                ✂️ {b.service}
                              </p>
                              <p className={styles.bookingInfo}>
                                📅 {b.date || "Walk-in"}{" "}
                                {b.time && `at ${b.time}`}
                              </p>
                              {b.price && (
                                <p className={styles.bookingInfo}>
                                  💰 ₹{b.price}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Barbers Accordions - ONLY ONE SECTION */}
                <div className={styles.barbersSection}>
                  <h3 className={styles.sectionTitle}>💈 Barbers</h3>
                  {barbers.map((barber) => {
                    const barberBookings = bookings.filter(
                      (b) => b.barberId === barber._id
                    );
                    return (
                      <details
                        key={barber._id}
                        className={styles.barberAccordion}
                      >
                        <summary className={styles.barberSummary}>
                          <span className={styles.barberName}>
                            {barber.name}
                          </span>
                          {barberBookings.length > 0 && (
                            <span className={styles.bookingBadge}>
                              {barberBookings.length}
                            </span>
                          )}
                        </summary>

                        <div className={styles.barberBookings}>
                          {barberBookings.length === 0 ? (
                            <p className={styles.noBookings}>No bookings</p>
                          ) : (
                            barberBookings.map((b) => (
                              <div
                                key={b._id || b.id}
                                className={styles.bookingCard}
                              >
                                <div className={styles.bookingDetails}>
                                  <h3 className={styles.customerName}>
                                    {b.customerName}
                                    {b.customerAge && (
                                      <span className={styles.customerAge}>
                                        {" "}
                                        ({b.customerAge} yrs)
                                      </span>
                                    )}
                                  </h3>
                                  <p className={styles.bookingInfo}>
                                    📞 {b.customerPhone}
                                  </p>
                                  <p className={styles.bookingInfo}>
                                    ✂️ {b.service}
                                  </p>
                                  <p className={styles.bookingInfo}>
                                    📅 {b.date || "Walk-in"}{" "}
                                    {b.time && `at ${b.time}`}
                                  </p>
                                  {b.price && (
                                    <p className={styles.bookingInfo}>
                                      💰 ₹{b.price}
                                    </p>
                                  )}
                                  <span
                                    className={`${
                                      styles.statusBadge
                                    } ${getStatusClassName(b.status)}`}
                                  >
                                    {b.queueStatus || b.status}
                                  </span>
                                </div>

                                <div className={styles.barberActions}>
                                  {b.status === "confirmed" && (
                                    <button
                                      onClick={() =>
                                        updateBookingStatus(b._id, "arrived")
                                      }
                                      className={styles.arrivedBtn}
                                    >
                                      Mark Arrived
                                    </button>
                                  )}

                                  {b.status === "arrived" && (
                                    <button
                                      onClick={() => {
                                        setBookingToStart(b);
                                        setShowTimeModal(true);
                                      }}
                                      className={styles.startBtn}
                                    >
                                      Start Service
                                    </button>
                                  )}

                                  <button className={styles.timeBtn}>
                                    +5min
                                  </button>
                                  <button className={styles.timeBtn}>
                                    +10min
                                  </button>
                                  <button className={styles.pauseBtn}>
                                    Pause
                                  </button>

                                  {b.status === "started" && (
                                    <button
                                      onClick={() =>
                                        updateBookingStatus(b._id, "completed")
                                      }
                                      className={styles.doneBtn}
                                    >
                                      Done
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
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
