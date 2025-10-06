import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import styles from "../../styles/Admin/AdminReports.module.css";

export default function AdminReports() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("comprehensive");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportType, dateRange }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TechTrims_Report_${reportType}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1>Report Generation</h1>
        <p className={styles.subtitle}>
          Generate comprehensive PDF reports for all data
        </p>

        <div className={styles.reportForm}>
          <div className={styles.formGroup}>
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="comprehensive">
                Comprehensive Report (All Data)
              </option>
              <option value="salons">Salons Report</option>
              <option value="users">Users Report</option>
              <option value="bookings">Bookings Report</option>
              <option value="revenue">Revenue Report</option>
              <option value="analytics">Analytics Report</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Date Range (Optional)</label>
            <div className={styles.dateRange}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
              />
            </div>
          </div>

          <button
            className={styles.generateBtn}
            onClick={generateReport}
            disabled={loading}
          >
            {loading ? "Generating PDF..." : "📄 Generate Report"}
          </button>
        </div>

        <div className={styles.reportInfo}>
          <h3>Report Contents</h3>
          <ul>
            <li>✅ All registered salons with complete details</li>
            <li>✅ User statistics and demographics</li>
            <li>✅ Booking trends and analytics</li>
            <li>✅ Revenue breakdown and payments</li>
            <li>✅ Performance metrics and insights</li>
            <li>✅ Charts and visualizations</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
