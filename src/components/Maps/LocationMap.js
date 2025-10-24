import React, { useEffect, useState, useRef } from "react";

import { Navigation } from "lucide-react";
import styles from "../../styles/LocationMap.module.css";

const LocationMap = ({ location, userLocation, salonName, address, phone }) => {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapInstanceRef = useRef(null); // ADD THIS LINE

  useEffect(() => {
    if (!location?.coordinates || !userLocation) return;

    const [lng, lat] = location.coordinates;

    // Calculate distance
    const R = 6371;
    const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(dist.toFixed(1));
    setDuration(Math.round(dist * 3));
  }, [location, userLocation]);

  useEffect(() => {
    if (typeof window === "undefined" || !location?.coordinates) return;

    let mapInstance = null;
    let timeoutId = null;

    const loadMap = async () => {
      try {
        timeoutId = setTimeout(async () => {
          const L = await import("leaflet");
          await import("leaflet/dist/leaflet.css");

          const mapContainer = document.getElementById("salon-detail-map");

          if (!mapContainer || mapContainer._leaflet_id) return;

          const [lng, lat] = location.coordinates;

          mapInstance = L.map(mapContainer).setView([lat, lng], 16);
          mapInstanceRef.current = mapInstance; // ADD THIS LINE

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
          }).addTo(mapInstance);

          // Custom salon marker icon - bigger and more visible
          const salonIcon = L.divIcon({
            html: `<div style="font-size: 48px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">📍</div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -50], // Move popup 50px above the pin
            className: "fixed-marker-icon",
          });

          // Add salon marker with offset popup
          L.marker([lat, lng], { icon: salonIcon })
            .addTo(mapInstance)
            .bindPopup(`<b>${salonName}</b><br>${address}`, {
              offset: [0, -1], // Additional offset
              closeButton: true,
              autoClose: false,
              closeOnClick: false,
            })
            .openPopup();

          // Add user location marker if available
          if (userLocation) {
            const userIcon = L.divIcon({
              html: `<div style="font-size: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">📍</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              className: "fixed-user-icon",
            });

            L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
              .addTo(mapInstance)
              .bindPopup("<b>Your Location</b>");

            // Draw route line
            L.polyline(
              [
                [userLocation.lat, userLocation.lng],
                [lat, lng],
              ],
              { color: "#f59e0b", weight: 3, opacity: 0.7, dashArray: "10, 5" }
            ).addTo(mapInstance);
          }

          setMapLoaded(true);
        }, 100);
      } catch (error) {
        console.error("Map loading error:", error);
      }
    };

    loadMap();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (mapInstance) {
        try {
          mapInstance.remove();
          mapInstanceRef.current = null; // ADD THIS LINE
        } catch (e) {
          console.error("Map cleanup error:", e);
        }
      }
    };
  }, [location, userLocation, salonName, address]);

  const openInGoogleMaps = () => {
    if (!location?.coordinates) return;
    const [lng, lat] = location.coordinates;
    let url;

    if (userLocation) {
      url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    window.open(url, "_blank");
  };

  const centerOnUser = () => {
    if (!userLocation || !mapInstanceRef.current) return;

    setLocating(true);

    // Use the existing map instance
    mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, {
      animate: true,
      duration: 1.5,
    });

    setTimeout(() => setLocating(false), 1500);
  };

  if (!location?.coordinates) {
    return null;
  }

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <div className={styles.headerInfo}>
          <h3 className={styles.mapTitle}>{salonName || "Salon"}</h3>
          <p className={styles.address}>{address || "Address not available"}</p>
          {phone && <p className={styles.phone}>{phone}</p>}
          {distance && (
            <div className={styles.routeInfo}>
              <span>📍 {distance} km</span>
              {duration && <span> 🕐 ~{duration} min</span>}
              <button
                className={styles.directionsButton}
                onClick={openInGoogleMaps}
              >
                <Navigation size={18} />
                Get Directions
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "10px",
          height: "300px",
        }}
      >
        <div id="salon-detail-map" className={styles.mapWrapper}></div>

        {/* My Location Button */}
        {userLocation && (
          <button
            className={styles.liveLocationBtn}
            onClick={centerOnUser}
            disabled={locating}
            style={{ zIndex: 9999 }}
          >
            <span className={locating ? styles.spinning : ""}>📍</span>
            {locating ? "Locating..." : "My Location"}
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationMap;
