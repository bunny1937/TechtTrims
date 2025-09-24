// components/salons/SalonDashboard.js
import React, { useEffect, useState } from "react";
import BookingList from "./dashboard/BookingList";
import BookingForm from "./dashboard/BookingForm";
import StaffList from "./dashboard/StaffList";
import ServiceList from "./dashboard/ServiceList";

/**
 * NOTE: Replace this salonId with actual salonId from your auth/session.
 * For testing, you can hardcode a salonId string (ObjectId) from your DB.
 */
const DEFAULT_SALON_ID = process.env.NEXT_PUBLIC_SALON_ID || "";

export default function SalonDashboard() {
  const [salonId] = useState(DEFAULT_SALON_ID);

  if (!salonId) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold">Salon Dashboard</h2>
        <p className="mt-4 text-red-600">
          No salonId configured. Set NEXT_PUBLIC_SALON_ID or connect to auth
          session.
        </p>
      </div>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salon Owner Dashboard</h1>
        <div>
          Salon ID: <code className="bg-gray-100 p-1 rounded">{salonId}</code>
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Today&#39;s Bookings</h2>
          <BookingList salonId={salonId} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Create Booking</h2>
          <BookingForm salonId={salonId} />
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Staff</h2>
          <StaffList salonId={salonId} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Services</h2>
          <ServiceList salonId={salonId} />
        </div>
      </section>
    </main>
  );
}
