// pages/salons/[salonId]/services.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

export default function SalonServicesPage() {
  const router = useRouter();
  const { salonId } = router.query;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newService, setNewService] = useState({
    title: "",
    description: "",
    price: 0,
  });
  const [creating, setCreating] = useState(false);

  // Fetch services
  useEffect(() => {
    if (!salonId) return;

    const fetchServices = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/salons/services?salonId=${salonId}`);
        setServices(res.data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch services");
      }
      setLoading(false);
    };

    fetchServices();
  }, [salonId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
  };

  // Create new service
  const handleCreate = async () => {
    if (!newService.title) return alert("Title is required");
    setCreating(true);
    try {
      const res = await axios.post("/api/salons/services", {
        ...newService,
        salonId,
      });
      setServices([...services, res.data]);
      setNewService({ title: "", description: "", price: 0 });
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to create service");
    }
    setCreating(false);
  };

  if (loading) return <p className="p-6">Loading services...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Services for Salon {salonId}</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* New Service Form */}
      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Add New Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={newService.title}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={newService.price}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="text"
            name="description"
            placeholder="Description"
            value={newService.description}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {creating ? "Creating..." : "Add Service"}
        </button>
      </div>

      {/* Services List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Services</h2>
        {services.length === 0 ? (
          <p>No services yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Title</th>
                  <th className="px-4 py-2 border">Description</th>
                  <th className="px-4 py-2 border">Price</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{s.title}</td>
                    <td className="px-4 py-2 border">{s.description}</td>
                    <td className="px-4 py-2 border">{s.price}</td>
                    <td className="px-4 py-2 border">
                      <Link
                        href={`/salons/services/${s._id}`}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
