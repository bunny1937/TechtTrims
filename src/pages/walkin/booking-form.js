// import { useState } from "react";
// import { useRouter } from "next/router";
// import styles from "../../styles/wal";

// export default function WalkinBookingForm() {
//   const router = useRouter();
//   const { salonId, barberId } = router.query;

//   const [formData, setFormData] = useState({
//     customerName: "",
//     customerPhone: "",
//     service: "Haircut",
//     estimatedDuration: 45,
//   });

//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const res = await fetch("/api/walkin/create-booking", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           salonId,
//           barberId,
//           ...formData,
//         }),
//       });

//       const data = await res.json();

//       if (data.success) {
//         // Redirect to confirmation page
//         router.push(`/walkin/confirmation?bookingId=${data.booking.bookingId}`);
//       } else {
//         alert(data.message || "Booking failed");
//       }
//     } catch (error) {
//       console.error("Booking error:", error);
//       alert("Something went wrong. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className={styles.container}>
//       <h1 className={styles.title}>Book Your Service</h1>

//       <form onSubmit={handleSubmit} className={styles.form}>
//         <div className={styles.formGroup}>
//           <label>Full Name *</label>
//           <input
//             type="text"
//             value={formData.customerName}
//             onChange={(e) =>
//               setFormData({ ...formData, customerName: e.target.value })
//             }
//             required
//             placeholder="Enter your name"
//           />
//         </div>

//         <div className={styles.formGroup}>
//           <label>Phone Number *</label>
//           <input
//             type="tel"
//             value={formData.customerPhone}
//             onChange={(e) =>
//               setFormData({ ...formData, customerPhone: e.target.value })
//             }
//             required
//             placeholder="10-digit mobile number"
//             pattern="[0-9]{10}"
//           />
//         </div>

//         <div className={styles.formGroup}>
//           <label>Service *</label>
//           <select
//             value={formData.service}
//             onChange={(e) =>
//               setFormData({ ...formData, service: e.target.value })
//             }
//           >
//             <option value="Haircut">Haircut</option>
//             <option value="Shave">Shave</option>
//             <option value="Hair Styling">Hair Styling</option>
//             <option value="Beard Trim">Beard Trim</option>
//             <option value="Hair Color">Hair Color</option>
//           </select>
//         </div>

//         <button type="submit" disabled={loading} className={styles.submitBtn}>
//           {loading ? "Creating Booking..." : "Confirm Booking"}
//         </button>
//       </form>
//     </div>
//   );
// }
