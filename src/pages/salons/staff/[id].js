// pages/salons/staff/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function StaffPage() {
  const router = useRouter();
  const { id } = router.query;

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchStaff = async () => {
      try {
        const res = await fetch(`/api/salons/staff/${id}`);
        if (!res.ok) throw new Error("Failed to fetch staff");
        const data = await res.json();
        setStaff(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (!staff) return <p>Staff not found</p>;

  return (
    <div>
      <h1>{staff.name}</h1>
      <p>Email: {staff.email}</p>
      <p>Role: {staff.role}</p>
    </div>
  );
}
