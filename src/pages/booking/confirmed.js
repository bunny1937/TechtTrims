import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>Booking Status</h2>

      <div
        style={{
          background: "#f8f9fa",
          padding: 20,
          borderRadius: 8,
          marginBottom: 20,
        }}
      >
        <p>
          <strong>Booking ID:</strong> {booking._id}
        </p>
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

      <div style={{ marginBottom: 20 }}>
        <h3>Service Status</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            margin: "20px 0",
          }}
        >
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
        <div
          style={{
            background: "#d4edda",
            border: "1px solid #c3e6cb",
            padding: 15,
            borderRadius: 5,
            marginBottom: 20,
          }}
        >
          <h3 style={{ color: "#155724", margin: 0 }}>Service Completed!</h3>
          <p style={{ margin: "10px 0 0 0" }}>
            Your service has been completed. Please provide feedback.
          </p>
          <button
            onClick={proceedToFeedback}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: 5,
              cursor: "pointer",
              marginTop: 10,
            }}
          >
            Give Feedback
          </button>
        </div>
      )}

      {booking.status !== "completed" && (
        <div
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            padding: 15,
            borderRadius: 5,
          }}
        >
          <p style={{ margin: 0 }}>{getStatusMessage(booking.status)}</p>
        </div>
      )}
    </div>
  );
}

function StatusStep({ label, active, completed }) {
  return (
    <div
      style={{
        textAlign: "center",
        opacity: active || completed ? 1 : 0.4,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: completed ? "#28a745" : active ? "#ffc107" : "#6c757d",
          margin: "0 auto 5px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        {completed ? "✓" : active ? "⏳" : "⏸"}
      </div>
      <div style={{ fontSize: 12 }}>{label}</div>
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
