// components/LocationCheckOverlay.js
import LocationPermissionModal from "../LocationPermissionModal";
import styles from "../../styles/Home.module.css";

export default function LocationCheckOverlay({
  locationCheckStatus,
  handleGetLocation,
  setActiveOverlay,
  handleRetry,
  loadNearbySalons,
  setIsLoading,
  userGender,
}) {
  const handleLocationGranted = ({ latitude, longitude }) => {
    setIsLoading(true);
    loadNearbySalons(latitude, longitude, userGender);
    setActiveOverlay(null);
  };
  return (
    <div className={styles.locationCheckOverlay}>
      <LocationPermissionModal
        show={true}
        onLocationGranted={handleLocationGranted}
      />
      <div className={styles.locationCheckBox}>
        <h2 className={styles.locationCheckTitle}>📍 Location Required</h2>
        <p className={styles.locationCheckSubtitle}>
          We need your location to find nearby salons
        </p>

        <div className={styles.statusList}>
          <div
            className={`${styles.statusItem} ${
              locationCheckStatus.deviceLocation
                ? styles.statusSuccess
                : styles.statusPending
            }`}
          >
            <span className={styles.statusIcon}>
              {locationCheckStatus.deviceLocation ? "✅" : "⏳"}
            </span>
            <span className={styles.statusText}>Device Location</span>
          </div>

          <div
            className={`${styles.statusItem} ${
              locationCheckStatus.locationAccuracy
                ? styles.statusSuccess
                : styles.statusPending
            }`}
          >
            <span className={styles.statusIcon}>
              {locationCheckStatus.locationAccuracy ? "✅" : "⏳"}
            </span>
            <span className={styles.statusText}>Location Accuracy</span>
          </div>

          <div
            className={`${styles.statusItem} ${
              locationCheckStatus.hasCoordinates
                ? styles.statusSuccess
                : styles.statusPending
            }`}
          >
            <span className={styles.statusIcon}>
              {locationCheckStatus.hasCoordinates ? "✅" : "⏳"}
            </span>
            <span className={styles.statusText}>Location Data Received</span>
          </div>
        </div>

        {locationCheckStatus.coordinates && (
          <div className={styles.coordsDisplay}>
            <p>📌 Lat: {locationCheckStatus.coordinates.lat.toFixed(6)}</p>
            <p>📌 Lng: {locationCheckStatus.coordinates.lng.toFixed(6)}</p>
          </div>
        )}

        <div className={styles.locationCheckActions}>
          {!locationCheckStatus.hasCoordinates ? (
            <>
              <button
                onClick={handleGetLocation}
                className={styles.getLocationBtn}
              >
                📍 Get My Location
              </button>

              <button
                onClick={() => setActiveOverlay("manual")}
                className={styles.manualLocationBtn}
              >
                🗺️ Enter Location Manually
              </button>

              <button onClick={handleRetry} className={styles.retryBtn}>
                🔄 Retry
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setActiveOverlay(null);
                setIsLoading(true);
                loadNearbySalons(
                  locationCheckStatus.coordinates.lat,
                  locationCheckStatus.coordinates.lng,
                  userGender || "all",
                ).finally(() => setIsLoading(false));
              }}
              className={styles.continueBtn}
            >
              ✨ Continue to Salons
            </button>
          )}
        </div>

        {!locationCheckStatus.deviceLocation && (
          <div className={styles.helpText}>
            <p>⚠️ Location is turned off</p>
            <p className={styles.helpSubtext}>
              Please enable location in your device settings, then tap
              &ldquo;Get My Location&ldquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
