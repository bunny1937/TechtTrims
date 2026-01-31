import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/PrebookConfirmation.module.css";
import feedbackStyles from "../../styles/Feedback.module.css";
import { motion } from "framer-motion";
import { isAuthenticated } from "@/lib/cookieAuth";
import { showError, showWarning, showSuccess } from "@/lib/toast";
import { QRCodeSVG } from "qrcode.react";

// Format time ago
const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "N/A";
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ago`;
};

// Format countdown to appointment
const formatCountdown = (scheduledFor) => {
  if (!scheduledFor) return "N/A";
  const now = new Date();
  const scheduled = new Date(scheduledFor);
  const diffMs = scheduled - now;

  if (diffMs < 0) return "Appointment time passed";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ${hours % 24}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

// Format expiry countdown
const formatExpiry = (expiryDate) => {
  if (!expiryDate) return "N/A";
  const remaining = Math.ceil((new Date(expiryDate) - new Date()) / 1000 / 60);
  if (remaining < 0) return "Expired";
  if (remaining < 1) return "< 1m";
  return `${remaining}m`;
};

// Format time left/elapsed in service
const formatTimeLeft = (serviceStartedAt, estimatedDuration) => {
  if (!serviceStartedAt || !estimatedDuration) return "N/A";
  const now = new Date();
  const started = new Date(serviceStartedAt);
  const elapsedMinutes = Math.floor((now - started) / 1000 / 60);
  const remainingMinutes = estimatedDuration - elapsedMinutes;

  if (remainingMinutes <= 0) {
    const overtime = Math.abs(remainingMinutes);
    return {
      display: `${elapsedMinutes}m/${estimatedDuration}m`,
      overtime: overtime,
      isUrgent: true,
    };
  }

  return {
    display: `${elapsedMinutes}m/${estimatedDuration}m`,
    overtime: 0,
    isUrgent: remainingMinutes <= 5,
  };
};

export default function PrebookConfirmation() {
  const router = useRouter();
  const { bookingId } = router.query; // ✅ CHANGED FROM id TO bookingId

  const [booking, setBooking] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [serviceTimer, setServiceTimer] = useState({
    elapsed: 0,
    remaining: 0,
    isOvertime: false,
  });

  const hasArrived = !!booking?.arrivedAt;
  const isServing = !!booking?.serviceStartedAt;

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
  const [queueInfo, setQueueInfo] = useState(null);
  const [error, setError] = useState(null);
  const [barberQueueData, setBarberQueueData] = useState(null);
  const [countdown, setCountdown] = useState("");

  // ✅ 1. Fetch booking details
  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/prebook/${bookingId}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch booking");

        const data = await res.json();

        setBooking({
          ...data.booking,
          barberName: data.booking.barber || data.booking.barberName,
        });

        // Auto-show feedback if completed
        // ✅ Redirect to feedback page when completed
        if (data.booking?.queueStatus === "COMPLETED") {
          if (isAuthenticated()) {
            router.push("/user/dashboard");
          } else {
            const prefillData = {
              name: data.booking.customerName,
              phone: data.booking.customerPhone,
              gender: data.booking.customerGender,
              lastBooking: {
                salonId: data.booking.salonId,
                service: data.booking.service,
              },
            };
            localStorage.setItem(
              "userPrefillData",
              JSON.stringify(prefillData),
            );
            router.push(`/feedback?bookingId=${bookingId}`);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching prebook:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  // ✅ 2. Poll status every 5s
  useEffect(() => {
    if (!bookingId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/prebook/${bookingId}`);
        if (!res.ok) return;

        const data = await res.json();

        setBooking((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            queueStatus: data.booking.queueStatus,
            queuePosition: data.booking.queuePosition,
            serviceStartedAt:
              data.booking.serviceStartedAt ?? prev.serviceStartedAt,
            estimatedDuration:
              data.booking.estimatedDuration ?? prev.estimatedDuration,
            serviceEndedAt: data.booking.serviceEndedAt ?? prev.serviceEndedAt,
            actualServiceMinutes:
              data.booking.actualServiceMinutes ?? prev.actualServiceMinutes,
            arrivedAt: data.booking.arrivedAt ?? prev.arrivedAt,
            chairNumber: data.booking.chairNumber ?? prev.chairNumber,
          };
        });

        // ✅ Redirect to feedback when COMPLETED
        if (data.booking.queueStatus === "COMPLETED") {
          if (isAuthenticated()) {
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
            localStorage.setItem(
              "userPrefillData",
              JSON.stringify(prefillData),
            );
            router.push(`/feedback?bookingId=${bookingId}`);
          }
        }
      } catch (err) {
        console.error("❌ Poll error:", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [bookingId, showFeedback]);

  // ✅ 3. Live service timer
  useEffect(() => {
    if (!booking?.serviceStartedAt || booking?.queueStatus !== "GREEN") {
      setServiceTimer({
        elapsed: 0,
        duration: 0,
        remaining: 0,
        isOvertime: false,
      });
      return;
    }

    const updateServiceTimer = () => {
      const now = new Date();
      const started = new Date(booking.serviceStartedAt);
      const duration =
        booking.estimatedDuration || booking.selectedDuration || 30;
      const elapsed = Math.floor((now - started) / 1000 / 60);
      const remaining = duration - elapsed;
      const isOvertime = remaining < 0;

      setServiceTimer({ elapsed, duration, remaining, isOvertime });
    };

    updateServiceTimer();
    const interval = setInterval(updateServiceTimer, 1000);
    return () => clearInterval(interval);
  }, [
    booking?.serviceStartedAt,
    booking?.estimatedDuration,
    booking?.selectedDuration,
    booking?.queueStatus,
  ]);

  // ✅ 4. Fetch barber queue
  useEffect(() => {
    if (!booking?.barberId || !booking?.salonId) return;

    const fetchBarberQueue = async () => {
      try {
        const res = await fetch(
          `/api/salons/${booking.salonId}/barber-queue?barberId=${booking.barberId}`,
        );

        if (res.ok) {
          const data = await res.json();
          // Filter expired
          const now = new Date();
          const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
          const activeQueue = (data.queue || []).filter((q) => {
            if (q.isExpired) return false;
            if (q.queueStatus === "RED" && !q.arrivedAt && q.expiresAt) {
              // ✅ Only check expiry if expiresAt exists (walk-ins)
              return new Date(q.expiresAt) > bufferTime;
            }
            return true; // ✅ Include prebooks without expiresAt
          });

          setBarberQueueData({
            ...data,
            queue: Array.isArray(activeQueue) ? activeQueue : [],
          });
        }
      } catch (err) {
        console.error("❌ Error fetching barber queue:", err);
      }
    };

    fetchBarberQueue();
    const interval = setInterval(fetchBarberQueue, 5000);
    return () => clearInterval(interval);
  }, [booking?.barberId, booking?.salonId]);

  // ✅ 5. Countdown timer to appointment
  useEffect(() => {
    if (!booking?.scheduledFor) return;

    const updateCountdown = () => {
      setCountdown(formatCountdown(booking.scheduledFor));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [booking?.scheduledFor]);

  // ✅ Submit feedback
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
        if (isAuthenticated()) {
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
      showError("Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label, required = true }) => (
    <div className={feedbackStyles.ratingRow}>
      <label>
        {label} {required && <span className={feedbackStyles.required}>*</span>}
      </label>
      <div className={feedbackStyles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => onChange(star)}
            className={
              star <= value
                ? feedbackStyles.starFilled
                : feedbackStyles.starEmpty
            }
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );

  const isMe = (q) =>
    q._id === booking?._id || q.bookingCode === booking?.bookingCode;

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your booking...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (!booking) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Booking not found</h2>
          <button
            onClick={() => router.push("/")}
            className={styles.homeButton}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const scheduledTime = new Date(booking.scheduledFor);
  const oneHourBefore = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
  const now = new Date();
  const isInPriorityQueue = now >= oneHourBefore;

  const qrCodeUrlFinal = `${process.env.NEXT_PUBLIC_BASE_URL || "https://techtrims.vercel.app"}/prebook/confirmation?id=${bookingId}`;

  // ✅ MAIN UI - EXACTLY LIKE WALKIN
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back
        </button>
        <h1>Pre-Booking Confirmation</h1>
      </header>

      <div className={styles.card}>
        {/* QR CODE */}
        <div className={styles.qrCodeSection}>
          <div className={styles.qrCodeContainer}>
            <QRCodeSVG
              value={qrCodeUrlFinal}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className={styles.qrCodeLabel}>Scan this at salon entrance</p>
        </div>

        {/* BOOKING CODE */}
        <div className={styles.bookingCodeSection}>
          <p className={styles.codeLabel}>OR show this code:</p>
          <div className={styles.bookingCodeBox}>
            <span className={styles.bookingCode}>{booking.bookingCode}</span>
          </div>
        </div>

        {/* BOOKING DETAILS */}
        <div className={styles.details}>
          <h2 className={styles.sectionHeader}>📅 Booking Details</h2>

          {/* APPOINTMENT TIME HIGHLIGHT */}
          <div className={styles.appointmentHighlight}>
            <div className={styles.timeBox}>
              <span className={styles.timeLabel}>Your Appointment</span>
              <span className={styles.timeValue}>
                {new Date(booking.scheduledFor).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              <span className={styles.dateValue}>
                {new Date(booking.scheduledFor).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            {/* COUNTDOWN BOX - DYNAMIC BASED ON STATUS */}
            <div className={styles.countdownBox}>
              <span className={styles.countdownLabel}>
                {booking.queueStatus === "RED" ||
                booking.queueStatus === "PREBOOK_PENDING"
                  ? "Time Remaining"
                  : booking.queueStatus === "ORANGE"
                    ? "Estimated Wait"
                    : booking.queueStatus === "GREEN"
                      ? "Service Time"
                      : "Status"}
              </span>
              <span className={styles.countdownValue}>
                {/* BEFORE APPOINTMENT - Show countdown */}
                {(booking.queueStatus === "RED" ||
                  booking.queueStatus === "PREBOOK_PENDING") &&
                  countdown !== "Appointment time passed" &&
                  countdown}

                {/* AFTER APPOINTMENT TIME - Show "Ready to serve" */}
                {(booking.queueStatus === "RED" ||
                  booking.queueStatus === "PREBOOK_PENDING") &&
                  countdown === "Appointment time passed" && (
                    <span style={{ color: "#f59e0b" }}>Ready to serve</span>
                  )}

                {/* ORANGE - Show PERSONAL estimated wait */}
                {booking.queueStatus === "ORANGE" &&
                  (() => {
                    const myBooking = barberQueueData?.queue?.find(
                      (q) => q._id === booking._id,
                    );
                    const myWait = myBooking?.estimatedWait || 0;

                    if (myWait === 0) return "Ready soon";
                    if (myWait < 60) return `~${myWait}m`;

                    const hours = Math.floor(myWait / 60);
                    const mins = myWait % 60;
                    return `~${hours}h ${mins}m`;
                  })()}

                {/* ORANGE - No wait data */}
                {booking.queueStatus === "ORANGE" &&
                  !barberQueueData?.estimatedWait && (
                    <span style={{ color: "#10b981" }}>You&apos;re next!</span>
                  )}

                {/* GREEN - Show service elapsed/remaining */}
                {booking.queueStatus === "GREEN" && (
                  <span
                    style={{
                      color: serviceTimer.isOvertime ? "#ef4444" : "#10b981",
                    }}
                  >
                    {serviceTimer.elapsed}m / {serviceTimer.duration}m
                    {serviceTimer.isOvertime &&
                      ` (+${Math.abs(serviceTimer.remaining)}m)`}
                  </span>
                )}

                {/* COMPLETED */}
                {booking.queueStatus === "COMPLETED" && (
                  <span style={{ color: "#10b981" }}>✓ Done</span>
                )}
              </span>
            </div>
          </div>

          {/* WHEN TO ARRIVE */}
          <div className={styles.arrivalInfo}>
            <div className={styles.infoIcon}>⏰</div>
            <div>
              <strong className={styles.arrivalTitle}>When to Arrive:</strong>
              <p className={styles.arrivalText}>
                Arrive between{" "}
                <strong>
                  {new Date(
                    new Date(booking.scheduledFor).getTime() - 10 * 60 * 1000,
                  ).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </strong>{" "}
                and{" "}
                <strong>
                  {new Date(booking.scheduledFor).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </strong>
              </p>
              <p className={styles.arrivalNote}>
                ✅ You&apos;ll enter the <strong>Priority Queue</strong> 1 hour
                before your time!
              </p>
            </div>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Customer</span>
            <span className={styles.detailValue}>{booking.customerName}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Phone</span>
            <span className={styles.detailValue}>
              {booking.customerPhone || "N/A"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Service</span>
            <span className={styles.detailValue}>{booking.service}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Barber</span>
            <span className={styles.detailValue}>
              {booking.barberName || "Assigned at salon"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Price</span>
            <span className={styles.detailValue}>₹{booking.price}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Salon</span>
            <span className={styles.detailValue}>{booking.salonName}</span>
          </div>
        </div>

        {/* ✅ QUEUE STATUS - EXACTLY LIKE WALKIN */}
        <div className={styles.queuePositionCard}>
          <h2 className={styles.sectionHeader}>Queue Status</h2>

          {/* PREBOOK_PENDING */}
          {booking.queueStatus === "PREBOOK_PENDING" && !isInPriorityQueue && (
            <div className={`${styles.statusBadge} ${styles.grey}`}>
              <div className={styles.statusDot}></div>
              <span>PREBOOK - SCHEDULED</span>
            </div>
          )}

          {/* RED */}
          {booking.queueStatus === "RED" && (
            <div className={`${styles.statusBadge} ${styles.red}`}>
              <div className={styles.statusDot}></div>
              <span>🔴 PRIORITY QUEUE</span>
            </div>
          )}

          {/* ORANGE */}
          {booking.queueStatus === "ORANGE" && (
            <div className={`${styles.statusBadge} ${styles.orange}`}>
              <div className={styles.statusDot}></div>
              <span>🟠 CHECKED IN</span>
            </div>
          )}

          {/* GREEN */}
          {booking.queueStatus === "GREEN" && (
            <div className={`${styles.statusBadge} ${styles.green}`}>
              <div className={styles.statusDot}></div>
              <span>🟢 IN SERVICE</span>
            </div>
          )}

          {/* COMPLETED */}
          {booking.queueStatus === "COMPLETED" && (
            <div className={`${styles.statusBadge} ${styles.completed}`}>
              <div className={styles.statusDot}></div>
              <span>✅ COMPLETED</span>
            </div>
          )}
        </div>

        {/* ✅ MODERN QUEUE VISUALIZATION - ONLY FOR RED/ORANGE/GREEN */}
        {(booking.queueStatus === "RED" ||
          booking.queueStatus === "ORANGE" ||
          booking.queueStatus === "GREEN") &&
          barberQueueData && (
            <div className={styles.modernQueueContainer}>
              {/* STATS */}
              <div className={styles.modernStatsGrid}>
                <div
                  className={styles.modernStatCard}
                  style={{ background: "#ef4444" }}
                >
                  <div className={styles.statIcon}>📅</div>
                  <div className={styles.statNumber}>
                    {
                      barberQueueData.queue.filter(
                        (q) => q.queueStatus === "RED",
                      ).length
                    }
                  </div>
                  <div className={styles.statLabel}>Booked</div>
                </div>

                <div
                  className={styles.modernStatCard}
                  style={{ background: "#f97316" }}
                >
                  <div className={styles.statIcon}>⏳</div>
                  <div className={styles.statNumber}>
                    {
                      barberQueueData.queue.filter(
                        (q) => q.queueStatus === "ORANGE",
                      ).length
                    }
                  </div>
                  <div className={styles.statLabel}>Waiting</div>
                </div>

                <div
                  className={styles.modernStatCard}
                  style={{ background: "#10b981" }}
                >
                  <div className={styles.statIcon}>✂️</div>
                  <div className={styles.statNumber}>
                    {
                      barberQueueData.queue.filter(
                        (q) => q.queueStatus === "GREEN",
                      ).length
                    }
                  </div>
                  <div className={styles.statLabel}>Serving</div>
                </div>
              </div>

              {/* SERVICE TIMER - GREEN ONLY */}
              {booking.queueStatus === "GREEN" && booking.serviceStartedAt && (
                <div className={styles.serviceTimeCard}>
                  <span className={styles.timeIcon}>⏱️</span>
                  <div>
                    <span className={styles.serviceTime}>
                      {serviceTimer.elapsed}m / {serviceTimer.duration}m
                    </span>
                    <span className={styles.serviceLabel}>
                      {serviceTimer.isOvertime
                        ? `⚠️ Overtime: ${Math.abs(serviceTimer.remaining)}m`
                        : `${serviceTimer.remaining}m remaining`}
                    </span>
                  </div>
                </div>
              )}

              {/* CHAIR + QUEUE FLOW */}
              <div className={styles.chairContainer}>
                <div className={styles.modernChair}>
                  <div className={styles.chairIcon}>💺</div>
                  <div className={styles.chairLabel}>
                    CHAIR{" "}
                    {booking.chairNumber ||
                      barberQueueData.chairNumber ||
                      "N/A"}
                  </div>

                  {barberQueueData.serving ? (
                    <div className={styles.servingCustomer}>
                      <div className={styles.servingCircle}>
                        <div className={styles.userIcon}>👤</div>
                      </div>
                      <span className={styles.servingName}>
                        {barberQueueData.serving.customerName}
                      </span>
                      <span className={styles.servingBadge}>IN SERVICE</span>
                    </div>
                  ) : (
                    <div className={styles.emptyText}>Empty</div>
                  )}
                </div>

                {/* HORIZONTAL QUEUE */}
                <div className={styles.queueFlowContainer}>
                  <div className={styles.queueArrow}>→</div>
                  <div className={styles.horizontalQueue}>
                    {barberQueueData.queue
                      .filter((q) => q.queueStatus !== "GREEN")
                      .map((q, idx) => {
                        const bgColor =
                          q.queueStatus === "ORANGE"
                            ? "#fef3c7"
                            : q.queueStatus === "RED"
                              ? "#fee2e2"
                              : "#f3f4f6";

                        return (
                          <div
                            key={q._id}
                            className={`${styles.modernQueueItem} ${isMe(q) ? styles.highlightMe : ""}`}
                            style={{ background: bgColor }}
                          >
                            <div className={styles.positionBadge}>
                              {idx + 1}
                            </div>
                            <div className={styles.customerAvatar}>
                              {q.customerName?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className={styles.customerName}>
                              {q.customerName}
                            </span>
                            {/* ✅ ADD BOOKING TYPE BADGE */}
                            {q.bookingType === "PREBOOK" && (
                              <span className={styles.prebookBadge}>
                                PREBOOK
                              </span>
                            )}

                            <span className={styles.queueTime}>
                              {q.arrivedAt
                                ? `Arrived ${formatTimeAgo(q.arrivedAt)}`
                                : q.createdAt
                                  ? `Booked ${formatTimeAgo(q.createdAt)}`
                                  : "N/A"}
                            </span>

                            {isMe(q) && (
                              <span className={styles.youPill}>YOU</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* LEGEND */}
              <div className={styles.modernLegend}>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendIcon}
                    style={{ background: "#10b981" }}
                  >
                    ✂️
                  </div>
                  <span>Serving</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendIcon}
                    style={{ background: "#f97316" }}
                  >
                    ⏳
                  </div>
                  <span>Arrived</span>
                </div>
                <div className={styles.legendItem}>
                  <div
                    className={styles.legendIcon}
                    style={{ background: "#ef4444" }}
                  >
                    📅
                  </div>
                  <span>Booked</span>
                </div>
              </div>

              {/* WAIT TIME */}
              {booking.queueStatus === "RED" &&
                barberQueueData.estimatedWait && (
                  <div className={styles.waitTimeCard}>
                    <span className={styles.waitIcon}>⏱️</span>
                    <p className={styles.waitText}>
                      Estimated wait:{" "}
                      <strong>{barberQueueData.estimatedWait} minutes</strong>
                    </p>
                  </div>
                )}
            </div>
          )}

        {/* ACTION BUTTONS */}
        <div className={styles.actions}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(qrCodeUrlFinal);
              showSuccess("Link copied!");
            }}
            className={styles.btnSecondary}
          >
            📋 Copy Link
          </button>
          {booking.customerEmail && (
            <button
              onClick={() =>
                window.open(
                  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=TechTrims+Appointment&dates=${new Date(booking.scheduledFor).toISOString().replace(/[-:]/g, "").split(".")[0]}Z/${new Date(booking.scheduledFor).toISOString().replace(/[-:]/g, "").split(".")[0]}Z&details=Service:+${booking.service}&location=${booking.salonName}`,
                  "_blank",
                )
              }
              className={styles.btnPrimary}
            >
              📅 Add to Calendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
