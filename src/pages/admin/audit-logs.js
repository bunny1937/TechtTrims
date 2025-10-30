import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import styles from "../../styles/Admin/AdminAnalytics.module.css";

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      const response = await fetch(`/api/admin/audit-logs?${queryParams}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      alert("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes("DELETE")) return styles.badgeDanger;
    if (action.includes("CREATE")) return styles.badgeSuccess;
    if (action.includes("UPDATE")) return styles.badgeWarning;
    if (action.includes("VIEW")) return styles.badgeInfo;
    return styles.badgeSecondary;
  };

  const getStatusBadgeColor = (status) => {
    return status === "SUCCESS" ? styles.badgeSuccess : styles.badgeDanger;
  };

  return (
    <AdminLayout>
      <div className={styles.auditLogs}>
        <div className={styles.header}>
          <h1>🔍 Audit Logs</h1>
          <p>Track all admin actions and system changes</p>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className={styles.select}
          >
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE_SALON">Create Salon</option>
            <option value="UPDATE_SALON">Update Salon</option>
            <option value="DELETE_SALON">Delete Salon</option>
            <option value="TOGGLE_SALON_STATUS">Toggle Salon Status</option>
            <option value="VIEW_USERS">View Users</option>
            <option value="VIEW_REVENUE">View Revenue</option>
            <option value="VIEW_ANALYTICS">View Analytics</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={styles.select}
          >
            <option value="">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
            className={styles.input}
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
            className={styles.input}
            placeholder="End Date"
          />

          <button onClick={fetchLogs} className={styles.buttonPrimary}>
            Apply Filters
          </button>
        </div>

        {/* Logs Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loading}>Loading audit logs...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                    <td>
                      <strong>{log.adminUsername}</strong>
                    </td>
                    <td>
                      <span className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      {log.resource && (
                        <div>
                          {log.resource}
                          {log.resourceId && (
                            <div className={styles.resourceId}>
                              ID: {log.resourceId.substring(0, 8)}...
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={getStatusBadgeColor(log.status)}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.ipAddress || "N/A"}</td>
                    <td>
                      {log.details && (
                        <details>
                          <summary>View Details</summary>
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
            disabled={pagination.page === 1}
            className={styles.buttonSecondary}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.pages} ({pagination.total}{" "}
            total)
          </span>
          <button
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
            disabled={pagination.page === pagination.pages}
            className={styles.buttonSecondary}
          >
            Next
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
