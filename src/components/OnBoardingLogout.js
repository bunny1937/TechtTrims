import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { showConfirm, showSuccess } from "../lib/toast";

export default function OnboardingLogoutButton() {
  const [showButton, setShowButton] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkOnboardingStatus = () => {
      const hasOnboarded = localStorage.getItem("hasOnboarded");
      const userToken = localStorage.getItem("userToken");
      const authenticatedUserData = localStorage.getItem(
        "authenticatedUserData"
      );
      const onboardingDataStr = localStorage.getItem("userOnboardingData");

      // Show button only if onboarded but not logged in
      const isOnboarded = hasOnboarded === "true";
      const isLoggedIn = !!(userToken || authenticatedUserData);

      setShowButton(isOnboarded && !isLoggedIn);

      // Parse onboarding data for display
      if (onboardingDataStr) {
        try {
          setOnboardingData(JSON.parse(onboardingDataStr));
        } catch (e) {
          setOnboardingData(null);
        }
      }
    };

    checkOnboardingStatus();
    const handleStorageChange = () => checkOnboardingStatus();
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(checkOnboardingStatus, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleClearOnboarding = () => {
    const message = onboardingData?.name
      ? `Clear data for "${onboardingData.name}" and start fresh?`
      : "Clear onboarding data and start fresh?";

    if (showConfirm(message)) {
      // Clear onboarding specific data
      localStorage.removeItem("hasOnboarded");
      localStorage.removeItem("userOnboardingData");
      localStorage.removeItem("userPrefillData");

      showSuccess("Onboarding data cleared! You can now start fresh.");
      router.push("/onboarding");
    }
  };

  if (!showButton) return null;

  return (
    <div>
      <div className="bg-white rounded-md shadow-lg border border-gray-200 p-8 max-w-xs">
        {onboardingData && (
          <div className="text-xs text-gray-600 mb-2">
            user:
            <span className="font-semibold text-gray-800">
              {onboardingData.name}
            </span>
          </div>
        )}
        <button
          onClick={handleClearOnboarding}
          className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}
