import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/WalkinConfirmation.module.css";

export default function WalkinConfirmation() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [booking, setBooking] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (!bookingId) return;

    fetchBooking();
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.expiresAt) return;

    const interval = setInterval(() => {
      const remaining = new Date(booking.expiresAt) - new Date();
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 1000 / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setTimeLeft("EXPIRED");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  // ✅ Poll booking status every 10 seconds
  useEffect(() => {
    if (!bookingId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/bookings/status/${bookingId}`);
        const data = await res.json();

        setBooking((prev) => ({
          ...prev,
          status: data.status,
          queueStatus: data.queueStatus,
          queuePosition: data.queuePosition,
        }));

        // Stop timer if expired
        if (data.isExpired) {
          setTimeLeft("EXPIRED");
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    const interval = setInterval(pollStatus, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await fetch(`/api/walkin/booking/${bookingId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch booking");
      }

      const data = await res.json();
      setBooking(data.booking);
      if (data.booking?.bookingCode) {
        const QRCode = (await import("qrcode")).default;
        const qrUrl = await QRCode.toDataURL(data.booking.bookingCode, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrUrl);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading booking details...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Booking Not Found</h2>
          <p>Unable to load booking details. Please check your booking ID.</p>
          <button onClick={() => router.push("/")}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>✅ Booking Confirmed!</h1>

        {/* QR Code */}
        <div className={styles.qrSection}>
          <div className={styles.qrCodeWrapper}>
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Booking QR Code"
                className={styles.qrCode}
              />
            ) : (
              <div className={styles.qrPlaceholder}>
                <span>Generating QR Code...</span>
              </div>
            )}
          </div>
          <p className={styles.bookingCode}>{booking.bookingCode}</p>
          <p className={styles.qrInstruction}>Show this at salon entrance</p>
        </div>

        {/* Details */}
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span>Salon:</span>
            <strong>{booking.salonName}</strong>
          </div>
          <div className={styles.detailItem}>
            <span>Barber:</span>
            <strong>{booking.barberName}</strong>
          </div>
          <div className={styles.detailItem}>
            <span>Chair:</span>
            <strong>#{booking.chairNumber}</strong>
          </div>
          <div className={styles.detailItem}>
            <span>Service:</span>
            <strong>{booking.service}</strong>
          </div>
          <div className={styles.detailItem}>
            <span>Customer:</span>
            <strong>{booking.customerName}</strong>
          </div>
        </div>

        <div
          className={`${styles.statusBadge} ${
            booking.queueStatus === "RED"
              ? styles.red
              : booking.queueStatus === "ORANGE"
              ? styles.orange
              : booking.queueStatus === "GREEN"
              ? styles.green
              : styles.completed
          }`}
        >
          <span className={styles.statusDot}></span>
          <span>
            {booking.queueStatus === "RED" && "🔴 Confirmed - Not Arrived"}
            {booking.queueStatus === "ORANGE" &&
              `🟠 In Queue - Position #${booking.queuePosition || "?"}`}
            {booking.queueStatus === "GREEN" && "🟢 Service Started"}
            {booking.queueStatus === "COMPLETED" && (
              <div className={styles.feedbackSection}>
                <h3>✨ Service Complete!</h3>
                <p>How was your experience?</p>
                <button
                  onClick={() =>
                    router.push(`/feedback?bookingId=${bookingId}`)
                  }
                  className={styles.feedbackBtn}
                >
                  📝 Give Feedback
                </button>
              </div>
            )}
          </span>
        </div>

        {/* Expiry Timer */}
        {booking.queueStatus === "RED" && (
          <div className={styles.expiryAlert}>
            <p>
              ⏰ Please arrive within:{" "}
              <strong>{timeLeft || "Calculating..."}</strong>
            </p>
            <p className={styles.note}>Booking expires after 45 minutes</p>
          </div>
        )}

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3>Next Steps:</h3>
          <ol>
            <li>📍 Head to the salon</li>
            <li>📱 Show this screen at reception</li>
            <li>✂️ Get your service done!</li>
          </ol>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            onClick={() => {
              if (booking.salonCoordinates) {
                // Use same format as SalonMap.js - opens with daddr (destination address)
                const [lng, lat] = booking.salonCoordinates;
                window.open(
                  `https://maps.google.com/maps?daddr=${lat},${lng}`,
                  "_blank"
                );
              } else if (booking.salonLocation) {
                // Fallback to address
                window.open(
                  `https://maps.google.com/?q=${encodeURIComponent(
                    booking.salonLocation
                  )}`,
                  "_blank"
                );
              }
            }}
          >
            📍 Get Directions
          </button>

          <button
            className={styles.btnSecondary}
            onClick={() => router.push("/")}
          >
            🏠 Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
