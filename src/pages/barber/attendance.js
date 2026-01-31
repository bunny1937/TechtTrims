// src/pages/barber/attendance.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/barber/BarberAttendance.module.css";
import {
  Clock,
  Coffee,
  LogOut,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarOff,
} from "lucide-react";
import BarberSidebar from "@/components/Barber/BarberSidebar";

export default function BarberAttendance() {
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  // ✅ NEW: Absent/Leave Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveData, setLeaveData] = useState({
    fromDate: "",
    toDate: "",
    fromTime: "09:00",
    toTime: "18:00",
    reason: "",
  });
  // Today's attendance state
  const [todayStatus, setTodayStatus] = useState({
    clockIn: null,
    clockOut: null,
    breaks: [],
    currentBreak: null,
    status: "NOT_CLOCKED_IN",
    totalMinutes: 0,
  });

  // Monthly view state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState({
    records: [],
    stats: {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      totalHours: 0,
    },
  });

  // Monthly report for salary
  const [monthlyReport, setMonthlyReport] = useState(null);

  // UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState("today"); // today, history, report

  // Timer state for live clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workingDuration, setWorkingDuration] = useState("00:00:00");

  // Load barber session
  useEffect(() => {
    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession) {
      router.push("/auth/barber/login");
      return;
    }
    const barberData = JSON.parse(barberSession);
    console.log("🔥 Barber Session Data:", barberData); // DEBUG
    setBarber(barberData);

    // Use _id if id doesn't exist
    const barberId = barberData._id || barberData.id;
    console.log("🔥 Using Barber ID:", barberId); // DEBUG

    loadTodayStatus(barberId);
    loadMonthlyData(barberId, selectedMonth, selectedYear);
    loadMonthlyReport(barberId, selectedMonth, selectedYear);
  }, []);

  // Live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate working duration
  useEffect(() => {
    if (todayStatus.clockIn && !todayStatus.clockOut) {
      const interval = setInterval(() => {
        const start = new Date(todayStatus.clockIn);
        const now = new Date();
        let diff = now - start;

        // Subtract break time
        todayStatus.breaks.forEach((brk) => {
          if (brk.start && brk.end) {
            diff -= new Date(brk.end) - new Date(brk.start);
          } else if (brk.start) {
            // Active break
            diff -= now - new Date(brk.start);
          }
        });

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setWorkingDuration(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [todayStatus]);

  // Reload on month/year change
  useEffect(() => {
    if (barber) {
      loadMonthlyData(barber.id, selectedMonth, selectedYear);
      loadMonthlyReport(barber.id, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  // Load today's attendance status
  const loadTodayStatus = async (barberId) => {
    try {
      const res = await fetch(
        `/api/barber/attendance/status?barberId=${barberId}`,
      );
      const data = await res.json();
      console.log("🔥 API Response:", data);

      // Properly map the API response
      const status = {
        clockIn: data.clockIn || null,
        clockOut: data.clockOut || null,
        breaks: data.breaks || [],
        currentBreak: data.currentBreak || null,
        status: data.status || "NOT_CLOCKED_IN",
        totalMinutes: data.totalMinutes || 0,
      };

      console.log("🔥 Setting Status:", status);
      setTodayStatus(status);
    } catch (err) {
      console.error("Error loading today status:", err);
      // Set default state on error
      setTodayStatus({
        clockIn: null,
        clockOut: null,
        breaks: [],
        currentBreak: null,
        status: "NOT_CLOCKED_IN",
        totalMinutes: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Load monthly attendance history
  const loadMonthlyData = async (barberId, month, year) => {
    try {
      const res = await fetch(
        `/api/barber/attendance/history?barberId=${barberId}&month=${month}&year=${year}`,
      );
      const data = await res.json();
      setMonthlyData(data);
    } catch (err) {
      console.error("Error loading monthly data:", err);
    }
  };

  // Load monthly report with salary
  const loadMonthlyReport = async (barberId, month, year) => {
    try {
      const res = await fetch(
        `/api/barber/attendance/monthly-report?month=${month}&year=${year}`,
      );
      const data = await res.json();
      setMonthlyReport(data);
    } catch (err) {
      console.error("Error loading monthly report:", err);
    }
  };
  const handleApplyLeave = async () => {
    if (!leaveData.fromDate || !leaveData.toDate || !leaveData.reason.trim()) {
      showWarning("Please fill all fields");
      return;
    }

    try {
      // Get fresh barber data from session
      const barberSession = sessionStorage.getItem("barberSession");
      const barberData = JSON.parse(barberSession);

      const payload = {
        barberId: barberData._id || barberData.id,
        salonId: barberData.linkedId || barberData.salonId,
        barberName: barberData.name,
        ...leaveData,
      };

      console.log("[Frontend] Leave request payload:", payload);

      const res = await fetch("/api/barber/leave/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess(
          "Leave request submitted! Waiting for salon owner approval.",
        );
        setShowLeaveModal(false);
        setLeaveData({
          fromDate: "",
          toDate: "",
          fromTime: "09:00",
          toTime: "18:00",
          reason: "",
        });
      } else {
        console.error("[Frontend] Leave error:", data);
        showError(data.message || "Failed to apply for leave");
      }
    } catch (error) {
      console.error("[Frontend] Leave network error:", error);
      showError("Network error");
    }
  };

  // Clock In
  const handleClockIn = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const barberId = barber._id || barber.id;
      console.log("🔥 Clock In - Barber ID:", barberId);

      const res = await fetch("/api/barber/attendance/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: barberId }),
        credentials: "include",
      });

      const data = await res.json();
      console.log("🔥 Clock In Response:", data);

      if (res.ok) {
        setSuccess("✅ Clocked in successfully!");

        // Immediately update the UI with the returned data
        setTodayStatus({
          clockIn: data.attendance.clockIn,
          clockOut: data.attendance.clockOut,
          breaks: data.attendance.breaks || [],
          currentBreak: null,
          status: "CLOCKED_IN",
          totalMinutes: data.attendance.totalMinutes || 0,
        });

        // Also reload from API to be sure
        await loadTodayStatus(barberId);
        await loadMonthlyData(barberId, selectedMonth, selectedYear);
      } else {
        setError(data.message || "Failed to clock in");
      }
    } catch (err) {
      console.error("Clock in error:", err);
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    if (!confirm("Are you sure you want to clock out?")) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const barberId = barber._id || barber.id;

      const res = await fetch("/api/barber/attendance/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: barberId }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(
          `✅ Clocked out! Total: ${data.totalHours || 0}h worked today`,
        );
        await loadTodayStatus(barber.id);
        await loadMonthlyData(barber.id, selectedMonth, selectedYear);
        await loadMonthlyReport(barber.id, selectedMonth, selectedYear);
      } else {
        setError(data.message || "Failed to clock out");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Start/End Break
  const handleBreak = async (action) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const barberId = barber._id || barber.id;

      const res = await fetch("/api/barber/attendance/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barberId: barberId, action }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(
          action === "start"
            ? "☕ Break started"
            : "✅ Break ended. Back to work!",
        );
        await loadTodayStatus(barber.id);
      } else {
        setError(data.message || "Failed to update break");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Download monthly report
  const downloadReport = () => {
    if (!monthlyReport) return;

    const csv = [
      [
        "Date",
        "Status",
        "Clock In",
        "Clock Out",
        "Total Hours",
        "Absent Reason",
      ],
      ...monthlyReport.records.map((r) => [
        r.date,
        r.status,
        r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : "-",
        r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : "-",
        r.totalHours || 0,
        r.absentReason || "-",
      ]),
      [],
      ["Summary"],
      ["Present Days", monthlyReport.presentDays],
      ["Absent Days", monthlyReport.absentDays],
      ["Total Hours", monthlyReport.totalHours],
      ["Salary", `₹${monthlyReport.calculatedSalary}`],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Change month
  const changeMonth = (direction) => {
    if (direction === "prev") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getStatusColor = (status) => {
    if (status === "present") return styles.statusPresent;
    if (status === "absent") return styles.statusAbsent;
    return styles.statusPending;
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <BarberSidebar barber={barber} currentPage="attendance" />

      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button
                className={styles.backButton}
                onClick={() => router.push("/barber/dashboard")}
              >
                <ChevronLeft size={20} />
              </button>
              <div className={styles.headerTitle}>
                <div>
                  <h1>Attendance</h1>
                  <p>{barber?.name}</p>
                </div>
              </div>
            </div>
            <div className={styles.liveClock}>
              <div className={styles.clockTime}>
                {currentTime.toLocaleTimeString()}
              </div>
              <div className={styles.clockDate}>
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </header>

          {/* Notifications */}
          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}
          {success && (
            <div className={styles.successBanner}>
              <CheckCircle size={20} />
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "today" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("today")}
            >
              <Clock size={18} />
              Today
            </button>
            <button
              className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <Calendar size={18} />
              History
            </button>
            <button
              className={`${styles.tab} ${activeTab === "report" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("report")}
            >
              <BarChart3 size={18} />
              Report
            </button>
          </div>

          {/* TODAY TAB */}
          {activeTab === "today" && (
            <div className={styles.todaySection}>
              {/* Status Card */}
              <div className={styles.statusCard}>
                <div className={styles.statusHeader}>
                  <button
                    className={styles.leaveBtn}
                    onClick={() => setShowLeaveModal(true)}
                  >
                    <CalendarOff size={18} /> Apply Leave
                  </button>
                  <h2>Current Status</h2>
                  <div
                    className={`${styles.statusBadge} ${
                      todayStatus.status === "CLOCKED_IN"
                        ? styles.statusActive
                        : styles.statusInactive
                    }`}
                  >
                    {todayStatus.status === "CLOCKED_IN"
                      ? "🟢 Active"
                      : "⚪ Not Clocked In"}
                  </div>
                </div>

                {todayStatus.status === "CLOCKED_IN" && (
                  <div className={styles.workingTimer}>
                    <TrendingUp className={styles.timerIcon} />
                    <div className={styles.timerDisplay}>
                      <span className={styles.timerLabel}>
                        Working Duration
                      </span>
                      <span className={styles.timerTime}>
                        {workingDuration}
                      </span>
                    </div>
                  </div>
                )}

                <div className={styles.timeGrid}>
                  <div className={styles.timeCard}>
                    <Clock size={24} className={styles.timeIcon} />
                    <div>
                      <p className={styles.timeLabel}>Clock In</p>
                      <p className={styles.timeValue}>
                        {todayStatus.clockIn
                          ? new Date(todayStatus.clockIn).toLocaleTimeString()
                          : "--:--"}
                      </p>
                    </div>
                  </div>

                  <div className={styles.timeCard}>
                    <LogOut size={24} className={styles.timeIcon} />
                    <div>
                      <p className={styles.timeLabel}>Clock Out</p>
                      <p className={styles.timeValue}>
                        {todayStatus.clockOut
                          ? new Date(todayStatus.clockOut).toLocaleTimeString()
                          : "--:--"}
                      </p>
                    </div>
                  </div>

                  <div className={styles.timeCard}>
                    <Coffee size={24} className={styles.timeIcon} />
                    <div>
                      <p className={styles.timeLabel}>Breaks</p>
                      <p className={styles.timeValue}>
                        {todayStatus.breaks?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className={styles.timeCard}>
                    <TrendingUp size={24} className={styles.timeIcon} />
                    <div>
                      <p className={styles.timeLabel}>Total Hours</p>
                      <p className={styles.timeValue}>
                        {(todayStatus.totalMinutes / 60).toFixed(2)}h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  {todayStatus.status === "NOT_CLOCKED_IN" && (
                    <button
                      className={`${styles.actionButton} ${styles.clockInButton}`}
                      onClick={handleClockIn}
                      disabled={actionLoading}
                    >
                      {actionLoading ? "Loading..." : "🕐 Clock In"}
                    </button>
                  )}

                  {todayStatus.status === "CLOCKED_IN" && (
                    <>
                      {!todayStatus.currentBreak ? (
                        <button
                          className={`${styles.actionButton} ${styles.breakButton}`}
                          onClick={() => handleBreak("start")}
                          disabled={actionLoading}
                        >
                          ☕ Start Break
                        </button>
                      ) : (
                        <button
                          className={`${styles.actionButton} ${styles.endBreakButton}`}
                          onClick={() => handleBreak("end")}
                          disabled={actionLoading}
                        >
                          ✅ End Break
                        </button>
                      )}

                      <button
                        className={`${styles.actionButton} ${styles.clockOutButton}`}
                        onClick={handleClockOut}
                        disabled={actionLoading}
                      >
                        🚪 Clock Out
                      </button>
                    </>
                  )}
                </div>

                {/* Break History */}
                {todayStatus.breaks && todayStatus.breaks.length > 0 && (
                  <div className={styles.breakHistory}>
                    <h3>Break History Today</h3>
                    <div className={styles.breakList}>
                      {todayStatus.breaks.map((brk, idx) => (
                        <div key={idx} className={styles.breakItem}>
                          <Coffee size={16} />
                          <span>
                            {new Date(brk.start).toLocaleTimeString()} -{" "}
                            {brk.end
                              ? new Date(brk.end).toLocaleTimeString()
                              : "Ongoing"}
                          </span>
                          {brk.end && (
                            <span className={styles.breakDuration}>
                              (
                              {(
                                (new Date(brk.end) - new Date(brk.start)) /
                                60000
                              ).toFixed(0)}{" "}
                              min)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ✅ NEW: Leave Modal */}
          {showLeaveModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h3>Apply for Leave</h3>
                <p>
                  Your request will be sent to the salon owner for approval.
                </p>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>From Date</label>
                    <input
                      type="date"
                      value={leaveData.fromDate}
                      onChange={(e) =>
                        setLeaveData({ ...leaveData, fromDate: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>To Date</label>
                    <input
                      type="date"
                      value={leaveData.toDate}
                      onChange={(e) =>
                        setLeaveData({ ...leaveData, toDate: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>From Time</label>
                    <input
                      type="time"
                      value={leaveData.fromTime}
                      onChange={(e) =>
                        setLeaveData({ ...leaveData, fromTime: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>To Time</label>
                    <input
                      type="time"
                      value={leaveData.toTime}
                      onChange={(e) =>
                        setLeaveData({ ...leaveData, toTime: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Reason</label>
                  <textarea
                    placeholder="Enter reason for leave..."
                    value={leaveData.reason}
                    onChange={(e) =>
                      setLeaveData({ ...leaveData, reason: e.target.value })
                    }
                    rows={3}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    onClick={handleApplyLeave}
                    className={styles.confirmBtn}
                  >
                    Submit Leave Request
                  </button>
                  <button
                    onClick={() => {
                      setShowLeaveModal(false);
                      setLeaveData({
                        fromDate: "",
                        toDate: "",
                        fromTime: "09:00",
                        toTime: "18:00",
                        reason: "",
                      });
                    }}
                    className={styles.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <div className={styles.historySection}>
              {/* Month Selector */}
              <div className={styles.monthSelector}>
                <button
                  className={styles.monthNavButton}
                  onClick={() => changeMonth("prev")}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className={styles.monthDisplay}>
                  {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </div>
                <button
                  className={styles.monthNavButton}
                  onClick={() => changeMonth("next")}
                  disabled={
                    selectedYear === new Date().getFullYear() &&
                    selectedMonth === new Date().getMonth() + 1
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Stats Cards */}
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.statPresent}`}>
                  <CheckCircle className={styles.statIcon} />
                  <div>
                    <p className={styles.statValue}>
                      {monthlyData.stats.presentDays}
                    </p>
                    <p className={styles.statLabel}>Present Days</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.statAbsent}`}>
                  <XCircle className={styles.statIcon} />
                  <div>
                    <p className={styles.statValue}>
                      {monthlyData.stats.absentDays}
                    </p>
                    <p className={styles.statLabel}>Absent Days</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.statHours}`}>
                  <Clock className={styles.statIcon} />
                  <div>
                    <p className={styles.statValue}>
                      {monthlyData.stats.totalHours.toFixed(1)}h
                    </p>
                    <p className={styles.statLabel}>Total Hours</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.statTotal}`}>
                  <Calendar className={styles.statIcon} />
                  <div>
                    <p className={styles.statValue}>
                      {monthlyData.stats.totalDays}
                    </p>
                    <p className={styles.statLabel}>Total Days</p>
                  </div>
                </div>
              </div>

              {/* Attendance Records */}
              <div className={styles.recordsContainer}>
                <h3>Attendance Records</h3>
                <div className={styles.recordsTable}>
                  <div className={styles.tableHeader}>
                    <span>Date</span>
                    <span>Clock In</span>
                    <span>Clock Out</span>
                    <span>Hours</span>
                    <span>Status</span>
                  </div>
                  {monthlyData.records.length === 0 ? (
                    <div className={styles.emptyState}>
                      <Calendar size={48} />
                      <p>No attendance records for this month</p>
                    </div>
                  ) : (
                    monthlyData.records.map((record) => (
                      <div key={record._id} className={styles.tableRow}>
                        <span className={styles.recordDate}>
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                        <span>
                          {record.clockIn
                            ? new Date(record.clockIn).toLocaleTimeString()
                            : "-"}
                        </span>
                        <span>
                          {record.clockOut
                            ? new Date(record.clockOut).toLocaleTimeString()
                            : "-"}
                        </span>
                        <span>
                          {record.totalMinutes
                            ? (record.totalMinutes / 60).toFixed(2)
                            : "0"}
                          h
                        </span>
                        <span
                          className={`${styles.statusBadge} ${getStatusColor(
                            record.status || "present",
                          )}`}
                        >
                          {record.status === "absent" ? (
                            <>
                              <XCircle size={14} /> Absent
                              {record.absentReason && (
                                <span className={styles.tooltip}>
                                  {record.absentReason}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} /> Present
                            </>
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* REPORT TAB */}
          {activeTab === "report" && monthlyReport && (
            <div className={styles.reportSection}>
              {/* Month Selector */}
              <div className={styles.monthSelector}>
                <button
                  className={styles.monthNavButton}
                  onClick={() => changeMonth("prev")}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className={styles.monthDisplay}>
                  {new Date(selectedYear, selectedMonth - 1).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </div>
                <button
                  className={styles.monthNavButton}
                  onClick={() => changeMonth("next")}
                  disabled={
                    selectedYear === new Date().getFullYear() &&
                    selectedMonth === new Date().getMonth() + 1
                  }
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Salary Card */}
              <div className={styles.salaryCard}>
                <div className={styles.salaryHeader}>
                  <DollarSign className={styles.salaryIcon} />
                  <h2>Monthly Salary</h2>
                </div>
                <div className={styles.salaryAmount}>
                  ₹{monthlyReport.calculatedSalary?.toLocaleString("en-IN")}
                </div>
                <div className={styles.salaryBreakdown}>
                  <div className={styles.breakdownItem}>
                    <span>Present Days:</span>
                    <span>{monthlyReport.presentDays}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span>Daily Rate:</span>
                    <span>₹{monthlyReport.dailyRate}</span>
                  </div>
                  <div className={styles.breakdownItem}>
                    <span>Total Hours:</span>
                    <span>{monthlyReport.totalHours}h</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className={styles.performanceGrid}>
                <div className={styles.performanceCard}>
                  <TrendingUp className={styles.perfIcon} />
                  <div>
                    <p className={styles.perfLabel}>Attendance Rate</p>
                    <p className={styles.perfValue}>
                      {monthlyReport.presentDays && monthlyReport.totalDays
                        ? (
                            (monthlyReport.presentDays /
                              (monthlyReport.presentDays +
                                monthlyReport.absentDays)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                <div className={styles.performanceCard}>
                  <Clock className={styles.perfIcon} />
                  <div>
                    <p className={styles.perfLabel}>Avg. Hours/Day</p>
                    <p className={styles.perfValue}>
                      {monthlyReport.presentDays
                        ? (
                            monthlyReport.totalHours / monthlyReport.presentDays
                          ).toFixed(1)
                        : 0}
                      h
                    </p>
                  </div>
                </div>

                <div className={styles.performanceCard}>
                  <CheckCircle className={styles.perfIcon} />
                  <div>
                    <p className={styles.perfLabel}>On-Time Rate</p>
                    <p className={styles.perfValue}>95%</p>
                  </div>
                </div>
              </div>

              {/* Download Report */}
              <button
                className={styles.downloadButton}
                onClick={downloadReport}
              >
                <Download size={20} />
                Download Monthly Report (CSV)
              </button>

              {/* Detailed Records */}
              <div className={styles.detailedRecords}>
                <h3>Detailed Records</h3>
                <div className={styles.recordsList}>
                  {monthlyReport.records.map((record, idx) => (
                    <div key={idx} className={styles.detailCard}>
                      <div className={styles.detailHeader}>
                        <span className={styles.detailDate}>{record.date}</span>
                        <span
                          className={`${styles.statusBadge} ${getStatusColor(
                            record.status,
                          )}`}
                        >
                          {record.status === "absent" ? "Absent" : "Present"}
                        </span>
                      </div>
                      {record.status !== "absent" ? (
                        <div className={styles.detailBody}>
                          <div className={styles.detailItem}>
                            <Clock size={16} />
                            <span>
                              In:{" "}
                              {record.clockIn
                                ? new Date(record.clockIn).toLocaleTimeString()
                                : "-"}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <LogOut size={16} />
                            <span>
                              Out:{" "}
                              {record.clockOut
                                ? new Date(record.clockOut).toLocaleTimeString()
                                : "-"}
                            </span>
                          </div>
                          <div className={styles.detailItem}>
                            <TrendingUp size={16} />
                            <span>Hours: {record.totalHours || 0}h</span>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.absentReason}>
                          <AlertCircle size={16} />
                          <span>
                            {record.absentReason || "No reason provided"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
