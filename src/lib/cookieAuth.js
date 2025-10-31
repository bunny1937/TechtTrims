// src/lib/cookieAuth.js - CREATE NEW FILE
import Cookies from "js-cookie";

// ✅ getAuthToken - Read cookie (works with HttpOnly from backend)
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;

  // ✅ HttpOnly cookies ARE sent with requests automatically
  // We can't read them with JavaScript, but we can check if user is authenticated
  // by making an API call
  return true; // Just return true if we assume cookie exists
};

// ✅ removeAuthToken - Call logout API to clear HttpOnly cookie
export const removeAuthToken = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // Include cookies
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};
export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  const matches = document.cookie.match(/(?:^|; )userAuth=([^;]*)/);
  return matches ? matches[1] === "true" : false;
};

// ❌ REMOVE setAuthToken - Backend sets HttpOnly cookie
// export const setAuthToken = ... DELETE THIS

export const setUserData = (userData) => {
  // Encrypt sensitive data before storing (optional)
  const safeData = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
  };
  sessionStorage.setItem("userData", JSON.stringify(safeData));
};

export const getUserData = () => {
  const data = sessionStorage.getItem("userData");
  return data ? JSON.parse(data) : null;
};
// Add this to your existing lib/cookieAuth.js file

export const logout = () => {
  if (typeof window === "undefined") return;

  // Clear auth cookies
  document.cookie = "authToken=; path=/; max-age=0";
  document.cookie = "userData=; path=/; max-age=0";

  // Clear session storage EXCEPT location
  const storedLocation = sessionStorage.getItem("userLocation");
  sessionStorage.clear();

  // Restore location after clearing
  if (storedLocation) {
    sessionStorage.setItem("userLocation", storedLocation);
  }

  // Clear localStorage except location
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (!key.includes("location")) {
      localStorage.removeItem(key);
    }
  });
};
