export const USER_ROLES = {
  USER: "user",
  SALON_OWNER: "salon_owner",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

export const BOOKING_STATUS = {
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const SERVICE_CATEGORIES = {
  HAIR: "hair",
  BEARD: "beard",
  SKIN: "skin",
  NAIL: "nail",
  MASSAGE: "massage",
};

export const RATING_CATEGORIES = [
  { key: "serviceQuality", label: "Service Quality" },
  { key: "timing", label: "Timing/Punctuality" },
  { key: "barberPerformance", label: "Staff Performance" },
  { key: "salonAmbience", label: "Salon Ambience" },
  { key: "overall", label: "Overall Experience" },
];

export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];

export const SEARCH_RADIUS = 5000; // 5km in meters for nearby salon search

export const DEFAULT_SALON_IMAGE = "/images/salon-placeholder.jpg";
export const DEFAULT_BARBER_IMAGE = "/images/barber-placeholder.jpg";
