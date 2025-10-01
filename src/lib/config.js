export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
};

export const getSalonUrl = (salonId) => {
  return `${getBaseUrl()}/salons/${salonId}`;
};

export const getBookingUrl = (bookingId) => {
  return `${getBaseUrl()}/bookings/${bookingId}`;
};
