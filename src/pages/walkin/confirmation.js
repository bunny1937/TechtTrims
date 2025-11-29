import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/WalkinConfirmation.module.css";
import feedbackStyles from "../../styles/Feedback.module.css";
import { motion } from "framer-motion";
import { showError, showWarning } from "@/lib/toast";
// Format time ago
const formatTimeAgo = (date) => {
  if (!date) return "N/A";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000 / 60);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
};

// Format expiry countdown
const formatExpiry = (expiryDate) => {
  if (!expiryDate) return "N/A";
  const remaining = Math.ceil((new Date(expiryDate) - new Date()) / 1000 / 60);
  if (remaining < 0) return "Expired";
  if (remaining < 1) return "< 1m";
  return `${remaining}m`;
};

// Format time left in service
const formatTimeLeft = (completionTime) => {
  if (!completionTime) return "N/A";
  const remaining = Math.ceil(
    (new Date(completionTime) - new Date()) / 1000 / 60
  );
  if (remaining < 0) return "Done";
  return `${remaining}m left`;
};

export default function WalkinConfirmation() {
  const router = useRouter();
  const { bookingId, salonId } = router.query;

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
  const [salonState, setSalonState] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [queueInfo, setQueueInfo] = useState(null); // NEW: Queue position info
  const [error, setError] = useState(null);
  const [barberQueueData, setBarberQueueData] = useState(null);

  // ==================== useEffects - START ====================

  // 1. Fetch booking details on component mount (ORIGINAL)
  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      try {
        setLoading(true);
        console.log("📥 Fetching booking:", bookingId);

        // Mark expired first
        await fetch("/api/walkin/mark-expired", { method: "POST" });

        const res = await fetch(`/api/walkin/booking/${bookingId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch booking");

        const data = await res.json();
        console.log("✅ Booking fetched:", data.booking);
        const bookingData = data.booking;

        // Check if expired
        const now = new Date();
        const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
        if (
          bookingData.isExpired ||
          (bookingData.queueStatus === "RED" &&
            new Date(bookingData.expiresAt) < bufferTime)
        ) {
          setError("⚠️ This booking has EXPIRED. Please book again.");
          setBooking({ ...bookingData, isExpired: true });
          setLoading(false); // ✅ ADD THIS
          return;
        }
        setBooking(data.booking);

        // Generate QR Code dynamically
        if (data.booking?.bookingCode && !qrCodeUrl) {
          try {
            const QRCodeModule = await import("qrcode");
            const qrUrl = await QRCodeModule.default.toDataURL(
              data.booking.bookingCode,
              {
                width: 200,
                margin: 2,
                color: { dark: "#1a0f00", light: "#faf6ef" },
              }
            );
            setQrCodeUrl(qrUrl);
            console.log("✅ QR code generated");
          } catch (qrErr) {
            console.error("❌ QR code generation error:", qrErr);
          }
        }

        // Auto-show feedback if completed and not submitted
        if (
          data.booking?.queueStatus === "COMPLETED" &&
          !data.booking?.feedback?.submitted
        ) {
          setShowFeedback(true);
        }
      } catch (error) {
        console.error("❌ Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, qrCodeUrl]);

  // 2. Countdown timer (ORIGINAL)
  useEffect(() => {
    if (!booking?.expiresAt) return;

    const updateCountdown = () => {
      const remaining = new Date(booking.expiresAt) - new Date();
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 1000 / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setTimeLeft("EXPIRED");
      }
    };

    updateCountdown(); // Call immediately
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [booking?.expiresAt]);

  // 3. Poll booking status every 5 seconds (NEW - for live queue updates)
  useEffect(() => {
    if (!bookingId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/walkin/booking/${bookingId}`);
        if (!res.ok) return;

        const data = await res.json();
        const updatedBooking = data.booking;

        // Update relevant fields only
        setBooking((prev) => ({
          ...prev,
          queueStatus: updatedBooking.queueStatus,
          queuePosition: updatedBooking.queuePosition,
          status: updatedBooking.status,
        }));

        // Auto-show feedback when COMPLETED
        if (
          updatedBooking.queueStatus === "COMPLETED" &&
          !updatedBooking.feedback?.submitted &&
          !showFeedback
        ) {
          setShowFeedback(true);
        } else if (updatedBooking.feedback?.submitted && showFeedback) {
          setShowFeedback(false);
        }

        // Update expiry status
        if (updatedBooking.isExpired) {
          setTimeLeft("EXPIRED");
        }
      } catch (err) {
        console.error("❌ Poll status error:", err);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [bookingId, showFeedback]);
  // NEW: Fetch barber's specific queue every 5 seconds
  // NEW: Fetch barber's specific queue every 5 seconds
  useEffect(() => {
    if (!booking?.barberId || !booking?.salonId) return;

    console.log("🔄 Fetching barber queue for:", {
      salonId: booking.salonId,
      barberId: booking.barberId,
    });

    const fetchBarberQueue = async () => {
      try {
        const res = await fetch(
          `/api/salons/${booking.salonId}/barber-queue?barberId=${booking.barberId}`
        );
        if (res.ok) {
          const data = await res.json();
          // Filter expired from queue
          const now = new Date();
          const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
          const activeQueue = (data.queue || []).filter((q) => {
            if (q.isExpired) return false;
            if (q.queueStatus === "RED") {
              return new Date(q.expiresAt) > bufferTime;
            }
            return true;
          });

          setBarberQueueData({ ...data, queue: activeQueue });
        } else {
          console.error("❌ Queue fetch failed:", res.status);
        }
      } catch (err) {
        console.error("❌ Error fetching barber queue:", err);
      }
    };

    fetchBarberQueue();
    const interval = setInterval(fetchBarberQueue, 5000);
    return () => clearInterval(interval);
  }, [booking?.barberId, booking?.salonId]); // ✅ Depend on booking data

  // ==================== useEffects - END ====================

  const submitFeedback = async () => {
    const unratedFields = Object.entries(ratings)
      .filter(([key, value]) => value === 0)
      .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());

    if (unratedFields.length > 0) {
      showWarning(`Please rate: ${unratedFields.join(", ")}`);
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
        showError("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Feedback submission error:", error);
      showError("Error submitting feedback");
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
          <div className={styles.statusBadge}>
            {booking.queueStatus === "RED" ? (
              <div className={styles.greyStatus}>
                <span className={styles.statusDot}>⚫</span>
                <span>Booked - Not Arrived Yet in {booking.barber}s queue</span>
                <span className={styles.expiryNote}>
                  (Expires in {timeLeft})
                </span>
              </div>
            ) : booking.queueStatus === "ORANGE" ? (
              <div className={styles.goldenStatus}>
                <span className={styles.statusDot}>🟠</span>
                <span>
                  In Priority Queue - Position #{booking.queuePosition} with{" "}
                  {booking.barber}
                </span>
              </div>
            ) : booking.queueStatus === "GREEN" ? (
              <div className={styles.greenStatus}>
                <span className={styles.statusDot}>🟢</span>
                <span>Now Being Served by {booking.barber}</span>
              </div>
            ) : booking.queueStatus === "COMPLETED" ? (
              <div className={styles.completedStatus}>
                <span className={styles.statusDot}>✅</span>
                <span>Service Complete</span>
              </div>
            ) : (
              <div className={styles.expiredStatus}>
                <span className={styles.statusDot}>❌</span>
                <span>Booking Expired</span>
              </div>
            )}
          </div>
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
        {/* NEW: Queue Visualization */}
        {queueInfo && (
          <div style={styles.queueVisualizationContainer}>
            <h3>📍 Your Queue Position</h3>

            <div style={styles.queueStatsRow}>
              <div style={{ ...styles.statBox, background: "#86efac" }}>
                <div style={styles.statNumber}>{queueInfo.position}</div>
                <div style={styles.statLabel}>Your Position</div>
              </div>
              <div style={{ ...styles.statBox, background: "#fbbf24" }}>
                <div style={styles.statNumber}>{queueInfo.arrived}</div>
                <div style={styles.statLabel}>Arrived (Priority)</div>
              </div>
              <div style={{ ...styles.statBox, background: "#d1d5db" }}>
                <div style={styles.statNumber}>{queueInfo.booked}</div>
                <div style={styles.statLabel}>Bookings (Temp)</div>
              </div>
            </div>

            <div style={styles.queueVisualItems}>
              {queueInfo.queueList.map((item) => {
                const isYou = item.id === bookingId;
                const bgColor =
                  item.status === "SERVING"
                    ? "#86efac"
                    : item.status === "ARRIVED"
                    ? "#fbbf24"
                    : "#d1d5db";
                const borderStyle =
                  item.status === "BOOKED"
                    ? "2px dotted #000"
                    : "2px solid #000";

                return (
                  <div
                    key={item.id}
                    style={{
                      ...styles.queueVisItem,
                      background: bgColor,
                      border: borderStyle,
                      opacity: isYou ? 1 : 0.7,
                      boxShadow: isYou
                        ? "0 0 12px rgba(132, 204, 22, 0.8)"
                        : "none",
                      transform: isYou ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    <div style={styles.position}>#{item.position}</div>
                    <div style={styles.name}>{item.name}</div>
                    {isYou && <div style={styles.youBadge}>YOU</div>}
                  </div>
                );
              })}
            </div>

            <div style={styles.legend}>
              <div style={styles.legendItem}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#86efac",
                    border: "2px solid #000",
                    borderRadius: 4,
                  }}
                ></div>
                <span>🟢 Serving Now</span>
              </div>
              <div style={styles.legendItem}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#fbbf24",
                    border: "2px solid #000",
                    borderRadius: 4,
                  }}
                ></div>
                <span>🟡 Arrived (Priority)</span>
              </div>
              <div style={styles.legendItem}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: "#d1d5db",
                    border: "2px dotted #000",
                    borderRadius: 4,
                  }}
                ></div>
                <span>⚫ Booked (Expires 45 min)</span>
              </div>
            </div>
          </div>
        )}
        {barberQueueData && (
          <div className={styles.modernQueueContainer}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.queueHeader}
            >
              <h3>
                🪑 {booking.barberName}&lsquo;s Queue (Chair #
                {barberQueueData.chairNumber})
              </h3>
            </motion.div>

            {/* Modern Stats Cards */}
            <div className={styles.modernStatsGrid}>
              <motion.div
                className={styles.modernStatCard}
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={styles.statIcon}>🟢</div>
                <div className={styles.statNumber}>
                  {barberQueueData.serving ? "1" : "0"}
                </div>
                <div className={styles.statLabel}>Now Serving</div>
              </motion.div>

              <motion.div
                className={styles.modernStatCard}
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statNumber}>
                  {barberQueueData.priorityQueueCount || 0}
                </div>
                <div className={styles.statLabel}>Priority Queue</div>
              </motion.div>

              <motion.div
                className={styles.modernStatCard}
                style={{
                  background:
                    "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)",
                }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={styles.statIcon}>⏳</div>
                <div className={styles.statNumber}>
                  {barberQueueData.bookedCount || 0}
                </div>
                <div className={styles.statLabel}>Temporary Queue</div>
              </motion.div>
            </div>

            {/* THE CHAIR - Modern Design */}
            <div className={styles.chairContainer}>
              <motion.div
                className={styles.modernChair}
                animate={{
                  boxShadow: barberQueueData.serving
                    ? [
                        "0 0 20px rgba(16, 185, 129)",
                        "0 0 40px rgba(16, 185, 129)",
                        "0 0 20px rgba(16, 185, 129)",
                      ]
                    : "0 4px 20px rgba(0,0,0,0)",
                }}
              >
                <div className={styles.chairIcon}>🪑</div>
                <div className={styles.chairLabel}>
                  CHAIR #{barberQueueData.chairNumber}
                </div>

                {barberQueueData.serving ? (
                  <motion.div
                    className={styles.servingCustomer}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <div className={styles.servingCircle}>
                      <div className={styles.userIcon}>👤</div>
                      <motion.div
                        className={styles.pulseRing}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    <div className={styles.servingName}>
                      {barberQueueData.serving.customerName}
                    </div>
                    <div className={styles.servingBadge}>NOW SERVING</div>
                    {barberQueueData.serving._id === booking._id && (
                      <motion.div
                        className={styles.youPill}
                        animate={{ scale: [1, 1.1, 1] }}
                      >
                        YOU
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <div className={styles.emptyChairState}>
                    <div className={styles.emptyText}>Available</div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Horizontal Queue Flow */}
            <div className={styles.queueFlowContainer}>
              {/* <div className={styles.queueArrow}>→</div> */}

              <div className={styles.horizontalQueue}>
                {/* Priority Queue Golden */}
                {barberQueueData.queue
                  ?.filter((c) => c.queueStatus === "ORANGE")
                  .map((customer, idx) => {
                    const isYou = customer.id === booking.id;
                    const createdAtDate = customer.createdAt
                      ? new Date(customer.createdAt)
                      : null;

                    const pos = customer.queuePosition || idx + 1;
                    const posLabel =
                      pos === 1
                        ? "1st"
                        : pos === 2
                        ? "2nd"
                        : pos === 3
                        ? "3rd"
                        : `${pos}th`;

                    return (
                      <motion.div
                        key={customer.id}
                        className={`${styles.modernQueueItem} ${
                          styles.orangeCard || ""
                        }`}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        style={{
                          background:
                            "linear-gradient(135deg, #fbbf24 0, #f59e0b 100)",
                          border: "3px solid #000",
                          boxShadow: isYou
                            ? "0 0 30px rgba(251, 191, 36, 0.8), 0 8px 20px rgba(0,0,0,0.2)"
                            : "0 4px 15px rgba(0,0,0,0.15)",
                          position: "relative",
                        }}
                      >
                        {/* Position label top-right */}
                        <div className={styles.positionLabel}>
                          <span className={styles.positionNumber}>
                            {posLabel}
                          </span>
                          <span className={styles.positionType}>Priority</span>
                        </div>

                        {/* Booking created time top-left */}
                        {createdAtDate && (
                          <div className={styles.bookingTime}>
                            <div className={styles.timeSmall}>
                              {createdAtDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className={styles.timeBig}>
                              {createdAtDate.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </div>
                          </div>
                        )}

                        <div className={styles.positionBadge}>{pos}</div>
                        <div className={styles.customerAvatar}>
                          {customer.customerName
                            ? customer.customerName.charAt(0)
                            : "?"}
                        </div>
                        <div className={styles.customerName}>
                          {customer.customerName || "Guest"}
                        </div>
                        <div className={styles.queueTime}>
                          {formatTimeAgo(customer.arrivedAt)}
                        </div>
                        {isYou && (
                          <motion.div
                            className={styles.youPill}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            YOU
                          </motion.div>
                        )}
                        <div
                          className={styles.statusDot}
                          style={{ background: "#fbbf24" }}
                        />
                      </motion.div>
                    );
                  })}

                {/* Temporary Queue (Grey Dotted) */}
                {barberQueueData.queue
                  ?.filter((c) => c.queueStatus === "RED")
                  .map((customer, idx) => {
                    const isYou = customer._id === booking._id;
                    const priorityCount = barberQueueData.queue.filter(
                      (c) => c.queueStatus === "ORANGE"
                    ).length;

                    return (
                      <motion.div
                        key={customer._id}
                        className={styles.modernQueueItem}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (priorityCount + idx) * 0.1 }}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        style={{
                          background:
                            "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                          border: "3px dotted #000",
                          boxShadow: isYou
                            ? "0 0 30px rgba(209, 213, 219, 0.8), 0 8px 20px rgba(0,0,0,0.2)"
                            : "0 4px 15px rgba(0,0,0,0.15)",
                        }}
                      >
                        <div
                          className={styles.positionBadge}
                          style={{ opacity: 0.6 }}
                        >
                          #{priorityCount + idx + 1}
                        </div>
                        <div
                          className={styles.customerAvatar}
                          style={{ opacity: 0.7 }}
                        >
                          {customer.customerName
                            ? customer.customerName.charAt(0).toUpperCase()
                            : "?"}
                        </div>
                        <div className={styles.customerName}>
                          {customer.customerName || "Unknown Customer"}
                        </div>

                        <div
                          className={styles.queueTime}
                          style={{ color: "#dc2626" }}
                        >
                          ⏱️ {formatExpiry(customer.expiresAt)}
                        </div>
                        {isYou && (
                          <motion.div
                            className={styles.youPill}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            YOU
                          </motion.div>
                        )}
                        <div
                          className={styles.statusDot}
                          style={{ background: "#9ca3af" }}
                        />
                      </motion.div>
                    );
                  })}
              </div>
            </div>

            {/* Modern Legend */}
            <div className={styles.modernLegend}>
              <div className={styles.legendItem}>
                <div
                  className={styles.legendIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    borderRadius: "50%",
                  }}
                >
                  🟢
                </div>
                <span>
                  <strong>Now Serving</strong> - Currently getting service
                </span>
              </div>

              <div className={styles.legendItem}>
                <div
                  className={styles.legendIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  }}
                />
                <span>
                  <strong>Priority Queue</strong> - Arrived at salon
                </span>
              </div>

              <div className={styles.legendItem}>
                <div
                  className={styles.legendIcon}
                  style={{
                    background:
                      "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                    border: "2px dotted #000",
                  }}
                />
                <span>
                  <strong>Temporary Queue</strong> - Booked (45 min expiry)
                </span>
              </div>
            </div>

            {/* Queue Explanation */}
            <motion.div
              className={styles.queueExplanation}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h4>📋 How Queue Works:</h4>
              <ul>
                <li>
                  💻 <strong>Book Online:</strong> Enter temporary queue (grey
                  dotted). Arrive within 45 min.
                </li>
                <li>
                  🚪 <strong>Arrive at Salon:</strong> Show booking code → Move
                  to priority queue (golden).
                </li>
                <li>
                  ⚡ <strong>Priority System:</strong> Arrived customers get
                  served first. Next in line if someone ahead didn&lsquo;t
                  arrive.
                </li>
                <li>
                  ✅ <strong>Your Turn:</strong> You&lsquo;ll appear in the
                  green circle on the chair.
                </li>
              </ul>
            </motion.div>

            {/* Estimated Wait */}
            {booking.queueStatus === "ORANGE" &&
              barberQueueData.estimatedWait && (
                <motion.div
                  className={styles.waitTimeCard}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <span className={styles.waitIcon}>⏱️</span>
                  <span className={styles.waitText}>
                    Estimated Wait Time:{" "}
                    <strong>{barberQueueData.estimatedWait} minutes</strong>
                  </span>
                </motion.div>
              )}
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
