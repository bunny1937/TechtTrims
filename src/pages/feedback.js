// src/pages/feedback.js - Enhanced feedback with star ratings
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";

export default function FeedbackPage() {
  const router = useRouter();
  const { bookingId } = router.query;

  const [booking, setBooking] = useState(null);
  const [ratings, setRatings] = useState({
    serviceQuality: 0,
    timing: 0,
    barberPerformance: 0,
    ambience: 0,
    overall: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex space-x-1 items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`text-3xl transition-all duration-200 hover:scale-110 ${
                star <= value
                  ? "text-yellow-400 drop-shadow-sm"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            >
              {star <= value ? "⭐" : "☆"}
            </button>
          ))}
          <div className="ml-3">
            {value === 0 ? (
              <span className="text-sm text-gray-400">Tap to rate</span>
            ) : (
              <span className="text-sm text-gray-600 font-medium">
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
          },
        }),
      });

      if (response.ok) {
        alert("Thank you for your feedback!");

        // Store booking data in localStorage for registration prefill
        if (booking) {
          const prefillData = {
            name: booking.customerName,
            phone: booking.customerPhone,
            lastBooking: {
              salonId: booking.salonId,
              service: booking.service,
              date: booking.date,
              time: booking.time,
            },
            timestamp: new Date().getTime(),
          };

          console.log("Storing prefill data:", prefillData);
          localStorage.setItem("userPrefillData", JSON.stringify(prefillData));
        }

        router.push("/auth/user-register");
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Rate Your Experience
            </h1>
            <p className="text-gray-600">
              How was your visit to {booking.salonName || "the salon"}?
            </p>
          </div>

          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Booking Summary</h3>
            <p>
              <strong>Service:</strong> {booking.service}
            </p>
            {booking.barber && (
              <p>
                <strong>Barber:</strong> {booking.barber}
              </p>
            )}
            <p>
              <strong>Date:</strong> {booking.date} at {booking.time}
            </p>
            <p>
              <strong>Amount:</strong> ₹{booking.price}
            </p>
          </div>

          {/* Rating Form */}
          <div className="space-y-4">
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
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 text-center">
            <button
              onClick={submitFeedback}
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "✅ Submit Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
