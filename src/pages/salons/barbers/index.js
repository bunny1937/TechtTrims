// pages/salons/barbers/index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

export default function SalonBarbersPage() {
  const router = useRouter();
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [salonId, setSalonId] = useState(null);
  const [newBarber, setNewBarber] = useState({
    name: "",
    experience: 0,
    skills: [],
    bio: "",
    photo: "",
  });

  const availableSkills = [
    "Haircut",
    "Shaving",
    "Hair Styling",
    "Beard Trim",
    "Hair Color",
    "Facial",
  ];

  // Get salonId from localStorage (salon session)
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Checking localStorage for salon session...");

      // Check all possible keys
      const salonSession = localStorage.getItem("salonSession");
      const salonToken = localStorage.getItem("salonToken");

      console.log("Raw salonSession:", salonSession);
      console.log("Raw salonToken:", salonToken);

      if (salonSession) {
        try {
          const salonData = JSON.parse(salonSession);
          console.log("Parsed salon data:", salonData);

          // Try multiple possible id fields
          const id = salonData.id || salonData._id || salonData.salonId;

          if (id) {
            setSalonId(id);
            console.log("Salon ID loaded from session:", id);
          } else {
            console.error("No ID found in salon session data");
            setError("Invalid salon session data");
          }
        } catch (err) {
          console.error("Failed to parse salon session:", err);
          setError("Failed to parse salon session");
        }
      } else {
        console.error("No salon session found in localStorage");
        setError("No salon session found. Please login first.");
        setTimeout(() => {
          router.push("/auth/salon/login");
        }, 2000);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!salonId) {
      console.log("No salonId yet, waiting...");
      return;
    }

    console.log("Fetching barbers for salon:", salonId);
    const fetchBarbers = async () => {
      setLoading(true);
      try {
        // Use the correct API endpoint
        const res = await axios.get(`/api/salons/barbers?salonId=${salonId}`);
        console.log("Barbers API response:", res.data);
        setBarbers(res.data);
        setError("");
      } catch (err) {
        console.error("Fetch barbers error:", err);
        console.error("Error response:", err.response?.data);
        setError(
          `Failed to fetch barbers: ${err.response?.data?.error || err.message}`
        );
      }
      setLoading(false);
    };

    fetchBarbers();
  }, [salonId]);

  // Rest of your component remains the same...
  const handleCreate = async () => {
    if (!newBarber.name) return alert("Name is required");
    if (!salonId) return alert("No salon session found");

    try {
      console.log("Creating barber:", { ...newBarber, salonId });
      const res = await axios.post("/api/salons/barbers", {
        ...newBarber,
        salonId,
      });
      console.log("Create response:", res.data);
      setBarbers([...barbers, res.data]);
      setNewBarber({ name: "", experience: 0, skills: [], bio: "", photo: "" });
      setShowForm(false);
      setError("");
    } catch (err) {
      console.error("Create barber error:", err);
      setError(
        `Failed to create barber: ${err.response?.data?.error || err.message}`
      );
    }
  };

  const handleSkillToggle = (skill) => {
    setNewBarber((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleAvailability = async (barberId, currentStatus) => {
    try {
      await axios.put(`/api/salons/barbers/${barberId}`, {
        isAvailable: !currentStatus,
      });
      setBarbers(
        barbers.map((b) =>
          b._id === barberId ? { ...b, isAvailable: !currentStatus } : b
        )
      );
    } catch (err) {
      console.error("Toggle availability error:", err);
      setError("Failed to update barber status");
    }
  };

  // Show debug info while loading
  if (loading || !salonId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">
            Loading Barbers...
          </h3>
          <div className="text-sm space-y-1">
            <p>
              <strong>Salon ID:</strong> {salonId || "Loading..."}
            </p>
            <p>
              <strong>Loading:</strong> {loading.toString()}
            </p>
            <p>
              <strong>Error:</strong> {error || "None"}
            </p>
            <p>
              <strong>LocalStorage Keys:</strong>{" "}
              {typeof window !== "undefined"
                ? Object.keys(localStorage).join(", ")
                : "Not available"}
            </p>
            {typeof window !== "undefined" &&
              localStorage.getItem("salonSession") && (
                <p>
                  <strong>Session Data:</strong>{" "}
                  {localStorage.getItem("salonSession")}
                </p>
              )}
          </div>
        </div>
        {error && error.includes("No salon session") && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/auth/salon/login")}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Barber Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
        >
          {showForm ? "Cancel" : "Add New Barber"}
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Add Barber Form */}
      {showForm && (
        <div className="mb-8 p-6 border rounded-lg shadow bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Add New Barber</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Barber Name"
              value={newBarber.name}
              onChange={(e) =>
                setNewBarber({ ...newBarber, name: e.target.value })
              }
              className="border rounded px-3 py-2 w-full"
            />
            <input
              type="number"
              placeholder="Years of Experience"
              value={newBarber.experience}
              onChange={(e) =>
                setNewBarber({
                  ...newBarber,
                  experience: parseInt(e.target.value) || 0,
                })
              }
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">
              Skills & Specializations
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableSkills.map((skill) => (
                <label key={skill} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newBarber.skills.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                    className="mr-2"
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block font-medium mb-2">
              Bio/Accomplishments
            </label>
            <textarea
              placeholder="Describe achievements, awards, specialties..."
              value={newBarber.bio}
              onChange={(e) =>
                setNewBarber({ ...newBarber, bio: e.target.value })
              }
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={handleCreate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Barber
          </button>
        </div>
      )}

      {/* Barbers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <div
            key={barber._id}
            className="bg-white border rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{barber.name}</h3>
                <p className="text-gray-600">
                  {barber.experience} years experience
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-500">⭐</span>
                  <span className="ml-1">{barber.rating}/5</span>
                  <span className="text-gray-500 ml-2">
                    ({barber.totalBookings} bookings)
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  toggleAvailability(barber._id, barber.isAvailable)
                }
                className={`px-3 py-1 rounded text-sm ${
                  barber.isAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {barber.isAvailable ? "Available" : "Unavailable"}
              </button>
            </div>

            {/* Skills */}
            <div className="mb-3">
              <p className="font-medium text-sm mb-2">Specializations:</p>
              <div className="flex flex-wrap gap-1">
                {barber.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Bio */}
            {barber.bio && (
              <div className="mb-3">
                <p className="text-gray-700 text-sm">{barber.bio}</p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Link href={`/salons/barbers/${barber._id}`} className="flex-1">
                <button className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">
                  Edit Details
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {barbers.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No barbers found for this salon.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 text-white px-6 py-3 rounded hover:bg-amber-700"
          >
            Add Your First Barber
          </button>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <p>Salon ID: {salonId || "Not loaded"}</p>
        <p>Barbers Count: {barbers.length}</p>
        <p>Loading: {loading.toString()}</p>
        <p>Error: {error || "None"}</p>
      </div>
    </div>
  );
}
