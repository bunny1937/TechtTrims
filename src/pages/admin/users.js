import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../components/Admin/AdminLayout";
import UserDetailsModal from "../../components/Admin/UserDetailsModal";
import styles from "../../styles/Admin/AdminUsers.module.css";

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const admin = sessionStorage.getItem("adminData");
    if (!admin) {
      router.push("/admin/login");
      return;
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsersList();
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsersList = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    setFilteredUsers(filtered);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loading}>Loading users...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>User Management</h1>
          <p className={styles.subtitle}>Total Users: {users.length}</p>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Bookings</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td className={styles.userName}>{user.name}</td>
                  <td>{user.email || "N/A"}</td>
                  <td>{user.phone}</td>
                  <td className={styles.gender}>{user.gender}</td>
                  <td>{user.bookingHistory?.length || 0}</td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        user.isActive ? styles.active : styles.inactive
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setSelectedUser(user)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className={styles.noData}>No users found</div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </AdminLayout>
  );
}
