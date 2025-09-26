import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import OwnerSidebar from "../../components/OwnerSidebar";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // <-- control mobile sidebar

  const loadTodayBookings = useCallback(async (salonId) => {
    try {
      setLoading(true);
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const today = istDate.toISOString().split("T")[0];

      const response = await fetch(
        `/api/salons/bookings?salonId=${salonId}&date=${today}`,
        { cache: "no-store", headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Error loading bookings: " + err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const response = await fetch("/api/bookings/update-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            (b._id || b.id) === bookingId
              ? { ...b, status, updatedAt: new Date() }
              : b
          )
        );
      } else {
        alert("Failed to update booking");
      }
    } catch {
      alert("Error updating booking");
    }
  };

  const getCurrentDate = () =>
    new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner"></div>
        <p className="ml-2">Loading dashboard...</p>
      </div>
    );

  return (
    <Layout>
      <div className="flex min-h-screen bg-background-primary">
        {/* Sidebar Desktop */}
        <aside className="hidden md:block w-64 border-r">
          <OwnerSidebar />
        </aside>

        {/* Sidebar Mobile (slide-in) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black bg-opacity-40"
              onClick={() => setSidebarOpen(false)}
            ></div>
            {/* Drawer */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl animate-slideIn">
              <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6 animate-slideIn">
            {/* Top Bar for mobile */}
            <div className="md:hidden flex items-center justify-between bg-white p-3 rounded-lg shadow-sm sticky top-0 z-30">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                ☰
              </button>
              <h1 className="font-bold text-lg gold-gradient-text">
                {salon?.salonName || "Dashboard"}
              </h1>
            </div>

            {/* Salon Info */}
            <div className="card">
              <h1 className="text-2xl font-bold gold-gradient-text">
                {salon?.salonName}
              </h1>
              <p className="text-text-secondary">Owner: {salon?.ownerName}</p>
            </div>

            {/* Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  Today’s Bookings ({bookings.length})
                </h2>
                <span className="text-sm text-text-secondary">
                  {getCurrentDate()}
                </span>
              </div>

              {error && (
                <div className="bg-error/10 border border-error text-error px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {bookings.length === 0 ? (
                <p className="text-text-secondary">No bookings today</p>
              ) : (
                <div className="grid gap-4">
                  {bookings.map((b) => (
                    <div
                      key={b._id || b.id}
                      className="flex flex-col md:flex-row justify-between md:items-center card p-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">
                          {b.customerName}
                        </h3>
                        <p className="text-text-secondary">
                          📞 {b.customerPhone}
                        </p>
                        <p className="text-text-secondary">✂️ {b.service}</p>
                        {b.barber && (
                          <p className="text-text-secondary">👤 {b.barber}</p>
                        )}
                        <p className="text-text-secondary">
                          📅 {b.date} at {b.time}
                        </p>
                        <p className="text-text-secondary">💰 ₹{b.price}</p>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 md:mt-0 flex flex-col space-y-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium self-start md:self-end ${getStatusColor(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>

                        <div className="flex flex-wrap gap-2">
                          {b.status === "confirmed" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(b._id, "started")
                              }
                              className="btn btn-primary text-sm"
                            >
                              Start Service
                            </button>
                          )}
                          {b.status === "started" && (
                            <button
                              onClick={() =>
                                updateBookingStatus(b._id, "completed")
                              }
                              className="btn btn-primary text-sm"
                            >
                              Mark Done
                            </button>
                          )}
                          {b.status !== "cancelled" &&
                            b.status !== "completed" && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(b._id, "cancelled")
                                }
                                className="btn btn-secondary text-sm"
                              >
                                Cancel
                              </button>
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
    case "started":
      return "bg-yellow-100 text-yellow-800";
    case "completed":
      return "bg-success/20 text-success";
    case "cancelled":
      return "bg-error/20 text-error";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
