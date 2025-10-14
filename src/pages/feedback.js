// src/pages/feedback.js - Enhanced feedback with star ratings
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Feedback.module.css";

export default function FeedbackPage() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [bookings, setBooking] = useState(null);
  const [ratings, setRatings] = useState({
    serviceQuality: 0,
    timing: 0,
    barberPerformance: 0,
    ambience: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userOnboardingData, setUserOnboardingData] = useState(null);

  useEffect(() => {
    // Get user onboarding data from localStorage
    if (typeof window !== "undefined") {
      const onboardingData = localStorage.getItem("userOnboardingData");
      if (onboardingData) {
        try {
          setUserOnboardingData(JSON.parse(onboardingData));
        } catch (e) {
          console.error("Error parsing onboarding data:", e);
        }
      }
    }
  }, []);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data); // ✅ Debug log

        // Handle different API response formats
        const bookingData = data.booking || data;
        setBooking(bookingData);
      } else {
        console.error("Failed to fetch booking:", response.status);
        alert("Failed to load booking details");
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      alert("Error loading booking: " + error.message);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, fetchBookingDetails]);

  // StarRating component - fixed version
  const StarRating = ({ value, onChange, label, required = true }) => {
    return (
      <div className={styles.ratingGroup}>
        <label className={styles.ratingLabel}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
        <div className={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`${styles.starButton} ${
                star <= value ? styles.starFilled : styles.starEmpty
              }`}
            >
              {star <= value ? "⭐" : "☆"}
            </button>
          ))}
          <div className={styles.ratingInfo}>
            {value === 0 ? (
              <span className={styles.ratingPlaceholder}>Tap to rate</span>
            ) : (
              <span className={styles.ratingValue}>
                {value}/5 {getRatingLabel(value)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add rating labels
  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1:
        return "Poor";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Very Good";
      case 5:
        return "Excellent";
      default:
        return "";
    }
  };

  // Add validation before submission
  const submitFeedback = async () => {
    if (!bookingId) {
      alert("Invalid booking ID");
      return;
    }

    // Validate that all ratings are provided
    const unratedFields = Object.entries(ratings)
      .filter(([key, value]) => value === 0)
      .map(([key]) => key.replace(/([A-Z])/g, " $1").toLowerCase());

    if (unratedFields.length > 0) {
      alert(`Please rate: ${unratedFields.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          feedback: {
            ratings,
            comment,
            submittedAt: new Date(),
            serviceDate:
              bookings.serviceStartedAt ||
              bookings.completedAt ||
              bookings.createdAt ||
              new Date(),
            customerPhone:
              bookings.customerPhone || userOnboardingData?.phoneNumber,
            price: bookings.price, // ✅ Store price in feedback
            barberName: bookings.barberName,
          },
        }),
      });

      if (response.ok) {
        alert("Thank you for your feedback!");

        // Check if user is logged in
        const userToken = localStorage.getItem("userToken");
        const authenticatedUserData = localStorage.getItem(
          "authenticatedUserData"
        );

        if (userToken && authenticatedUserData) {
          // User is logged in - redirect to dashboard
          router.push("/user/dashboard");
        } else {
          // User is not logged in - store prefill data and redirect to register
          if (bookings) {
            const prefillData = {
              name: bookings.customerName,
              customerName: bookings.customerName, // Add both formats
              phone: bookings.customerPhone || userOnboardingData?.phoneNumber,
              phoneNumber:
                bookings.customerPhone || userOnboardingData?.phoneNumber, // Add both formats
              customerPhone:
                bookings.customerPhone || userOnboardingData?.phoneNumber,
              gender: bookings.customerGender || userOnboardingData?.gender,
              customerGender:
                bookings.customerGender || userOnboardingData?.gender, // Add both formats
              age: bookings.customerAge || userOnboardingData?.age,
              customerAge: bookings.customerAge || userOnboardingData?.age,
              lastbookings: {
                salonId: bookings.salonId,
                service: bookings.service,
                date: bookings.date,
                time: bookings.time,
              },
              timestamp: new Date().getTime(),
            };
            console.log("Storing complete prefill data:", prefillData); // Debug log

            console.log("Storing prefill data:", prefillData);
            localStorage.setItem(
              "userPrefillData",
              JSON.stringify(prefillData)
            );
          }
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

  if (!bookings) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Rate Your Experience</h1>
            <p className={styles.subtitle}>
              How was your visit to {bookings.salonName || "the salon"}?
            </p>
          </div>

          {/* Booking Summary */}
          <div className={styles.bookingSummary}>
            <h3 className={styles.summaryTitle}>📋 Booking Summary</h3>
            <p className={styles.summaryInfo}>
              <strong>Customer:</strong> {bookings.customerName}
              {bookings.customerAge && ` (${bookings.customerAge} years)`}
            </p>
            <p className={styles.summaryInfo}>
              <strong>Phone:</strong>{" "}
              {bookings.customerPhone ||
                userOnboardingData?.phoneNumber ||
                "Not provided"}
            </p>
            <p className={styles.summaryInfo}>
              <strong>Service:</strong> {bookings.service}
            </p>
            {bookings.barberName && (
              <p className={styles.summaryInfo}>
                <strong>Barber:</strong> {bookings.barberName}
              </p>
            )}
            <p className={styles.summaryInfo}>
              <strong>Date:</strong>{" "}
              {bookings.serviceStartedAt
                ? new Date(bookings.serviceStartedAt).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  ) +
                  " at " +
                  new Date(bookings.serviceStartedAt).toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : bookings.completedAt
                ? new Date(bookings.completedAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : bookings.date && bookings.time
                ? `${bookings.date} at ${bookings.time}`
                : "Today"}
            </p>
            <p className={styles.summaryInfo}>
              <strong>Amount:</strong> ₹{bookings.price || "Paid at salon"}
            </p>
            {bookings.estimatedDuration && (
              <p className={styles.summaryInfo}>
                <strong>Duration:</strong> {bookings.estimatedDuration} mins
              </p>
            )}
          </div>

          {/* Rating Form */}
          <div className={styles.ratingsForm}>
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
              label="Salon Ambience / Cleanliness"
              value={ratings.ambience}
              onChange={(value) => setRatings({ ...ratings, ambience: value })}
            />

            <StarRating
              label="Overall Experience"
              value={ratings.overall}
              onChange={(value) => setRatings({ ...ratings, overall: value })}
            />

            {/* Text Feedback */}
            <div className={styles.commentSection}>
              <label className={styles.commentLabel}>
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience in detail..."
                className={styles.textarea}
                rows="4"
              />
            </div>

            {/* Submit Button */}
            <div className={styles.submitSection}>
              <button
                onClick={submitFeedback}
                disabled={submitting}
                className={styles.submitButton}
              >
                {submitting ? "Submitting..." : "✅ Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
