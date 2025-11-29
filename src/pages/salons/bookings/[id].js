// pages/salons/bookings/[id].jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { showSuccess, showError } from "../../../lib/toast";

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    serviceId: "",
    appointmentAt: "",
    status: "",
  });

  // Fetch booking data
  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/salons/bookings/${id}`);
        if (!res.ok) throw new Error("Booking not found");
        const data = await res.json();
        setBooking(data);
        setForm({
          customerName: data.customerName || "",
          customerPhone: data.customerPhone || "",
          serviceId: data.serviceId || "",
          appointmentAt: data.appointmentAt
            ? new Date(data.appointmentAt).toISOString().slice(0, 16)
            : "",
          status: data.status || "pending",
        });
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  // Update booking
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/salons/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      const updated = await res.json();
      setBooking(updated);
      showSuccess("Booking updated successfully!");
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete booking
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/salons/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      showError("Booking deleted successfully!");
      router.push("/salons/bookings"); // redirect to booking list
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="p-4">Loading booking...</p>;
  if (!booking)
    return <p className="p-4 text-red-500">{error || "Booking not found"}</p>;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Booking Details</h1>

      {error && <p className="text-red-500">{error}</p>}

      <form
        onSubmit={handleUpdate}
        className="grid gap-4 bg-white p-6 rounded shadow-md"
      >
        <div>
          <label className="block font-semibold">Customer Name</label>
          <input
            type="text"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold">Customer Phone</label>
          <input
            type="text"
            value={form.customerPhone}
            onChange={(e) =>
              setForm({ ...form, customerPhone: e.target.value })
            }
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold">Service ID</label>
          <input
            type="text"
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold">Appointment Date & Time</label>
          <input
            type="datetime-local"
            value={form.appointmentAt}
            onChange={(e) =>
              setForm({ ...form, appointmentAt: e.target.value })
            }
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Booking"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Booking"}
          </button>
        </div>
      </form>

      <div className="bg-gray-50 p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Current Booking Info:</h2>
        <pre className="text-sm">{JSON.stringify(booking, null, 2)}</pre>
      </div>
    </div>
  );
}
