//pages/salons/dashboard.js
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../components/OwnerSidebar";
import styles from "../../styles/SalonDashboard.module.css";
import { showError, showSuccess, showWarning } from "@/lib/toast";

// Time Remaining Component
function TimeRemaining({ endTime }) {
  const [timeLeft, setTimeLeft] = useState("");
  // Run every hour
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetch("/api/walkin/booking/mark-expired", {
        method: "POST",
      });
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = Math.max(0, Math.floor((end - now) / 1000 / 60));

      if (diff === 0) {
        setTimeLeft("Time Up! ⏰");
      } else if (diff <= 5) {
        setTimeLeft(`${diff}m left (ending soon!)`);
      } else {
        setTimeLeft(`${diff}m remaining`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span>{timeLeft}</span>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
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
  const [serviceTimers, setServiceTimers] = useState({});
  const [pausedBarbers, setPausedBarbers] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const [salonStatus, setSalonStatus] = useState({
    isOpen: true,
    isPaused: false,
    pauseReason: null,
    pauseUntil: null,
    closingTime: null,
  });
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingHour, setOpeningHour] = useState("09");
  const [openingMinute, setOpeningMinute] = useState("00");
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseType, setPauseType] = useState("");
  const [pauseDuration, setPauseDuration] = useState(30);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingHour, setClosingHour] = useState("21");
  const [closingMinute, setClosingMinute] = useState("00");
  const [barberBreaks, setBarberBreaks] = useState({});
  const [showSalonControls, setShowSalonControls] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBarberForBreak, setSelectedBarberForBreak] = useState(null);
  const [customBreakTime, setCustomBreakTime] = useState("");
  const [assignmentInputs, setAssignmentInputs] = useState({}); // { barberId: bookingCode }
  const [assigningBarber, setAssigningBarber] = useState(null);
  const [closingCountdown, setClosingCountdown] = useState(null);
  const [showClosingAlert, setShowClosingAlert] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Service time notification system
  useEffect(() => {
    const activeBookings = bookings.filter(
      (b) => b.status === "started" && b.serviceEndTime
    );

    const checkTimers = () => {
      const now = new Date();

      activeBookings.forEach((booking) => {
        const endTime = new Date(booking.serviceEndTime);
        const timeLeft = Math.floor((endTime - now) / 1000 / 60); // minutes

        // 5 minutes warning
        if (timeLeft === 5 && !serviceTimers[`${booking.id}_5min`]) {
          playNotificationSound();
          showNotification(
            `⏰ 5 Minutes Left!`,
            `Service for ${booking.customerName} ending soon`
          );
          setServiceTimers((prev) => ({
            ...prev,
            [`${booking.id}_5min`]: true,
          }));
        }

        // 2 minutes warning
        if (timeLeft === 2 && !serviceTimers[`${booking.id}_2min`]) {
          playNotificationSound();
          showNotification(
            `⏰ 2 Minutes Left!`,
            `Service for ${booking.customerName} almost done`
          );
          setServiceTimers((prev) => ({
            ...prev,
            [`${booking.id}_2min`]: true,
          }));
        }

        // Service completed
        if (timeLeft === 0 && !serviceTimers[`${booking.id}_done`]) {
          playNotificationSound();
          showNotification(
            `✅ Time's Up!`,
            `Mark ${booking.customerName}'s service as Done or add more time`
          );
          setServiceTimers((prev) => ({
            ...prev,
            [`${booking.id}_done`]: true,
          }));
        }
      });
    };

    const interval = setInterval(checkTimers, 30000); // Check every 30 seconds
    checkTimers(); // Initial check

    return () => clearInterval(interval);
  }, [bookings, serviceTimers]);

  // Dashboard closing countdown
  useEffect(() => {
    if (!salon?.closingTime) return;

    const checkClosing = () => {
      const now = new Date();
      const [hours, minutes] = salon.closingTime.split(":");
      const closingTime = new Date();
      closingTime.setHours(parseInt(hours), parseInt(minutes), 20, 0);

      const secondsRemaining = Math.floor((closingTime - now) / 1000);

      if (secondsRemaining <= 60 && secondsRemaining > 0) {
        setShowClosingAlert(true);
        setClosingCountdown(secondsRemaining);
      } else if (secondsRemaining <= 0) {
        setShowClosingAlert(false);
        window.location.reload(); // Refresh to show closed state
      } else {
        setShowClosingAlert(false);
      }
    };

    checkClosing();
    const interval = setInterval(checkClosing, 1000);
    return () => clearInterval(interval);
  }, [salon?.closingTime]);

  // Notification helpers
  const playNotificationSound = () => {
    const audio = new Audio("/notification.mp3"); // Add notification sound to public folder
    audio.play().catch((e) => console.log("Audio play failed:", e));
  };

  const showNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/logo.png" });
    } else {
      showWarning(`${title}\n${body}`);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const loadBookings = useCallback(async (salonId, dateString) => {
    try {
      console.log(
        "🔄 Loading bookings for salon:",
        salonId,
        "date:",
        dateString
      );

      // Mark expired first
      await fetch(`/api/walkin/mark-expired`, { method: "POST" });

      let dateParam = ``;
      if (dateString === "all") {
        dateParam = ``;
      } else {
        dateParam = `&date=${dateString}`;
      }

      const response = await fetch(
        `/api/salons/bookings?salonId=${salonId}${dateParam}&includeWalkins=true`,
        {
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        }
      );

      let data = []; // Declare data outside the if block

      if (response.ok) {
        data = await response.json();
        console.log("✅ Loaded bookings:", data.length);
      } else {
        console.error("❌ API response not ok:", response.status);
        setBookings([]);
        setError(`Failed to load bookings: HTTP ${response.status}`);
        setLoading(false);
        return;
      }

      // **ALSO fetch barbers to check availability**
      try {
        const barbersRes = await fetch(
          `/api/salons/barbers?salonId=${salonId}`
        );
        if (barbersRes.ok) {
          const barbersData = await barbersRes.json();
          console.log("✅ Loaded barbers:", barbersData.length);
          setBarbers(barbersData);
        }
      } catch (barberError) {
        console.error("⚠️ Barbers fetch failed:", barberError);
        // Continue even if barbers fail
      }

      // Filter expired bookings
      const now = new Date();
      const bufferTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 min buffer
      const activeBookings = (Array.isArray(data) ? data : []).filter((b) => {
        if (b.isExpired) return false;
        if (b.queueStatus === "RED") {
          return new Date(b.expiresAt) > bufferTime;
        }
        return true;
      });

      // ✅ Sort bookings by priority queue logic PER BARBER
      const sortedBookings = activeBookings.sort((a, b) => {
        // Different barbers don't affect each other
        if (a.barberId !== b.barberId) return 0;

        // GREEN (serving) always first
        if (a.queueStatus === "GREEN") return -1;
        if (b.queueStatus === "GREEN") return 1;

        // ORANGE (priority - arrived, sorted by bookedAt)
        if (a.queueStatus === "ORANGE" && b.queueStatus === "ORANGE") {
          return (
            new Date(a.bookedAt || a.createdAt) -
            new Date(b.bookedAt || b.createdAt)
          );
        }
        if (a.queueStatus === "ORANGE") return -1;
        if (b.queueStatus === "ORANGE") return 1;

        // RED (waiting - not arrived, sorted by bookedAt)
        if (a.queueStatus === "RED" && b.queueStatus === "RED") {
          return (
            new Date(a.bookedAt || a.createdAt) -
            new Date(b.bookedAt || b.createdAt)
          );
        }

        return 0;
      });

      console.log(
        `✅ Active bookings after filtering: ${sortedBookings.length}`
      );
      setBookings(sortedBookings);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("❌ Error loading bookings:", err);
      setError("Error loading bookings: " + err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bookings initially
  useEffect(() => {
    if (!salon?.id) return;
    loadBookings(salon.id, selectedDate);
  }, [salon?.id, selectedDate, loadBookings]);

  // Auto-refresh bookings every 5 seconds with notifications
  useEffect(() => {
    if (!salon?.id) return;

    console.log("🔄 Auto-refresh started");

    let previousBookingIds = new Set();

    const refreshWithNotification = async () => {
      try {
        console.log("🔄 Refreshing bookings...");

        // Fetch fresh bookings
        const res = await fetch(
          `/api/salons/bookings?salonId=${salon.id}&date=${selectedDate}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const data = await res.json();
          const newBookings = data.bookings || [];

          // Check for new bookings (only if we have previous data)
          if (previousBookingIds.size > 0) {
            const addedBookings = newBookings.filter(
              (b) =>
                !previousBookingIds.has(b._id?.toString() || b.id?.toString())
            );

            // Show toast for each new booking
            addedBookings.forEach((booking) => {
              showSuccess(
                `🔔 New Booking: ${booking.customerName} booked with ${booking.barber}`
              );
            });
          }

          // Update tracking
          previousBookingIds = new Set(
            newBookings.map((b) => b._id?.toString() || b.id?.toString())
          );

          // Update state
          setBookings(newBookings);
        }
      } catch (error) {
        console.error("Auto-refresh error:", error);
      }
    };

    const interval = setInterval(refreshWithNotification, 5000);

    return () => {
      console.log("🛑 Auto-refresh stopped");
      clearInterval(interval);
    };
  }, [salon?.id, selectedDate, showSuccess]);

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
  }, [router, router.isReady, loadBookings, selectedDate, loadBarbers]);

  // ✅ Only this check can come after all hooks
  if (!mounted) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

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
        body: JSON.stringify({ bookingCode, salonId: salon._id }),
      });
      const data = await res.json();

      if (data.success) {
        const bookingData = data.booking;

        // Show position dialog with actual position number
        showSuccess(
          `${bookingData.customerName} checked in!\nQueue Position: #${bookingData.queuePosition}`
        );

        setScanResult({
          success: true,
          message: `${bookingData.customerName} checked in!`,
          queuePosition: bookingData.queuePosition,
        });

        // Refresh bookings
        if (salon?._id) await loadBookings(salon._id, selectedDate);
      } else {
        setScanResult({ success: false, message: data.message });
        showError(data.message);
      }
    } catch (error) {
      console.error("Verify arrival error:", error);
      setScanResult({ success: false, message: "Error verifying booking" });
      showError("Error checking in customer");
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
        showError("Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Error updating booking");
    }
  };

  const handleAddTime = async (bookingId, additionalMinutes) => {
    const key = `extend-${bookingId}-${additionalMinutes}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const booking = bookings.find(
        (b) => b._id === bookingId || b.id === bookingId
      );
      if (!booking) {
        console.error("Booking not found:", bookingId);
        showWarning("Booking not found");
        return;
      }

      const newEstimatedDuration =
        (booking.estimatedDuration || 30) + additionalMinutes;

      // Use _id if available, fallback to id
      const actualBookingId = booking._id || booking.id;

      const response = await fetch("/api/bookings/add-time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: actualBookingId,
          additionalMinutes,
          newEstimatedDuration,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update local state
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  estimatedDuration: newEstimatedDuration,
                  serviceEndTime: data.newEndTime,
                }
              : b
          )
        );

        showSuccess(
          `Added ${additionalMinutes} minutes. New duration: ${newEstimatedDuration} mins`
        );

        // Refresh bookings
        if (salon && salon.id) {
          await loadBookings(salon.id, selectedDate);
        }
      } else {
        showError("Failed to add time");
      }
    } catch (error) {
      console.error("Error adding time:", error);
      showError("Error adding time");
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  // Handle salon pause
  const handleSalonPause = async (reason, duration) => {
    try {
      const until =
        duration > 0 ? new Date(Date.now() + duration * 60000) : null;

      const response = await fetch("/api/salons/toggle-pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: salon._id,
          isPaused: !salonStatus.isPaused,
          reason,
          until: until ? until.toISOString() : null,
        }),
      });

      if (response.ok) {
        setSalonStatus((prev) => ({
          ...prev,
          isPaused: !prev.isPaused,
          pauseReason: reason,
          pauseUntil: until ? until.toISOString() : null,
        }));
        showWarning(`Salon ${!salonStatus.isPaused ? "paused" : "resumed"}`);
      }
    } catch (error) {
      console.error("Error toggling salon:", error);
    }
  };

  const handleSetOpeningTime = async (time) => {
    try {
      const response = await fetch("/api/salons/set-opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: salon._id,
          openingTime: time,
        }),
      });

      if (response.ok) {
        showSuccess(`Opening time set to ${time}`);
      }
    } catch (error) {
      console.error("Error setting opening time:", error);
    }
  };

  // Set closing time
  const handleSetClosingTime = async (time) => {
    try {
      const response = await fetch("/api/salons/set-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: salon._id,
          closingTime: time,
        }),
      });

      if (response.ok) {
        setSalonStatus((prev) => ({ ...prev, closingTime: time }));
        showSuccess(`Closing time set to ${time}`);
      }
    } catch (error) {
      console.error("Error setting closing time:", error);
    }
  };

  // Handle barber break
  const handleBarberBreak = async (barberId, type, duration) => {
    try {
      const until = new Date(Date.now() + duration * 60000);

      const response = await fetch("/api/barber/set-break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId,
          breakType: type,
          until: until.toISOString(),
        }),
      });

      if (response.ok) {
        setBarberBreaks((prev) => ({
          ...prev,
          [barberId]: { type, until: until.toISOString() },
        }));
        showSuccess(`Break set for ${type}`);
        setShowBreakModal(false);
      }
    } catch (error) {
      console.error("Error setting break:", error);
    }
  };

  const handleTogglePause = async (barberId, barberName) => {
    const isPaused = pausedBarbers.has(barberId);

    try {
      const response = await fetch("/api/barber/toggle-pause", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId,
          isPaused: !isPaused,
        }),
      });

      if (response.ok) {
        setPausedBarbers((prev) => {
          const newSet = new Set(prev);
          if (isPaused) {
            newSet.delete(barberId);
            showSuccess(`${barberName}'s queue resumed`);
          } else {
            newSet.add(barberId);
            showSuccess(`${barberName}'s queue paused`);
          }
          return newSet;
        });

        // Refresh bookings
        if (salon && salon.id) {
          await loadBookings(salon.id, selectedDate);
        }
      } else {
        showError("Failed to toggle pause");
      }
    } catch (error) {
      console.error("Error toggling pause:", error);
      showError("Error toggling pause");
    }
  };

  const handleAssignBooking = async (barberId) => {
    const bookingCode = assignmentInputs[barberId];

    if (!bookingCode) {
      showWarning("Please enter a booking code");
      return;
    }

    setAssigningBarber(barberId);

    try {
      const response = await fetch("/api/bookings/assign-barber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode, barberId }),
      });

      const data = await response.json();

      if (response.ok) {
        showWarning(`✅ ${data.message}`);
        setAssignmentInputs({ ...assignmentInputs, [barberId]: "" });
        if (salon?._id) {
          await loadBookings(salon._id, selectedDate);
        }
      } else {
        showError(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error("Error assigning booking:", error);
      showError("Failed to assign booking. Please try again.");
    } finally {
      setAssigningBarber(null);
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
      {/* Closing Alert Banner */}
      {showClosingAlert && closingCountdown > 0 && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: closingCountdown <= 20 ? "#ef4444" : "#f59e0b",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 9999,
            fontWeight: 600,
            fontSize: "18px",
          }}
        >
          {closingCountdown <= 20 ? "🚨" : "⏰"} Closing in {closingCountdown}s
        </div>
      )}

      {/* Salon Closed Overlay */}
      {salon?.isActive === false && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>
              🔒 Salon Closed
            </h2>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              Dashboard is locked. Set opening time to resume.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "12px 24px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

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
            <div className={styles.headerLeft}>
              <div className={styles.salonInfo}>
                <h1 className={styles.salonTitle}>
                  {salon?.salonName}
                  <span>
                    <p className={styles.salonOwner}>
                      Owner: {salon?.ownerName}
                    </p>
                  </span>
                </h1>
                <div
                  className={`${styles.statusIndicator} ${
                    salonStatus.isPaused
                      ? styles.paused
                      : salonStatus.isOpen
                      ? styles.open
                      : styles.closed
                  }`}
                >
                  <span className={styles.statusDot}></span>
                  {salonStatus.isPaused
                    ? "Paused"
                    : salonStatus.isOpen
                    ? "Open"
                    : "Closed"}
                </div>
              </div>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.headerActions}>
                <button
                  onClick={() => {
                    setPauseType("Pause");
                    setPauseDuration(30);
                    setShowPauseModal(true);
                    setShowSalonControls(false);
                  }}
                  className={styles.dropdownItem}
                >
                  ⏸️ Pause Salon
                </button>

                <button
                  onClick={() => {
                    setPauseType("Lunch Break");
                    setPauseDuration(60);
                    setShowPauseModal(true);
                    setShowSalonControls(false);
                  }}
                  className={styles.dropdownItem}
                >
                  🍽️ Lunch Break
                </button>

                <button
                  onClick={() => {
                    setPauseType("Short Break");
                    setPauseDuration(20);
                    setShowPauseModal(true);
                    setShowSalonControls(false);
                  }}
                  className={styles.dropdownItem}
                >
                  ☕ Short Break
                </button>

                <div className={styles.divider}></div>

                <button
                  onClick={() => {
                    setShowOpeningModal(true);
                    setShowSalonControls(false);
                  }}
                  className={styles.dropdownItem}
                >
                  🌅 Set Opening Time
                </button>

                <button
                  onClick={() => {
                    setShowClosingModal(true);
                    setShowSalonControls(false);
                  }}
                  className={styles.dropdownItem}
                >
                  🕐 Set Closing Time
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className={styles.scannerBtn}
            >
              📷 Scan QR / Enter Code
            </button>
            {showScanner && (
              <div className={styles.scannerModal}>
                <div className={styles.scannerContent}>
                  <div className={styles.checkinHeader}>
                    <h2 className={styles.checkinTitle}>Check-in Customer</h2>
                    <button
                      onClick={() => setShowScanner(false)}
                      className={styles.closeModal}
                    >
                      ✕
                    </button>
                  </div>

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
          </div>

          {/* Bookings */}
          <div className={styles.card}>
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
            {bookings && bookings.length > 0 && (
              <section className={styles.overallQueueSection}>
                <h2 className={styles.queueTitle}>📊 Live Salon Queue</h2>

                <div className={styles.queueStatsRow}>
                  <div className={styles.queueStat}>
                    <span className={styles.statIcon}>🟢</span>
                    <div>
                      <div className={styles.statValue}>
                        {
                          bookings.filter((b) => b.queueStatus === "GREEN")
                            .length
                        }
                      </div>
                      <div className={styles.statLabel}>Now Serving</div>
                    </div>
                  </div>
                  <div className={styles.queueStat}>
                    <span className={styles.statIcon}>🟠</span>
                    <div>
                      <div className={styles.statValue}>
                        {
                          bookings.filter((b) => b.queueStatus === "ORANGE")
                            .length
                        }
                      </div>
                      <div className={styles.statLabel}>Priority Queue</div>
                    </div>
                  </div>
                  <div className={styles.queueStat}>
                    <span className={styles.statIcon}>⚫</span>
                    <div>
                      <div className={styles.statValue}>
                        {bookings.filter((b) => b.queueStatus === "RED").length}
                      </div>
                      <div className={styles.statLabel}>Booked</div>
                    </div>
                  </div>
                </div>

                {/* All Barbers with Queue */}
                <div className={styles.allBarbersQueue}>
                  {barbers &&
                    barbers.map((barber) => {
                      const barberBookings = bookings.filter(
                        (b) =>
                          b.barberId?.toString() ===
                          (barber._id || barber.id)?.toString()
                      );
                      const greenBooking = barberBookings.find(
                        (b) => b.queueStatus === "GREEN"
                      );
                      const orangeBookings = barberBookings.filter(
                        (b) => b.queueStatus === "ORANGE"
                      );
                      const redBookings = barberBookings.filter(
                        (b) => b.queueStatus === "RED"
                      );

                      return (
                        <div
                          key={barber._id || barber.id}
                          className={styles.barberQueueOverview}
                        >
                          <div className={styles.barberQueueHeader}>
                            <h4>
                              {barber.name} - Chair #{barber.chairNumber}
                            </h4>
                            <span className={styles.queueCount}>
                              {barberBookings.length}
                            </span>
                          </div>

                          <div className={styles.barberQueueRow}>
                            {greenBooking ? (
                              <div
                                className={`${styles.queueCard} ${styles.serving}`}
                              >
                                <span>🟢</span>
                                <span>{greenBooking.customerName}</span>
                                <span className={styles.status}>Serving</span>
                              </div>
                            ) : (
                              <div
                                className={`${styles.queueCard} ${styles.available}`}
                              >
                                <span>💺</span>
                                <span>Available</span>
                              </div>
                            )}

                            {orangeBookings
                              .sort(
                                (a, b) =>
                                  new Date(a.bookedAt || a.createdAt) -
                                  new Date(b.bookedAt || b.createdAt)
                              )
                              .map((b, idx) => (
                                <div
                                  key={b.id}
                                  className={`${styles.queueCard} ${styles.orange}`}
                                  style={{
                                    background: "#f59e0b",
                                    color: "#000",
                                    fontWeight: "600",
                                    border: "2px solid #d97706",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "16px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <span>{b.customerName}</span>
                                  <span className={styles.status}>
                                    Priority
                                  </span>
                                </div>
                              ))}

                            {redBookings
                              .sort(
                                (a, b) =>
                                  new Date(a.bookedAt || a.createdAt) -
                                  new Date(b.bookedAt || b.createdAt)
                              )
                              .map((b, idx) => (
                                <div
                                  key={b.id}
                                  className={`${styles.queueCard} ${styles.red}`}
                                  style={{
                                    background: "#fef3c7",
                                    color: "#000",
                                    fontWeight: "500",
                                    border: "2px dashed #d97706",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <span>{b.customerName}</span>
                                  <span className={styles.status}>Booked</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* ==================== END OVERALL QUEUE VIEW ==================== */}

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
                {/* Unassigned Bookings - ENHANCED */}
                {bookings.filter((b) => !b.barberId).length > 0 && (
                  <div
                    className={`${styles.unassignedSection} ${styles.prominentAlert}`}
                  >
                    <div className={styles.alertHeader}>
                      <span className={styles.alertIcon}>⚠️</span>
                      <h3 className={styles.alertTitle}>
                        Pending Assignment -{" "}
                        {bookings.filter((b) => !b.barberId).length} Booking(s)
                      </h3>
                    </div>
                    <p className={styles.alertDescription}>
                      These bookings need barber assignment. Copy the booking
                      code and paste in any barber section below.
                    </p>

                    <div className={styles.bookingsGrid}>
                      {bookings
                        .filter((b) => !b.barberId)
                        .map((b, index) => (
                          <div
                            key={b._id || b.id}
                            className={`${styles.bookingCard} ${styles.unassignedCard}`}
                          >
                            <div className={styles.unassignedBadge}>
                              <span className={styles.badgeText}>
                                Queue Position: {index + 1}
                              </span>
                              <span className={styles.badgeWarning}>
                                No Barber Assigned
                              </span>
                            </div>

                            <div className={styles.bookingDetails}>
                              <h3 className={styles.customerName}>
                                {b.customerName}
                              </h3>
                              <p className={styles.bookingInfo}>
                                <strong>Code:</strong>{" "}
                                <span className={styles.highlightCode}>
                                  {b.bookingCode}
                                </span>
                              </p>
                              <p className={styles.bookingInfo}>
                                {b.customerPhone}
                              </p>
                              <p className={styles.bookingInfo}>{b.service}</p>

                              {/* Show service time for GREEN bookings */}
                              {b.queueStatus === "GREEN" &&
                                b.serviceStartedAt && (
                                  <p
                                    className={styles.serviceTime}
                                    style={{
                                      fontWeight: "700",
                                      fontSize: "1.1rem",
                                      marginTop: "8px",
                                    }}
                                  >
                                    {(() => {
                                      const now = new Date();
                                      const started = new Date(
                                        b.serviceStartedAt
                                      );
                                      const duration =
                                        b.estimatedDuration || 30;
                                      const elapsed = Math.floor(
                                        (now - started) / 1000 / 60
                                      );
                                      const isOvertime = elapsed > duration;

                                      return (
                                        <span
                                          style={{
                                            color: isOvertime
                                              ? "#ef4444"
                                              : "#10b981",
                                            fontSize: isOvertime
                                              ? "1.3rem"
                                              : "1.1rem",
                                          }}
                                        >
                                          ⏱️ {elapsed}m/{duration}m
                                          {isOvertime && " ⚠️"}
                                        </span>
                                      );
                                    })()}
                                  </p>
                                )}

                              {/* Show service time progress for GREEN bookings */}
                              {b.queueStatus === "GREEN" &&
                                b.serviceStartedAt && (
                                  <p className={styles.timeRemaining}>
                                    {(() => {
                                      const now = new Date();
                                      const started = new Date(
                                        b.serviceStartedAt
                                      );
                                      const duration =
                                        b.estimatedDuration || 30;
                                      const elapsed = Math.floor(
                                        (now - started) / 1000 / 60
                                      );
                                      const isOvertime = elapsed > duration;

                                      return (
                                        <span
                                          style={{
                                            color: isOvertime
                                              ? "#ef4444"
                                              : "#10b981",
                                            fontSize: isOvertime
                                              ? "1.1rem"
                                              : "0.95rem",
                                            fontWeight: isOvertime
                                              ? "700"
                                              : "600",
                                          }}
                                        >
                                          {elapsed}m/{duration}m
                                          {isOvertime && " ⚠️"}
                                        </span>
                                      );
                                    })()}
                                  </p>
                                )}

                              <p className={styles.bookingInfo}>
                                📅 {b.date || "Walk-in"}{" "}
                                {b.time && `at ${b.time}`}
                              </p>
                              {b.price && (
                                <p className={styles.bookingInfo}>
                                  💰 ₹{b.price}
                                </p>
                              )}
                              {b.bookingType === "PREBOOK" && (
                                <p className={styles.bookingInfo}>
                                  <strong>Type:</strong> Pre-booked
                                </p>
                              )}
                            </div>

                            <div className={styles.instructionBox}>
                              <p>
                                📋 Copy <strong>{b.bookingCode}</strong> and
                                paste in barber section below
                              </p>
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
                    // NEW: Expire old bookings for this barber
                    const now = new Date();
                    // const expiryTime = new Date(now - 45 * 60 * 1000);

                    const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

                    const barberBookings = bookings.filter((b) => {
                      // Filter expired
                      if (b.isExpired) return false;

                      // EXCLUDE COMPLETED bookings
                      if (b.queueStatus === "COMPLETED") return false;

                      if (
                        b.queueStatus === "RED" &&
                        new Date(b.expiresAt) < bufferTime
                      )
                        return false;

                      return b.barberId?.toString() === barber._id?.toString();
                    });

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

                        {/* NEW: Booking Assignment Section */}
                        <div className={styles.assignBookingSection}>
                          <h4 className={styles.assignTitle}>
                            Assign Unassigned Booking
                          </h4>
                          <div className={styles.assignInputGroup}>
                            <input
                              type="text"
                              placeholder="Enter Booking Code (e.g., ST-3842N)"
                              value={assignmentInputs[barber._id] || ""}
                              onChange={(e) =>
                                setAssignmentInputs({
                                  ...assignmentInputs,
                                  [barber._id]: e.target.value.toUpperCase(),
                                })
                              }
                              className={styles.bookingCodeInput}
                              disabled={assigningBarber === barber._id}
                            />
                            <button
                              onClick={() => handleAssignBooking(barber._id)}
                              className={styles.assignBtn}
                              disabled={
                                !assignmentInputs[barber._id] ||
                                assigningBarber === barber._id
                              }
                            >
                              {assigningBarber === barber._id
                                ? "Assigning..."
                                : `Assign to ${barber.name}`}
                            </button>
                          </div>
                        </div>
                        {/* NEW: Per-Barber Queue Visualization */}
                        {bookings &&
                          bookings.length > 0 &&
                          (() => {
                            const barberBookings = bookings.filter(
                              (b) =>
                                b.barberId?.toString() ===
                                (barber._id || barber.id)?.toString()
                            );
                            const greenBooking = barberBookings.find(
                              (b) => b.queueStatus === "GREEN"
                            );
                            const orangeBookings = barberBookings.filter(
                              (b) => b.queueStatus === "ORANGE"
                            );
                            const redBookings = barberBookings.filter(
                              (b) => b.queueStatus === "RED"
                            );

                            return barberBookings.length > 0 ? (
                              <div className={styles.barberAccordionQueue}>
                                {/* CHAIR */}
                                <div className={styles.chairBox}>
                                  <div className={styles.chairLabel}>
                                    Chair #{barber.chairNumber}
                                  </div>
                                  {greenBooking ? (
                                    <div className={styles.servingBox}>
                                      <span>
                                        🟢 {greenBooking.customerName}
                                      </span>
                                      <span className={styles.now}>
                                        NOW SERVING
                                      </span>
                                    </div>
                                  ) : (
                                    <div className={styles.availableBox}>
                                      Available
                                    </div>
                                  )}
                                </div>

                                {/* QUEUE */}
                                {(orangeBookings.length > 0 ||
                                  redBookings.length > 0) && (
                                  <div className={styles.barberQueueLine}>
                                    <div className={styles.queueLabel}>
                                      Queue (
                                      {orangeBookings.length +
                                        redBookings.length}
                                      )
                                    </div>
                                    <div className={styles.queueItems}>
                                      {orangeBookings
                                        .sort(
                                          (a, b) =>
                                            new Date(
                                              a.bookedAt || a.createdAt
                                            ) -
                                            new Date(b.bookedAt || b.createdAt)
                                        )
                                        .map((b, idx) => (
                                          <div
                                            key={b.id}
                                            className={styles.queueItem}
                                            style={{
                                              background: "#f59e0b",
                                              padding: "8px 12px",
                                              borderRadius: "6px",
                                              color: "#000",
                                              fontWeight: "600",
                                              border: "2px solid #d97706",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: "16px",
                                                fontWeight: "700",
                                              }}
                                            >
                                              #{idx + 1}
                                            </span>
                                            <span>{b.customerName}</span>
                                            <span>🟠</span>
                                          </div>
                                        ))}

                                      {redBookings
                                        .sort(
                                          (a, b) =>
                                            new Date(
                                              a.bookedAt || a.createdAt
                                            ) -
                                            new Date(b.bookedAt || b.createdAt)
                                        )
                                        .map((b, idx) => (
                                          <div
                                            key={b.id}
                                            className={styles.queueItem}
                                            style={{
                                              background: "#fef3c7",
                                              padding: "8px 12px",
                                              borderRadius: "6px",
                                              color: "#000",
                                              fontWeight: "500",
                                              border: "2px dashed #d97706",
                                              marginBottom: "4px",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: "14px",
                                                fontWeight: "600",
                                              }}
                                            >
                                              #{idx + 1}
                                            </span>
                                            <span>{b.customerName}</span>
                                            <span>⚫</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}

                        {/* EXISTING: Assignment & Bookings */}

                        <div className={styles.barberBookings}>
                          {barberBookings.length === 0 ? (
                            <p className={styles.noBookings}>No bookings</p>
                          ) : (
                            barberBookings.map((b) => {
                              // NEW: Calculate queue status color & label
                              const now = new Date();
                              const createdTime = b.createdAt
                                ? new Date(b.createdAt)
                                : new Date();
                              const expiryTime = new Date(
                                createdTime.getTime() + 45 * 60 * 1000
                              );
                              const timeUntilExpiry = expiryTime - now;
                              const minutesLeft = Math.floor(
                                timeUntilExpiry / 1000 / 60
                              );

                              let statusColor = "#ddd3c8"; // grey for BOOKED
                              let statusLabel = b.queueStatus || b.status;
                              let borderStyle = "2px solid #ccc";

                              if (b.queueStatus === "SERVING") {
                                statusColor = "#86efac";
                                statusLabel = "🟢 SERVING";
                                borderStyle = "2px solid #000";
                              } else if (b.queueStatus === "ARRIVED") {
                                statusColor = "#fbbf24";
                                statusLabel = "🟡 ARRIVED (Priority)";
                                borderStyle = "2px solid #000";
                              } else if (b.queueStatus === "BOOKED") {
                                borderStyle = "2px dotted #000";
                                if (minutesLeft < 5 && minutesLeft > 0) {
                                  statusColor = "#fca5a5"; // Red warning
                                  statusLabel = `⚠️ Expires in ${minutesLeft}m`;
                                } else if (minutesLeft <= 0) {
                                  statusColor = "#9ca3af";
                                  statusLabel = "🔴 EXPIRED";
                                } else {
                                  statusLabel = `📅 Booked (${minutesLeft}m)`;
                                }
                              }

                              return (
                                <div
                                  key={b._id}
                                  className={`${styles.bookingCard} ${
                                    b.queueStatus === "GREEN"
                                      ? styles.greenCard
                                      : b.queueStatus === "ORANGE"
                                      ? styles.orangeCard
                                      : b.queueStatus === "COMPLETED"
                                      ? styles.completedCard
                                      : ""
                                  }`}
                                  style={{
                                    background: statusColor,
                                    border: borderStyle,
                                    position: "relative",
                                  }}
                                >
                                  {/* Card loading overlay */}
                                  {Object.keys(actionLoading).some((key) =>
                                    key.includes(b._id)
                                  ) && (
                                    <div className={styles.cardLoadingOverlay}>
                                      <div className={styles.spinner} />
                                      <p>Processing...</p>
                                    </div>
                                  )}

                                  {/* Position label - top right */}
                                  {/* Position label - top right - ALWAYS show for ORANGE */}
                                  {/* Position label - only show if position > 1 OR chair is busy */}
                                  {/* Position label - show for ORANGE, hide if #1 and chair empty */}
                                  {/* Position label - ALWAYS show for ORANGE at top right */}
                                  {b.queueStatus === "ORANGE" && (
                                    <div className={styles.positionLabel}>
                                      <span className={styles.positionNumber}>
                                        {!b.queuePosition ||
                                        b.queuePosition === 1
                                          ? "1st"
                                          : b.queuePosition === 2
                                          ? "2nd"
                                          : b.queuePosition === 3
                                          ? "3rd"
                                          : `${b.queuePosition}th`}
                                      </span>
                                      <span className={styles.positionType}>
                                        {(() => {
                                          const hasActiveService =
                                            barberBookings.some(
                                              (booking) =>
                                                booking.queueStatus === "GREEN"
                                            );
                                          return hasActiveService
                                            ? "Waiting"
                                            : "Queue";
                                        })()}
                                      </span>
                                    </div>
                                  )}

                                  {/* Booking created time - top left */}
                                  {/* Booking created time - bottom left to avoid overlap */}
                                  {b.createdAt && (
                                    <div className={styles.bookingTime}>
                                      <div className={styles.timeBig}>
                                        {new Date(
                                          b.createdAt
                                        ).toLocaleTimeString("en-IN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                        })}
                                      </div>
                                      <div className={styles.timeSmall}>
                                        {new Date(b.createdAt)
                                          .toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                          })
                                          .toUpperCase()}
                                      </div>
                                    </div>
                                  )}

                                  <div className={styles.bookingDetails}>
                                    {/* ⏱️ SERVICE TIME DISPLAY */}
                                    {b.queueStatus === "GREEN" &&
                                      b.serviceStartedAt && (
                                        <div
                                          style={{
                                            marginTop: "12px",
                                            padding: "14px",
                                            background:
                                              "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                                            border: "2px solid #10b981",
                                            borderRadius: "10px",
                                            textAlign: "center",
                                            boxShadow:
                                              "0 2px 8px rgba(16, 185, 129, 0.15)",
                                          }}
                                        >
                                          {(() => {
                                            const now = new Date();
                                            const started = new Date(
                                              b.serviceStartedAt
                                            );
                                            const duration =
                                              b.estimatedDuration ||
                                              b.selectedDuration ||
                                              30;
                                            const elapsed = Math.floor(
                                              (now - started) / 1000 / 60
                                            );
                                            const isOvertime =
                                              elapsed > duration;

                                            return (
                                              <>
                                                <div
                                                  style={{
                                                    fontSize: "0.7rem",
                                                    color: "#6b7280",
                                                    marginBottom: "6px",
                                                    fontWeight: "600",
                                                    letterSpacing: "0.5px",
                                                  }}
                                                >
                                                  ⏱️ SERVICE TIME
                                                </div>
                                                <div
                                                  style={{
                                                    fontSize: isOvertime
                                                      ? "1.8rem"
                                                      : "1.5rem",
                                                    fontWeight: "900",
                                                    color: isOvertime
                                                      ? "#ef4444"
                                                      : "#10b981",
                                                    letterSpacing: "-1px",
                                                  }}
                                                >
                                                  {elapsed}m / {duration}m
                                                  {isOvertime && " ⚠️"}
                                                </div>
                                                {isOvertime && (
                                                  <div
                                                    style={{
                                                      fontSize: "0.7rem",
                                                      color: "#ef4444",
                                                      marginTop: "4px",
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    OVERTIME!
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}

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
                                      {b.service}
                                    </p>
                                    {b.status === "started" &&
                                      b.serviceEndTime && (
                                        <p className={styles.timeRemaining}>
                                          ⏱{" "}
                                          <TimeRemaining
                                            endTime={b.serviceEndTime}
                                          />
                                        </p>
                                      )}

                                    <p className={styles.bookingInfo}>
                                      📅 {b.date || "Walk-in"}{" "}
                                      {b.time && `at ${b.time}`}
                                    </p>
                                    {b.price && (
                                      <p className={styles.bookingInfo}>
                                        💰 ₹{b.price}
                                      </p>
                                    )}

                                    {/* NEW: Updated status badge with queue color */}
                                    <span
                                      className={styles.statusBadge}
                                      style={{
                                        background: statusColor,
                                        color:
                                          statusColor === "#fbbf24"
                                            ? "#000"
                                            : "#fff",
                                        border: "none",
                                        fontWeight: 700,
                                        padding: "6px 12px",
                                        borderRadius: "4px",
                                        display: "inline-block",
                                      }}
                                    >
                                      {statusLabel}
                                    </span>

                                    {/* NEW: Show booking code only for BOOKED status */}
                                    {b.queueStatus === "BOOKED" && (
                                      <p
                                        className={styles.bookingInfo}
                                        style={{
                                          fontWeight: 700,
                                          color: "#000",
                                          marginTop: "8px",
                                        }}
                                      >
                                        Code: {b.bookingCode}
                                      </p>
                                    )}
                                  </div>
                                  <div className={styles.barberActions}>
                                    {b.status === "confirmed" &&
                                      (() => {
                                        const now = new Date();
                                        const bufferTime = new Date(
                                          now.getTime() - 5 * 60 * 1000
                                        );
                                        const isExpired =
                                          b.isExpired ||
                                          (b.queueStatus === "RED" &&
                                            new Date(b.expiresAt) < bufferTime);

                                        return (
                                          <button
                                            onClick={() =>
                                              !isExpired &&
                                              updateBookingStatus(
                                                b._id,
                                                "arrived"
                                              )
                                            }
                                            className={
                                              isExpired
                                                ? styles.expiredBtn
                                                : styles.arrivedBtn
                                            }
                                            disabled={isExpired}
                                            style={{
                                              opacity: isExpired ? 0.5 : 1,
                                              cursor: isExpired
                                                ? "not-allowed"
                                                : "pointer",
                                            }}
                                          >
                                            {isExpired
                                              ? "EXPIRED"
                                              : "Mark Arrived"}
                                          </button>
                                        );
                                      })()}

                                    {b.status === "arrived" &&
                                      b.queueStatus === "ORANGE" &&
                                      (() => {
                                        // Check if barber already has someone being served (GREEN)
                                        const hasActiveService =
                                          barberBookings.some(
                                            (booking) =>
                                              booking.queueStatus === "GREEN"
                                          );

                                        // Calculate actual position by counting ORANGE bookings sorted by bookedAt
                                        const orangeForBarber = barberBookings
                                          .filter(
                                            (booking) =>
                                              booking.queueStatus === "ORANGE"
                                          )
                                          .sort(
                                            (a, b) =>
                                              new Date(
                                                a.bookedAt || a.createdAt
                                              ) -
                                              new Date(
                                                b.bookedAt || b.createdAt
                                              )
                                          );

                                        const actualPosition =
                                          orangeForBarber.findIndex(
                                            (booking) =>
                                              (booking._id || booking.id) ===
                                              (b._id || b.id)
                                          ) + 1;

                                        // Can start if: no active service AND is position 1
                                        const canStart =
                                          !hasActiveService &&
                                          actualPosition === 1;

                                        return (
                                          <>
                                            {canStart ? (
                                              <button
                                                onClick={() => {
                                                  setBookingToStart(b);
                                                  setTimeEstimate(
                                                    b.estimatedDuration || 30
                                                  );
                                                  setShowTimeModal(true);
                                                }}
                                                disabled={
                                                  !!actionLoading[
                                                    `start-${b._id}`
                                                  ]
                                                }
                                                className={styles.startBtn}
                                                style={{
                                                  background: actionLoading[
                                                    `start-${b._id}`
                                                  ]
                                                    ? "#9ca3af"
                                                    : "#10b981",
                                                  color: "#fff",
                                                  fontWeight: "700",
                                                  padding: "10px 16px",
                                                  borderRadius: "8px",
                                                  border: "none",
                                                  cursor: actionLoading[
                                                    `start-${b._id}`
                                                  ]
                                                    ? "not-allowed"
                                                    : "pointer",
                                                }}
                                              >
                                                {actionLoading[`start-${b._id}`]
                                                  ? "Starting..."
                                                  : "✅ Start Service"}
                                              </button>
                                            ) : (
                                              // : `✅ Start Service (Priority #${actualPosition})`}

                                              <button
                                                className={styles.disabledBtn}
                                                disabled
                                                title={
                                                  hasActiveService
                                                    ? "Chair occupied - wait for current service to complete"
                                                    : `Priority position #${actualPosition} - wait for #1 to complete`
                                                }
                                                style={{
                                                  background: "#d1d5db",
                                                  color: "#6b7280",
                                                  fontWeight: "600",
                                                  padding: "10px 16px",
                                                  borderRadius: "8px",
                                                  border: "2px solid #9ca3af",
                                                  cursor: "not-allowed",
                                                }}
                                              >
                                                {hasActiveService
                                                  ? `🔒 Chair Busy (You're #${actualPosition})`
                                                  : `⏳ Waiting (Priority #${actualPosition})`}
                                              </button>
                                            )}
                                          </>
                                        );
                                      })()}

                                    {/* Time control buttons - ONLY for GREEN (in-service) */}
                                    {b.queueStatus === "GREEN" && (
                                      <>
                                        <button
                                          className={styles.timeBtn}
                                          onClick={() =>
                                            handleAddTime(b._id || b.id, 5)
                                          }
                                          disabled={
                                            !!actionLoading[`extend-${b._id}-5`]
                                          }
                                        >
                                          {actionLoading[`extend-${b._id}-5`]
                                            ? "..."
                                            : "+5min"}
                                        </button>

                                        <button
                                          className={styles.timeBtn}
                                          onClick={() =>
                                            handleAddTime(b._id || b.id, 10)
                                          }
                                          disabled={
                                            !!actionLoading[
                                              `extend-${b._id}-10`
                                            ]
                                          }
                                        >
                                          {actionLoading[`extend-${b._id}-10`]
                                            ? "..."
                                            : "+10min"}
                                        </button>

                                        <button
                                          className={`${styles.pauseBtn} ${
                                            pausedBarbers.has(
                                              barber._id || barber.id
                                            )
                                              ? styles.pausedBtn
                                              : ""
                                          }`}
                                          onClick={() =>
                                            handleTogglePause(
                                              barber._id || barber.id,
                                              barber.name
                                            )
                                          }
                                        >
                                          {pausedBarbers.has(
                                            barber._id || barber.id
                                          )
                                            ? "▶ Resume"
                                            : "⏸ Pause"}
                                        </button>

                                        <button
                                          onClick={async () => {
                                            const key = `end-${b._id}`;
                                            setActionLoading((prev) => ({
                                              ...prev,
                                              [key]: true,
                                            }));

                                            try {
                                              const response = await fetch(
                                                "/api/barber/service-control",
                                                {
                                                  method: "POST",
                                                  headers: {
                                                    "Content-Type":
                                                      "application/json",
                                                  },
                                                  body: JSON.stringify({
                                                    action: "END",
                                                    bookingId: b._id,
                                                    barberId: b.barberId,
                                                  }),
                                                }
                                              );
                                              if (response.ok) {
                                                await loadBookings(
                                                  salon._id || salon.id
                                                );
                                              }
                                            } catch (error) {
                                              console.error(
                                                "Error ending service:",
                                                error
                                              );
                                            } finally {
                                              setActionLoading((prev) => {
                                                const copy = { ...prev };
                                                delete copy[key];
                                                return copy;
                                              });
                                            }
                                          }}
                                          disabled={
                                            !!actionLoading[`end-${b._id}`]
                                          }
                                          className={styles.doneBtn}
                                        >
                                          {actionLoading[`end-${b._id}`]
                                            ? "Ending..."
                                            : "Done"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
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
      {/* Pause Time Modal */}
      {showPauseModal && (
        <div className={styles.modal} onClick={() => setShowPauseModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{pauseType}</h3>
            <p>Set duration in minutes:</p>

            <div className={styles.timeSlider}>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseInt(e.target.value))}
                className={styles.slider}
              />
              <div className={styles.timeDisplay}>
                <span className={styles.bigTime}>{pauseDuration}</span>
                <span>minutes</span>
              </div>
            </div>

            <div className={styles.quickButtons}>
              <button onClick={() => setPauseDuration(15)}>15 min</button>
              <button onClick={() => setPauseDuration(30)}>30 min</button>
              <button onClick={() => setPauseDuration(60)}>1 hour</button>
              <button onClick={() => setPauseDuration(120)}>2 hours</button>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  handleSalonPause(pauseType, pauseDuration);
                  setShowPauseModal(false);
                }}
                className={styles.confirmBtn}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowPauseModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Time Modal */}
      {showOpeningModal && (
        <div
          className={styles.modal}
          onClick={() => setShowOpeningModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Set Opening Time</h3>
            <p>Salon will automatically open at this time:</p>

            <div className={styles.timePicker}>
              <div className={styles.timeColumn}>
                <label>Hour</label>
                <select
                  value={openingHour}
                  onChange={(e) => setOpeningHour(e.target.value)}
                  className={styles.timeSelect}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <span className={styles.timeSeparator}>:</span>

              <div className={styles.timeColumn}>
                <label>Minute</label>
                <select
                  value={openingMinute}
                  onChange={(e) => setOpeningMinute(e.target.value)}
                  className={styles.timeSelect}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  handleSetOpeningTime(`${openingHour}:${openingMinute}`);
                  setShowOpeningModal(false);
                }}
                className={styles.confirmBtn}
              >
                Set Time
              </button>
              <button
                onClick={() => setShowOpeningModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Time Modal */}
      {showClosingModal && (
        <div
          className={styles.modal}
          onClick={() => setShowClosingModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Set Closing Time</h3>
            <p>Select when the salon should stop accepting bookings:</p>

            <div className={styles.timePicker}>
              <div className={styles.timeColumn}>
                <label>Hour</label>
                <select
                  value={closingHour}
                  onChange={(e) => setClosingHour(e.target.value)}
                  className={styles.timeSelect}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <span className={styles.timeSeparator}>:</span>

              <div className={styles.timeColumn}>
                <label>Minute</label>
                <select
                  value={closingMinute}
                  onChange={(e) => setClosingMinute(e.target.value)}
                  className={styles.timeSelect}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i.toString().padStart(2, "0")}>
                      {i.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  handleSetClosingTime(`${closingHour}:${closingMinute}`);
                  setShowClosingModal(false);
                }}
                className={styles.confirmBtn}
              >
                Set Time
              </button>
              <button
                onClick={() => setShowClosingModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Time Estimate Modal */}
      {showTimeModal && (
        <div className={styles.scannerModal}>
          <div
            className={styles.scannerContent}
            style={{ position: "relative" }}
          >
            {/* Loading overlay */}
            {actionLoading[`modal-start-${bookingToStart?._id}`] && (
              <div className={styles.modalLoadingOverlay}>
                <div className={styles.spinner} />
                <p>Starting service...</p>
              </div>
            )}

            <button
              onClick={() => {
                setShowTimeModal(false);
                setBookingToStart(null);
                setTimeEstimate(30);
              }}
              className={styles.closeModal}
              disabled={!!actionLoading[`modal-start-${bookingToStart?._id}`]}
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
                    disabled={
                      !!actionLoading[`modal-start-${bookingToStart?._id}`]
                    }
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
                  disabled={
                    !!actionLoading[`modal-start-${bookingToStart?._id}`]
                  }
                />
                <span>minutes</span>
              </div>
            </div>

            <button
              onClick={async () => {
                const key = `modal-start-${bookingToStart._id}`;
                setActionLoading((prev) => ({ ...prev, [key]: true }));

                try {
                  await updateBookingStatus(
                    bookingToStart._id,
                    "started",
                    timeEstimate
                  );
                  setShowTimeModal(false);
                  setBookingToStart(null);
                  setTimeEstimate(30);
                } catch (error) {
                  console.error("Error starting service:", error);
                } finally {
                  setActionLoading((prev) => {
                    const copy = { ...prev };
                    delete copy[key];
                    return copy;
                  });
                }
              }}
              disabled={
                !bookingToStart ||
                !!actionLoading[`modal-start-${bookingToStart?._id}`]
              }
              className={styles.verifyBtn}
              style={{
                opacity: actionLoading[`modal-start-${bookingToStart?._id}`]
                  ? 0.6
                  : 1,
                cursor: actionLoading[`modal-start-${bookingToStart?._id}`]
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {actionLoading[`modal-start-${bookingToStart?._id}`]
                ? "Starting..."
                : `Start Service (${timeEstimate} mins)`}
            </button>
          </div>
        </div>
      )}

      {/* Pause Banner */}
      {salonStatus.isPaused && (
        <div className={styles.pauseBanner}>
          <span>⏸️ {salonStatus.pauseReason}</span>
          <span>
            Until: {new Date(salonStatus.pauseUntil).toLocaleTimeString()}
          </span>
          <button onClick={() => handleSalonPause(null, 0)}>Resume</button>
        </div>
      )}
      {/* Break Time Modal */}
      {showBreakModal && (
        <div className={styles.modal} onClick={() => setShowBreakModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Set Break Time</h3>

            <div className={styles.breakOptions}>
              <button
                onClick={() =>
                  handleBarberBreak(selectedBarberForBreak, "Lunch Break", 60)
                }
                className={styles.breakOption}
              >
                🍽️ Lunch (1 hr)
              </button>

              <button
                onClick={() =>
                  handleBarberBreak(selectedBarberForBreak, "Short Break", 20)
                }
                className={styles.breakOption}
              >
                ☕ Short (20 min)
              </button>

              <button
                onClick={() =>
                  handleBarberBreak(selectedBarberForBreak, "Coffee Break", 15)
                }
                className={styles.breakOption}
              >
                ☕ Coffee (15 min)
              </button>

              <div className={styles.customBreak}>
                <input
                  type="number"
                  placeholder="Custom minutes"
                  value={customBreakTime}
                  onChange={(e) => setCustomBreakTime(e.target.value)}
                  className={styles.customInput}
                />
                <button
                  onClick={() => {
                    if (customBreakTime) {
                      handleBarberBreak(
                        selectedBarberForBreak,
                        "Custom Break",
                        parseInt(customBreakTime)
                      );
                      setCustomBreakTime("");
                    }
                  }}
                  className={styles.customBtn}
                >
                  Set
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowBreakModal(false)}
              className={styles.closeBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
