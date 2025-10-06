import styles from "../../styles/Admin/AdminStatsCards.module.css";

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: "Total Salons",
      value: stats?.totalSalons || 0,
      icon: "🏢",
      color: "#f59e0b",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: "👥",
      color: "#3b82f6",
    },
    {
      title: "Total Bookings",
      value: stats?.totalBookings || 0,
      icon: "📅",
      color: "#10b981",
    },
    {
      title: "Total Revenue",
      value: `₹${stats?.totalRevenue || 0}`,
      icon: "💰",
      color: "#8b5cf6",
    },
  ];

  return (
    <div className={styles.container}>
      {cards.map((card) => (
        <div
          key={card.title}
          className={styles.card}
          style={{ borderLeft: `4px solid ${card.color}` }}
        >
          <div
            className={styles.icon}
            style={{ background: `${card.color}20`, color: card.color }}
          >
            {card.icon}
          </div>
          <div className={styles.content}>
            <h3 className={styles.title}>{card.title}</h3>
            <p className={styles.value}>{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
