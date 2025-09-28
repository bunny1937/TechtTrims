import { useState, useEffect } from "react";
import useNetworkStatus from "../hooks/useNetworkStatus";

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
      // Hide notification when connection is good, but with delay for better UX
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 2000);
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
          bgColor: "bg-red-500",
          textColor: "text-white",
        };
      case "slow":
        return {
          icon: "🐌",
          title: "Slow Connection",
          message: `Connection: ${connectionType.toUpperCase()}`,
          bgColor: "bg-yellow-500",
          textColor: "text-black",
        };
      default:
        return {
          icon: "✅",
          title: "Back Online",
          message: "Connection restored",
          bgColor: "bg-green-500",
          textColor: "text-white",
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <>
      {/* Mobile-first notification bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-100 ${config.bgColor} ${
          config.textColor
        } px-4 py-3 text-center transform transition-transform duration-300 ${
          showNotification ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <span className="text-lg">{config.icon}</span>
          <span>{config.title}</span>
          <span className="hidden sm:inline">- {config.message}</span>
        </div>
      </div>

      {/* Desktop floating notification */}
      {/* <div
        className={`fixed top-4 left-4 z-50 hidden sm:block transform transition-all duration-300 ${
          showNotification
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0"
        }`}
      >
        <div
          className={`${config.bgColor} ${config.textColor} rounded-lg shadow-lg p-4 max-w-xs`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <div className="font-semibold text-sm">{config.title}</div>
              <div className="text-xs opacity-90">{config.message}</div>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="ml-2 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      </div> */}
    </>
  );
}
