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

  // 1️⃣ Load bookings function (can be reused)
  const loadTodayBookings = useCallback(async (salonId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/salons/bookings/today?salonId=${salonId}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      console.log("Bookings fetched:", data);

      if (response.ok && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      } else {
        setError("Failed to load bookings");
      }
    } catch (err) {
      console.error(err);
      setError("Error loading bookings");
    } finally {
      setLoading(false);
    }
  }, []); // no deps → stable function

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
  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch(`/api/bookings/update-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });

      if (response.ok) {
        // ✅ refresh bookings after status change
        loadTodayBookings(salon._id);
      } else {
        alert("Failed to update booking status");
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Error updating booking");
    }
  };

  const markArrived = (bookingId) => updateBookingStatus(bookingId, "arrived");
  const markStarted = (bookingId) => updateBookingStatus(bookingId, "started");
  const markDone = (bookingId) => updateBookingStatus(bookingId, "completed");

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
                Today&#39;s Bookings ({bookings.length})
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
                      key={booking._id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">
                            {booking.customerName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Service: {booking.service}
                          </p>
                          <p className="text-sm text-gray-600">
                            Time: {booking.time}
                          </p>
                          <p className="text-sm text-gray-600">
                            Phone: {booking.customerPhone}
                          </p>
                          {booking.barber && (
                            <p className="text-sm text-gray-600">
                              Barber: {booking.barber}
                            </p>
                          )}
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs mt-2 ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {booking.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {booking.status === "confirmed" && (
                            <button
                              onClick={() => markArrived(booking._id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Customer Arrived
                            </button>
                          )}

                          {booking.status === "arrived" && (
                            <button
                              onClick={() => markStarted(booking._id)}
                              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
                            >
                              Start Service
                            </button>
                          )}

                          {booking.status === "started" && (
                            <button
                              onClick={() => markDone(booking._id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                            >
                              Mark Done
                            </button>
                          )}

                          {booking.status === "completed" && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">
                              Completed
                            </span>
                          )}
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
    case "arrived":
      return "bg-yellow-100 text-yellow-800";
    case "started":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
