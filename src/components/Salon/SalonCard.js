import { useRouter } from "next/router";
import styles from "../../styles/SalonCard.module.css";

export default function SalonCard({ salon, gender }) {
  const router = useRouter();
  if (!salon) {
    return null; // or return a loading/error placeholder
  }

  const handleBookNow = () => {
    router.push({ pathname: "/salons/[id]", query: { id: salon.id } });
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <img
          src={salon.images?.front || "/salon-placeholder.jpg"}
          alt={salon.name}
        />
        <div className={styles.popularityBadge}>
          {salon.totalBookings > 100 && "🔥 Most Booked"}
        </div>
      </div>

      <div className={styles.content}>
        <h3>{salon.name}</h3>

        <div className={styles.metrics}>
          <span>⭐ {salon.rating}/5</span>
          <span>📍 {salon.location?.distance || "1.2"} km</span>
          <span>🎯 {salon.customerServiceScore}% satisfaction</span>
        </div>

        <div className={styles.services}>
          <h4>Popular Services</h4>
          <div className={styles.serviceList}>
            {salon.topServices?.map((service, index) => (
              <div key={index} className={styles.serviceItem}>
                <span>{service.name}</span>
                <span className={styles.price}>₹{service.price}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleBookNow} className={styles.bookBtn}>
          Book Now →
        </button>
      </div>
    </div>
  );
}
