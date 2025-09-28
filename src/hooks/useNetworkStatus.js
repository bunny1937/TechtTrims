import { useState, useEffect } from "react";

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState("unknown");

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Get connection info if available
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    const updateConnectionInfo = () => {
      if (connection) {
        setConnectionType(connection.effectiveType || "unknown");
        // Consider 2g and slow-2g as slow connections
        setIsSlowConnection(
          connection.effectiveType === "2g" ||
            connection.effectiveType === "slow-2g" ||
            connection.downlink < 1.5 // Less than 1.5 Mbps
        );
      }
    };

    // Test connection speed
    const testConnectionSpeed = async () => {
      if (!navigator.onLine) return;

      try {
        const startTime = Date.now();
        const response = await fetch("/api/ping", {
          method: "HEAD",
          cache: "no-cache",
        });
        const endTime = Date.now();
        const latency = endTime - startTime;

        // Consider connection slow if latency > 3 seconds or request fails
        setIsSlowConnection(latency > 3000 || !response.ok);
      } catch (error) {
        setIsSlowConnection(true);
      }
    };

    // Event listeners
    const handleOnline = () => {
      setIsOnline(true);
      testConnectionSpeed();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSlowConnection(false);
    };

    const handleConnectionChange = () => updateConnectionInfo();

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    // Initial checks
    updateConnectionInfo();
    if (navigator.onLine) {
      testConnectionSpeed();
    }

    // Periodic speed test (every 30 seconds when online)
    const speedTestInterval = setInterval(() => {
      if (navigator.onLine) {
        testConnectionSpeed();
      }
    }, 30000);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
      clearInterval(speedTestInterval);
    };
  }, []);

  return { isOnline, isSlowConnection, connectionType };
}
