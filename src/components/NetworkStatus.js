import { useState, useEffect } from "react";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export default function NetworkStatus() {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState("offline");

  useEffect(() => {
    if (!isOnline) {
      setNotificationType("offline");
      setShowNotification(true);
    } else if (isSlowConnection) {
      setNotificationType("slow");
      setShowNotification(true);
    } else {
      const timer = setTimeout(() => setShowNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSlowConnection]);

  if (!showNotification) return null;

  const getNotificationConfig = () => {
    switch (notificationType) {
      case "offline":
        return {
          icon: "📡",
          title: "You're Offline",
          message: "Check your internet connection",
          bgStyle: { backgroundColor: "#ef4444" }, // ← DIRECT INLINE STYLE
          textStyle: { color: "#ffffff" },
        };
      case "slow":
        return {
          icon: "⚠️",
          title: "Slow Connection",
          message: `Connection: ${connectionType.toUpperCase()}`,
          bgStyle: { backgroundColor: "#f59e0b" },
          textStyle: { color: "#000000" },
        };
      default:
        return {
          icon: "✅",
          title: "Back Online",
          message: "Connection restored",
          bgStyle: { backgroundColor: "#10b981" },
          textStyle: { color: "#ffffff" },
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <>
      {/* Mobile-first notification bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          ...config.bgStyle, // ← INLINE STYLE
          ...config.textStyle,
          textAlign: "center",
          transform: showNotification ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: "18px" }}>{config.icon}</span>
          <span>{config.title}</span>
          <span
            style={{
              display: "none",
              "@media (min-width: 640px)": { display: "inline" },
            }}
          >
            — {config.message}
          </span>
        </div>
      </div>

      {/* Desktop floating notification */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 50,
          display: "none",
          "@media (min-width: 640px)": { display: "block" },
          transform: showNotification
            ? "translateX(0) opacity(1)"
            : "translateX(-100%) opacity(0)",
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            ...config.bgStyle,
            ...config.textStyle,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "320px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>{config.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                {config.title}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>
                {config.message}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            style={{
              marginLeft: "8px",
              fontSize: "12px",
              opacity: 0.7,
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}
