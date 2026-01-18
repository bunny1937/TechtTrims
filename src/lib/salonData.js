// src/lib/salonData.js

class SalonDataManagerClass {
  constructor() {
    this.salonData = null;
  }

  // Check if salon is logged in
  isLoggedIn() {
    if (typeof window === "undefined") return false;

    // Check cookie
    const getCookie = (name) => {
      const matches = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)"),
      );
      return matches ? decodeURIComponent(matches[1]) : null;
    };

    return getCookie("salonAuth") === "true";
  }

  // Get salon data from sessionStorage
  getSalonData() {
    if (typeof window === "undefined") return null;

    try {
      const data = sessionStorage.getItem("salonSession");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting salon data:", error);
      return null;
    }
  }

  // Set salon data
  setSalonData(data) {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem("salonSession", JSON.stringify(data));
      this.salonData = data;
    } catch (error) {
      console.error("Error setting salon data:", error);
    }
  }

  // Clear salon data (logout)
  clearSalonData() {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.removeItem("salonSession");
      localStorage.removeItem("salonToken");
      this.salonData = null;
    } catch (error) {
      console.error("Error clearing salon data:", error);
    }
  }
}

export const SalonDataManager = new SalonDataManagerClass();
