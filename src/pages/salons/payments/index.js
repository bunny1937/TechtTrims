// src/pages/salons/payments/index.js - COMPLETE REPLACEMENT
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonPayments.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";

export default function PaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [salon, setSalon] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalPayments: 0,
    todayPayments: 0,
    cashPayments: 0,
    onlinePayments: 0,
    totalAmount: 0,
    todayAmount: 0,
  });

  useEffect(() => {
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    const salonId = salonData._id || salonData.id;

    if (!salonId) {
      alert("Invalid salon session");
      router.push("/auth/salon/login");
      return;
    }

    loadPayments(salonId);
  }, [router]);

  const loadPayments = async (salonId) => {
    try {
      setLoading(true);

      const bookingsRes = await fetch(
        `/api/salons/bookings?salonId=${salonId}&date=all&includeWalkins=true`
      );
      const bookings = await bookingsRes.json();

      const barbersRes = await fetch(`/api/salons/barbers?salonId=${salonId}`);
      const barbersData = await barbersRes.json();

      const barberMap = {};
      barbersData.forEach((barber) => {
        const barberId = barber._id || barber.id;
        barberMap[barberId] = barber.name;
        barberMap[barberId.toString()] = barber.name;
      });

      const paidBookings = bookings.filter(
        (b) =>
          (b.status === "completed" || b.status === "confirmed") &&
          b.price &&
          b.price > 0
      );

      const paymentsData = paidBookings.map((b) => {
        let barberName = "Unassigned";

        if (
          b.barber &&
          typeof b.barber === "string" &&
          !b.barber.match(/^[0-9a-fA-F]{24}$/)
        ) {
          barberName = b.barber;
        } else if (b.barberId) {
          const id = b.barberId._id || b.barberId.id || b.barberId.toString();
          barberName =
            barberMap[id] || barberMap[id.toString()] || "Unassigned";
        } else if (b.barber) {
          barberName =
            barberMap[b.barber] || barberMap[b.barber.toString()] || b.barber;
        }

        return {
          _id: b._id,
          bookingCode: b.bookingCode,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          service: b.service,
          amount: b.price,
          paymentMode: b.paymentMode || "cash",
          date: b.date,
          time: b.time || "-",
          barber: barberName,
          paidAt: b.completedAt || b.updatedAt || b.createdAt,
        };
      });

      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      calculateStats(paymentsData);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData) => {
    const today = new Date().toISOString().split("T")[0];
    const todayPayments = paymentsData.filter((p) => p.date === today);

    const cashPayments = paymentsData.filter((p) => p.paymentMode === "cash");
    const onlinePayments = paymentsData.filter(
      (p) => p.paymentMode === "online"
    );

    const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
    const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalPayments: paymentsData.length,
      todayPayments: todayPayments.length,
      cashPayments: cashPayments.length,
      onlinePayments: onlinePayments.length,
      totalAmount,
      todayAmount,
    });
  };

  useEffect(() => {
    let result = [...payments];

    if (searchTerm) {
      result = result.filter(
        (p) =>
          p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.customerPhone?.includes(searchTerm) ||
          p.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter !== "all") {
      const today = new Date().toISOString().split("T")[0];
      if (dateFilter === "today") {
        result = result.filter((p) => p.date === today);
      } else if (dateFilter === "custom" && startDate && endDate) {
        result = result.filter((p) => p.date >= startDate && p.date <= endDate);
      }
    }

    if (serviceFilter !== "all") {
      result = result.filter((p) => p.service === serviceFilter);
    }

    if (modeFilter !== "all") {
      result = result.filter((p) => p.paymentMode === modeFilter);
    }

    setFilteredPayments(result);
  }, [
    searchTerm,
    dateFilter,
    serviceFilter,
    modeFilter,
    startDate,
    endDate,
    payments,
  ]);

  const uniqueServices = [...new Set(payments.map((p) => p.service))];

  if (loading) {
    return (
      <div className={dashboardStyles.dashboardWrapper}>
        <div className={dashboardStyles.sidebarDesktop}>
          <OwnerSidebar />
        </div>
        <main className={dashboardStyles.mainContent}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading payments...</p>
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
          <h2 className={dashboardStyles.mobileTitle}>Payments</h2>
        </div>

        <div className={styles.container}>
          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statIcon}>💰</span>
              <h3 className={styles.statLabel}>Total Revenue</h3>
              <p className={styles.statValue}>₹{stats.totalAmount}</p>
              <p className={styles.statSubtext}>
                {stats.totalPayments} payments
              </p>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>📅</span>
              <h3 className={styles.statLabel}>Today&#39;s Revenue</h3>
              <p className={styles.statValue}>₹{stats.todayAmount}</p>
              <p className={styles.statSubtext}>
                {stats.todayPayments} payments
              </p>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>💵</span>
              <h3 className={styles.statLabel}>Cash Payments</h3>
              <p className={styles.statValue}>{stats.cashPayments}</p>
              <p className={styles.statSubtext}>Total cash transactions</p>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statIcon}>💳</span>
              <h3 className={styles.statLabel}>Online Payments</h3>
              <p className={styles.statValue}>{stats.onlinePayments}</p>
              <p className={styles.statSubtext}>Digital transactions</p>
            </div>
          </div>

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
                <label>Payment Mode</label>
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
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
                Showing {filteredPayments.length} of {payments.length} payments
              </h3>
            </div>

            {filteredPayments.length > 0 ? (
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
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td>
                          <code>{payment.bookingCode}</code>
                        </td>
                        <td>{payment.customerName}</td>
                        <td>{payment.customerPhone}</td>
                        <td>{payment.service}</td>
                        <td>{payment.barber}</td>
                        <td>{payment.date}</td>
                        <td>
                          <strong>₹{payment.amount}</strong>
                        </td>
                        <td>
                          <span
                            className={`${styles.modeBadge} ${
                              styles[`mode${payment.paymentMode}`]
                            }`}
                          >
                            {payment.paymentMode}
                          </span>
                        </td>
                        <td>
                          {new Date(payment.paidAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>No payments found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
