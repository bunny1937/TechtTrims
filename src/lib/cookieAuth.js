// src/lib/cookieAuth.js - CREATE NEW FILE
import Cookies from "js-cookie";

export const setAuthToken = (token, rememberMe = false) => {
  const options = {
    expires: rememberMe ? 7 : 1, // 7 days if remember me, else 1 day
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    path: "/",
  };

  Cookies.set("authToken", token, options);
};

export const getAuthToken = () => {
  return Cookies.get("authToken");
};

export const removeAuthToken = () => {
  Cookies.remove("authToken", { path: "/" });
};

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
