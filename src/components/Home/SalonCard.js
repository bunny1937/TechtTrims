// components/SalonCard.js
import React from "react";
import styles from "../../styles/Home.module.css";

export default function SalonCard({
  salon,
  index,
  isPrebook,
  onNavigate,
  getSalonStatus,
  placeholderImage,
}) {
  const salonId = salon._id?.oid || salon._id;

  const handleClick = (e) => {
    // Prevent button double-click
    if (e.target.tagName === "BUTTON") {
      e.stopPropagation();
      return;
    }
    onNavigate(salonId, isPrebook ? "prebook" : "walkin");
  };

  return (
    <div className={styles.salonCard} onClick={handleClick}>
      {/* Salon Image */}
      <div className={styles.salonImageContainer}>
        <img
          src={`${salon.profilePicture || placeholderImage}?tr=w-400,h-250,q-75,f-webp,fo-auto`}
          alt={salon.salonName || "Salon"}
          width="400"
          height="250"
          style={{
            objectFit: "cover",
            borderRadius: "8px",
          }}
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={index < 3 ? "high" : "auto"}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = placeholderImage;
          }}
        />
        <div className={styles.salonImageOverlay}></div>

        {/* Badges */}
        <div className={styles.salonBadges}>
          {!isPrebook ? (
            <span className={`${styles.salonBadge} ${styles.walkInBadge}`}>
              ⚡ Walk-in Ready
            </span>
          ) : (
            <>
              <span className={`${styles.salonBadge} ${styles.primaryBadge}`}>
                {salon.distance < 2
                  ? "Very Close"
                  : salon.isVerified
                    ? "Verified"
                    : "Popular"}
              </span>
              <span className={`${styles.salonBadge} ${styles.distanceBadge}`}>
                {salon.distance}Km away
              </span>
            </>
          )}
        </div>
      </div>

      {/* Salon Info */}
      <div className={styles.salonInfo}>
        <div className={styles.salonHeader}>
          <h4 className={styles.salonName}>{salon.salonName}</h4>
          <div className={styles.salonRating}>
            <span className={styles.ratingStars}>⭐</span>
            <span className={styles.ratingNumber}>
              {salon.ratings?.overall || salon.stats?.rating || 0}
            </span>
          </div>
        </div>

        <p className={styles.salonLocation}>{salon.location?.address}</p>

        <div className={styles.salonMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricIcon}>📍</span>
            <span className={styles.metricValue}>
              {salon.distance
                ? salon.distance < 1
                  ? `${Math.round(salon.distance * 1000)}m away`
                  : `${salon.distance.toFixed(1)}km away`
                : "Calculating..."}{" "}
            </span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon}>🕐</span>
            <span className={styles.metricValue}>{getSalonStatus(salon)}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricIcon}>⭐</span>
            <span className={styles.metricValue}>
              {(salon.ratings?.totalReviews || salon.stats?.totalRatings || 0) >
              0
                ? `${salon.ratings?.totalReviews || salon.stats?.totalRatings} reviews`
                : "New"}
            </span>
          </div>
        </div>

        {salon.topServices && salon.topServices.length > 0 && (
          <div className={styles.salonServices}>
            {salon.topServices.slice(0, 3).map((service, idx) => (
              <span key={idx} className={styles.serviceTag}>
                {service.name}
              </span>
            ))}
            {salon.topServices.length > 3 && (
              <span className={styles.serviceTag}>
                +{salon.topServices.length - 3} more
              </span>
            )}
          </div>
        )}

        <button
          className={!isPrebook ? styles.walkInButton : styles.bookButton}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(salonId, isPrebook ? "prebook" : "walkin");
          }}
        >
          {!isPrebook ? "⚡ View Live Availability" : "📅 Book Now"}
        </button>
      </div>
    </div>
  );
}
