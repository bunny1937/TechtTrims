// pages/salons/services/[id].jsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ServicePage() {
  const router = useRouter();
  const { id } = router.query;

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch the service by ID
  useEffect(() => {
    if (!id) return;

    const fetchService = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/salons/services/${id}`);
        setService(res.data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch service");
      }
      setLoading(false);
    };

    fetchService();
  }, [id]); // ✅ only depends on `id`

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setService({ ...service, [name]: value });
  };

  // Save updated service
  const handleSave = async () => {
    if (!service) return;
    setSaving(true);
    try {
      const res = await axios.put(`/api/salons/services/${id}`, service);
      setService(res.data);
      setError("");
      alert("Service updated successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to update service");
    }
    setSaving(false);
  };

  // Delete service
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;
    try {
      await axios.delete(`/api/salons/services/${id}`);
      alert("Service deleted successfully!");
      router.push("/salons/services"); // Redirect after deletion
    } catch (err) {
      console.error(err);
      setError("Failed to delete service");
    }
  };

  if (loading) return <p>Loading service...</p>;
  if (!service) return <p>No service found.</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Service</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="mb-4">
        <label className="block font-medium">Name:</label>
        <input
          type="text"
          name="name"
          value={service.name || ""}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Description:</label>
        <textarea
          name="description"
          value={service.description || ""}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      <div className="mb-4">
        <label className="block font-medium">Price:</label>
        <input
          type="number"
          name="price"
          value={service.price || 0}
          onChange={handleChange}
          className="w-full border rounded px-3 py-2 mt-1"
        />
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Delete Service
        </button>
      </div>
    </div>
  );
}
