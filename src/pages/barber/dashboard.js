// src/pages/barber/dashboard.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import BarberSidebar from "../../components/Barber/BarberSidebar";
import styles from "../../styles/barber/BarberDashboard.module.css";
import { showError, showSuccess, showWarning } from "../../lib/toast";
import {
  Calendar,
  Clock,
  DollarSign,
  Star,
  Users,
  PlayCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Filter,
  TrendingUp,
  Phone,
  UserX,
  CalendarOff,
  AlertCircle,
} from "lucide-react";

import dynamic from "next/dynamic";
import QueueDisplay from "@/components/Walkin/QueueDisplay";
const LiveQrScanner = dynamic(() => import("../../components/LiveQrScanner"), {
  ssr: false,
});

export default function BarberDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [stats, setStats] = useState({
    todayBookings: 0,
    totalCompleted: 0,
    rating: 0,
    earnings: 0,
  });
  const [attendance, setAttendance] = useState({
    isPaused: false,
    isAvailable: true,
    currentStatus: "AVAILABLE",
  });
  // ✅ NEW: Absent/Leave Modals
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentReason, setAbsentReason] = useState("");

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  // 🔥 Dialog state for confirmations
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    type: "", // 'START' | 'COMPLETE' | 'CANCEL'
    booking: null,
  });
  const [processing, setProcessing] = useState(false);
  // 🔥 NEW: Scanner & Code Entry
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);

  // 🔥 NEW: Time Modal (like salon)
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [bookingToStart, setBookingToStart] = useState(null);

  // 🔥 NEW: Action Loading
  const [actionLoading, setActionLoading] = useState({});

  // Offline customer form
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    name: "",
    phone: "",
    service: "",
    price: "",
    serviceTime: "",
  });
  const [dummyCustomers, setDummyCustomers] = useState([]);
  const [dummyToStart, setDummyToStart] = useState(null);

  const handleAddOffline = async () => {
    const { name, phone, service, price, serviceTime } = offlineForm;
    if (!name || !phone || !service || !price || !serviceTime) {
      showWarning("All fields are required");
      return;
    }
    setOfflineLoading(true);
    try {
      const res = await fetch("/api/dummy-user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: barber?.salonId,
          barberId: barber?._id || barber?.id,

          barberName: barber?.name,
          name,
          phone,
          service,
          price,
          serviceTime,
          createdBy: "barber",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess(`Offline customer added! Code: ${data.dummy.bookingCode}`);
      // Show the confirmation URL for the customer:
      showSuccess(
        `Share with customer: /walkin/confirmation?bookingCode=${data.dummy.bookingCode}&isDummy=true`,
      );
      setOfflineForm({
        name: "",
        phone: "",
        service: "",
        price: "",
        serviceTime: "",
      });
      setShowOfflineForm(false);
      await loadDummyCustomers(barber?._id || barber?.id, barber);
    } catch (e) {
      showError(e.message);
    } finally {
      setOfflineLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;

    const barberSession = sessionStorage.getItem("barberSession");

    if (!barberSession || barberSession === "undefined") {
      console.error("No barber session found");
      sessionStorage.removeItem("barberSession");
      router.push("/auth/login");
      return;
    }

    try {
      const barberData = JSON.parse(barberSession);
      const barberId = barberData._id || barberData.id;

      if (!barberId) {
        throw new Error("Invalid barber data - no ID found");
      }

      setBarber(barberData);
      loadDashboardData(barberId, barberData);
    } catch (error) {
      console.error("Failed to parse barber session:", error);
      sessionStorage.removeItem("barberSession");
      router.push("/auth/login");
    }
  }, [router, router.isReady]);

  const loadDummyCustomers = async (barberId, barberData) => {
    try {
      const sid =
        barberData?.salonId?.toString?.() ||
        barberData?.salonId ||
        barberData?.linkedId;
      if (!sid) return;
      const res = await fetch(`/api/dummy-user/active?salonId=${sid}`);

      const data = await res.json();
      const mine = (data.dummies || []).filter(
        (d) => d.barberName === barberData?.name,
      );
      setDummyCustomers(mine);
    } catch (e) {
      console.error("loadDummyCustomers error:", e);
    }
  };

  const loadDashboardData = async (barberId, barberData) => {
    setLoading(true);

    // 🔥 CLEANUP EXPIRED BOOKINGS FIRST
    try {
      await fetch("/api/walkin/mark-expired", { method: "POST" });
    } catch (error) {
      console.error("Cleanup error:", error);
    }

    await Promise.all([
      loadStats(barberId),
      loadBookings(barberId, selectedDate, barberData),
      loadAttendance(barberId),
      loadDummyCustomers(barberId, barberData), // ✅ ADD THIS
    ]);
    setLoading(false);
  };

  const loadStats = async (barberId) => {
    try {
      const res = await fetch(`/api/barber/stats?barberId=${barberId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadBookings = async (barberId, date, barberData = barber) => {
    try {
      const dateParam = date === "all" ? "all" : date;
      const res = await fetch(
        `/api/barber/bookings?barberId=${barberId}&date=${dateParam}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        setFilteredBookings(data);

        // Update stats
        const todayStr = new Date().toISOString().split("T")[0];
        const todayBookings =
          date === "all"
            ? data.filter(
                (b) =>
                  new Date(b.createdAt).toISOString().split("T")[0] ===
                  todayStr,
              )
            : data;

        const completed = data.filter((b) => b.status === "completed");
        const totalEarnings = completed.reduce(
          (sum, b) => sum + (b.price || 0),
          0,
        );

        setStats({
          todayBookings: todayBookings.length,
          totalCompleted: completed.length,
          rating: barberData?.rating || 4.8, // ✅ Use passed barberData
          earnings: totalEarnings,
        });
      }
    } catch (error) {
      console.error("Error loading bookings:", error);
    }
  };

  const loadAttendance = async (barberId) => {
    try {
      const res = await fetch(
        `/api/barber/attendance/status?barberId=${barberId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Service filter
    if (serviceFilter !== "all") {
      filtered = filtered.filter((b) => b.service === serviceFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.customerPhone?.includes(searchTerm),
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, serviceFilter, searchTerm]);

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch("/api/barber/attendance/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        loadAttendance(barber.id);
        showSuccess(`Status changed to ${newStatus}`);
      }
    } catch (error) {
      showError("Failed to update status");
    }
  };

  // ✅ NEW: Mark Absent
  const handleMarkAbsent = async () => {
    if (!absentReason.trim()) {
      showWarning("Please provide a reason");
      return;
    }

    try {
      // Get fresh barber data from session
      const barberSession = sessionStorage.getItem("barberSession");
      const barberData = JSON.parse(barberSession);

      const payload = {
        barberId: barberData._id || barberData.id,
        salonId: barberData.linkedId || barberData.salonId,
        reason: absentReason,
        date: new Date().toISOString().split("T")[0],
      };

      const res = await fetch("/api/barber/attendance/mark-absent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess("Marked as absent. You are disabled for today.");
        setShowAbsentModal(false);
        setAbsentReason("");
        // Disable barber availability
        setAttendance({ ...attendance, isAvailable: false });
      } else {
        console.error("[Frontend] Error response:", data);
        showError(data.message || "Failed to mark absent");
      }
    } catch (error) {
      console.error("[Frontend] Network error:", error);
      showError("Network error");
    }
  };
  // 🔥 NEW: Verify Arrival (Mark customer as arrived)
  const handleVerifyArrival = async (bookingCode) => {
    try {
      const payload = {
        bookingCode,
        salonId: barber.linkedId || barber.salonId,
      };

      const res = await fetch("/api/walkin/verify-arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ CHECK-IN FAILED:", data?.message);
        showError(
          data?.message ||
            data?.error ||
            `Check-in failed (HTTP ${res.status})`,
        );
        setScanResult({
          success: false,
          message:
            data?.message ||
            data?.error ||
            `Check-in failed (HTTP ${res.status})`,
        });
        return;
      }

      // SUCCESS
      showSuccess(`${data.booking.customerName} checked in successfully!`);
      setScanResult({
        success: true,
        message: "Customer checked in",
        booking: data.booking,
      });
      await loadBookings(barber.id || barber._id, selectedDate, barber);
    } catch (err) {
      console.error("💥 NETWORK ERROR:", err);
      showError(err.message || "Network error while checking in");
      setScanResult({
        success: false,
        message: err.message || "Network error",
      });
    }
  };

  // 🔥 NEW: Update Booking Status
  const updateBookingStatus = async (
    bookingId,
    newStatus,
    estimatedTime = null,
  ) => {
    try {
      // ✅ VALIDATE BEFORE STARTING SERVICE
      if (newStatus === "started") {
        const validateRes = await fetch("/api/barber/validate-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, barberId: barber.id }),
        });

        const validateData = await validateRes.json();

        if (!validateData.canStart) {
          showError(validateData.reason);
          return; // ❌ BLOCK THE ACTION
        }
      }
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

      if (newStatus === "started" && estimatedTime) {
        payload.estimatedDuration = estimatedTime;
      }

      const response = await fetch("/api/bookings/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await loadBookings(barber._id || barber.id, selectedDate, barber);
        showSuccess("✅ Status updated!");
      } else {
        showError("Failed to update booking");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Error updating booking");
    }
  };

  // 🔥 NEW: Add Time
  const handleAddTime = async (bookingId, additionalMinutes) => {
    const key = `extend-${bookingId}-${additionalMinutes}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const booking = bookings.find((b) => (b._id || b.id) === bookingId);

      if (!booking) {
        showWarning("Booking not found");
        return;
      }

      const newEstimatedDuration =
        (booking.estimatedDuration || 30) + additionalMinutes;

      const response = await fetch("/api/bookings/add-time", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking._id || booking.id,
          additionalMinutes,
          newEstimatedDuration,
        }),
      });

      if (response.ok) {
        showSuccess(`Added ${additionalMinutes} minutes!`);
        await loadBookings(barber._id || barber.id, selectedDate, barber);
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
  const handleDummyAddTime = async (dummyId, additionalMinutes) => {
    const key = `dummy-extend-${dummyId}-${additionalMinutes}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/dummy-user/start-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dummyId,
          // Pass current serviceTime + additional minutes
          serviceTime:
            (dummyCustomers.find((d) => d._id === dummyId)?.serviceTime || 30) +
            additionalMinutes,
          addTime: true, // flag so API extends rather than resets startedAt
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess(`Added ${additionalMinutes} minutes!`);
      await loadDummyCustomers(barber?._id || barber?.id, barber);
    } catch (e) {
      showError(e.message);
    } finally {
      setActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };
  // 🔥 Open confirmation dialog
  const openConfirmDialog = (type, booking) => {
    setConfirmDialog({
      show: true,
      type,
      booking,
    });
  };

  // 🔥 Close dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({
      show: false,
      type: "",
      booking: null,
    });
  };

  // 🔥 Handle service control actions
  const handleServiceControl = async () => {
    const { type, booking } = confirmDialog;
    setProcessing(true);

    try {
      const barberId = localStorage.getItem("barberId");

      if (type === "START") {
        // Start service (ORANGE → GREEN)
        const res = await fetch("/api/barber/service-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking._id,
            barberId,
            action: "START",
          }),
        });

        if (res.ok) {
          const bookingsRes = await fetch(
            `/api/barber/bookings?barberId=${barberId}`,
          );
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
          showSuccess("✅ Service started!");
        } else {
          showError("❌ Failed to start service");
        }
      } else if (type === "COMPLETE") {
        // Complete service (GREEN → COMPLETED)
        const res = await fetch("/api/barber/service-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking._id,
            barberId,
            action: "COMPLETE",
          }),
        });

        if (res.ok) {
          const bookingsRes = await fetch(
            `/api/barber/bookings?barberId=${barberId}`,
          );
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
          showSuccess("✅ Service completed!");
        } else {
          showError("❌ Failed to complete service");
        }
      } else if (type === "ADD_TIME") {
        // Add 10 minutes to service
        const res = await fetch("/api/barber/service-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking._id,
            barberId,
            action: "ADD_TIME",
            additionalMinutes: 10,
          }),
        });

        if (res.ok) {
          const bookingsRes = await fetch(
            `/api/barber/bookings?barberId=${barberId}`,
          );
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
          showSuccess("✅ Added 10 minutes!");
        } else {
          showError("❌ Failed to add time");
        }
      }
    } catch (error) {
      console.error("Service control error:", error);
      showError("❌ An error occurred");
    } finally {
      setProcessing(false);
      closeConfirmDialog();
    }
  };

  const getUniqueServices = () => {
    const services = new Set(bookings.map((b) => b.service).filter(Boolean));
    return Array.from(services);
  };

  if (loading || !barber) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading dashboard...</div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Offline Customer Modal */}
      {showOfflineForm && (
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
              width: "340px",
              maxWidth: "92vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h3
              style={{ margin: "0 0 6px", fontWeight: "700", fontSize: "18px" }}
            >
              Add Offline Customer
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#f97316",
                marginBottom: "16px",
                fontWeight: "500",
              }}
            >
              💡 Encourage them to register on TechTrims for easy online
              booking!
            </p>
            {[
              { key: "name", placeholder: "Customer Name", type: "text" },
              { key: "phone", placeholder: "Phone Number", type: "tel" },
              {
                key: "service",
                placeholder: "Service (e.g. Haircut)",
                type: "text",
              },
              { key: "price", placeholder: "Price (₹)", type: "number" },
              {
                key: "serviceTime",
                placeholder: "Service Time (minutes)",
                type: "number",
              },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                value={offlineForm[key]}
                onChange={(e) =>
                  setOfflineForm((p) => ({ ...p, [key]: e.target.value }))
                }
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
            ))}
            <button
              onClick={handleAddOffline}
              disabled={offlineLoading}
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
                opacity: offlineLoading ? 0.7 : 1,
              }}
            >
              {offlineLoading ? "Adding..." : "Add to Queue"}
            </button>
            <button
              onClick={() => setShowOfflineForm(false)}
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

      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} currentPage="dashboard" />

        <main className={styles.mainContent}>
          {/* Header */}
          <div className={styles.header}>
            <div>
              <p className={styles.title}>Welcome {barber.name}! 👋</p>
            </div>
            {/* 🔥 NEW: Scan/Enter Code Button */}
            <button
              className={styles.scannerbtn}
              onClick={() => setShowScanner(true)}
            >
              Scan QR
            </button>

            <div className={styles.attendanceControl}>
              <button
                className={`${styles.statusBtn} ${
                  attendance.isPaused ? styles.paused : styles.active
                }`}
                onClick={() =>
                  handleStatusChange(attendance.isPaused ? "ACTIVE" : "PAUSED")
                }
              >
                {attendance.isPaused ? (
                  <>
                    <PlayCircle size={18} /> Resume
                  </>
                ) : (
                  <>
                    <PauseCircle size={18} /> Pause
                  </>
                )}
              </button>
              <button
                className={styles.absentBtn}
                onClick={() => setShowAbsentModal(true)}
              >
                <UserX size={18} /> Mark Absent
              </button>
            </div>
          </div>
          {/* Add Offline Customer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() => setShowOfflineForm(true)}
              style={{
                background: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              + Add Offline Customer
            </button>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "#10b981" }}
              >
                <Calendar size={24} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Today&lsquo;s Bookings</p>
                <h3 className={styles.statValue}>{stats.todayBookings}</h3>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "#3b82f6" }}
              >
                <CheckCircle size={24} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Total Completed</p>
                <h3 className={styles.statValue}>{stats.totalCompleted}</h3>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "#f59e0b" }}
              >
                <Star size={24} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Rating</p>
                <h3 className={styles.statValue}>{stats.rating || "N/A"} ⭐</h3>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={styles.statIcon}
                style={{ background: "#8b5cf6" }}
              >
                <DollarSign size={24} />
              </div>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>Total Earnings</p>
                <h3 className={styles.statValue}>₹{stats.earnings || 0}</h3>
              </div>
            </div>
          </div>
          {/* Live Queue */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                fontWeight: "700",
                fontSize: "16px",
                marginBottom: "10px",
                color: "#374151",
              }}
            >
              📋 Live Queue
            </h3>
            <QueueDisplay
              barberId={barber?._id || barber?.id}
              salonId={barber?.salonId || barber?.linkedId}
              customerId={null}
              defaultBarberName={barber?.name || ""}
            />
          </div>
          {/* Offline Customers Section */}
          {dummyCustomers.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h3
                style={{
                  fontWeight: "700",
                  fontSize: "16px",
                  color: "#92400e",
                  marginBottom: "12px",
                }}
              >
                🟤 Offline Walk-in Customers ({dummyCustomers.length})
              </h3>
              {dummyCustomers.map((d) => (
                <div
                  key={d._id}
                  style={{
                    background: "#fff3e0",
                    border: "2px solid #f97316",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "700",
                        color: "#92400e",
                        fontSize: "15px",
                      }}
                    >
                      {d.name}
                    </span>
                    <span
                      style={{
                        background: "#f97316",
                        color: "#fff",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 9px",
                      }}
                    >
                      OFFLINE
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#78350f",
                      marginBottom: "4px",
                    }}
                  >
                    📞 {d.phone} &nbsp;|&nbsp; ✂️ {d.service} — ₹{d.price}{" "}
                    &nbsp;|&nbsp; ⏱ {d.serviceTime} min
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#a16207",
                      marginBottom: "10px",
                    }}
                  >
                    Code: <strong>{d.bookingCode}</strong> &nbsp;|&nbsp;
                    Arrived:{" "}
                    {new Date(d.arrivedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </div>
                  <div
                    style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                  >
                    {(d.status === "active" || d.status === "claimed") &&
                      (() => {
                        const STARTABLE = ["active", "claimed"];
                        const anyInService = dummyCustomers.some(
                          (x) => x.status === "in-service",
                        );
                        const firstWaiting = dummyCustomers
                          .filter((x) => STARTABLE.includes(x.status))
                          .sort(
                            (a, b) =>
                              new Date(a.arrivedAt) - new Date(b.arrivedAt),
                          )[0];
                        const canStart =
                          !anyInService && firstWaiting?._id === d._id;
                        return (
                          <>
                            <button
                              onClick={() => {
                                const anyInService = dummyCustomers.some(
                                  (x) => x.status === "in-service",
                                );
                                const firstWaiting = [...dummyCustomers]
                                  .filter((x) => STARTABLE.includes(x.status))
                                  .sort(
                                    (a, b) =>
                                      new Date(a.arrivedAt) -
                                      new Date(b.arrivedAt),
                                  )[0];
                                const canStart =
                                  !anyInService && firstWaiting?._id === d._id;
                                if (!canStart) {
                                  showWarning(
                                    anyInService
                                      ? "Finish current service first"
                                      : "Wait for your turn",
                                  );
                                  return;
                                }
                                setDummyToStart(d);
                                setTimeEstimate(Number(d.serviceTime) || 30);
                                setShowTimeModal(true);
                              }}
                              className={styles.startBtn}
                              style={{
                                opacity: canStart ? 1 : 0.5,
                                cursor: canStart ? "pointer" : "not-allowed",
                              }}
                            >
                              {canStart ? "▶ Start Service" : "⏳ Wait"}
                            </button>
                          </>
                        );
                      })()}

                    {d.status === "in-service" && (
                      <>
                        <button
                          className={styles.addTimeBtn}
                          onClick={() => handleDummyAddTime(d._id, 5)}
                          disabled={!!actionLoading[`dummy-extend-${d._id}-5`]}
                        >
                          <Clock size={16} />
                          {actionLoading[`dummy-extend-${d._id}-5`]
                            ? "..."
                            : "+5min"}
                        </button>
                        <button
                          className={styles.addTimeBtn}
                          onClick={() => handleDummyAddTime(d._id, 10)}
                          disabled={!!actionLoading[`dummy-extend-${d._id}-10`]}
                        >
                          <Clock size={16} />
                          {actionLoading[`dummy-extend-${d._id}-10`]
                            ? "..."
                            : "+10min"}
                        </button>
                        <button
                          className={styles.completeBtn}
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                "/api/dummy-user/complete-service",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ dummyId: d._id }),
                                },
                              );
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.message);
                              showSuccess(`${d.name}'s service completed!`);
                              await loadDummyCustomers(
                                barber?._id || barber?.id,
                                barber,
                              );
                            } catch (e) {
                              showError(e.message);
                            }
                          }}
                        >
                          ✅ Complete Service
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Filters Section */}
          <div className={styles.filtersSection}>
            <div className={styles.filterHeader}>
              <Filter size={20} />
              <h3>Filter Bookings</h3>
            </div>

            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label>Date</label>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setSelectedDate(newDate);
                    if (barber?.id) {
                      loadBookings(barber.id, newDate, barber);
                    }
                  }}
                  className={styles.filterSelect}
                >
                  <option value={new Date().toISOString().split("T")[0]}>
                    Today
                  </option>
                  <option value="all">All Bookings</option>
                  <option
                    value={
                      new Date(Date.now() - 86400000)
                        .toISOString()
                        .split("T")[0]
                    }
                  >
                    Yesterday
                  </option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="started">Started</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Service</label>
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Services</option>
                  {getUniqueServices().map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className={styles.bookingsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                {selectedDate === "all"
                  ? "All Bookings"
                  : `Bookings for ${new Date(selectedDate).toLocaleDateString()}`}
              </h2>
              <span className={styles.count}>
                {filteredBookings.length} booking(s)
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No bookings found</p>
                <p>Try adjusting your filters</p>
              </div>
            ) : (
              filteredBookings.map((booking) => {
                // ✅ Calculate time-based data
                const now = new Date();
                const createdAt = new Date(booking.createdAt);
                const serviceStarted = booking.serviceStartedAt
                  ? new Date(booking.serviceStartedAt)
                  : null;
                const expiresAt = booking.expiresAt
                  ? new Date(booking.expiresAt)
                  : null;

                // ✅ Calculate time since booking
                const timeSinceBooking = Math.floor(
                  (now - createdAt) / (1000 * 60),
                ); // minutes

                // ✅ Calculate expiry countdown (for GREY bookings)
                let expiryMinutes = null;
                if (expiresAt && booking.queueStatus === "RED") {
                  expiryMinutes = Math.floor((expiresAt - now) / (1000 * 60));
                }

                // ✅ Calculate service timer (for GREEN bookings)
                let serviceElapsed = null;
                let serviceRemaining = null;
                if (serviceStarted && booking.queueStatus === "GREEN") {
                  serviceElapsed = Math.floor(
                    (now - serviceStarted) / (1000 * 60),
                  );
                  const estimatedDuration = booking.estimatedDuration || 30;
                  serviceRemaining = estimatedDuration - serviceElapsed;
                }

                // ✅ Determine card color class
                const getQueueStatusClass = () => {
                  switch (booking.queueStatus) {
                    case "RED": // Booked but not arrived
                      return styles.greyCard;
                    case "ORANGE": // Arrived, waiting
                      return styles.orangeCard;
                    case "GREEN": // Being served
                      return styles.greenCard;
                    case "COMPLETED":
                      return styles.completedCard;
                    default:
                      return "";
                  }
                };

                // ✅ Status badge text
                const getStatusText = () => {
                  const isPrebook = booking.bookingType === "PREBOOK";

                  switch (booking.queueStatus) {
                    case "RED":
                      return isPrebook ? "PREBOOK - PRIORITY" : "BOOKED";
                    case "ORANGE":
                      return isPrebook ? "PREBOOK - ARRIVED" : "WAITING";
                    case "GREEN":
                      return isPrebook ? "PREBOOK - SERVING" : "SERVING";
                    case "COMPLETED":
                      return "COMPLETED";
                    default:
                      return booking.status;
                  }
                };

                return (
                  <div
                    key={booking._id}
                    className={`${styles.bookingCard} ${getQueueStatusClass()}`}
                  >
                    {/* ADD: Prebook Badge */}
                    {booking.bookingType === "PREBOOK" && (
                      <div className={styles.prebookBadge}>
                        📅 PRE-BOOKED
                        <span className={styles.prebookTime}>
                          {new Date(booking.scheduledFor).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    )}

                    {/* ✅ TOP ROW: Customer Name + Status Badge */}
                    <div className={styles.cardHeader}>
                      <h3 className={styles.customerName}>
                        {booking.customerName || "Guest"}
                      </h3>
                      <span
                        className={`${styles.statusBadge} ${styles[booking.queueStatus]}`}
                      >
                        {getStatusText()}
                      </span>
                    </div>

                    {/* ✅ BOOKING TIME + QUEUE POSITION */}
                    <div className={styles.bookingMeta}>
                      <div className={styles.metaItem}>
                        <Clock size={14} />
                        <span className={styles.bookingTime}>
                          {createdAt.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        <span className={styles.timeSince}>
                          ({timeSinceBooking}m ago)
                        </span>
                      </div>

                      {booking.queuePosition && (
                        <div className={styles.queuePos}>
                          <span className={styles.posLabel}>Position:</span>
                          <span className={styles.posNumber}>
                            #{booking.queuePosition}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ✅ SERVICE + PHONE */}
                    <div className={styles.serviceInfo}>
                      <div className={styles.service}>
                        <span className={styles.serviceIcon}>✂</span>
                        <span className={styles.serviceName}>
                          {booking.service}
                        </span>
                      </div>
                      {booking.customerPhone && (
                        <a
                          href={`tel:${booking.customerPhone}`}
                          className={styles.phoneLink}
                        >
                          <Phone size={14} />
                          {booking.customerPhone}
                        </a>
                      )}
                    </div>

                    {/* ✅ TIMER SECTION - Different for each status */}
                    {booking.queueStatus === "RED" && expiresAt && (
                      <div className={styles.timerSection}>
                        <div
                          className={`${styles.timerBox} ${styles.expiryTimer}`}
                        >
                          <span className={styles.timerLabel}>Expires in:</span>
                          <span
                            className={`${styles.timerValue} ${expiryMinutes <= 10 ? styles.urgent : ""}`}
                          >
                            {expiryMinutes > 0
                              ? `${expiryMinutes}m`
                              : "EXPIRED"}
                          </span>
                        </div>
                      </div>
                    )}

                    {booking.queueStatus === "ORANGE" && (
                      <div className={styles.timerSection}>
                        <div
                          className={`${styles.timerBox} ${styles.waitingTimer}`}
                        >
                          <span className={styles.timerLabel}>Waiting:</span>
                          <span className={styles.timerValue}>
                            {timeSinceBooking}m
                          </span>
                        </div>
                      </div>
                    )}

                    {booking.queueStatus === "GREEN" && serviceStarted && (
                      <div className={styles.timerSection}>
                        <div
                          className={`${styles.timerBox} ${styles.serviceTimer}`}
                        >
                          <div className={styles.timerRow}>
                            <span className={styles.timerLabel}>
                              Service Time:
                            </span>
                            <span
                              className={`${styles.timerValue} ${serviceRemaining < 0 ? styles.overtime : ""}`}
                            >
                              {serviceElapsed}m /{" "}
                              {booking.estimatedDuration || 30}m
                            </span>
                          </div>
                          {serviceRemaining !== null && (
                            <div className={styles.timerSubtext}>
                              {serviceRemaining > 0
                                ? `${serviceRemaining}m remaining`
                                : `Overtime: ${Math.abs(serviceRemaining)}m`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.queueStatus === "COMPLETED" && (
                      <div className={styles.completedInfo}>
                        <CheckCircle size={16} />
                        <span>Completed successfully</span>
                      </div>
                    )}

                    {/* 🔥 ACTION BUTTONS */}
                    <div className={styles.cardActions}>
                      {/* RED: Mark Arrived */}
                      {booking.queueStatus === "RED" && (
                        <button
                          onClick={() =>
                            updateBookingStatus(
                              booking._id || booking.id,
                              "arrived",
                            )
                          }
                          className={styles.arrivedBtn}
                          disabled={
                            !!actionLoading[
                              `arrive-${booking._id || booking.id}`
                            ]
                          }
                        >
                          {actionLoading[`arrive-${booking._id || booking.id}`]
                            ? "Marking..."
                            : "Mark Arrived"}
                        </button>
                      )}

                      {/* ORANGE - Start Service WITH HARDCORE RESTRICTIONS */}
                      {booking.queueStatus === "ORANGE" &&
                        (() => {
                          // ✅ CHECK 1: Is there already someone being served? (online OR offline dummy)
                          const someoneInService =
                            filteredBookings.some(
                              (b) => b.queueStatus === "GREEN",
                            ) ||
                            dummyCustomers.some(
                              (d) => d.status === "in-service",
                            );
                          // ✅ CHECK 2: Get full queue order including dummies
                          const onlineOrangeQueue = filteredBookings
                            .filter((b) => b.queueStatus === "ORANGE")
                            .sort((a, b) => {
                              const aIsPrebook = a.bookingType === "PREBOOK";
                              const bIsPrebook = b.bookingType === "PREBOOK";
                              if (aIsPrebook && !bIsPrebook) return -1;
                              if (!aIsPrebook && bIsPrebook) return 1;
                              const aTime = new Date(
                                a.arrivedAt || a.createdAt,
                              );
                              const bTime = new Date(
                                b.arrivedAt || b.createdAt,
                              );
                              return aTime - bTime;
                            });

                          // Include waiting dummies as virtual queue entries sorted by arrivedAt
                          const STARTABLE = ["active", "claimed"];
                          const dummyWaiting = dummyCustomers
                            .filter((d) => STARTABLE.includes(d.status))
                            .sort(
                              (a, b) =>
                                new Date(a.arrivedAt) - new Date(b.arrivedAt),
                            );

                          // Build unified queue: whoever arrived first is truly #1
                          const unifiedQueue = [
                            ...onlineOrangeQueue.map((b) => ({
                              id: b._id || b.id,
                              arrivedAt: b.arrivedAt || b.createdAt,
                              isDummy: false,
                            })),
                            ...dummyWaiting.map((d) => ({
                              id: d._id,
                              arrivedAt: d.arrivedAt,
                              isDummy: true,
                            })),
                          ].sort(
                            (a, b) =>
                              new Date(a.arrivedAt) - new Date(b.arrivedAt),
                          );

                          // This online booking can only start if it's #1 in the unified queue
                          const isFirstInQueue =
                            unifiedQueue.length > 0 &&
                            !unifiedQueue[0].isDummy &&
                            (unifiedQueue[0].id === booking._id ||
                              unifiedQueue[0].id === booking.id);

                          // ✅ CHECK 3: Prebook arrived too early? — MUST be before disabledReason
                          let tooEarly = false;
                          let minsEarly = 0;
                          if (
                            booking.bookingType === "PREBOOK" &&
                            booking.scheduledFor
                          ) {
                            const appointmentTime = new Date(
                              booking.scheduledFor,
                            );
                            const now = new Date();
                            const minutesUntilAppointment =
                              (appointmentTime - now) / (60 * 1000);
                            if (minutesUntilAppointment > 10) {
                              tooEarly = true;
                              minsEarly = Math.ceil(minutesUntilAppointment);
                            }
                          }

                          // ✅ FINAL DECISION
                          const canStart =
                            !someoneInService && isFirstInQueue && !tooEarly;

                          // Update error message for when a dummy is ahead
                          let disabledReason = "";
                          if (someoneInService) {
                            const currentOnline = filteredBookings.find(
                              (b) => b.queueStatus === "GREEN",
                            );
                            const currentDummy = dummyCustomers.find(
                              (d) => d.status === "in-service",
                            );
                            const currentName =
                              currentOnline?.customerName ||
                              currentDummy?.name ||
                              "Someone";
                            disabledReason = `🚫 ${currentName} is being served first`;
                          } else if (!isFirstInQueue) {
                            const firstEntry = unifiedQueue[0];
                            const firstName = firstEntry?.isDummy
                              ? dummyCustomers.find(
                                  (d) => d._id === firstEntry.id,
                                )?.name
                              : onlineOrangeQueue[0]?.customerName;
                            disabledReason = `🚫 ${firstName || "Someone"} arrived earlier — serve them first`;
                          } else if (tooEarly) {
                            disabledReason = `🚫 Appointment in ${minsEarly}m - too early`;
                          }

                          // ✅ CHECK 3: Prebook arrived too early?

                          return (
                            <div
                              style={{
                                position: "relative",
                                marginBottom: disabledReason ? "30px" : "0",
                              }}
                            >
                              <button
                                onClick={() => {
                                  if (!canStart) {
                                    showWarning(disabledReason);
                                    return;
                                  }
                                  setBookingToStart(booking);
                                  setTimeEstimate(
                                    booking.estimatedDuration || 30,
                                  );
                                  setShowTimeModal(true);
                                }}
                                className={styles.startBtn}
                                disabled={
                                  !canStart ||
                                  !!actionLoading[
                                    `start-${booking._id || booking.id}`
                                  ]
                                }
                                style={{
                                  opacity: !canStart ? 0.5 : 1,
                                  cursor: !canStart ? "not-allowed" : "pointer",
                                  background: !canStart ? "#9ca3af" : "",
                                }}
                              >
                                <PlayCircle size={16} />
                                {actionLoading[
                                  `start-${booking._id || booking.id}`
                                ]
                                  ? "Starting..."
                                  : "Start Service"}
                              </button>

                              {!canStart && (
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "-25px",
                                    left: "0",
                                    right: "0",
                                    fontSize: "11px",
                                    color: "#ef4444",
                                    fontWeight: "600",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {disabledReason}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      {/* GREEN: Time Control + Complete */}
                      {booking.queueStatus === "GREEN" && (
                        <>
                          <button
                            className={styles.addTimeBtn}
                            onClick={() =>
                              handleAddTime(booking._id || booking.id, 5)
                            }
                            disabled={
                              !!actionLoading[
                                `extend-${booking._id || booking.id}-5`
                              ]
                            }
                          >
                            <Clock size={16} />
                            {actionLoading[
                              `extend-${booking._id || booking.id}-5`
                            ]
                              ? "..."
                              : "+5min"}
                          </button>

                          <button
                            className={styles.addTimeBtn}
                            onClick={() =>
                              handleAddTime(booking._id || booking.id, 10)
                            }
                            disabled={
                              !!actionLoading[
                                `extend-${booking._id || booking.id}-10`
                              ]
                            }
                          >
                            <Clock size={16} />
                            {actionLoading[
                              `extend-${booking._id || booking.id}-10`
                            ]
                              ? "..."
                              : "+10min"}
                          </button>

                          <button
                            className={styles.completeBtn}
                            onClick={() =>
                              updateBookingStatus(
                                booking._id || booking.id,
                                "completed",
                              )
                            }
                            disabled={
                              !!actionLoading[
                                `end-${booking._id || booking.id}`
                              ]
                            }
                          >
                            <CheckCircle size={16} />
                            {actionLoading[`end-${booking._id || booking.id}`]
                              ? "Ending..."
                              : "Complete"}
                          </button>
                        </>
                      )}
                    </div>

                    {/* ✅ PRICE TAG */}
                    <div className={styles.priceTag}>
                      <DollarSign size={14} />₹{booking.price}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {showAbsentModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Mark Absent for Today</h3>
                <p>You will be disabled for the entire day.</p>
                <textarea
                  placeholder="Enter reason for absence..."
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  rows={4}
                  className={styles.textarea}
                />
                <div className={styles.modalActions}>
                  <button
                    onClick={handleMarkAbsent}
                    className={styles.confirmBtn}
                  >
                    Confirm Absent
                  </button>
                  <button
                    onClick={() => {
                      setShowAbsentModal(false);
                      setAbsentReason("");
                    }}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {showScanner && (
            <LiveQrScanner
              salonId={barber.linkedId || barber.salonId}
              onResult={(bookingCode) => {
                setShowScanner(false);
                handleVerifyArrival(bookingCode);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
          {scanResult && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: scanResult.success ? "#dcfce7" : "#fee2e2",
                border: "2px solid",
                borderColor: scanResult.success ? "#16a34a" : "#dc2626",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <strong>DEBUG:</strong>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                {JSON.stringify(scanResult, null, 2)}
              </pre>
            </div>
          )}

          {/* 🔥 TIME ESTIMATE MODAL */}
          {/* 🔥 TIME ESTIMATE MODAL */}
          {showTimeModal && (bookingToStart || dummyToStart) && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
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
                  padding: "28px 24px",
                  width: "500px",
                  maxWidth: "92vw",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  position: "relative",
                }}
              >
                {actionLoading[
                  `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                ] && (
                  <div className={styles.modalLoadingOverlay}>
                    <div className={styles.spinner}></div>
                    <p>Starting service...</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowTimeModal(false);
                    setBookingToStart(null);
                    setDummyToStart(null);
                    setTimeEstimate(30);
                  }}
                  className={styles.closeModal}
                  disabled={
                    !!actionLoading[
                      `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                    ]
                  }
                >
                  ✕
                </button>

                <h2
                  style={{
                    margin: "0 0 4px",
                    fontSize: "18px",
                    fontWeight: "700",
                  }}
                >
                  Estimate Service Time
                </h2>
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "14px",
                    color: "#6b7280",
                  }}
                >
                  For{" "}
                  <strong style={{ color: "#111" }}>
                    {dummyToStart
                      ? dummyToStart.name
                      : bookingToStart?.customerName}
                  </strong>
                </p>

                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#374151",
                      display: "block",
                      marginBottom: "10px",
                    }}
                  >
                    How long will this service take?
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    {[15, 20, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setTimeEstimate(mins)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border:
                            timeEstimate === mins
                              ? "2px solid #f97316"
                              : "2px solid #e5e7eb",
                          background:
                            timeEstimate === mins ? "#fff7ed" : "#f9fafb",
                          color: timeEstimate === mins ? "#f97316" : "#374151",
                          fontWeight: timeEstimate === mins ? "700" : "500",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                        disabled={
                          !!actionLoading[
                            `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                          ]
                        }
                      >
                        {mins} mins
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    <input
                      type="number"
                      value={timeEstimate}
                      onChange={(e) =>
                        setTimeEstimate(
                          Math.min(
                            120,
                            Math.max(5, parseInt(e.target.value) || 30),
                          ),
                        )
                      }
                      min="5"
                      max="120"
                      style={{
                        width: "80px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "2px solid #e5e7eb",
                        fontSize: "16px",
                        fontWeight: "700",
                        textAlign: "center",
                      }}
                      disabled={
                        !!actionLoading[
                          `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                        ]
                      }
                    />
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>
                      minutes
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (dummyToStart) {
                      try {
                        const res = await fetch(
                          "/api/dummy-user/start-service",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              dummyId: dummyToStart._id,
                              serviceTime: timeEstimate,
                            }),
                          },
                        );
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.message);
                        showSuccess(
                          `Service started for ${dummyToStart.name}!`,
                        );
                        setShowTimeModal(false);
                        setDummyToStart(null);
                        setTimeEstimate(30);
                        await loadDummyCustomers(
                          barber?._id || barber?.id,
                          barber,
                        );
                      } catch (e) {
                        showError(e.message);
                      }
                      return;
                    }
                    const key = `modal-start-${bookingToStart._id || bookingToStart.id}`;
                    setActionLoading((prev) => ({ ...prev, [key]: true }));
                    try {
                      await updateBookingStatus(
                        bookingToStart._id || bookingToStart.id,
                        "started",
                        timeEstimate,
                      );
                      setShowTimeModal(false);
                      setBookingToStart(null);
                      setDummyToStart(null);
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
                    (!bookingToStart && !dummyToStart) ||
                    !!actionLoading[
                      `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                    ]
                  }
                  className={styles.verifyBtn}
                  style={{
                    opacity: actionLoading[
                      `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                    ]
                      ? 0.6
                      : 1,
                    cursor: actionLoading[
                      `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                    ]
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {actionLoading[
                    `modal-start-${bookingToStart?._id || bookingToStart?.id}`
                  ]
                    ? "Starting..."
                    : `Start Service (${timeEstimate} mins)`}
                </button>
              </div>
            </div>
          )}
        </main>
        {/* 🔥 CONFIRMATION DIALOG */}
        {confirmDialog.show && (
          <div className={styles.dialogOverlay}>
            <div className={styles.dialogBox}>
              <div className={styles.dialogHeader}>
                <AlertCircle size={32} />
                <h2>
                  {confirmDialog.type === "START" && "Start Service?"}
                  {confirmDialog.type === "COMPLETE" && "Complete Service?"}
                  {confirmDialog.type === "ADD_TIME" && "Add 10 Minutes?"}
                </h2>
              </div>

              <div className={styles.dialogContent}>
                <p>
                  <strong>Customer:</strong>{" "}
                  {confirmDialog.booking?.customerName}
                </p>
                <p>
                  <strong>Service:</strong> {confirmDialog.booking?.service}
                </p>
                <p>
                  <strong>Price:</strong> ₹{confirmDialog.booking?.price}
                </p>

                {confirmDialog.type === "START" && (
                  <p className={styles.dialogWarning}>
                    This will mark the customer as being served and start the
                    timer.
                  </p>
                )}

                {confirmDialog.type === "COMPLETE" && (
                  <p className={styles.dialogWarning}>
                    This will mark the service as completed and move the
                    customer out of queue.
                  </p>
                )}

                {confirmDialog.type === "ADD_TIME" && (
                  <p className={styles.dialogWarning}>
                    This will extend the service by 10 minutes.
                  </p>
                )}
              </div>

              <div className={styles.dialogContent}>
                <p>
                  <strong>Customer:</strong>{" "}
                  {confirmDialog.booking?.customerName}
                </p>
                <p>
                  <strong>Service:</strong> {confirmDialog.booking?.service}
                </p>
                <p>
                  <strong>Price:</strong> ₹{confirmDialog.booking?.price}
                </p>

                {confirmDialog.type === "START" && (
                  <p className={styles.dialogWarning}>
                    This will mark the customer as being served.
                  </p>
                )}

                {confirmDialog.type === "COMPLETE" && (
                  <p className={styles.dialogWarning}>
                    This will mark the service as completed and move the
                    customer out of queue.
                  </p>
                )}

                {confirmDialog.type === "CANCEL" && (
                  <p className={styles.dialogWarning}>
                    This action cannot be undone. The booking will be cancelled.
                  </p>
                )}
              </div>

              <div className={styles.dialogActions}>
                <button
                  className={styles.dialogCancelBtn}
                  onClick={closeConfirmDialog}
                  disabled={processing}
                >
                  No, Go Back
                </button>
                <button
                  className={styles.dialogConfirmBtn}
                  onClick={handleServiceControl}
                  disabled={processing}
                >
                  {processing ? "Processing..." : "Yes, Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
