import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import OwnerSidebar from "../../components/OwnerSidebar";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  const loadTodayBookings = useCallback(async (salonId) => {
    try {
      setLoading(true);

      // Get current date in IST timezone
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istDate = new Date(now.getTime() + istOffset);
      const today = istDate.toISOString().split("T")[0];

      console.log("Current IST date:", today);
      console.log("Fetching bookings for date:", today);

      const response = await fetch(
        `/api/salons/bookings?salonId=${salonId}&date=${today}`,
        {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `HTTP ${response.status}: ${errorData.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Dashboard bookings response:", data);

      // The API now returns array directly
      if (Array.isArray(data)) {
        setBookings(data);
      } else {
        console.warn("Unexpected response format:", data);
        setBookings([]);
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      setError("Error loading bookings: " + err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2️⃣ useEffect to load salon + bookings
  useEffect(() => {
    if (!router.isReady) return;

    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/salon/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);

    loadTodayBookings(salonData._id);
  }, [router, router.isReady, loadTodayBookings]);

  // 3️⃣ Update booking status
  // src/pages/salons/dashboard.js - Enhanced updateBookingStatus function
  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch("/api/bookings/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update local state immediately for better UX
        setBookings((prev) =>
          prev.map((booking) =>
            (booking._id || booking.id) === bookingId
              ? { ...booking, status, updatedAt: new Date() }
              : booking
          )
        );

        if (status === "completed") {
          alert(
            "Service completed! Customer will be notified to provide feedback."
          );
        } else {
          alert(`Booking ${status} successfully!`);
        }
      } else {
        const error = await response.json();
        alert(`Failed to update booking: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Error updating booking. Please try again.");
    }
  };

  const markArrived = (bookingId) => updateBookingStatus(bookingId, "arrived");
  const markStarted = (bookingId) => updateBookingStatus(bookingId, "started");
  const markDone = (bookingId) => updateBookingStatus(bookingId, "completed");
  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  if (loading) return <div>Loading dashboard...</div>;

  console.log("Salon:", salon);
  console.log("Bookings state:", bookings);

  return (
    <Layout>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 border-r bg-white">
          <OwnerSidebar />
        </aside>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h1 className="text-2xl font-bold">{salon?.salonName}</h1>
              <p className="text-gray-600">Owner: {salon?.ownerName}</p>
            </div>

            {/* Today's Bookings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Today&#39;s Bookings ({bookings.length}) - {getCurrentDate()}
              </h2>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {bookings.length === 0 ? (
                <p className="text-gray-500">No bookings for today</p>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking._id || booking.id}
                      className="bg-white p-4 rounded-lg border shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.customerName}
                          </h3>
                          <p className="text-gray-600">
                            📞 {booking.customerPhone}
                          </p>
                          <p className="text-gray-600">✂️ {booking.service}</p>
                          {booking.barber && (
                            <p className="text-gray-600">👤 {booking.barber}</p>
                          )}
                          <p className="text-gray-600">
                            📅 {booking.date} at {booking.time}
                          </p>
                          <p className="text-gray-600">💰 ₹{booking.price}</p>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-1">
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(
                                    booking._id || booking.id,
                                    "started"
                                  )
                                }
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Start Service
                              </button>
                            )}

                            {booking.status === "started" && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(
                                    booking._id || booking.id,
                                    "completed"
                                  )
                                }
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Mark Done
                              </button>
                            )}

                            {booking.status !== "cancelled" &&
                              booking.status !== "completed" && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(
                                      booking._id || booking.id,
                                      "cancelled"
                                    )
                                  }
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Cancel
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}

function getStatusColor(status) {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "started":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
