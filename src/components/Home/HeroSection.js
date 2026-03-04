// components/Hero/HeroSection.js
import React from "react";
import styles from "../../styles/Home.module.css";

export default function HeroSection({
  profileUser,
  userOnboarding,
  salons,
  searchTerm,
  setSearchTerm,
  selectedService,
  setSelectedService,
}) {
  const quickFilters = [
    { icon: "💇", label: "Haircut", color: "#FF6B6B" },
    { icon: "🧔", label: "Beard Trim", color: "#4ECDC4" },
    { icon: "💅", label: "Manicure", color: "#45B7D1" },
    { icon: "✨", label: "Facial", color: "#96CEB4" },
    { icon: "🎨", label: "Hair Color", color: "#FECA57" },
    { icon: "💆", label: "Massage", color: "#FF9FF3" },
  ];

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroContent}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTextContainer}>
            <h1 className={styles.heroTitle}>
              Discover Premium Salons Near You ✨
            </h1>
            <p className={styles.heroGreeting}>
              {profileUser ? `Welcome back, ${profileUser.name}` : ""}
            </p>

            <p className={styles.heroSubtitle}>
              Discover luxury salon experiences and premium beauty services near{" "}
              <span className={styles.locationHighlight}>
                {userOnboarding?.location?.address || "you"}{" "}
              </span>
            </p>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.statIcon}>
                  🏪 <span className={styles.statNumber}>{salons.length}</span>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Premium Salons</span>
                </div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statIcon}>
                  💆{" "}
                  <span className={styles.statNumber}>
                    {Array.isArray(salons)
                      ? salons.reduce(
                          (total, salon) =>
                            total + (salon.topServices?.length || 0),
                          0,
                        )
                      : 0}
                  </span>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Expert Services</span>
                </div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statIcon}>
                  ⭐
                  <span className={styles.statNumber}>
                    {Array.isArray(salons)
                      ? salons.reduce(
                          (total, salon) =>
                            total + (salon.stats?.totalBookings || 0),
                          0,
                        )
                      : 0}
                  </span>
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Happy Clients</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.heroRight}>
          {/* Enhanced Search Section */}
          <section className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <div className={styles.searchBox}>
                <div className={styles.searchInputWrapper}>
                  <input
                    type="text"
                    placeholder="Search for services, salons, or treatments..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className={styles.searchIcon}>🔍</span>
                </div>
              </div>

              <div className={styles.quickFilters}>
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    className={`${styles.filterChip} ${
                      selectedService === filter.label
                        ? styles.activeFilter
                        : ""
                    }`}
                    style={{ "--filter-color": filter.color }}
                    onClick={() => {
                      if (selectedService === filter.label) {
                        setSelectedService("");
                      } else {
                        setSelectedService(filter.label);
                      }
                    }}
                  >
                    <span className={styles.filterIcon}>{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
