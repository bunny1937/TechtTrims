import { useState, useEffect } from "react";

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState("unknown");

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    const updateConnectionInfo = () => {
      if (connection) {
        setConnectionType(connection.effectiveType || "unknown");
        setIsSlowConnection(
          ["2g", "slow-2g"].includes(connection.effectiveType) ||
            connection.downlink < 1.5
        );
      }
    };

    const testConnectionSpeed = async () => {
      if (!navigator.onLine) return;
      try {
        const samples = [];
        for (let i = 0; i < 2; i++) {
          const start = Date.now();
          const response = await fetch("/api/ping", {
            method: "HEAD",
            cache: "no-cache",
          });
          const latency = Date.now() - start;
          if (!response.ok) throw new Error();
          samples.push(latency);
        }
        const avgLatency = samples.reduce((a, b) => a + b, 0) / samples.length;
        setIsSlowConnection(avgLatency > 5000);
      } catch {
        setIsSlowConnection(true);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(testConnectionSpeed, 3000); // delay first test
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSlowConnection(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (connection) {
      connection.addEventListener("change", updateConnectionInfo);
    }

    updateConnectionInfo();
    setTimeout(() => {
      if (navigator.onLine) testConnectionSpeed();
    }, 3000);

    const interval = setInterval(() => {
      if (navigator.onLine) testConnectionSpeed();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection)
        connection.removeEventListener("change", updateConnectionInfo);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isSlowConnection, connectionType };
}
