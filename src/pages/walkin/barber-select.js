import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/WalkinBarberSelect.module.css";

export default function WalkinBarberSelect() {
  const router = useRouter();
  const { salonId } = router.query;

  const [salonState, setSalonState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salonId) return;

    fetchSalonState();

    // Update every 30 seconds
    const interval = setInterval(fetchSalonState, 30000);

    return () => clearInterval(interval);
  }, [salonId]);

  const fetchSalonState = async () => {
    try {
      const res = await fetch(`/api/walkin/salon-state?salonId=${salonId}`);
      const data = await res.json();
      setSalonState(data);
    } catch (error) {
      console.error("Error fetching salon state:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBarberSelect = (barberId) => {
    router.push(`/walkin/booking-form?salonId=${salonId}&barberId=${barberId}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading barbers...</div>;
  }

  if (!salonState) {
    return <div className={styles.error}>Unable to load salon information</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Select Your Barber</h1>

      {/* Overall Stats */}
      <div className={styles.overallStats}>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>🟢</span>
          <span className={styles.statValue}>{salonState.totalServing}</span>
          <span className={styles.statLabel}>Serving Now</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>🟠</span>
          <span className={styles.statValue}>{salonState.totalWaiting}</span>
          <span className={styles.statLabel}>In Queue</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statIcon}>⏱️</span>
          <span className={styles.statValue}>
            ~{salonState.avgWaitTime} min
          </span>
          <span className={styles.statLabel}>Avg Wait</span>
        </div>
      </div>

      {/* Barber Chairs Grid */}
      <div className={styles.chairsGrid}>
        {salonState.barbers.map((barber) => (
          <div
            key={barber.barberId}
            className={`${styles.chairCard} ${
              styles[barber.status.toLowerCase()]
            }`}
            onClick={() => handleBarberSelect(barber.barberId)}
          >
            {/* Chair Visual */}
            <div className={styles.chairIcon}>
              <div
                className={`${styles.statusDot} ${
                  styles[barber.status.toLowerCase()]
                }`}
              ></div>
              <span className={styles.chairNumber}>#{barber.chairNumber}</span>
            </div>

            {/* Barber Info */}
            <h3 className={styles.barberName}>{barber.name}</h3>

            {barber.status === "AVAILABLE" && (
              <div className={styles.availableTag}>✅ Available Now</div>
            )}

            {barber.status === "OCCUPIED" && (
              <div className={styles.occupiedInfo}>
                <p className={styles.servingText}>
                  🟢 Serving: {barber.currentCustomer}
                </p>
                <p className={styles.timeLeft}>
                  Time Left: ~{barber.timeLeft} mins
                </p>
              </div>
            )}

            {barber.queueCount > 0 && (
              <div className={styles.queueBadge}>
                {barber.queueCount} in queue
              </div>
            )}

            <div className={styles.waitEstimate}>
              {barber.status === "AVAILABLE" ? (
                <span className={styles.noWait}>No Wait</span>
              ) : (
                <span className={styles.waitTime}>
                  ~{barber.timeLeft + barber.queueCount * 45} mins wait
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.green}`}></span>
          <span>Service In Progress</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.orange}`}></span>
          <span>Waiting in Queue</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.red}`}></span>
          <span>Booking Confirmed</span>
        </div>
      </div>
    </div>
  );
}
