export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateMobile = (mobile) => {
  const mobileRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;
  return mobileRegex.test(mobile);
};

export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpper || !hasLower || !hasNumber) {
    return {
      valid: false,
      message: "Password must contain uppercase, lowercase, and numbers",
    };
  }

  return { valid: true };
};

export const validateSalonRegistration = (data) => {
  const errors = {};

  // Owner Details Validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  }

  if (!validateMobile(data.mobileNumber)) {
    errors.mobileNumber = "Invalid mobile number format";
  }

  if (!validateEmail(data.email)) {
    errors.email = "Invalid email format";
  }

  if (!validatePassword(data.password)) {
    errors.password = "Password must be at least 6 characters";
  }

  // Salon Details Validation
  if (!data.salonName || data.salonName.trim().length < 2) {
    errors.salonName = "Salon name must be at least 2 characters";
  }

  if (!data.address || data.address.trim().length < 10) {
    errors.address = "Address must be at least 10 characters";
  }

  // Services Validation
  const enabledServices = Object.entries(data.services || {})
    .filter(([_, service]) => service.enabled)
    .map(([key, service]) => ({ key, ...service }));

  if (enabledServices.length === 0) {
    errors.services = "At least one service must be enabled";
  }

  enabledServices.forEach((service) => {
    if (!service.price || service.price < 1) {
      errors[`service_${service.key}`] = "Service price must be greater than 0";
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateBooking = (data) => {
  const errors = {};

  if (!data.salonId) {
    errors.salonId = "Salon selection is required";
  }

  if (!data.barberName) {
    errors.barberName = "Barber selection is required";
  }

  if (!data.service) {
    errors.service = "Service selection is required";
  }
  if (!data.scheduledTime && !data.timeSlot) {
    errors.scheduledTime = "Time slot selection is required";
  } else if (!data.scheduledTime && data.timeSlot) {
    // normalize: if client sent timeSlot, map it to scheduledTime for downstream code
    data.scheduledTime = data.timeSlot;
  }

  if (!data.userDetails?.name) {
    errors.userName = "Name is required";
  }

  if (!validateMobile(data.userDetails?.mobile)) {
    errors.userMobile = "Valid mobile number is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
