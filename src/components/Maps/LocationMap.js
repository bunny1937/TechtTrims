// techtrims/src/components/Maps/LocationMap.js
import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/LocationMap.module.css";

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const salonIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="35" height="35">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
});

const userIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="25" height="25">
      <circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="2"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  `),
  iconSize: [25, 25],
  iconAnchor: [12.5, 12.5],
});

const LocationMap = ({ salonLocation, userLocation, salonName, address }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);

  const center = salonLocation || [19.076, 72.8777];

  const calculateDirectRoute = useCallback(() => {
    if (userLocation && salonLocation) {
      const route = [
        [userLocation.lat, userLocation.lng],
        [salonLocation[0], salonLocation[1]],
      ];
      setRouteCoordinates(route);

      const R = 6371;
      const dLat = ((salonLocation[0] - userLocation.lat) * Math.PI) / 180;
      const dLon = ((salonLocation[1] - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((salonLocation[0] * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;

      setDistance(dist.toFixed(1));
      setDuration(Math.round(dist * 3));
    }
  }, [userLocation, salonLocation]);

  const getAdvancedDirections = async () => {
    if (!userLocation || !salonLocation) return;

    setLoading(true);
    try {
      // Using OpenRouteService for routing (free alternative to Google)
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=YOUR_API_KEY&start=${userLocation.lng},${userLocation.lat}&end=${salonLocation[1]},${salonLocation[0]}`
      );

      if (response.ok) {
        const data = await response.json();
        const coordinates = data.features[0].geometry.coordinates.map(
          (coord) => [coord[1], coord[0]]
        );
        setRouteCoordinates(coordinates);

        const route = data.features[0].properties.segments[0];
        setDistance((route.distance / 1000).toFixed(1));
        setDuration(Math.round(route.duration / 60));
      } else {
        // Fallback to direct route
        calculateDirectRoute();
      }
    } catch (error) {
      console.log("Advanced routing failed, using direct route");
      calculateDirectRoute();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation && salonLocation) {
      calculateDirectRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateDirectRoute]);

  const openInGoogleMaps = () => {
    if (salonLocation) {
      const url = userLocation
        ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${salonLocation[0]},${salonLocation[1]}`
        : `https://www.google.com/maps/place/${salonLocation[0]},${salonLocation[1]}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <div className={styles.mapInfo}>
          <h3>{salonName}</h3>
          <p>{address}</p>
          {distance && (
            <div className={styles.routeInfo}>
              <span>📍 {distance} km</span>
              {duration && <span>🕐 ~{duration} min</span>}
            </div>
          )}
        </div>
        <div className={styles.mapActions}>
          <button className={styles.directionsBtn} onClick={openInGoogleMaps}>
            🗺️ Google Maps
          </button>
          {userLocation && (
            <button
              className={styles.routeBtn}
              onClick={getAdvancedDirections}
              disabled={loading}
            >
              {loading ? "⏳" : "🚗"} Route
            </button>
          )}
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={userLocation ? 13 : 15}
        className={styles.map}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Salon marker */}
        {salonLocation && (
          <Marker position={salonLocation} icon={salonIcon}>
            <Popup>
              <div className={styles.popupContent}>
                <strong>{salonName}</strong>
                <p>{address}</p>
                <button onClick={openInGoogleMaps} className={styles.popupBtn}>
                  Get Directions
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div className={styles.popupContent}>
                <strong>Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#f59e0b"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
