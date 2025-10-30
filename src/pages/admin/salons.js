import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import SalonDetailsModal from "../../components/Admin/SalonDetailsModal";
import styles from "../../styles/Admin/AdminSalons.module.css";

export default function AdminSalons() {
  const router = useRouter();
  const [salons, setSalons] = useState([]);
  const [filteredSalons, setFilteredSalons] = useState([]);
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    const admin = sessionStorage.getItem("adminData");
    if (!admin) {
      router.push("/admin/login");
      return;
    }
    fetchSalons();
  }, [router]);

  const filterSalonsList = useCallback(() => {
    let filtered = salons;

    if (searchTerm) {
      filtered = filtered.filter(
        (salon) =>
          salon.salonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          salon.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          salon.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((salon) =>
        filterStatus === "active" ? salon.isActive : !salon.isActive
      );
    }

    setFilteredSalons(filtered);
  }, [searchTerm, filterStatus, salons]);

  useEffect(() => {
    filterSalonsList();
  }, [filterSalonsList]);

  const fetchSalons = async () => {
    try {
      const response = await fetch("/api/admin/salons", {
        credentials: "include",
      });
      const data = await response.json();
      setSalons(data.salons || []);
    } catch (error) {
      console.error("Error fetching salons:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSalonStatus = async (salonId, currentStatus) => {
    try {
      const response = await fetch(
        `/api/admin/salons/${salonId}/toggle-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (response.ok) {
        fetchSalons();
        alert(
          `Salon ${!currentStatus ? "activated" : "deactivated"} successfully`
        );
      }
    } catch (error) {
      console.error("Error toggling salon status:", error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading salons...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Salon Management</h1>
          <p className={styles.subtitle}>Total Salons: {salons.length}</p>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search by name, owner, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.statusFilter}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Salons Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Salon Name</th>
                <th>Owner</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Bookings</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalons.map((salon) => (
                <tr key={salon._id}>
                  <td className={styles.salonName}>{salon.salonName}</td>
                  <td>{salon.ownerName}</td>
                  <td>{salon.email}</td>
                  <td>{salon.phone}</td>
                  <td>{salon.stats?.totalBookings || 0}</td>
                  <td>
                    <span className={styles.rating}>
                      ⭐ {(salon.ratings?.overall || 5.0).toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        salon.isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {salon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => setSelectedSalon(salon)}
                      >
                        View
                      </button>
                      <button
                        className={styles.toggleBtn}
                        onClick={() =>
                          toggleSalonStatus(salon._id, salon.isActive)
                        }
                      >
                        {salon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSalons.length === 0 && (
            <div className={styles.noData}>No salons found</div>
          )}
        </div>
      </div>

      {selectedSalon && (
        <SalonDetailsModal
          salon={selectedSalon}
          onClose={() => setSelectedSalon(null)}
        />
      )}
    </AdminLayout>
  );
}
