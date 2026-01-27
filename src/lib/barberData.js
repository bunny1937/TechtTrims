// src/lib/barberData.js

class BarberDataManagerClass {
  constructor() {
    this.barberData = null;
  }

  // Check if barber is logged in
  isLoggedIn() {
    if (typeof window === "undefined") return false;

    // Check cookie
    const getCookie = (name) => {
      const matches = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)"),
      );
      return matches ? decodeURIComponent(matches[1]) : null;
    };

    return getCookie("barberAuth") === "true";
  }

  // Get barber data from sessionStorage
  getBarberData() {
    if (typeof window === "undefined") return null;

    try {
      const data = sessionStorage.getItem("barberSession");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting barber data:", error);
      return null;
    }
  }

  // Set barber data
  setBarberData(data) {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem("barberSession", JSON.stringify(data));
      this.barberData = data;
      // Set auth cookie (consider adding Secure and SameSite attributes in production)
      document.cookie = "barberAuth=true; path=/;";
    } catch (error) {
      console.error("Error setting barber data:", error);
    }
  }

  // Clear barber data (logout)
  clearBarberData() {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.removeItem("barberSession");
      localStorage.removeItem("barberToken");
      this.barberData = null;

      // Clear cookie
      document.cookie =
        "barberAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    } catch (error) {
      console.error("Error clearing barber data:", error);
    }
  }
}

export const BarberDataManager = new BarberDataManagerClass();
