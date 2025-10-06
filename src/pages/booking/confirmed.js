import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from "../../styles/BookingConfirmed.module.css";

export default function BookingConfirmed() {
  const router = useRouter();
  const { id } = router.query;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadBooking = async () => {
      try {
        const res = await fetch("/api/bookings/" + id);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking);
        }
      } catch (error) {
        console.error("Error loading booking:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
    const interval = setInterval(loadBooking, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const proceedToFeedback = () => {
    router.push(`/feedback?bookingId=${id}`);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!booking) return <div style={{ padding: 20 }}>Booking not found.</div>;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Booking Status</h2>
      <div className={styles.bookingCard}>
        <p className={styles.bookingInfo}>
          <strong>Customer:</strong> {booking.customerName}
          {booking.customerAge && ` (${booking.customerAge} years)`}
        </p>
        <p className={styles.bookingInfo}>
          <strong>Phone:</strong> {booking.customerPhone}
        </p>
        {booking.customerLocation && (
          <p className={styles.bookingInfo}>
            <strong>Location:</strong> {booking.customerLocation.address}
          </p>
        )}

        <p>
          <strong>Service:</strong> {booking.service}
        </p>
        {booking.barber && (
          <p>
            <strong>Barber:</strong> {booking.barber}
          </p>
        )}
        <p>
          <strong>Date:</strong> {booking.date}
        </p>
        <p>
          <strong>Time:</strong> {booking.time}
        </p>
        <p>
          <strong>Customer:</strong> {booking.customerName}
        </p>
      </div>

      <div className={styles.statusSection}>
        <h3 className={styles.statusHeading}>Service Status</h3>
        <div className={styles.statusTracker}>
          <StatusStep
            label="Confirmed"
            active={true}
            completed={booking.status !== "confirmed"}
          />
          <StatusStep
            label="Customer Arrived"
            active={
              booking.status === "arrived" ||
              isAfterStatus("arrived", booking.status)
            }
            completed={isAfterStatus("arrived", booking.status)}
          />
          <StatusStep
            label="Service Started"
            active={
              booking.status === "started" ||
              isAfterStatus("started", booking.status)
            }
            completed={isAfterStatus("started", booking.status)}
          />
          <StatusStep
            label="Service Done"
            active={booking.status === "completed"}
            completed={booking.status === "completed"}
          />
        </div>
      </div>

      {booking.status === "completed" && (
        <div className={styles.completedAlert}>
          <h3 className={styles.completedTitle}>Service Completed!</h3>
          <p className={styles.completedText}>
            Your service has been completed...
          </p>
          <button onClick={proceedToFeedback} className={styles.feedbackButton}>
            Give Feedback
          </button>
        </div>
      )}

      {booking.status !== "completed" && (
        <div className={styles.pendingAlert}>
          <p className={styles.pendingText}>
            {getStatusMessage(booking.status)}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusStep({ label, active, completed }) {
  return (
    <div
      className={`${styles.statusStep} ${
        active || completed ? styles.active : styles.inactive
      }`}
    >
      <div
        className={`${styles.statusIcon} ${
          completed
            ? styles.completed
            : active
            ? styles.active
            : styles.inactive
        }`}
      >
        {completed ? "✓" : active ? "⏳" : "⏸"}
      </div>
      <div className={styles.statusLabel}>{label}</div>
    </div>
  );
}

function isAfterStatus(checkStatus, currentStatus) {
  const statusOrder = ["confirmed", "arrived", "started", "completed"];
  return statusOrder.indexOf(currentStatus) > statusOrder.indexOf(checkStatus);
}

function getStatusMessage(status) {
  switch (status) {
    case "confirmed":
      return "Your booking is confirmed. Please arrive on time.";
    case "arrived":
      return "You have arrived. Waiting for service to start.";
    case "started":
      return "Your service is in progress. Please wait.";
    case "completed":
      return "Service completed! Please provide feedback.";
    default:
      return "Unknown status";
  }
}
