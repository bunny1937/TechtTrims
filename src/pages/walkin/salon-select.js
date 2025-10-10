// import { useState, useEffect } from "react";
// import { useRouter } from "next/router";
// import styles from "../../styles/WalkinSalonSelect.module.css";

// export default function WalkinSalonSelect() {
//   const router = useRouter();
//   const [salons, setSalons] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchSalons();
//   }, []);

//   const fetchSalons = async () => {
//     try {
//       const res = await fetch("/api/salons");
//       const data = await res.json();
//       setSalons(data.salons || []);
//     } catch (error) {
//       console.error("Error fetching salons:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSalonSelect = (salonId) => {
//     router.push(`/walkin/barber-select?salonId=${salonId}`);
//   };

//   if (loading) {
//     return <div className={styles.loading}>Loading salons...</div>;
//   }

//   return (
//     <div className={styles.container}>
//       <h1 className={styles.title}>Select a Salon</h1>

//       <div className={styles.salonGrid}>
//         {salons.map((salon) => (
//           <div
//             key={salon._id}
//             className={styles.salonCard}
//             onClick={() => handleSalonSelect(salon._id)}
//           >
//             <h2>{salon.salonName}</h2>
//             <p>{salon.address}</p>
//             <div className={styles.stats}>
//               <span>⭐ {salon.ratings?.overall || 5.0}</span>
//               <span>👥 {salon.stats?.totalBookings || 0} bookings</span>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
