import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../../styles/ManualLocationOverlay.module.css";
import L from "leaflet";
import { useMapEvents, useMap } from "react-leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});

export default function ManualLocationOverlay({ onConfirm, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [position, setPosition] = useState([20.5937, 78.9629]); // India

  useEffect(() => {
    if (!query.trim()) return;

    const t = setTimeout(searchLocation, 500);
    return () => clearTimeout(t);
  }, [query]);

  const InvalidateMapSize = () => {
    const map = useMap();

    useEffect(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }, [map]);

    return null;
  };

  const manualMarkerIcon = new L.Icon({
    iconUrl: "/leaflet/marker-icon.png",
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    shadowUrl: "/leaflet/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // 🔍 SEARCH USING NOMINATIM (FREE)
  const searchLocation = async () => {
    if (!query.trim()) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=8`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "TechTrims/1.0 (contact@techtrims.com)",
          Referer: "http://localhost:3000",
        },
      },
    );

    const data = await res.json();
    setResults(data);
  };

  function ClickToSetMarker({ setPosition }) {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    });

    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <input
          className={styles.searchInput}
          placeholder="Search city, area, pincode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchLocation()}
        />

        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((item) => (
              <div
                key={item.place_id}
                className={styles.resultItem}
                onClick={() => {
                  setPosition([+item.lat, +item.lon]);
                  setResults([]);
                }}
              >
                {item.display_name}
              </div>
            ))}
          </div>
        )}

        <div className={styles.mapContainer}>
          {L && (
            <MapContainer
              center={position}
              zoom={14}
              className={styles.leafletMap}
            >
              <InvalidateMapSize />
              <ClickToSetMarker setPosition={setPosition} />

              <TileLayer url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
              <Marker
                position={position}
                icon={manualMarkerIcon}
                draggable
                eventHandlers={{
                  click(e) {
                    map.flyTo(e.latlng, map.getZoom());
                    setPosition([e.latlng.lat, e.latlng.lng]);
                  },
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setPosition([lat, lng]);
                  },
                }}
              />
            </MapContainer>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.confirmBtn}
            onClick={() => onConfirm({ lat: position[0], lng: position[1] })}
          >
            Confirm Location
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
