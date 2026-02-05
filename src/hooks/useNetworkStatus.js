import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [connectionType, setConnectionType] = useState("4g");

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const checkConnectionSpeed = () => {
      if ("connection" in navigator) {
        // @ts-ignore
        const connection = navigator.connection || navigator.webkitConnection;

        if (connection) {
          const effectiveType = connection.effectiveType || "4g";
          setConnectionType(effectiveType);

          // ONLY 2G OR SLOWER - NOT 3G
          setIsSlowConnection(["slow-2g", "2g"].includes(effectiveType));
        }
      }
    };

    updateOnlineStatus();
    checkConnectionSpeed();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // @ts-ignore
    const connection = navigator.connection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener("change", checkConnectionSpeed);
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (connection) {
        connection.removeEventListener("change", checkConnectionSpeed);
      }
    };
  }, []);

  return { isOnline, isSlowConnection, connectionType };
}

export default useNetworkStatus;
