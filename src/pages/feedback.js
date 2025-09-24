import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function FeedbackPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [ratings, setRatings] = useState({
    overall: 5,
    serviceQuality: 5,
    timing: 5,
    cleanliness: 5,
    ambience: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (!bookingId) {
      alert("Invalid booking ID");
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
        router.push("/");
      } else {
        alert("Failed to submit feedback");
      }
    } catch (error) {
      alert("Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>Rate Your Experience</h2>

      {Object.entries(ratings).map(([key, value]) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              marginBottom: 5,
              textTransform: "capitalize",
            }}
          >
            {key.replace(/([A-Z])/g, " $1")}: {value} stars
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={value}
            onChange={(e) =>
              setRatings({ ...ratings, [key]: parseInt(e.target.value) })
            }
            style={{ width: "100%" }}
          />
        </div>
      ))}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          Additional Comments:
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          style={{ width: "100%", padding: 10 }}
          placeholder="Tell us about your experience..."
        />
      </div>

      <button
        onClick={submitFeedback}
        disabled={submitting}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          padding: "12px 24px",
          borderRadius: 5,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>
    </div>
  );
}
