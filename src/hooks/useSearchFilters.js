// src/hooks/useSearchFilters.js

import { useState, useEffect } from "react";

/**
 * Non-linear radius values for slider
 * Index 0-25 maps to these kilometer values
 */
export const radiusMarks = [
  1, 3, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 400, 500, 600, 700, 800,
  900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
];

/**
 * Hook to manage search and filter states
 * Includes debounced search for performance
 */
export function useSearchFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [searchRadius, setSearchRadius] = useState(10000); // 10km default

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    selectedService,
    setSelectedService,
    searchRadius,
    setSearchRadius,
    radiusMarks,
  };
}
