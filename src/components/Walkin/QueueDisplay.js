import React, { useState, useEffect } from "react";
import styles from "../../styles/WalkinQueue.module.css";

export default function QueueDisplay({ barberId, salonId, customerId }) {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("🟢 QueueDisplay received:", { barberId, salonId, customerId });

  const fetchQueueStatus = async () => {
    if (!barberId || !salonId) {
      console.log("⏭️ QueueDisplay: Missing barberId or salonId");
      setLoading(false);
      return;
    }

    try {
      console.log("🔵 Fetching queue for:", { barberId, salonId });

      const response = await fetch("/api/walkin/queue-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barberId?.toString?.() || barberId,
          salonId: salonId?.toString?.() || salonId,
          customerId: customerId?.toString?.() || customerId,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, err);
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Queue data received:", data);

      setQueueData(data);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching queue:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🟡 QueueDisplay useEffect triggered");
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 3000);
    return () => clearInterval(interval);
  }, [barberId, salonId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
        Loading queue...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#dc2626" }}>
        Error: {error}
      </div>
    );
  }

  if (!queueData) {
    return (
      <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
        No queue data
      </div>
    );
  }

  const {
    currentCustomer,
    waitingCustomers = [],
    temporaryBookings = [],
    barberStats = {},
  } = queueData;

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          justifyContent: "space-around",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "24px", fontWeight: "700", color: "#10b981" }}
          >
            🟢 {barberStats.serving || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Serving</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "24px", fontWeight: "700", color: "#f59e0b" }}
          >
            🟠 {barberStats.waiting || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Waiting</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{ fontSize: "24px", fontWeight: "700", color: "#ef4444" }}
          >
            🔴 {barberStats.temporary || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Booked</div>
        </div>
      </div>

      {/* Current Customer */}
      {currentCustomer && (
        <div
          style={{
            background: "#d1fae5",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "12px",
            border: "2px solid #10b981",
          }}
        >
          <div style={{ fontWeight: "700", color: "#065f46" }}>
            Now Serving: {currentCustomer.name}
          </div>
          <div style={{ fontSize: "12px", color: "#047857" }}>
            ⏱️ {currentCustomer.timeLeft} mins left
          </div>
        </div>
      )}

      {/* Waiting */}
      {waitingCustomers && waitingCustomers.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{ fontWeight: "700", marginBottom: "8px", color: "#374151" }}
          >
            ⏳ In Queue ({waitingCustomers.length})
          </div>
          {waitingCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: "#fef3c7",
                padding: "8px",
                borderRadius: "6px",
                marginBottom: "6px",
                fontSize: "13px",
                border: "1px solid #fcd34d",
              }}
            >
              #{customer.position}: {customer.name}
            </div>
          ))}
        </div>
      )}

      {/* Booked */}
      {temporaryBookings && temporaryBookings.length > 0 && (
        <div>
          <div
            style={{ fontWeight: "700", marginBottom: "8px", color: "#374151" }}
          >
            📅 Booked ({temporaryBookings.length})
          </div>
          {temporaryBookings.map((booking) => (
            <div
              key={booking.id}
              style={{
                background: "#f3f4f6",
                padding: "8px",
                borderRadius: "6px",
                marginBottom: "6px",
                fontSize: "13px",
                border: "1px dashed #9ca3af",
                opacity: 0.8,
              }}
            >
              #{booking.position}: {booking.name} (expires in{" "}
              {booking.expiresIn}m)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
