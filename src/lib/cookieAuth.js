// lib/cookieAuth.js
import Cookies from "js-cookie";

/**
 * ✔ getAuthToken()
 *
 * We CANNOT read the HttpOnly JWT (authToken).
 * So instead, we check a NORMAL cookie "userAuth=true".
 * Backend should set:
 *
 * Set-Cookie: userAuth=true; Path=/; SameSite=Strict;
 */
export const getAuthToken = () => {
  if (typeof window === "undefined") return null;

  const auth = Cookies.get("userAuth"); // readable cookie
  return auth === "true" ? true : null;
};

/**
 * ✔ removeAuthToken()
 * Calls backend logout API to clear HttpOnly cookie.
 */
export const removeAuthToken = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout API error:", error);
  }
};

/**
 * ✔ isAuthenticated()
 * Same logic as getAuthToken() but explicit
 */
export const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return Cookies.get("userAuth") === "true";
};

/**
 * ✔ setUserData()
 * Stores only SAFE data inside sessionStorage.
 */
export const setUserData = (userData) => {
  const normalizedGender = userData.gender
    ? userData.gender.charAt(0).toUpperCase() +
      userData.gender.slice(1).toLowerCase()
    : "Other";

  const safeData = {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    gender: normalizedGender,
  };

  sessionStorage.setItem("userData", JSON.stringify(safeData));
};

/**
 * ✔ getUserData()
 */
export const getUserData = () => {
  const data = sessionStorage.getItem("userData");
  return data ? JSON.parse(data) : null;
};

/**
 * ✔ logout()
 * Clears everything safely after backend wipes cookies.
 */
export const logout = async () => {
  if (typeof window === "undefined") return;

  // First, clear HttpOnly cookie through backend
  await removeAuthToken();

  // Clear readable cookies
  Cookies.remove("userAuth");
  Cookies.remove("userData");

  // Restore location after clearing session
  const storedLocation = sessionStorage.getItem("userLocation");

  sessionStorage.clear();
  if (storedLocation) {
    sessionStorage.setItem("userLocation", storedLocation);
  }

  // Clear localStorage (except location)
  Object.keys(localStorage).forEach((key) => {
    if (!key.includes("location")) localStorage.removeItem(key);
  });
};
