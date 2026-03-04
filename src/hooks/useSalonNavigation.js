// src/hooks/useSalonNavigation.js

import { useState } from "react";
import { useRouter } from "next/router";

/**
 * Hook to handle salon card navigation with loading state
 * Handles:
 * - Navigate to salon detail page
 * - Show loading state during navigation
 * - Support different booking modes (walk-in/pre-book)
 */
export function useSalonNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  /**
   * Navigate to salon detail page
   * @param {string} salonId - Salon ID
   * @param {string} mode - Booking mode ('walk-in' or 'pre-book')
   */
  const navigateToSalon = (salonId, mode = "walk-in") => {
    if (!salonId) {
      console.error("Salon ID is required for navigation");
      return;
    }

    setIsNavigating(true);
    router.push(`/salons/${salonId}?mode=${mode}`);
  };

  /**
   * Reset navigation state (useful for error recovery)
   */
  const resetNavigation = () => {
    setIsNavigating(false);
  };

  return {
    navigateToSalon,
    isNavigating,
    resetNavigation,
  };
}
