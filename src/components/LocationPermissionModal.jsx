import { Navigation } from "lucide-react";
import styles from "../styles/LocationPermissionModal.module.css";

export default function LocationPermissionModal({ show, onAllow, onDeny }) {
  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <Navigation size={48} className={styles.icon} />
        <h2>Enable Location</h2>
        <p>
          We need your location to show nearby salons and calculate distances.
        </p>
        <div className={styles.actions}>
          <button onClick={onAllow} className={styles.allowButton}>
            Enable Location
          </button>
          <button onClick={onDeny} className={styles.denyButton}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
