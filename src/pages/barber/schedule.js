// src/pages/barber/my-schedule.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import BarberSidebar from "../../components/Barber/BarberSidebar";
import styles from "../../styles/barber/BarberSchedule.module.css";
import {
  Calendar,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";

export default function BarberSchedule() {
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  // Schedule data
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Stats
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    completed: 0,
    cancelled: 0,
  });

  // Load barber session
  useEffect(() => {
    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession) {
      router.push("/auth/barber/login");
      return;
    }
    const barberData = JSON.parse(barberSession);
    setBarber(barberData);
    loadSchedule(barberData._id || barberData.id);
  }, []);

  // Reload on date/filter change
  useEffect(() => {
    if (barber) {
      loadSchedule(barber._id || barber.id);
    }
  }, [selectedDate, statusFilter]);

  // Search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredBookings(bookings);
      return;
    }

    const filtered = bookings.filter(
      (b) =>
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerPhone?.includes(searchTerm) ||
        b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.service?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredBookings(filtered);
  }, [searchTerm, bookings]);

  // Load schedule
  const loadSchedule = async (barberId) => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/barber/schedule?barberId=${barberId}&date=${selectedDate}&status=${statusFilter}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load schedule");
      }

      const data = await res.json();
      setBookings(data.bookings || []);
      setFilteredBookings(data.bookings || []);
      setStats(
        data.stats || { today: 0, upcoming: 0, completed: 0, cancelled: 0 },
      );
    } catch (err) {
      console.error("Error loading schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  // Change date
  const changeDate = (direction) => {
    const date = new Date(selectedDate);
    if (direction === "prev") {
      date.setDate(date.getDate() - 1);
    } else {
      date.setDate(date.getDate() + 1);
    }
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return styles.statusConfirmed;
      case "arrived":
        return styles.statusArrived;
      case "inservice":
        return styles.statusInService;
      case "completed":
        return styles.statusCompleted;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <BarberSidebar barber={barber} currentPage="schedule" />

      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerTitle}>
              <Calendar className={styles.headerIcon} size={28} />
              <div>
                <h1>My Schedule</h1>
                <p>{barber?.name}</p>
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statToday}`}>
              <Calendar className={styles.statIcon} />
              <div>
                <p className={styles.statValue}>{stats.today}</p>
                <p className={styles.statLabel}>Today&lsquo;s Bookings</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statUpcoming}`}>
              <Clock className={styles.statIcon} />
              <div>
                <p className={styles.statValue}>{stats.upcoming}</p>
                <p className={styles.statLabel}>Upcoming</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statCompleted}`}>
              <CheckCircle className={styles.statIcon} />
              <div>
                <p className={styles.statValue}>{stats.completed}</p>
                <p className={styles.statLabel}>Completed</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statCancelled}`}>
              <XCircle className={styles.statIcon} />
              <div>
                <p className={styles.statValue}>{stats.cancelled}</p>
                <p className={styles.statLabel}>Cancelled</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filtersCard}>
            {/* Date Selector */}
            <div className={styles.dateSelector}>
              <button
                className={styles.dateNavButton}
                onClick={() => changeDate("prev")}
              >
                <ChevronLeft size={20} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={styles.dateInput}
              />
              <button
                className={styles.dateNavButton}
                onClick={() => changeDate("next")}
              >
                <ChevronRight size={20} />
              </button>
              <button
                className={styles.todayButton}
                onClick={() =>
                  setSelectedDate(new Date().toISOString().split("T")[0])
                }
              >
                Today
              </button>
            </div>

            {/* Search */}
            <div className={styles.searchBox}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by name, phone, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Status Filter */}
            <div className={styles.filterBox}>
              <Filter size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="arrived">Arrived</option>
                <option value="inservice">In Service</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings List */}
          <div className={styles.scheduleCard}>
            <div className={styles.scheduleHeader}>
              <h2>
                Bookings for{" "}
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <span className={styles.bookingCount}>
                {filteredBookings.length} booking
                {filteredBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar size={64} />
                <p>No bookings found for this date</p>
                {statusFilter !== "all" && (
                  <button
                    className={styles.clearFilterButton}
                    onClick={() => setStatusFilter("all")}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.bookingsList}>
                {filteredBookings.map((booking) => (
                  <div key={booking._id} className={styles.bookingCard}>
                    <div className={styles.timeBadge}>
                      <Clock size={16} />
                      <span>{formatTime(booking.createdAt)}</span>
                    </div>

                    <div className={styles.bookingMain}>
                      <div className={styles.bookingHeader}>
                        <div>
                          <h3 className={styles.customerName}>
                            {booking.customerName}
                          </h3>
                          <p className={styles.bookingCode}>
                            #{booking.bookingCode}
                          </p>
                        </div>
                        <span
                          className={`${styles.statusBadge} ${getStatusColor(
                            booking.status,
                          )}`}
                        >
                          {getStatusIcon(booking.status)}
                          {booking.status}
                        </span>
                      </div>

                      <div className={styles.bookingDetails}>
                        <div className={styles.detailItem}>
                          <User size={16} />
                          <span>{booking.service || "Haircut"}</span>
                        </div>
                        {booking.customerPhone && (
                          <div className={styles.detailItem}>
                            <Phone size={16} />
                            <span>{booking.customerPhone}</span>
                          </div>
                        )}
                        {booking.estimatedDuration && (
                          <div className={styles.detailItem}>
                            <Clock size={16} />
                            <span>{booking.estimatedDuration} mins</span>
                          </div>
                        )}
                      </div>

                      {booking.queueStatus && (
                        <div className={styles.queueInfo}>
                          <span
                            className={`${styles.queueBadge} ${styles[`queue${booking.queueStatus}`]}`}
                          >
                            {booking.queueStatus}
                          </span>
                          {booking.queuePosition && (
                            <span className={styles.queuePosition}>
                              Position: {booking.queuePosition}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
