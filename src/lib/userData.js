// lib/userData.js
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUserData,
  setUserData,
} from "./cookieAuth";

export class UserDataManager {
  static getStoredUserData() {
    if (typeof window === "undefined") return null;
    try {
      const userToken = getAuthToken();
      if (userToken) {
        const storedUserData = getUserData();

        // Use sessionStorage to keep onboarding data and location with fallback
        const onboardingDataStr = sessionStorage.getItem("userOnboardingData");
        let onboarding = null;
        if (onboardingDataStr) {
          onboarding = JSON.parse(onboardingDataStr);
        }

        // Fallback: check localStorage cached location too (persist across reloads)
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

  static async fetchAndStoreUserData() {
    if (typeof window === "undefined") return null;

    const userToken = getAuthToken();
    if (!userToken) return this.getStoredUserData();

    try {
      const response = await fetch("/api/user/profile", {
        credentials: "include", // ✅ Include HttpOnly cookies
      });

      if (response.ok) {
        const userData = await response.json();

        console.log("API user data:", userData);

        // ✅ Always merge with onboarding data to preserve location and other fields
        const onboardingData = sessionStorage.getItem("userOnboardingData");

        console.log("Raw onboarding data:", onboardingData);

        let mergedData = userData;
        if (onboardingData) {
          try {
            const onboarding = JSON.parse(onboardingData);
            console.log("Parsed onboarding data:", onboarding);

            // Merge onboarding data with user data properly
            mergedData = {
              ...userData,
              // Always preserve onboarding location and other critical data
              location: onboarding.location || userData.location,
              gender: userData.gender || onboarding.gender,
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
            console.log("Merged data result:", mergedData);
          } catch (parseError) {
            console.error("Error parsing onboarding data:", parseError);
            mergedData = userData;
          }
        }

        // Store the merged data in sessionStorage
        setUserData(mergedData); // ✅ Use secure storage

        // Update booking history after login
        await this.syncBookingHistory();

        return mergedData;
      } else {
        // If API fails, return stored data
        return this.getStoredUserData();
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      return this.getStoredUserData();
    }
  }

  static async syncBookingHistory() {
    const userToken = getAuthToken(); // ✅ CHANGE 3
    if (!userToken) return;

    try {
      await fetch("/api/user/sync-booking-history", {
        method: "POST",
        headers: { Authorization: `Bearer ${userToken}` },
      });
    } catch (error) {
      console.error("Error syncing booking history:", error);
    }
  }
  static clearUserData() {
    if (typeof window === "undefined") return;

    // ✅ Clear user-specific data
    removeAuthToken(); // Clears HttpOnly cookie via API
    localStorage.removeItem("userPrefillData");

    // ✅ Clear session storage EXCEPT location
    const storedLocation = sessionStorage.getItem("userLocation");
    sessionStorage.removeItem("userOnboardingData");
    sessionStorage.removeItem("hasOnboarded");
    sessionStorage.removeItem("userData");

    // ✅ Restore location after clearing
    if (storedLocation) {
      sessionStorage.setItem("userLocation", storedLocation);
    }

    console.log("User data cleared successfully");
  }

  static clearSalonData() {
    if (typeof window === "undefined") return;
    // Clear salon-specific data
    localStorage.removeItem("salonToken");
    localStorage.removeItem("salonSession");
    localStorage.removeItem("ownerToken");

    console.log("Salon data cleared successfully");
  }

  static clearAllData() {
    if (typeof window === "undefined") return;
    // Nuclear option - clear everything except hasOnboarded
    removeAuthToken(); // ✅ Clear cookie
    sessionStorage.clear();
    localStorage.removeItem("salonToken");
    localStorage.removeItem("salonSession");
    localStorage.removeItem("ownerToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    const hasOnboarded = localStorage.getItem("hasOnboarded");
    const userOnboardingData = localStorage.getItem("userOnboardingData");

    localStorage.clear();

    // Restore onboarding data
    if (hasOnboarded) localStorage.setItem("hasOnboarded", hasOnboarded);
    if (userOnboardingData)
      localStorage.setItem("userOnboardingData", userOnboardingData);

    console.log("All data cleared except onboarding");
  }

  static isUserLoggedIn() {
    if (typeof window === "undefined") return false;
    const userToken = getAuthToken(); // ✅ CHANGE 4
    const authenticatedUserData = getUserData();
    const salonToken = localStorage.getItem("salonToken");
    const salonSession = localStorage.getItem("salonSession");
    // User is logged in if ANY auth token exists
    return !!(userToken || authenticatedUserData || salonToken || salonSession);
  }

  static preserveUserInfoForBooking(bookingData) {
    if (typeof window === "undefined") return;
    const currentUser = this.getStoredUserData();
    if (currentUser) {
      // Store prefill data with user info for feedback
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
    const userToken = getAuthToken(); // ✅ CHANGE 5
    const authenticatedUserData = getUserData();
    const salonToken = localStorage.getItem("salonToken");
    const salonSession = localStorage.getItem("salonSession");
    // Check ANY authentication
    return !!(userToken || authenticatedUserData || salonToken || salonSession);
  }

  static hasOnboarded() {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hasOnboarded") === "true";
  }
}
