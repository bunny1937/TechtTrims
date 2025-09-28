// lib/userData.js
export class UserDataManager {
  static getStoredUserData() {
    if (typeof window === "undefined") return null;

    try {
      // First try to get authenticated user data
      const userToken = localStorage.getItem("userToken");
      if (userToken) {
        const storedUserData = localStorage.getItem("authenticatedUserData");
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
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

    const userToken = localStorage.getItem("userToken");
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

        // Store the merged data
        localStorage.setItem(
          "authenticatedUserData",
          JSON.stringify(mergedData)
        );

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
    const userToken = localStorage.getItem("userToken");
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
    localStorage.removeItem("userToken");
    localStorage.removeItem("authenticatedUserData");
    localStorage.removeItem("userPrefillData");
    // Keep onboarding data for future use
  }

  static isUserLoggedIn() {
    if (typeof window === "undefined") return false;
    const userToken = localStorage.getItem("userToken");
    const authenticatedUserData = localStorage.getItem("authenticatedUserData");
    return !!(userToken && authenticatedUserData);
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
    return !!localStorage.getItem("userToken");
  }

  static hasOnboarded() {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("hasOnboarded") === "true";
  }
}
