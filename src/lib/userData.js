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
          return JSON.parse(storedUserData);
        }
      }

      // Fallback to onboarding data
      const onboardingData = localStorage.getItem("userOnboardingData");
      if (onboardingData) {
        return JSON.parse(onboardingData);
      }

      return null;
    } catch (error) {
      console.error("Error getting stored user data:", error);
      return null;
    }
  }

  static async fetchAndStoreUserData() {
    if (typeof window === "undefined") return null;

    const userToken = localStorage.getItem("userToken");
    if (!userToken) {
      return this.getStoredUserData();
    }

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

            // Start with API data, then carefully add onboarding fields that are missing
            mergedData = {
              ...userData,
              // Only override if API data doesn't have these fields or they're undefined/null
              ...(onboarding.location &&
                !userData.location && { location: onboarding.location }),
              ...(onboarding.gender &&
                !userData.gender && { gender: onboarding.gender }),
              // Always preserve onboarding location if it exists (API likely doesn't have coordinates)
              location: onboarding.location || userData.location,
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

  static clearUserData() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("userToken");
    localStorage.removeItem("authenticatedUserData");
    // Keep onboarding data for future use
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
