// src/hooks/useSalonStatus.js

/**
 * Hook to calculate salon open/closed status and timing
 * Handles:
 * - Current open/closed status
 * - Opening/closing times
 * - Next opening day calculations
 * - Time formatting
 */
export function useSalonStatus() {
  /**
   * Format time from 24hr to 12hr format
   */
  const formatTime = (time) => {
    if (!time) return "";

    // Handle "01:00" or "0100" format
    const cleaned = time.replace(/:/g, "");
    const hours = parseInt(cleaned.substring(0, cleaned.length - 2)) || 0;
    const mins = cleaned.substring(cleaned.length - 2) || "00";

    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${mins} ${ampm}`;
  };

  /**
   * Get salon status based on opening hours and current time
   */
  /**
   * Get salon status based on opening hours and current time
   */
  const getSalonStatus = (salon) => {
    if (!salon.operatingHours && !salon.openingHours) return "Closed";

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase()
      .trim();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // e.g., 1430 for 14:30

    // Try operatingHours[currentDay] first, fallback to openingHours
    const hours = salon.operatingHours?.[currentDay] || salon.openingHours;

    // Check if closed today
    if (!hours || hours.closed) {
      // Find next opening day
      const daysOrder = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const currentDayIndex = daysOrder.indexOf(currentDay);

      for (let i = 1; i <= 7; i++) {
        const nextDay = daysOrder[(currentDayIndex + i) % 7];
        const nextDayHours = salon.operatingHours?.[nextDay];

        if (nextDayHours && !nextDayHours.closed) {
          if (i === 1) {
            return `Opens Tomorrow at ${formatTime(nextDayHours.open)}`;
          } else if (i === 2) {
            const dayName = nextDay.charAt(0).toUpperCase() + nextDay.slice(1);
            return `Opens ${dayName}`;
          } else {
            return "Closed";
          }
        }
      }
      return "Closed";
    }

    // ✅ FIX: Handle midnight (00:00) correctly
    const openTimeStr = hours.open?.replace(/:/g, "") || "0900";
    const openTime = parseInt(openTimeStr);

    const closeTimeStr = hours.close?.replace(/:/g, "") || "2100";
    const closeTime = hours.close === "24:00" ? 2400 : parseInt(closeTimeStr);

    // Not open yet today
    if (currentTime < openTime) {
      const timeDiff = openTime - currentTime;
      const hoursUntil = Math.floor(timeDiff / 100);
      const minsUntil = timeDiff % 100;

      if (hoursUntil < 1) {
        return `Opens in ${minsUntil}mins`;
      } else if (hoursUntil < 2) {
        return `Opens in ${hoursUntil}hr ${minsUntil}mins`;
      } else {
        return `Opens at ${formatTime(hours.open)}`;
      }
    }

    // Already closed for today
    if (currentTime >= closeTime) {
      const daysOrder = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const currentDayIndex = daysOrder.indexOf(currentDay);
      const tomorrowDay = daysOrder[(currentDayIndex + 1) % 7];
      const tomorrowHours = salon.operatingHours?.[tomorrowDay];

      if (tomorrowHours && !tomorrowHours.closed) {
        return `Opens Tomorrow at ${formatTime(tomorrowHours.open)}`;
      }

      return "Closed";
    }

    // Currently open - calculate time until closing
    const timeUntilClose = closeTime - currentTime;
    const hoursLeft = Math.floor(timeUntilClose / 100);
    const minsLeft = timeUntilClose % 100;

    if (hoursLeft < 2) {
      if (hoursLeft === 0 && minsLeft <= 20) {
        return `Closes in ${minsLeft}mins`;
      }
      if (hoursLeft === 1) {
        return `Closes in 1hr ${minsLeft}mins`;
      }
      return `Closes in ${hoursLeft}hrs`;
    }

    return "Open Now";
  };

  /**
   * Check if salon is currently open (boolean)
   */
  const isOpen = (salon) => {
    const status = getSalonStatus(salon);
    return status === "Open Now" || status.includes("Closes in");
  };

  /**
   * Get next opening time for a closed salon
   */
  const getNextOpenTime = (salon) => {
    if (!salon.operatingHours && !salon.openingHours) return null;

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase()
      .trim();

    const daysOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    const currentDayIndex = daysOrder.indexOf(currentDay);

    for (let i = 0; i <= 7; i++) {
      const checkDay = daysOrder[(currentDayIndex + i) % 7];
      const hours = salon.operatingHours?.[checkDay] || salon.openingHours;

      if (hours && !hours.closed) {
        return {
          day: checkDay,
          time: formatTime(hours.open),
          daysAway: i,
        };
      }
    }

    return null;
  };

  return {
    getSalonStatus,
    formatTime,
    isOpen,
    getNextOpenTime,
  };
}
