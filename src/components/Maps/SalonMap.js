//pages/src/components/Maps/SalonMap.js
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/SalonMap.module.css";
// import SalonCard from "../Salon/SalonCard";

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
  iconSize: [35, 35], // Fixed size
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
  className: "fixed-marker-icon",
});

// User location marker
const userIcon = new L.Icon({
  iconUrl: "/maps/usericon.png", // Put your icon here
  iconSize: [25, 25], // Fixed size
  iconAnchor: [12.5, 12.5],
  className: "fixed-user-icon",
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

// const AutoOpenPopup = ({ children, position, ...props }) => {
//   const map = useMap();

//   const popupOptions = useMemo(() => props, [props]);

//   useEffect(() => {
//     const marker = L.marker(position, { icon: salonIcon }).addTo(map);
//     const popup = L.popup(popupOptions).setContent(children);
//     marker.bindPopup(popup).openPopup();

//     return () => {
//       map.removeLayer(marker);
//     };
//   }, [map, position, children, popupOptions]);

//   return null;
// };
// Live Location Control Component
const LiveLocationControl = ({ userLocation, map }) => {
  const [locating, setLocating] = useState(false);

  const centerOnUser = () => {
    if (userLocation?.lat && userLocation?.lng && map) {
      setLocating(true);
      map.flyTo([userLocation.lat, userLocation.lng], 16, {
        animate: true,
        duration: 1.5,
      });
      setTimeout(() => setLocating(false), 1500);
    } else {
      // Request live location
      if (navigator.geolocation) {
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPos = [
              position.coords.latitude,
              position.coords.longitude,
            ];
            map.flyTo(newPos, 16, { animate: true, duration: 1.5 });
            setTimeout(() => setLocating(false), 1500);
          },
          (error) => {
            alert("Unable to get location");
            setLocating(false);
          }
        );
      }
    }
  };

  return (
    <button
      className={styles.liveLocationBtn}
      onClick={centerOnUser}
      disabled={locating}
      title="Center on my location"
    >
      <span className={locating ? styles.spinning : ""}>📍</span>
      {locating ? "Locating..." : "My Location"}
    </button>
  );
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
  const [mapTheme, setMapTheme] = useState("standard");
  const [selectedSalonPopup, setSelectedSalonPopup] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapRef, setMapRef] = useState(null);

  const mapThemes = {
    standard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      name: "Standard",
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      name: "Dark",
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      name: "Light",
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      name: "Satellite",
    },
    terrain: {
      url: "https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png",
      name: "Terrain",
    },
  };

  const defaultCenter =
    userLocation?.lat && userLocation?.lng
      ? [userLocation.lat, userLocation.lng]
      : [19.076, 72.8777]; // Mumbai default
  const ThemeSelector = () => (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 text-black">
      <select
        value={mapTheme}
        onChange={(e) => setMapTheme(e.target.value)}
        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(mapThemes).map(([key, theme]) => (
          <option key={key} value={key}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
  // Add this component inside the MapContainer, after TileLayer
  const PopupOpener = ({ salons }) => {
    const map = useMap();

    useEffect(() => {
      const timer = setTimeout(() => {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.getPopup()) {
            layer.openPopup();
          }
        });
      }, 100);

      return () => clearTimeout(timer);
    }, [map, salons]);

    return null;
  };

  return (
    <div className={styles.mapContainer}>
      <ThemeSelector />
      <MapContainer
        center={defaultCenter}
        zoom={15}
        maxZoom={20}
        className={styles.map}
        ref={setMapRef}
        whenReady={(map) => setMapRef(map.target)}
        whenCreated={setMapInstance}
      >
        <TileLayer
          url={mapThemes[mapTheme].url}
          attribution="&copy; Map Data"
        />
        <PopupOpener salons={salons} />
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

        {/* Salon markers with always-open popups */}
        {salons.map((salon) => (
          <Marker
            key={salon._id}
            position={[
              salon.location.coordinates[1],
              salon.location.coordinates[0],
            ]}
            icon={salonIcon}
            eventHandlers={{
              click: () => onSalonSelect(salon),
            }}
          >
            <Popup
              autoClose={false}
              closeButton={false}
              closeOnClick={false}
              closeOnEscapeKey={false}
              autoPan={false}
              className="custom-popup"
            >
              <div className="text-center p-2 min-w-[20px]">
                <h3 className="font-bold text-sm mb-1">{salon.salonName}</h3>
                <p className="text-xs font-medium text-blue-600 ">
                  {salon.distance?.toFixed(1)}km away
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    className="text-xs bg-orange-500 text-white rounded px-4 py-1 font-medium hover:bg-orange-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSalonPopup(salon);
                    }}
                  >
                    View Details
                  </button>
                  <button
                    className="text-xs bg-blue-500 text-white rounded px-2 py-1 font-medium hover:bg-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(
                        `https://maps.google.com/maps?daddr=${salon.location.coordinates[1]},${salon.location.coordinates[0]}`
                      );
                    }}
                  >
                    Get Directions
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {salons.map((salon) => (
          <Marker
            key={`marker-${salon._id}`}
            position={[
              salon.location.coordinates[1],
              salon.location.coordinates[0],
            ]}
            icon={salonIcon}
            eventHandlers={{
              click: () => onSalonSelect(salon),
            }}
          />
        ))}
      </MapContainer>
      {userLocation && mapRef && (
        <LiveLocationControl userLocation={userLocation} map={mapRef} />
      )}
      {/* Salon Details Card */}
      {selectedSalonPopup && (
        <div
          className={styles.salonPopupOverlay}
          onClick={() => setSelectedSalonPopup(null)}
        >
          <div
            className={styles.salonPopupCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.popupClose}
              onClick={() => setSelectedSalonPopup(null)}
            >
              ×
            </button>
            <SalonCard
              salon={selectedSalonPopup}
              userLocation={userLocation}
              onSalonSelect={onSalonSelect}
              onBookNow={onBookNow}
              userGender={userGender}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonMap;
