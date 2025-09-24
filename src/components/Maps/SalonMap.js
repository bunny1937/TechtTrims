//pages/src/components/Maps/SalonMap.js
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/SalonMap.module.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom salon marker icon
const salonIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="30" height="30">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [60, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// User location marker
const userIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64=" +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="25" height="25">
      <circle cx="12" cy="12" r="10" stroke="#fff" stroke-width="2"/>
    </svg>
  `),
  iconSize: [25, 25],
  iconAnchor: [12.5, 12.5],
});

const SalonCard = ({
  salon,
  userLocation,
  selectedSalon,
  onSalonSelect,
  onBookNow,
  userGender,
}) => {
  const getGenderServices = (gender) => {
    const maleServices = [
      { name: "Haircut", price: 200, icon: "✂️" },
      { name: "Beard Trim", price: 150, icon: "🧔" },
      { name: "Hair Styling", price: 250, icon: "💇‍♂️" },
      { name: "Face Cleanup", price: 300, icon: "🧴" },
    ];

    const femaleServices = [
      { name: "Haircut & Style", price: 400, icon: "💇‍♀️" },
      { name: "Hair Coloring", price: 800, icon: "🎨" },
      { name: "Facial Treatment", price: 600, icon: "✨" },
      { name: "Manicure", price: 350, icon: "💅" },
    ];

    return gender === "Male" ? maleServices : femaleServices;
  };

  const services =
    salon.topServices?.length > 0
      ? salon.topServices.slice(0, 4)
      : getGenderServices(userGender).slice(0, 4);

  return (
    <div className={styles.salonCard}>
      <div className={styles.cardHeader}>
        <img
          src={
            typeof salon.salonImages?.[0] === "string"
              ? salon.salonImages[0]
              : salon.salonImages?.[0]?.url ||
                "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop"
          }
          alt={salon.salonName}
          className={styles.salonImage}
        />
        <div className={styles.badges}>
          {salon.distance < 2 && (
            <span className={styles.badge}>Very Close</span>
          )}
          {salon.isVerified && <span className={styles.badge}>Verified</span>}
        </div>
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.salonName}>{salon.salonName}</h3>
        <p className={styles.address}>{salon.location.address}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.icon}>⭐</span>
            <span>
              {(salon.ratings?.overall ?? salon.rating ?? 4.5).toFixed(1)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.icon}>📍</span>
            <span>{salon.distance?.toFixed(1) || "1.2"} km</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.icon}>👥</span>
            <span>{salon.stats?.totalBookings || 0} bookings</span>
          </div>
        </div>

        <div className={styles.services}>
          <h4>Popular Services</h4>
          <div className={styles.serviceGrid}>
            {services.map((service, idx) => (
              <div key={idx} className={styles.serviceItem}>
                <span className={styles.serviceIcon}>
                  {service.icon || "✂️"}
                </span>
                <div>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.servicePrice}>₹{service.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.bookButton}
          onClick={() => onBookNow(salon._id)}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

const MapUpdater = ({ selectedSalon, salons }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedSalon) {
      const salon = salons.find((s) => s._id === selectedSalon);
      if (salon && salon.location?.coordinates) {
        map.setView(
          [salon.location.coordinates[1], salon.location.coordinates[0]],
          16
        );
      }
    }
  }, [selectedSalon, salons, map]);

  return null;
};

const SalonMap = ({
  salons,
  userLocation,
  selectedSalon,
  onSalonSelect,
  onBookNow,
  userGender,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const selectedSalonData = salons.find((s) => s._id === selectedSalon);
  const router = useRouter();

  const handleView = (salonId) => {
    router.push(`/salon-details/${salonId}`);
  };
  const defaultCenter =
    userLocation?.lat && userLocation?.lng
      ? [userLocation.lat, userLocation.lng]
      : [19.076, 72.8777]; // Mumbai default

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className={styles.map}
        whenCreated={() => setMapLoaded(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapUpdater selectedSalon={selectedSalon} salons={salons} />

        {/* User location marker */}
        {userLocation?.lat && userLocation?.lng && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div className={styles.userPopup}>
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Salon markers */}
        {salons.map((salon) => {
          if (!salon.location?.coordinates) return null;

          const [lng, lat] = salon.location.coordinates;

          return (
            <Marker
              key={salon._id}
              position={[lat, lng]}
              icon={salonIcon}
              eventHandlers={{
                click: () => onSalonSelect(salon._id),
              }}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <strong>{salon.salonName}</strong>
                  <p>
                    {(salon.ratings?.overall ?? 4.5).toFixed(1)} •{" "}
                    {salon.distance?.toFixed(1)}km
                  </p>
                  <button
                    onClick={() => handleView(salon._id || salon.id)}
                    className={styles.popupButton}
                  >
                    View Details
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        `https://maps.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                      )
                    }
                    className={styles.directionsBtn}
                  >
                    Get Directions
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Salon Details Card */}
      {selectedSalonData && (
        <div className={styles.sidePanel}>
          <button
            className={styles.closeButton}
            onClick={() => onSalonSelect(null)}
          >
            ×
          </button>
          <SalonCard
            salon={selectedSalonData}
            onBookNow={onBookNow}
            userGender={userGender}
          />
        </div>
      )}
    </div>
  );
};

export default SalonMap;
