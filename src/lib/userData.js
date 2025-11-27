import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUserData,
  setUserData,
} from "./cookieAuth";

// 🔥 FIXED: Add retry prevention
let isRefreshing = false;
let refreshPromise = null;

// 🔥 NEW: Automatic Token Refresh Helper with retry prevention
async function tryRefreshToken() {
  if (isRefreshing) {
    console.log("⏳ Already refreshing, waiting...");
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      console.log("🔄 Calling /api/auth/refresh...");
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      console.log("🔄 Refresh response status:", res.status);
      const data = await res.json();
      console.log("🔄 Refresh response data:", data);

      if (!res.ok) {
        console.warn(`❌ Refresh failed: ${data.code || data.message}`);

        // Clear auth state if token is truly invalid
        if (
          [
            "NO_REFRESH_TOKEN",
            "INVALID_TOKEN",
            "SESSION_EXPIRED",
            "CORRUPTED_SESSION",
            "TOKEN_MISMATCH",
            "USER_INACTIVE",
          ].includes(data.code)
        ) {
          console.log("❌ Fatal auth error, clearing and redirecting...");
          await UserDataManager.clearUserData();
          window.location.href = "/auth/user/login";
        }

        return false;
      }

      console.log("✅ Token refreshed successfully");
      return true;
    } catch (err) {
      console.error("❌ Refresh request failed:", err);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class UserDataManager {
  static getStoredUserData() {
    if (typeof window === "undefined") return null;

    try {
      const userToken = getAuthToken();

      if (userToken) {
        const storedUserData = getUserData();
        const onboardingDataStr = sessionStorage.getItem("userOnboardingData");
        let onboarding = onboardingDataStr
          ? JSON.parse(onboardingDataStr)
          : null;

        let cachedLocation = null;
        try {
          cachedLocation = JSON.parse(
            localStorage.getItem("cachedUserLocation")
          );
        } catch {}

        return {
          ...storedUserData,
          location:
            onboarding?.location || cachedLocation || storedUserData.location,
          preferences: {
            ...storedUserData.preferences,
            ...(onboarding?.preferences || {}),
          },
        };
      }
    } catch (e) {
      return null;
    }
  }

  // 🔥 UPDATED: Better retry logic with single attempt
  static async fetchAndStoreUserData(skipRefresh = false) {
    if (typeof window === "undefined") return null;

    const userToken = getAuthToken();
    if (!userToken) {
      console.warn("⚠ No auth token found");
      return this.getStoredUserData();
    }

    async function requestProfile() {
      return fetch("/api/user/profile", {
        credentials: "include",
      });
    }

    try {
      let response = await requestProfile();

      // ❗ If token expired → try refresh ONCE
      if (response.status === 401 && !skipRefresh) {
        console.warn("⚠ Access token expired — trying refresh...");
        const refreshed = await tryRefreshToken();

        if (refreshed) {
          // Retry the profile request with new token
          response = await requestProfile();

          if (!response.ok) {
            console.error("❌ Profile request still failed after refresh");
            return this.getStoredUserData();
          }
        } else {
          console.warn("❌ Refresh failed, clearing session.");
          await this.clearUserData();
          return null;
        }
      } else if (response.status === 401 && skipRefresh) {
        // Already tried refresh, don't retry
        console.warn("❌ Auth failed after refresh attempt");
        await this.clearUserData();
        return null;
      }

      if (response.ok) {
        const userData = await response.json();
        const onboardingData = sessionStorage.getItem("userOnboardingData");
        let mergedData = userData;

        if (onboardingData) {
          try {
            const onboarding = JSON.parse(onboardingData);
            mergedData = {
              ...userData,
              location: onboarding.location || userData.location,
              gender: userData.gender || onboarding.gender || "other",
              age: userData.age || onboarding.age || null,
              dateOfBirth:
                userData.dateOfBirth || onboarding.dateOfBirth || null,
              phoneNumber:
                userData.phoneNumber ||
                userData.phone ||
                onboarding.phoneNumber,
              phone: userData.phone || onboarding.phoneNumber,
              mobile: userData.mobile || onboarding.phoneNumber,
              preferences: {
                ...userData.preferences,
                ...onboarding.preferences,
              },
            };
          } catch {}
        }

        setUserData(mergedData);
        await this.syncBookingHistory();
        return mergedData;
      }

      return this.getStoredUserData();
    } catch (error) {
      console.error("❌ fetchAndStoreUserData error:", error);
      return this.getStoredUserData();
    }
  }

  // 🔥 UPDATED: Auto-refresh added here too
  static async syncBookingHistory() {
    const userToken = getAuthToken();
    if (!userToken) return;

    async function syncRequest() {
      return fetch("/api/user/sync-booking-history", {
        method: "POST",
        credentials: "include",
      });
    }

    try {
      let response = await syncRequest();

      if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          return await syncRequest();
        }
      }
    } catch (error) {
      console.error("❌ Sync booking history error:", error);
    }
  }

  static clearUserData() {
    if (typeof window === "undefined") return;

    removeAuthToken();
    localStorage.removeItem("userPrefillData");

    const storedLocation = sessionStorage.getItem("userLocation");
    sessionStorage.removeItem("userOnboardingData");
    sessionStorage.removeItem("hasOnboarded");
    sessionStorage.removeItem("userData");

    if (storedLocation) {
      sessionStorage.setItem("userLocation", storedLocation);
    }
  }

  static clearSalonData() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("salonToken");
    localStorage.removeItem("salonSession");
    localStorage.removeItem("ownerToken");
  }

  static clearAllData() {
    if (typeof window === "undefined") return;

    removeAuthToken();
    sessionStorage.clear();
    localStorage.removeItem("salonToken");
    localStorage.removeItem("salonSession");
    localStorage.removeItem("ownerToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");

    const hasOnboarded = localStorage.getItem("hasOnboarded");
    const userOnboardingData = localStorage.getItem("userOnboardingData");
    localStorage.clear();

    if (hasOnboarded) localStorage.setItem("hasOnboarded", hasOnboarded);
    if (userOnboardingData)
      localStorage.setItem("userOnboardingData", userOnboardingData);
  }

  static isUserLoggedIn() {
    if (typeof window === "undefined") return false;

    const userToken = getAuthToken();
    const authenticatedUserData = getUserData();
    const salonToken = localStorage.getItem("salonToken");
    const salonSession = localStorage.getItem("salonSession");

    return !!(userToken || authenticatedUserData || salonToken || salonSession);
  }

  static preserveUserInfoForBooking(bookingData) {
    if (typeof window === "undefined") return;

    const currentUser = this.getStoredUserData();
    if (currentUser) {
      const prefillData = {
        name: currentUser.name || "Anonymous",
        phone: currentUser.phone || "",
        lastBookings: {
          salonId: bookingData.salonId,
          service: bookingData.service,
          date: bookingData.date,
          time: bookingData.time,
        },
        timestamp: Date.now(),
      };
      localStorage.setItem("userPrefillData", JSON.stringify(prefillData));
    }
  }

  static isLoggedIn() {
    if (typeof window === "undefined") return false;

    const userToken = getAuthToken();
    const authenticatedUserData = getUserData();
    const salonToken = localStorage.getItem("salonToken");
    const salonSession = localStorage.getItem("salonSession");

    return !!(userToken || authenticatedUserData || salonToken || salonSession);
  }

  static hasOnboarded() {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hasOnboarded") === "true";
  }
}
