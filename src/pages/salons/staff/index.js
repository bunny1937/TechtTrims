// pages/salons/[salonId]/staff.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

export default function SalonStaffPage() {
  const router = useRouter();
  const { salonId } = router.query;

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
  });
  const [creating, setCreating] = useState(false);

  // Fetch staff
  useEffect(() => {
    if (!salonId) return;

    const fetchStaff = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/salons/staff?salonId=${salonId}`);
        setStaffList(res.data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch staff");
      }
      setLoading(false);
    };

    fetchStaff();
  }, [salonId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewStaff({ ...newStaff, [name]: value });
  };

  // Create new staff
  const handleCreate = async () => {
    if (!newStaff.name) return alert("Name is required");
    setCreating(true);
    try {
      const res = await axios.post("/api/salons/staff", {
        ...newStaff,
        salonId,
      });
      setStaffList([...staffList, res.data]);
      setNewStaff({ name: "", email: "", phone: "", role: "" });
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to create staff");
    }
    setCreating(false);
  };

  if (loading) return <p className="p-6">Loading staff...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Staff for Salon {salonId}</h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* New Staff Form */}
      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Add New Staff</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={newStaff.name}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={newStaff.email}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone"
            value={newStaff.phone}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="text"
            name="role"
            placeholder="Role"
            value={newStaff.role}
            onChange={handleChange}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {creating ? "Adding..." : "Add Staff"}
        </button>
      </div>

      {/* Staff List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Staff</h2>
        {staffList.length === 0 ? (
          <p>No staff yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Name</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">Phone</th>
                  <th className="px-4 py-2 border">Role</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((st) => (
                  <tr key={st._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border">{st.name}</td>
                    <td className="px-4 py-2 border">{st.email}</td>
                    <td className="px-4 py-2 border">{st.phone}</td>
                    <td className="px-4 py-2 border">{st.role}</td>
                    <td className="px-4 py-2 border">
                      <Link
                        href={`/salons/staff/${st._id}`}
                        className="text-blue-600 hover:underline"
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
