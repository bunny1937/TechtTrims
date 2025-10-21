// src/pages/salons/bookings/index.js - COMPLETE REPLACEMENT
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonBookings.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";

export default function BookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    loadBookings(salonData._id || salonData.id);
  }, [router]);

  const loadBookings = async (salonId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/salons/bookings?salonId=${salonId}&date=all&includeWalkins=true`
      );
      const data = await res.json();
      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...bookings];

    if (searchTerm) {
      result = result.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.customerPhone?.includes(searchTerm) ||
          b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter !== "all") {
      const today = new Date().toISOString().split("T")[0];
      if (dateFilter === "today") {
        result = result.filter((b) => b.date === today);
      } else if (dateFilter === "custom" && startDate && endDate) {
        result = result.filter((b) => b.date >= startDate && b.date <= endDate);
      }
    }

    if (serviceFilter !== "all") {
      result = result.filter((b) => b.service === serviceFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    setFilteredBookings(result);
  }, [
    searchTerm,
    dateFilter,
    serviceFilter,
    statusFilter,
    startDate,
    endDate,
    bookings,
  ]);

  const uniqueServices = [...new Set(bookings.map((b) => b.service))];

  if (loading) {
    return (
      <div className={dashboardStyles.dashboardWrapper}>
        <div className={dashboardStyles.sidebarDesktop}>
          <OwnerSidebar />
        </div>
        <main className={dashboardStyles.mainContent}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading bookings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={dashboardStyles.dashboardWrapper}>
      {sidebarOpen && (
        <div
          className={dashboardStyles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={dashboardStyles.sidebarMobile}
            onClick={(e) => e.stopPropagation()}
          >
            <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className={dashboardStyles.sidebarDesktop}>
        <OwnerSidebar />
      </div>

      <main className={dashboardStyles.mainContent}>
        <div className={dashboardStyles.mobileTopBar}>
          <button
            className={dashboardStyles.menuButton}
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h2 className={dashboardStyles.mobileTitle}>Bookings</h2>
        </div>

        <div className={styles.container}>
          {/* Filters */}
          <div className={styles.filtersCard}>
            <h3 className={styles.filtersTitle}>🔍 Filters</h3>

            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name, phone, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Date</label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value === "custom") {
                      const today = new Date().toISOString().split("T")[0];
                      setStartDate(today);
                      setEndDate(today);
                    }
                  }}
                  className={styles.filterSelect}
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="custom">Custom Range</option>
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
                  {uniqueServices.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
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
                  <option value="arrived">Arrived</option>
                  <option value="started">Started</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {dateFilter === "custom" && (
              <div className={styles.dateRangeRow}>
                <div className={styles.dateInputWrapper}>
                  <label>From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>
                <span className={styles.dateSeparator}>to</span>
                <div className={styles.dateInputWrapper}>
                  <label>To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={styles.filterInput}
                    min={startDate}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>
                Showing {filteredBookings.length} of {bookings.length} bookings
              </h3>
            </div>

            {filteredBookings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Service</th>
                      <th>Barber</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr key={booking._id}>
                        <td>
                          <code>{booking.bookingCode}</code>
                        </td>
                        <td>{booking.customerName}</td>
                        <td>{booking.customerPhone}</td>
                        <td>{booking.service}</td>
                        <td>{booking.barber || "Unassigned"}</td>
                        <td>{booking.date}</td>
                        <td>{booking.time || "-"}</td>
                        <td>₹{booking.price}</td>
                        <td>
                          <span
                            className={`${styles.typeBadge} ${
                              booking.bookingType === "WALKIN"
                                ? styles.walkin
                                : styles.prebook
                            }`}
                          >
                            {booking.bookingType || "PREBOOK"}
                          </span>
                        </td>
                        <td>{booking.paymentMode || "Pending"}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              styles[`status${booking.status}`]
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No bookings found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
