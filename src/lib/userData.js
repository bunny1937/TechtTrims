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
      // First try to get authenticated user data
      const userToken = getAuthToken(); // ✅ CHANGE 1
      if (userToken) {
        const storedUserData = getUserData(); // ✅ Use sessionStorage instead
        if (storedUserData) {
          const userData = storedUserData;
          // Always preserve onboarding location data for authenticated users
          const onboardingData = localStorage.getItem("userOnboardingData");
          if (onboardingData) {
            try {
              const onboarding = JSON.parse(onboardingData);
              return {
                ...userData,
                location: onboarding.location || userData.location,
                preferences: {
                  ...userData.preferences,
                  ...onboarding.preferences,
                },
              };
            } catch (e) {
              return userData;
            }
          }
          return userData;
        }
      }

      // Fallback to onboarding data
      const onboardingData = localStorage.getItem("userOnboardingData");
      if (onboardingData) return JSON.parse(onboardingData);

      return null;
    } catch (error) {
      console.error("Error getting stored user data:", error);
      return null;
    }
  }

  static async fetchAndStoreUserData() {
    if (typeof window === "undefined") return null;

    const userToken = getAuthToken(); // ✅ CHANGE 2
    if (!userToken) return this.getStoredUserData();

    try {
      const response = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("API user data:", userData);

        // Always merge with onboarding data to preserve location and other fields
        const onboardingData = localStorage.getItem("userOnboardingData");
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
    // Clear user-specific data
    removeAuthToken(); // ✅ Clear cookie
    sessionStorage.removeItem("userData"); // Clear session data
    localStorage.removeItem("userPrefillData");
    localStorage.removeItem("userData");

    // Clear society/member data if exists
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("selectedSocietyId");

    // Keep onboarding data for future use
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
