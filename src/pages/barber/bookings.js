// src/pages/barber/bookings.js
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import BarberSidebar from "../../components/Barber/BarberSidebar";
import styles from "../../styles/barber/BarberBookings.module.css";
import { showError } from "../../lib/toast";
import {
  Calendar,
  Clock,
  User,
  DollarSign,
  Filter,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Timer,
} from "lucide-react";

export default function BarberBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [barber, setBarber] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    if (!router.isReady) return;

    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession) {
      router.push("/auth/login");
      return;
    }

    try {
      const barberData = JSON.parse(barberSession);
      setBarber(barberData);
      loadAllBookings(barberData.id);
    } catch (error) {
      console.error("Failed to parse barber session:", error);
      router.push("/auth/login");
    }
  }, [router, router.isReady]);

  const loadAllBookings = async (barberId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/barber/bookings?barberId=${barberId}&date=all`,
      );
      if (res.ok) {
        const data = await res.json();
        console.log("Loaded bookings:", data);
        setBookings(data);
        setFilteredBookings(data);
      } else {
        showError("Failed to load bookings");
      }
    } catch (error) {
      showError("Error loading bookings");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...bookings];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (dateRange) {
        case "today":
          const today = new Date().toISOString().split("T")[0];
          filtered = filtered.filter((b) => b.date === today);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter((b) => {
            const bookingDate = new Date(b.date);
            return bookingDate >= filterDate;
          });
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter((b) => {
            const bookingDate = new Date(b.date);
            return bookingDate >= filterDate;
          });
          break;
      }
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date + " " + (a.time || "00:00"));
      const dateB = new Date(b.date + " " + (b.time || "00:00"));
      return dateB - dateA;
    });

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, dateRange]);

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "N/A") return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "N/A") return "N/A";
    try {
      const [hours, minutes] = timeStr.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} currentPage="bookings" />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading bookings...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.dashboardWrapper}>
      <BarberSidebar barber={barber} currentPage="bookings" />

      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>All Bookings</h1>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.filterHeader}>
            <Filter size={20} />
            <h3>Filter Bookings</h3>
          </div>

          <div className={styles.filtersGrid}>
            <div className={styles.filterGroup}>
              <label>Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
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
          </div>
        </div>

        {/* Bookings Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Total Bookings</span>
            <span className={styles.statValue}>{filteredBookings.length}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Completed</span>
            <span className={styles.statValue}>
              {filteredBookings.filter((b) => b.status === "completed").length}
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Cancelled</span>
            <span className={styles.statValue}>
              {filteredBookings.filter((b) => b.status === "cancelled").length}
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>Total Revenue</span>
            <span className={styles.statValue}>
              ₹{filteredBookings.reduce((sum, b) => sum + (b.price || 0), 0)}
            </span>
          </div>
        </div>

        {/* Bookings List */}
        <div className={styles.bookingsList}>
          {filteredBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={64} />
              <p>No bookings found</p>
              <span>Try adjusting your filters</span>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking._id} className={styles.bookingCard}>
                {/* Header */}
                <div className={styles.bookingHeader}>
                  <div className={styles.customerSection}>
                    <div className={styles.customerAvatar}>
                      {(booking.customerName || "G").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className={styles.customerName}>
                        {booking.customerName || "Guest"}
                      </h4>
                      <p className={styles.bookingId}>
                        #{booking._id.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[booking.status?.toLowerCase() || "pending"]
                    }`}
                  >
                    {booking.status || "Pending"}
                  </span>
                </div>

                {/* Service Info */}
                <div className={styles.serviceSection}>
                  <div className={styles.serviceMain}>
                    <span className={styles.serviceIcon}>✂️</span>
                    <div>
                      <p className={styles.serviceName}>
                        {booking.service || "N/A"}
                      </p>
                      <div className={styles.serviceMeta}>
                        <span className={styles.duration}>
                          <Timer size={14} /> {booking.duration || 30} min
                        </span>
                        <span className={styles.price}>
                          <DollarSign size={14} /> ₹{booking.price || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className={styles.dateTimeSection}>
                  <div className={styles.dateTimeItem}>
                    <Calendar size={16} />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className={styles.dateTimeItem}>
                    <Clock size={16} />
                    <span>{formatTime(booking.time)}</span>
                  </div>
                </div>

                {/* Contact Details */}
                {/* Contact Details */}
                <div className={styles.contactSection}>
                  {booking.customerPhone &&
                    booking.customerPhone !== "N/A" &&
                    booking.customerPhone !== "" && (
                      <div className={styles.contactItem}>
                        <Phone size={14} />
                        <a href={`tel:${booking.customerPhone}`}>
                          {booking.customerPhone}
                        </a>
                      </div>
                    )}
                  {booking.customerEmail &&
                    booking.customerEmail !== "N/A" &&
                    booking.customerEmail !== "" && (
                      <div className={styles.contactItem}>
                        <Mail size={14} />
                        <a href={`mailto:${booking.customerEmail}`}>
                          {booking.customerEmail}
                        </a>
                      </div>
                    )}
                </div>

                {/* Payment Info */}
                {booking.paymentMode && (
                  <div className={styles.paymentSection}>
                    <CreditCard size={14} />
                    <span className={styles.paymentMode}>
                      {booking.paymentMode === "cash"
                        ? "Cash Payment"
                        : "Online Payment"}
                    </span>
                    {booking.paymentStatus && (
                      <span
                        className={`${styles.paymentStatus} ${styles[booking.paymentStatus]}`}
                      >
                        {booking.paymentStatus}
                      </span>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                {booking.notes && (
                  <div className={styles.notesSection}>
                    <p className={styles.notesLabel}>Notes:</p>
                    <p className={styles.notesText}>{booking.notes}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className={styles.timestamps}>
                  {booking.createdAt && (
                    <span className={styles.timestamp}>
                      Booked:{" "}
                      {new Date(booking.createdAt).toLocaleString("en-IN")}
                    </span>
                  )}
                  {booking.completedAt && (
                    <span className={styles.timestamp}>
                      Completed:{" "}
                      {new Date(booking.completedAt).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
