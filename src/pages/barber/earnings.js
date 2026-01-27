// src/pages/barber/earnings.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/barber/BarberEarnings.module.css";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Award,
  CreditCard,
  PieChart,
} from "lucide-react";
import BarberSidebar from "@/components/Barber/BarberSidebar";

export default function BarberEarnings() {
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);

  // Earnings data
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    tips: 0,
    pendingPayout: 0,
    lastPayout: null,
    bookingsCompleted: 0,
  });

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [breakdown, setBreakdown] = useState({
    services: [],
    dailyEarnings: [],
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
    loadEarnings(barberData._id || barberData.id, selectedMonth, selectedYear);
  }, []);

  // Reload on month change
  useEffect(() => {
    if (barber) {
      loadEarnings(barber._id || barber.id, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  // Load earnings
  const loadEarnings = async (barberId, month, year) => {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/barber/earnings?barberId=${barberId}&month=${month}&year=${year}`,
      );

      if (!res.ok) {
        throw new Error("Failed to load earnings");
      }

      const data = await res.json();
      setEarningsData(data.summary || {});
      setTransactions(data.transactions || []);
      setBreakdown(data.breakdown || { services: [], dailyEarnings: [] });
    } catch (err) {
      console.error("Error loading earnings:", err);
    } finally {
      setLoading(false);
    }
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

  // Download report
  const downloadReport = () => {
    const csv = [
      ["Date", "Service", "Amount", "Type", "Status"],
      ...transactions.map((t) => [
        new Date(t.date).toLocaleDateString(),
        t.service,
        `₹${t.amount}`,
        t.type,
        t.status,
      ]),
      [],
      ["Summary"],
      ["Total Earnings", `₹${earningsData.totalEarnings}`],
      ["Monthly Earnings", `₹${earningsData.monthlyEarnings}`],
      ["Tips", `₹${earningsData.tips}`],
      ["Bookings Completed", earningsData.bookingsCompleted],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Earnings_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading ...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <BarberSidebar barber={barber} currentPage="earnings" />

      <div className={styles.mainContent}></div>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.backButton}
              onClick={() => router.push("/barber/dashboard")}
            >
              <ChevronLeft size={20} />
              Back
            </button>
            <div className={styles.headerTitle}>
              <DollarSign className={styles.headerIcon} size={28} />
              <div>
                <h1>Earnings</h1>
                <p>{barber?.name}</p>
              </div>
            </div>
          </div>
        </header>

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

        {/* Earnings Overview */}
        <div className={styles.overviewGrid}>
          <div className={`${styles.overviewCard} ${styles.totalEarnings}`}>
            <div className={styles.cardHeader}>
              <DollarSign className={styles.cardIcon} />
              <h3>Total Earnings</h3>
            </div>
            <div className={styles.cardAmount}>
              ₹{earningsData.totalEarnings?.toLocaleString("en-IN") || 0}
            </div>
            <p className={styles.cardSubtext}>All time earnings</p>
          </div>

          <div className={`${styles.overviewCard} ${styles.monthlyEarnings}`}>
            <div className={styles.cardHeader}>
              <Calendar className={styles.cardIcon} />
              <h3>This Month</h3>
            </div>
            <div className={styles.cardAmount}>
              ₹{earningsData.monthlyEarnings?.toLocaleString("en-IN") || 0}
            </div>
            <p className={styles.cardSubtext}>Current month earnings</p>
          </div>

          <div className={`${styles.overviewCard} ${styles.tips}`}>
            <div className={styles.cardHeader}>
              <Award className={styles.cardIcon} />
              <h3>Tips</h3>
            </div>
            <div className={styles.cardAmount}>
              ₹{earningsData.tips?.toLocaleString("en-IN") || 0}
            </div>
            <p className={styles.cardSubtext}>Customer tips received</p>
          </div>

          <div className={`${styles.overviewCard} ${styles.bookings}`}>
            <div className={styles.cardHeader}>
              <Briefcase className={styles.cardIcon} />
              <h3>Bookings</h3>
            </div>
            <div className={styles.cardAmount}>
              {earningsData.bookingsCompleted || 0}
            </div>
            <p className={styles.cardSubtext}>Services completed</p>
          </div>
        </div>

        {/* Service Breakdown */}
        {breakdown.services && breakdown.services.length > 0 && (
          <div className={styles.breakdownCard}>
            <div className={styles.breakdownHeader}>
              <PieChart className={styles.sectionIcon} />
              <h2>Service Breakdown</h2>
            </div>
            <div className={styles.servicesList}>
              {breakdown.services.map((service, idx) => (
                <div key={idx} className={styles.serviceItem}>
                  <div className={styles.serviceInfo}>
                    <span className={styles.serviceName}>{service.name}</span>
                    <span className={styles.serviceCount}>
                      {service.count} services
                    </span>
                  </div>
                  <div className={styles.serviceEarnings}>
                    ₹{service.earnings.toLocaleString("en-IN")}
                  </div>
                  <div className={styles.serviceBar}>
                    <div
                      className={styles.serviceBarFill}
                      style={{
                        width: `${(service.earnings / earningsData.monthlyEarnings) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        <div className={styles.transactionsCard}>
          <div className={styles.transactionsHeader}>
            <div className={styles.sectionTitleGroup}>
              <CreditCard className={styles.sectionIcon} />
              <h2>Transaction History</h2>
            </div>
            <button className={styles.downloadButton} onClick={downloadReport}>
              <Download size={18} />
              Download Report
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <CreditCard size={64} />
              <p>No transactions for this month</p>
            </div>
          ) : (
            <div className={styles.transactionsList}>
              {transactions.map((transaction, idx) => (
                <div key={idx} className={styles.transactionItem}>
                  <div className={styles.transactionDate}>
                    {new Date(transaction.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className={styles.transactionMain}>
                    <div className={styles.transactionInfo}>
                      <span className={styles.transactionService}>
                        {transaction.service}
                      </span>
                      <span className={styles.transactionCustomer}>
                        {transaction.customerName}
                      </span>
                    </div>
                    <div className={styles.transactionRight}>
                      <span className={styles.transactionAmount}>
                        +₹{transaction.amount}
                      </span>
                      <span
                        className={`${styles.transactionType} ${
                          transaction.type === "tip"
                            ? styles.typeTip
                            : styles.typeService
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout Info */}
        <div className={styles.payoutCard}>
          <div className={styles.payoutHeader}>
            <TrendingUp className={styles.payoutIcon} />
            <div>
              <h3>Pending Payout</h3>
              <p>Next payout on 1st of next month</p>
            </div>
          </div>
          <div className={styles.payoutAmount}>
            ₹{earningsData.pendingPayout?.toLocaleString("en-IN") || 0}
          </div>
          {earningsData.lastPayout && (
            <p className={styles.lastPayout}>
              Last payout: ₹
              {earningsData.lastPayout.amount.toLocaleString("en-IN")} on{" "}
              {new Date(earningsData.lastPayout.date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
