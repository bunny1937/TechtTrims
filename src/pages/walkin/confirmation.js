import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/WalkinConfirmation.module.css";
import feedbackStyles from "../../styles/Feedback.module.css";

export default function WalkinConfirmation() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [booking, setBooking] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  // Feedback state
  const [ratings, setRatings] = useState({
    serviceQuality: 0,
    timing: 0,
    barberPerformance: 0,
    ambience: 0,
    cleanliness: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/walkin/booking/${bookingId}`);
        if (!res.ok) throw new Error("Failed to fetch booking");
        const data = await res.json();
        setBooking(data.booking);

        // Auto-show feedback when completed AND not already submitted
        if (
          data.booking?.queueStatus === "COMPLETED" &&
          !data.booking?.feedback?.submitted
        ) {
          setShowFeedback(true);
        } else if (data.booking?.feedback?.submitted) {
          setShowFeedback(false); // Hide feedback form if already submitted
        }

        if (data.booking?.bookingCode) {
          if (data.booking?.bookingCode && !qrCodeUrl) {
            const QRCode = (await import("qrcode")).default;
            const qrUrl = await QRCode.toDataURL(data.booking.bookingCode, {
              width: 200,
              margin: 2,
              color: { dark: "#000000", light: "#FFFFFF" },
            });
            setQrCodeUrl(qrUrl);
          }
          const qrUrl = await QRCode.toDataURL(data.booking.bookingCode, {
            width: 200,
            margin: 2,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          setQrCodeUrl(qrUrl);
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };

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

  // Poll booking status every 5 seconds
  useEffect(() => {
    if (!bookingId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/walkin/booking/${bookingId}`);
        const data = await res.json();

        setBooking((prev) => ({
          ...prev,
          queueStatus: data.booking.queueStatus,
          queuePosition: data.booking.queuePosition,
        }));

        // Auto-show feedback ONLY if not already submitted
        if (
          data.booking.queueStatus === "COMPLETED" &&
          !showFeedback &&
          !data.booking.feedback?.submitted
        ) {
          setShowFeedback(true);
        } else if (data.booking.feedback?.submitted && showFeedback) {
          setShowFeedback(false);
        }

        if (data.booking.isExpired) {
          setTimeLeft("EXPIRED");
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [bookingId, showFeedback]);

  const submitFeedback = async () => {
    const unratedFields = Object.entries(ratings)
      .filter(([key, value]) => value === 0)
      .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());

    if (unratedFields.length > 0) {
      alert(`Please rate: ${unratedFields.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          feedback: {
            ratings,
            comment,
            submittedAt: new Date(),
            serviceDate: booking.completedAt || booking.createdAt,
            customerPhone: booking.customerPhone,
            price: booking.price,
            barberName: booking.barberName,
          },
        }),
      });

      if (response.ok) {
        const userToken = localStorage.getItem("userToken");
        const authenticatedUserData = localStorage.getItem(
          "authenticatedUserData"
        );

        if (userToken || authenticatedUserData) {
          router.push("/user/dashboard");
        } else {
          const prefillData = {
            name: booking.customerName,
            phone: booking.customerPhone,
            gender: booking.customerGender,
            lastBooking: {
              salonId: booking.salonId,
              service: booking.service,
            },
          };
          localStorage.setItem("userPrefillData", JSON.stringify(prefillData));
          router.push("/auth/user/register");
        }
      } else {
        alert("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      alert("Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label, required = true }) => (
    <div className={feedbackStyles.ratingGroup}>
      <label className={feedbackStyles.ratingLabel}>
        {label} {required && <span className={feedbackStyles.required}>*</span>}
      </label>
      <div className={feedbackStyles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${feedbackStyles.starButton} ${
              star <= value
                ? feedbackStyles.starFilled
                : feedbackStyles.starEmpty
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <div className={feedbackStyles.ratingInfo}>
        {value > 0 ? (
          <span className={feedbackStyles.ratingValue}>
            {value}/5 -{" "}
            {value === 1
              ? "Poor"
              : value === 2
              ? "Fair"
              : value === 3
              ? "Good"
              : value === 4
              ? "Very Good"
              : "Excellent"}
          </span>
        ) : (
          <span className={feedbackStyles.ratingPlaceholder}>Tap to rate</span>
        )}
      </div>
    </div>
  );

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
          <p>Unable to load booking details.</p>
          <button onClick={() => router.push("/")}>Go Home</button>
        </div>
      </div>
    );
  }

  // Show feedback form when service is completed

  // Show feedback form when service is completed
  if (showFeedback) {
    // Check if feedback already submitted
    if (booking.feedback?.submitted) {
      return (
        <div className={feedbackStyles.pageContainer}>
          <div className={feedbackStyles.content}>
            <div className={feedbackStyles.card}>
              <div className={feedbackStyles.header}>
                <h1 className={feedbackStyles.title}>✅ Feedback Submitted</h1>
                <p className={feedbackStyles.subtitle}>
                  Thank you for your feedback on {booking.salonName}!
                </p>
              </div>

              {/* Show submitted feedback */}
              <div className={feedbackStyles.submittedFeedback}>
                <h3>Your Review:</h3>
                <div className={feedbackStyles.ratingsDisplay}>
                  <p>
                    <strong>Service Quality:</strong>{" "}
                    {booking.feedback.ratings.serviceQuality}/5 ⭐
                  </p>
                  <p>
                    <strong>Timing:</strong> {booking.feedback.ratings.timing}/5
                    ⭐
                  </p>
                  <p>
                    <strong>Barber Performance:</strong>{" "}
                    {booking.feedback.ratings.barberPerformance}/5 ⭐
                  </p>
                  <p>
                    <strong>Ambience:</strong>{" "}
                    {booking.feedback.ratings.ambience}/5 ⭐
                  </p>
                  <p>
                    <strong>Cleanliness:</strong>{" "}
                    {booking.feedback.ratings.cleanliness}/5 ⭐
                  </p>
                  <p>
                    <strong>Overall:</strong> {booking.feedback.ratings.overall}
                    /5 ⭐
                  </p>
                </div>
                {booking.feedback.comment && (
                  <div className={feedbackStyles.commentDisplay}>
                    <h4>Your Comment:</h4>
                    <p>{booking.feedback.comment}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push("/user/dashboard")}
                className={feedbackStyles.submitButton}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={feedbackStyles.pageContainer}>
        <div className={feedbackStyles.content}>
          <div className={feedbackStyles.card}>
            <div className={feedbackStyles.header}>
              <h1 className={feedbackStyles.title}>✨ Rate Your Experience</h1>
              <p className={feedbackStyles.subtitle}>
                How was your visit to {booking.salonName}?
              </p>
            </div>

            {/* Booking Summary */}
            <div className={feedbackStyles.bookingSummary}>
              <h3 className={feedbackStyles.summaryTitle}>
                📋 Booking Summary
              </h3>
              <div className={feedbackStyles.summaryGrid}>
                <p className={feedbackStyles.summaryInfo}>
                  <strong>Salon:</strong> {booking.salonName}
                </p>
                <p className={feedbackStyles.summaryInfo}>
                  <strong>Barber:</strong> {booking.barberName}
                </p>
                <p className={feedbackStyles.summaryInfo}>
                  <strong>Service:</strong> {booking.service}
                </p>
                <p className={feedbackStyles.summaryInfo}>
                  <strong>Price:</strong> ₹{booking.price}
                </p>
              </div>
            </div>

            {/* Rating Form */}
            <div className={feedbackStyles.ratingsForm}>
              <StarRating
                label="Service Quality"
                value={ratings.serviceQuality}
                onChange={(value) =>
                  setRatings({ ...ratings, serviceQuality: value })
                }
              />
              <StarRating
                label="Timing/Punctuality"
                value={ratings.timing}
                onChange={(value) => setRatings({ ...ratings, timing: value })}
              />
              <StarRating
                label="Barber Performance"
                value={ratings.barberPerformance}
                onChange={(value) =>
                  setRatings({ ...ratings, barberPerformance: value })
                }
              />
              <StarRating
                label="Salon Ambience"
                value={ratings.ambience}
                onChange={(value) =>
                  setRatings({ ...ratings, ambience: value })
                }
              />
              <StarRating
                label="Cleanliness"
                value={ratings.cleanliness}
                onChange={(value) =>
                  setRatings({ ...ratings, cleanliness: value })
                }
              />
              <StarRating
                label="Overall Experience"
                value={ratings.overall}
                onChange={(value) => setRatings({ ...ratings, overall: value })}
              />
            </div>

            {/* Comment Section */}
            <div className={feedbackStyles.commentSection}>
              <label className={feedbackStyles.commentLabel}>
                💬 Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience in detail..."
                className={feedbackStyles.textarea}
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className={feedbackStyles.submitSection}>
              <button
                onClick={submitFeedback}
                disabled={
                  submitting || Object.values(ratings).some((r) => r === 0)
                }
                className={feedbackStyles.submitButton}
              >
                {submitting ? "Submitting..." : "✅ Done"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show booking confirmation (original UI)
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
            <strong>{booking.chairNumber}</strong>
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
            {booking.queueStatus === "RED" &&
              `Position #${booking.queuePosition || 1} in ${
                booking.barberName
              }'s queue`}
            {booking.queueStatus === "ORANGE" &&
              `In Queue - Position #${booking.queuePosition || 1} with ${
                booking.barberName
              }`}
            {booking.queueStatus === "GREEN" && "🟢 Service Started"}
            {booking.queueStatus === "COMPLETED" && "✅ Service Complete"}
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
                const [lng, lat] = booking.salonCoordinates;
                window.open(
                  `https://maps.google.com/maps?daddr=${lat},${lng}`,
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
