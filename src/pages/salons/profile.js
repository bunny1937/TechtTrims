// pages/salons/profile.js
import { useEffect, useState } from "react";
import OwnerSidebar from "../../components/OwnerSidebar";

export default function SalonProfilePage() {
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSalon() {
      try {
        const res = await fetch("/api/salons/profile");
        if (!res.ok) throw new Error("Failed to fetch salon profile");
        const data = await res.json();
        setSalon(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSalon();
  }, []);

  return (
    <div className="flex">
      <OwnerSidebar />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Salon Profile</h1>

        {salon && (
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-semibold">{salon.salonName}</h2>
            <p>
              <strong>Owner:</strong> {salon.ownerName}
            </p>
            <p>
              <strong>Email:</strong> {salon.email}
            </p>
            <p>
              <strong>Phone:</strong> {salon.phone}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {salon.isActive ? "✅ Active" : "❌ Inactive"}
            </p>
            <p>
              <strong>Verified:</strong> {salon.isVerified ? "✅ Yes" : "❌ No"}
            </p>
            <p>
              <strong>Amenities:</strong>{" "}
              {salon.amenities?.length
                ? salon.amenities.join(", ")
                : "Not listed"}
            </p>
            <p>
              <strong>Created At:</strong>{" "}
              {new Date(salon.createdAt).toLocaleString()}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
