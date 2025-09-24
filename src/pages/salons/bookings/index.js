// src/pages/salons/bookings/index.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function BookingsPage() {
  const router = useRouter();
  const { salonId } = router.query; // salonId passed via query param
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    serviceId: "",
    appointmentAt: "",
  });

  // fetch bookings
  useEffect(() => {
    if (!salonId) return;
    setLoading(true);
    fetch(`/api/salons/bookings?salonId=${salonId}`)
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [salonId]);

  // submit booking
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!salonId) return alert("No salon selected");

    const res = await fetch(`/api/salons/bookings?salonId=${salonId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const newBooking = await res.json();
      setBookings((prev) => [...prev, newBooking]);
      setForm({
        customerName: "",
        customerPhone: "",
        serviceId: "",
        appointmentAt: "",
      });
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create booking");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Bookings</h1>

      {/* Add Booking Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "2rem",
          display: "grid",
          gap: "0.5rem",
          maxWidth: "400px",
        }}
      >
        <input
          type="text"
          placeholder="Customer Name"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Customer Phone"
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Service ID"
          value={form.serviceId}
          onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
          required
        />
        <input
          type="datetime-local"
          value={form.appointmentAt}
          onChange={(e) => setForm({ ...form, appointmentAt: e.target.value })}
          required
        />
        <button type="submit">Add Booking</button>
      </form>

      {/* Booking List */}
      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Appointment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.customerName}</td>
                <td>{b.customerPhone}</td>
                <td>{b.serviceId}</td>
                <td>{new Date(b.appointmentAt).toLocaleString()}</td>
                <td>{b.status || "pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
