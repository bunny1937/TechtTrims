import { useState } from "react";
import useNetworkStatus from "../hooks/useNetworkStatus";

export default function RetryButton({ onRetry, disabled = false }) {
  const { isOnline } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!isOnline || disabled) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={!isOnline || disabled || isRetrying}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        !isOnline || disabled
          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
          : "bg-blue-500 hover:bg-blue-600 text-white active:scale-95"
      }`}
    >
      {isRetrying ? (
        <span className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          Retrying...
        </span>
      ) : !isOnline ? (
        "📡 Offline"
      ) : (
        "🔄 Retry"
      )}
    </button>
  );
}
