// src/components/LocationPermissionModal.jsx
import { useState, useEffect } from "react";
import { Navigation, MapPin } from "lucide-react";
import styles from "../styles/LocationPermissionModal.module.css";
import dynamic from "next/dynamic";
const ManualLocationOverlay = dynamic(
  () => import("./Maps/ManualLocationOverlay"),
  { ssr: false },
);

export default function LocationPermissionModal({ show, onLocationGranted }) {
  const [phase, setPhase] = useState("request"); // 'request' | 'waiting' | 'denied' | 'off' | 'manual'
  const [showManual, setShowManual] = useState(false);

  // Don't render until show=true. Don't allow dismissal — loop until location received.
  if (!show) return null;

  const requestLocation = () => {
    setPhase("waiting");
    if (!navigator.geolocation) {
      setPhase("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sessionStorage.setItem(
          "userLocation",
          JSON.stringify({
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
          }),
        );
        onLocationGranted({ latitude, longitude });
      },
      (err) => {
        if (err.code === 1)
          setPhase("denied"); // PERMISSION_DENIED
        else if (err.code === 2)
          setPhase("off"); // POSITION_UNAVAILABLE — GPS off
        else setPhase("denied");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const handleManualConfirm = (location) => {
    sessionStorage.setItem(
      "userLocation",
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now(),
      }),
    );
    onLocationGranted({ latitude: location.lat, longitude: location.lng });
  };

  if (showManual) {
    return (
      <ManualLocationOverlay
        onConfirm={handleManualConfirm}
        onClose={() => setShowManual(false)}
      />
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <Navigation size={48} className={styles.icon} />
        <h2>Allow Location</h2>
        <p className={styles.safeMsg}>
          🔒 We don't store or access your location — it's only used to show
          nearby salons.
        </p>

        {phase === "request" && (
          <>
            <button onClick={requestLocation} className={styles.allowButton}>
              Allow Location Access
            </button>
            <button
              onClick={() => setShowManual(true)}
              className={styles.manualBtn}
            >
              Enter Location Manually
            </button>
          </>
        )}

        {phase === "waiting" && (
          <div className={styles.waitingBox}>
            <div className={styles.spinner} />
            <p>Getting your location…</p>
          </div>
        )}

        {/* GPS off — Android deep-link to settings (works in Chrome Android) */}
        {phase === "off" && (
          <>
            <p className={styles.errorMsg}>
              📍 Your device location (GPS) appears to be off. Please turn on
              location from your device settings.
            </p>
            <button
              className={styles.allowButton}
              onClick={() => {
                // Chrome Android supports this intent via a regular anchor; trigger settings link
                window.open("geo:0,0", "_blank");
                // After they return, retry
                setTimeout(() => {
                  setPhase("request");
                }, 1500);
              }}
            >
              Turn On Location
            </button>
            <button
              onClick={() => setShowManual(true)}
              className={styles.manualBtn}
            >
              Enter Location Manually
            </button>
          </>
        )}

        {phase === "denied" && (
          <>
            <p className={styles.errorMsg}>
              Location access was denied. Please enable it in your browser
              settings, then try again.
            </p>
            <button onClick={requestLocation} className={styles.allowButton}>
              Try Again
            </button>
            <button
              onClick={() => setShowManual(true)}
              className={styles.manualBtn}
            >
              Enter Location Manually
            </button>
          </>
        )}
      </div>
    </div>
  );
}
