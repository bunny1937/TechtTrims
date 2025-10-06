import { useState, useEffect } from "react";
import styles from "../../styles/Admin/AdminModal.module.css";

export default function SalonDetailsModal({ salon, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalonDetails();
  }, [salon._id]);

  const fetchSalonDetails = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const salonId = salon._id.toString(); // Convert to string

      console.log("Fetching details for salon:", salonId);

      // Fetch bookings
      const bookingsRes = await fetch(`/api/admin/salons/${salonId}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        console.log("Bookings received:", bookingsData.bookings);
        setBookings(bookingsData.bookings || []);
      }

      // Fetch reviews
      const reviewsRes = await fetch(`/api/admin/salons/${salonId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        console.log("Reviews received:", reviewsData.reviews);
        setReviews(reviewsData.reviews || []);
      }

      // Fetch barbers
      const barbersRes = await fetch(`/api/admin/salons/${salonId}/barbers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (barbersRes.ok) {
        const barbersData = await barbersRes.json();
        console.log("Barbers received:", barbersData.barbers);
        setBarbers(barbersData.barbers || []);
      }
    } catch (error) {
      console.error("Error fetching salon details:", error);
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

        <h2 className={styles.title}>{salon.salonName}</h2>

        {loading ? (
          <div className={styles.loading}>Loading details...</div>
        ) : (
          <div className={styles.content}>
            {/* Basic Info */}
            <section className={styles.section}>
              <h3>Basic Information</h3>
              <div className={styles.info}>
                <p>
                  <strong>Owner:</strong> {salon.ownerName}
                </p>
                <p>
                  <strong>Email:</strong> {salon.email}
                </p>
                <p>
                  <strong>Phone:</strong> {salon.phone}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {salon.location?.address || "Not set"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {salon.isActive ? "✅ Active" : "❌ Inactive"}
                </p>
                <p>
                  <strong>Verified:</strong>{" "}
                  {salon.isVerified ? "✅ Yes" : "❌ No"}
                </p>
              </div>
            </section>

            {/* Stats */}
            <section className={styles.section}>
              <h3>Statistics</h3>
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <span>Total Bookings</span>
                  <strong>{bookings.length}</strong>
                </div>
                <div className={styles.statCard}>
                  <span>Rating</span>
                  <strong>
                    ⭐ {(salon.ratings?.overall || 5.0).toFixed(1)}
                  </strong>
                </div>
                <div className={styles.statCard}>
                  <span>Reviews</span>
                  <strong>{reviews.length}</strong>
                </div>
              </div>
            </section>

            {/* Barbers */}
            <section className={styles.section}>
              <h3>Barbers ({barbers.length})</h3>
              <div className={styles.list}>
                {barbers.length > 0 ? (
                  barbers.map((barber) => (
                    <div key={barber._id} className={styles.listItem}>
                      <p>
                        <strong>{barber.name}</strong>
                      </p>
                      <p className={styles.small}>
                        {barber.experience} years | ⭐ {barber.rating} |{" "}
                        {barber.totalBookings} bookings
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={styles.small}>No barbers added yet</p>
                )}
              </div>
            </section>

            {/* Recent Bookings */}
            <section className={styles.section}>
              <h3>Recent Bookings ({bookings.length})</h3>
              <div className={styles.list}>
                {bookings.length > 0 ? (
                  bookings.slice(0, 5).map((booking) => (
                    <div key={booking._id} className={styles.listItem}>
                      <p>
                        <strong>{booking.customerName}</strong>
                      </p>
                      <p className={styles.small}>
                        {booking.service} - {booking.date} at {booking.time}
                      </p>
                      <p className={styles.small}>
                        Status: {booking.status} | ₹{booking.price}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={styles.small}>No bookings yet</p>
                )}
              </div>
            </section>

            {/* Reviews */}
            <section className={styles.section}>
              <h3>Recent Reviews ({reviews.length})</h3>
              <div className={styles.list}>
                {reviews.length > 0 ? (
                  reviews.slice(0, 5).map((review) => (
                    <div key={review._id} className={styles.listItem}>
                      <p>
                        <strong>{review.customerName}</strong>
                      </p>
                      <p>⭐ {review.rating}/5</p>
                      <p className={styles.small}>
                        {review.comment || "No comment"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={styles.small}>No reviews yet</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
