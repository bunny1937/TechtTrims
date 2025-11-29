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
  const [queueStatusFilter, setQueueStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // NEW: Sort option
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
      // FIX: Remove date filter from API call to get ALL bookings
      const res = await fetch(
        `/api/salons/bookings?salonId=${salonId}&includeWalkins=true`
      );
      const data = await res.json();

      console.log("📊 Total bookings loaded:", data.length);

      setBookings(data);
      setFilteredBookings(data);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // FIX: Improved filtering logic
  useEffect(() => {
    let result = [...bookings];

    // Search filter with highlighting
    if (searchTerm) {
      result = result.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.customerPhone?.includes(searchTerm) ||
          b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.service?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter - FIX: Compare dates properly
    if (dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      if (dateFilter === "today") {
        result = result.filter((b) => {
          if (!b.createdAt) return false;
          const bookingDate = new Date(b.createdAt);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate.toISOString().split("T")[0] === todayStr;
        });
      } else if (dateFilter === "custom" && startDate && endDate) {
        result = result.filter((b) => {
          if (!b.createdAt) return false;
          const bookingDate = new Date(b.createdAt).toISOString().split("T")[0];
          return bookingDate >= startDate && bookingDate <= endDate;
        });
      }
    }

    // Service filter
    if (serviceFilter !== "all") {
      result = result.filter((b) => b.service === serviceFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Queue Status filter
    if (queueStatusFilter !== "all") {
      result = result.filter((b) => b.queueStatus === queueStatusFilter);
    }

    // Sort
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "priceHigh") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "priceLow") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    setFilteredBookings(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [
    searchTerm,
    dateFilter,
    serviceFilter,
    statusFilter,
    queueStatusFilter,
    sortBy,
    startDate,
    endDate,
    bookings,
  ]);

  // Get unique services for filter
  const uniqueServices = [
    ...new Set(bookings.map((b) => b.service).filter(Boolean)),
  ];

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Highlight search term in text
  const highlightText = (text, search) => {
    if (!search || !text) return text;
    const parts = text.split(new RegExp(`(${search})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className={styles.highlight}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

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
        <>
          <div
            className={dashboardStyles.sidebarOverlay}
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={dashboardStyles.sidebarMobile}
            onClick={(e) => e.stopPropagation()}
          >
            <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </>
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
              {/* Search */}
              <div className={styles.filterGroup}>
                <label>Search</label>
                <input
                  type="text"
                  placeholder="Search by name, phone, code, service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.filterInput}
                />
              </div>

              {/* Date */}
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

              {/* Service */}
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

              {/* Status */}
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
                  <option value="inservice">In Service</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Queue Status */}
              <div className={styles.filterGroup}>
                <label>Queue Status</label>
                <select
                  value={queueStatusFilter}
                  onChange={(e) => setQueueStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Queue Status</option>
                  <option value="RED">Booked (RED)</option>
                  <option value="ORANGE">Arrived (ORANGE)</option>
                  <option value="GREEN">Serving (GREEN)</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Sort By - NEW */}
              <div className={styles.filterGroup}>
                <label>Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="priceLow">Price: Low to High</option>
                </select>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateFilter === "custom" && (
              <div className={styles.dateRangeRow}>
                <div className={styles.dateInputWrapper}>
                  <label>From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={styles.filterInput}
                    max={new Date().toISOString().split("T")[0]}
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
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>
                Showing {paginatedBookings.length} of {filteredBookings.length}{" "}
                bookings
                {filteredBookings.length !== bookings.length && (
                  <span style={{ color: "#f59e0b", marginLeft: "8px" }}>
                    (Filtered from {bookings.length} total)
                  </span>
                )}
              </h3>
            </div>

            {paginatedBookings.length > 0 ? (
              <>
                <div className={styles.tableWrapper}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Service</th>
                        <th>Barber</th>
                        <th>Created At</th>
                        <th>Price</th>
                        <th>Type</th>
                        <th>Queue</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBookings.map((booking) => (
                        <tr key={booking._id}>
                          <td>
                            <code>
                              {highlightText(
                                booking.bookingCode || "N/A",
                                searchTerm
                              )}
                            </code>
                          </td>
                          <td>
                            {highlightText(
                              booking.customerName || "N/A",
                              searchTerm
                            )}
                          </td>
                          <td>
                            {highlightText(
                              booking.customerPhone || "N/A",
                              searchTerm
                            )}
                          </td>
                          <td>
                            {highlightText(
                              booking.service || "N/A",
                              searchTerm
                            )}
                          </td>
                          <td>{booking.barber || "Unassigned"}</td>
                          <td>
                            {booking.createdAt
                              ? new Date(booking.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "N/A"}
                          </td>
                          <td>
                            <strong>₹{booking.price || 0}</strong>
                          </td>
                          <td>
                            <span
                              className={`${styles.typeBadge} ${
                                booking.bookingType === "WALKIN"
                                  ? styles.walkin
                                  : styles.prebook
                              }`}
                            >
                              {booking.bookingType || "WALKIN"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.queueBadge} ${
                                styles[`queue${booking.queueStatus}`]
                              }`}
                            >
                              {booking.queueStatus || "N/A"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                styles[`status${booking.status}`]
                              }`}
                            >
                              {booking.status || "pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={styles.pageButton}
                    >
                      ← Previous
                    </button>
                    <span className={styles.pageInfo}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className={styles.pageButton}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
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
