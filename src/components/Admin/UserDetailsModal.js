import { useState, useEffect } from "react";
import styles from "../../styles/Admin/AdminModal.module.css";

export default function UserDetailsModal({ user, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserBookings();
  }, []);

  const fetchUserBookings = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/users/${user._id}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <h2 className={styles.title}>{user.name}</h2>

        {loading ? (
          <div className={styles.loading}>Loading details...</div>
        ) : (
          <div className={styles.content}>
            {/* Basic Info */}
            <section className={styles.section}>
              <h3>User Information</h3>
              <div className={styles.info}>
                <p>
                  <strong>Email:</strong> {user.email || "N/A"}
                </p>
                <p>
                  <strong>Phone:</strong> {user.phoneNumber || user.phone}
                </p>
                <p>
                  <strong>Age:</strong> {user.age ? `${user.age} years` : "N/A"}
                </p>
                <p>
                  <strong>Gender:</strong> {user.gender}
                </p>
                {user.location && (
                  <p>
                    <strong>Location:</strong> {user.location.address || "Set"}
                  </p>
                )}
                <p>
                  <strong>Status:</strong>{" "}
                  {user.isActive ? "Active" : "Inactive"}
                </p>
                <p>
                  <strong>Joined:</strong>{" "}
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </section>

            {/* Booking History */}
            <section className={styles.section}>
              <h3>Booking History ({bookings.length})</h3>
              <div className={styles.list}>
                {bookings.map((booking) => (
                  <div key={booking._id} className={styles.listItem}>
                    <p>
                      <strong>{booking.service}</strong>
                    </p>
                    <p className={styles.small}>
                      {booking.salonName} - {booking.date} at {booking.time}
                    </p>
                    <p className={styles.small}>
                      Status: {booking.status} | ₹{booking.price}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews Given */}
            <section className={styles.section}>
              <h3>Reviews & Feedback</h3>
              <div className={styles.list}>
                {bookings
                  .filter((b) => b.feedback?.submitted)
                  .map((booking) => (
                    <div key={booking._id} className={styles.listItem}>
                      <p>⭐ {booking.feedback.ratings.overall}/5</p>
                      <p className={styles.small}>{booking.feedback.comment}</p>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
