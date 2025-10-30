import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import styles from "../../styles/Admin/AdminRevenue.module.css";

export default function AdminRevenue() {
  const router = useRouter();
  const [revenueData, setRevenueData] = useState(null);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("all");

  useEffect(() => {
    const admin = sessionStorage.getItem("adminData");
    if (!admin) {
      router.push("/admin/login");
      return;
    }
    fetchRevenueData();
  }, [filterMonth]);

  const fetchRevenueData = async () => {
    try {
      const response = await fetch(`/api/admin/revenue?month=${filterMonth}`, {
        credentials: "include",
      });
      const data = await response.json();
      setRevenueData(data.summary);
      setSalons(data.salons || []);
    } catch (error) {
      console.error("Error fetching revenue:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading revenue data...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Revenue Management</h1>
          <p className={styles.subtitle}>
            Track payments and earnings from all salons
          </p>
        </div>

        {/* Filter */}
        <div className={styles.filters}>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <h3>Total Revenue</h3>
            <p className={styles.amount}>₹{revenueData?.totalRevenue || 0}</p>
          </div>
          <div className={styles.card}>
            <h3>Collected</h3>
            <p className={styles.amount}>₹{revenueData?.collected || 0}</p>
          </div>
          <div className={styles.card}>
            <h3>Pending</h3>
            <p className={styles.amount}>₹{revenueData?.pending || 0}</p>
          </div>
          <div className={styles.card}>
            <h3>Salon Count</h3>
            <p className={styles.count}>{salons.length}</p>
          </div>
        </div>

        {/* Salons Revenue Table */}
        <div className={styles.tableContainer}>
          <h2>Salon-wise Revenue Breakdown</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Salon Name</th>
                <th>Owner</th>
                <th>Total Bookings</th>
                <th>Total Revenue</th>
                <th>Commission (15%)</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salons.map((salon) => (
                <tr key={salon._id}>
                  <td className={styles.salonName}>{salon.salonName}</td>
                  <td>{salon.ownerName}</td>
                  <td>{salon.totalBookings}</td>
                  <td>₹{salon.totalRevenue}</td>
                  <td>₹{salon.commission}</td>
                  <td className={styles.paid}>₹{salon.paid}</td>
                  <td className={styles.balance}>₹{salon.balance}</td>
                  <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className={styles.viewBtn}>Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
