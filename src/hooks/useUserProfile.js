// src/hooks/useUserProfile.js

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { UserDataManager } from "../lib/userData";
import { getAuthToken } from "../lib/cookieAuth";

/**
 * Hook to manage user profile, authentication, and onboarding status
 * Handles:
 * - User authentication check
 * - Profile data fetching and caching
 * - Onboarding redirect
 * - Session management
 */
export function useUserProfile() {
  const router = useRouter();
  const [profileUser, setProfileUser] = useState(null);
  const [userOnboarding, setUserOnboarding] = useState(() => {
    if (typeof window === "undefined") return null;

    const onboardingData = sessionStorage.getItem("userOnboardingData");
    if (onboardingData) {
      try {
        return JSON.parse(onboardingData);
      } catch (e) {
        console.error("Failed to parse onboarding data:", e);
        return null;
      }
    }
    return null;
  });
  const [isUserDataReady, setIsUserDataReady] = useState(false);

  // Prevent double initialization
  const initializedRef = useRef(false);

  /**
   * Initialize user profile and check onboarding status
   */
  const initializeUser = async () => {
    if (initializedRef.current) return;
    if (typeof window === "undefined") return;

    // Check if user has completed onboarding
    const hasOnboarded = sessionStorage.getItem("hasOnboarded");
    if (!hasOnboarded) {
      router.push("/auth/login");
      return;
    }

    initializedRef.current = true;

    // Check for authentication token
    const userToken = getAuthToken();

    if (userToken) {
      // Try to load cached profile first for instant display
      const cachedUser = sessionStorage.getItem("userProfile");
      if (cachedUser) {
        try {
          const parsedUser = JSON.parse(cachedUser);
          setProfileUser(parsedUser);
        } catch (e) {
          console.error("Failed to parse cached user profile:", e);
        }
      }

      // Fetch fresh user data in background
      try {
        const freshUser = await UserDataManager.fetchAndStoreUserData();
        if (freshUser) {
          setProfileUser(freshUser);
          // Update cache
          sessionStorage.setItem("userProfile", JSON.stringify(freshUser));
        }
      } catch (error) {
        console.error("Failed to fetch fresh user data:", error);
        // Keep using cached data if fetch fails
      }
    } else {
      // No token - user needs to login
      console.warn("No authentication token found");
    }

    setIsUserDataReady(true);
  };

  /**
   * Refresh user profile data
   */
  const refreshUserProfile = async () => {
    try {
      const freshUser = await UserDataManager.fetchAndStoreUserData();
      if (freshUser) {
        setProfileUser(freshUser);
        sessionStorage.setItem("userProfile", JSON.stringify(freshUser));
      }
    } catch (error) {
      console.error("Failed to refresh user profile:", error);
    }
  };

  /**
   * Update onboarding data
   */
  const updateOnboarding = (data) => {
    setUserOnboarding(data);
    if (data) {
      sessionStorage.setItem("userOnboardingData", JSON.stringify(data));
    } else {
      sessionStorage.removeItem("userOnboardingData");
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeUser();
  }, []);

  // Listen for onboarding data changes from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e) => {
      if (e.key === "userOnboardingData" && e.newValue) {
        try {
          setUserOnboarding(JSON.parse(e.newValue));
        } catch (error) {
          console.error(
            "Failed to parse onboarding data from storage event:",
            error,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    profileUser,
    userOnboarding,
    isUserDataReady,
    initializeUser,
    refreshUserProfile,
    updateOnboarding,
    initializedRef, // Expose for external checks if needed
  };
}
