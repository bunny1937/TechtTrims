import React, { useState, useEffect } from "react";
import styles from "../../styles/WalkinQueue.module.css";
import { showWarning, showSuccess, showError } from "../../lib/toast";

export default function QueueDisplay({
  barberId,
  salonId,
  customerId,
  defaultBarberName = "",
}) {
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dummyUsers, setDummyUsers] = useState([]);

  // Offline form state
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    name: "",
    phone: "",
    service: "",
    price: "",
    serviceTime: "",
    barberName: defaultBarberName,
  });

  const fetchQueueStatus = async () => {
    if (!barberId || !salonId) {
      setLoading(false);
      return;
    }
    try {
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
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setQueueData(data);
      setDummyUsers(data.dummyUsers || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 3000);
    return () => clearInterval(interval);
  }, [barberId, salonId]);

  const handleAddOffline = async () => {
    const { name, phone, service, price, serviceTime, barberName } =
      offlineForm;
    if (!name || !phone || !service || !price || !serviceTime || !barberName) {
      showWarning("All fields are required");
      return;
    }
    setOfflineLoading(true);
    try {
      const res = await fetch("/api/dummy-user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          barberName,
          name,
          phone,
          service,
          price,
          serviceTime,
          createdBy: "barber",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showSuccess(
        `Code: ${data.dummy.bookingCode} | Share: /walkin/confirmation?bookingCode=${data.dummy.bookingCode}&isDummy=true`,
      );
      setOfflineForm({
        name: "",
        phone: "",
        service: "",
        price: "",
        serviceTime: "",
        barberName: defaultBarberName,
      });
      setShowOfflineForm(false);
      fetchQueueStatus(); // ✅ FIXED: was fetchDummyUsers() which doesn't exist
    } catch (e) {
      showError(e.message);
    } finally {
      setOfflineLoading(false);
    }
  };

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
      {/* Header with Add Offline button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>
          Live Queue
        </div>
        <button
          onClick={() => setShowOfflineForm(true)}
          style={{
            background: "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          + Add Offline Customer
        </button>
      </div>

      {/* Offline Customer Form Modal */}
      {showOfflineForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              width: "340px",
              maxWidth: "92vw",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h3
              style={{ margin: "0 0 6px", fontWeight: "700", fontSize: "18px" }}
            >
              Add Offline Customer
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#f97316",
                marginBottom: "16px",
                fontWeight: "500",
              }}
            >
              💡 Ask them to register on TechTrims for easy online booking next
              time!
            </p>
            {[
              { key: "name", placeholder: "Customer Name", type: "text" },
              { key: "phone", placeholder: "Phone Number", type: "tel" },
              {
                key: "service",
                placeholder: "Service (e.g. Haircut)",
                type: "text",
              },
              { key: "price", placeholder: "Price (₹)", type: "number" },
              {
                key: "serviceTime",
                placeholder: "Service Time (minutes)",
                type: "number",
              },
              { key: "barberName", placeholder: "Barber Name", type: "text" },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                value={offlineForm[key]}
                onChange={(e) =>
                  setOfflineForm((p) => ({ ...p, [key]: e.target.value }))
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginBottom: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            ))}
            <button
              onClick={handleAddOffline}
              disabled={offlineLoading}
              style={{
                width: "100%",
                padding: "12px",
                background: "#f97316",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "15px",
                cursor: "pointer",
                marginBottom: "8px",
                opacity: offlineLoading ? 0.7 : 1,
              }}
            >
              {offlineLoading ? "Adding..." : "Add to Queue"}
            </button>
            <button
              onClick={() => setShowOfflineForm(false)}
              style={{
                width: "100%",
                padding: "10px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
        {dummyUsers.length > 0 && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "24px", fontWeight: "700", color: "#f97316" }}
            >
              🟤 {dummyUsers.length}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Offline</div>
          </div>
        )}
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
      {waitingCustomers.length > 0 && (
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

      {/* Offline (Dummy) Customers — orange badge */}
      {dummyUsers.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{ fontWeight: "700", marginBottom: "8px", color: "#374151" }}
          >
            🟤 Offline Customers ({dummyUsers.length})
          </div>
          {dummyUsers.map((d) => (
            <div
              key={d._id}
              style={{
                background: "#fff3e0",
                padding: "10px 12px",
                borderRadius: "8px",
                marginBottom: "8px",
                border: "2px solid #f97316",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontWeight: "700",
                    color: "#92400e",
                    fontSize: "14px",
                  }}
                >
                  {d.name}
                </span>
                <span
                  style={{
                    background: "#f97316",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                  }}
                >
                  OFFLINE
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#78350f",
                  lineHeight: "1.6",
                }}
              >
                📞 {d.phone} &nbsp;|&nbsp; ✂️ {d.service} — ₹{d.price}
              </div>
              <div style={{ fontSize: "12px", color: "#78350f" }}>
                ⏱ {d.serviceTime} min &nbsp;|&nbsp; 👤 {d.barberName}
              </div>
              <div
                style={{ fontSize: "11px", color: "#a16207", marginTop: "2px" }}
              >
                Arrived:{" "}
                {new Date(d.arrivedAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
              <div
                style={{ fontSize: "11px", color: "#a16207", marginTop: "2px" }}
              >
                Status:{" "}
                <span
                  style={{
                    fontWeight: "700",
                    color:
                      d.status === "in-service"
                        ? "#10b981"
                        : d.status === "completed"
                          ? "#6b7280"
                          : "#f97316",
                  }}
                >
                  {d.status === "in-service"
                    ? "🟢 In Service"
                    : d.status === "completed"
                      ? "✔ Done"
                      : "🟠 Waiting"}
                </span>
              </div>
              {d.serviceStartedAt && (
                <div style={{ fontSize: "11px", color: "#a16207" }}>
                  Started:{" "}
                  {new Date(d.serviceStartedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              )}
              {d.expectedFinishTime && (
                <div style={{ fontSize: "11px", color: "#a16207" }}>
                  Est. Finish:{" "}
                  {new Date(d.expectedFinishTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Booked (Temporary) */}
      {temporaryBookings.length > 0 && (
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
