// pages/salons/[id].js
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../../styles/SalonDetail.module.css";
import Image from "next/image";
import { UserDataManager } from "../../lib/userData";
import RetryButton from "@/components/RetryButton";

// Dynamic map import to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

export default function SalonDetail({ initialSalon }) {
  const router = useRouter();
  const { id } = router.query;
  const [userInfo, setUserInfo] = useState(null);
  const [salon, setSalon] = useState(initialSalon || null);
  const [isLoading, setIsLoading] = useState(!initialSalon);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableBarbers, setAvailableBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [timeSlots, setTimeSlots] = useState([]); // ✅ added this
  const [userOnboarding, setUserOnboarding] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMobile, setOtpMobile] = useState("");
  const [sseMessages, setSseMessages] = useState([]);
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [bookingError, setBookingError] = useState(null);

  useEffect(() => {
    // Only run once when component mounts
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userOnboardingData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserInfo(parsed);
          console.log("Loaded userInfo from localStorage:", parsed);
        } catch (err) {
          console.error("Failed to parse onboarding data:", err);
        }
      }
    }
  }, []);

  useEffect(() => {
    console.log(
      "🔎 Button enable check → Services:",
      selectedServices,
      "Time:",
      selectedTime
    );
  }, [selectedServices, selectedTime]);

  useEffect(() => {
    if (selectedServices.length > 0 && salon?._id) {
      const fetchAvailableBarbers = async () => {
        try {
          // Use the first selected service name
          const firstServiceName = selectedServices[0].name;
          console.log("Fetching barbers for service:", firstServiceName);

          // Fetch barbers who can perform the selected service
          const res = await fetch(
            `/api/salons/barbers/available?salonId=${
              salon._id
            }&service=${encodeURIComponent(firstServiceName)}`
          );

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const barbers = await res.json();
          console.log("Available barbers:", barbers);
          setAvailableBarbers(barbers);

          // If no barbers available, show a message but don't prevent booking
          if (barbers.length === 0) {
            console.warn("No barbers available for selected service");
          }
        } catch (err) {
          console.error("Error fetching barbers:", err);
          setAvailableBarbers([]);
        }
      };

      fetchAvailableBarbers();
    } else {
      setAvailableBarbers([]);
      setSelectedBarber(null);
    }
  }, [selectedServices, salon?._id]);

  const chosenService =
    salon?.services && selectedServices
      ? { name: selectedServices, ...(salon.services[selectedServices] || {}) }
      : null;
  const chosenBarber =
    salon?.barbers && selectedBarber
      ? salon.barbers.find(
          (b) => (b.id || b._id || b.name) === selectedBarber
        ) || null
      : null;
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Client re-fetch (optional, keeps data fresh if user navigates without reload)
  const computeTimeSlotsForDate = useCallback(
    (dateStr) => {
      if (!dateStr) return [];
      const slots = [];
      const today = new Date();
      const selectedDateObj = new Date(dateStr);
      const startHour =
        selectedDateObj.toDateString() === today.toDateString()
          ? Math.max(9, today.getHours() + 1)
          : 9;
      const endHour = 20;

      const bookedSet = new Set(
        (salon.bookings || [])
          .filter((b) => {
            try {
              const bd = new Date(b.date);
              return bd.toDateString() === selectedDateObj.toDateString();
            } catch {
              return false;
            }
          })
          .map((b) => b.date === selectedDate)
      );

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const hh = String(hour).padStart(2, "0");
          const mm = String(minute).padStart(2, "0");
          const timeString = `${hh}:${mm}`;
          slots.push({
            time: timeString,
            available: !bookedSet.has(timeString),
          });
        }
      }

      return slots;
    },
    [salon, selectedDate]
  );
  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      setSelectedSlot("");
      return;
    }
    const slots = computeTimeSlotsForDate(selectedDate);
    setTimeSlots(slots);
  }, [selectedDate, computeTimeSlotsForDate]);
  const getFilteredServices = () => {
    if (!salon) return [];

    // Convert object → array
    const servicesArray = Object.entries(salon.services || {}).map(
      ([key, value]) => ({
        name: key,
        price: Number(value.price) || 0,
        enabled: value.enabled,
        duration: value.duration || 30, // fallback if not stored
        gender: value.gender || ["All"], // fallback if not stored
      })
    );

    if (!userOnboarding) return servicesArray;

    return servicesArray.filter(
      (service) =>
        service.gender.includes(userOnboarding.gender) ||
        service.gender.includes("All")
    );
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading salon details...</p>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className={styles.errorContainer}>
        <h2>Salon not found</h2>
        <button onClick={() => router.push("/")} className={styles.backButton}>
          ← Back to Home
        </button>
      </div>
    );
  }

  const handleServiceClick = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.name === service.name);
      if (exists) {
        return prev.filter((s) => s.name !== service.name);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleTimeClick = (time) => {
    console.log("Time selected:", time);
    setSelectedTime(time);
    setSelectedSlot(time); // optional: keep both in sync
  };

  const handleBooking = async () => {
    if (selectedServices.length === 0) {
      alert("Please select at least one service");
      return;
    }

    // Allow booking even if no specific barber selected (salon can assign one)
    if (availableBarbers.length > 0 && !selectedBarber) {
      alert("Please select a barber");
      return;
    }

    if (!selectedDate) {
      alert("Please select a date");
      return;
    }

    if (!selectedSlot) {
      alert("Please select a time slot");
      return;
    }

    try {
      console.log("Booking with:", {
        selectedServices,
        selectedSlot,
        selectedBarber,
        userInfo,
      });

      // Find selected barber details if one is selected
      const selectedBarberDetails = selectedBarber
        ? availableBarbers.find((b) => b._id === selectedBarber)
        : null;

      // Prepare booking data
      const allServices = selectedServices
        .map((service) => service.name)
        .join(", ");
      const totalPrice = selectedServices.reduce(
        (sum, service) => sum + service.price,
        0
      );

      const currentUserInfo = UserDataManager.getStoredUserData();
      const userToken = localStorage.getItem("userToken");

      const payload = {
        salonId: salon._id,
        service: allServices,
        barber: selectedBarberDetails?.name || "Any Available",
        barberId: selectedBarber || null,
        date: selectedDate,
        time: selectedSlot,
        price: totalPrice,
        customerName: currentUserInfo?.name || "Anonymous",
        customerPhone: currentUserInfo?.phone || "",
        user: currentUserInfo,
        userId: currentUserInfo?._id || currentUserInfo?.id || null,
      };

      console.log("Booking payload:", payload);
      const makeBookingRequest = async () => {
        try {
          setBookingError(null);
          const response = await fetchWithRetry("/api/bookings/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(userToken && { Authorization: `Bearer ${userToken}` }),
            },
            body: JSON.stringify(payload),
          });
          return response;
        } catch (error) {
          setBookingError(error.message);
          throw error;
        }
      };

      // Handle 409 conflict (slot already booked) first
      if (response.status === 409) {
        const errorData = await response.json();
        alert(
          "⚠️ Sorry! This time slot was just booked by another customer. Please select a different time."
        );
        window.location.reload();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Booking failed");
      }

      const bookingResult = await response.json();
      console.log("✅ Booking confirmed:", bookingResult);

      // Preserve user info for feedback
      UserDataManager.preserveUserInfoForBooking(payload);

      alert("✅ Booking confirmed successfully!");

      if (!userToken && !currentUserInfo?._id) {
        setRegName(payload.customerName);
        setRegMobile(payload.customerPhone);
        setShowRegistrationModal(true);

        // Reset form for anonymous users
        setSelectedServices([]);
        setSelectedBarber(null);
        setSelectedDate("");
        setSelectedSlot("");

        // Redirect to feedback page for anonymous users
        router.push(
          `/feedback?bookingId=${bookingResult.bookingId || bookingResult._id}`
        );
      } else {
        // Reset form for logged in users
        setSelectedServices([]);
        setSelectedBarber(null);
        setSelectedDate("");
        setSelectedSlot("");

        // Redirect to confirmation page for logged in users
        router.push(
          `/booking/confirmed?id=${
            bookingResult.bookingId || bookingResult._id
          }`
        );
      }
    } catch (error) {
      console.error("❌ Booking error:", error);
      alert(`Booking failed: ${error.message}`);
    }
  };
  const handleRegisterAndLink = async () => {
    // call registration API
    if (!regName || !regMobile) return alert("Please enter name and mobile");
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          mobile: regMobile,
          email: regEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsBooking(false);
        return alert(
          "Registration failed: " + (data.message || res.statusText)
        );
      }
      // set onboarding and close modal
      setUserOnboarding({ name: regName, mobile: regMobile, email: regEmail });
      setShowRegistrationModal(false);
      alert("Account created! You are now registered.");
    } catch (e) {
      console.error(e);
      alert("Registration failed: " + e.message);
    }
  };

  const sendOtpForRegistration = async (mobile) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setOtpMobile(mobile);
        // For dev we get OTP in response; in prod SMS is sent.
        setOtpCode(data.otp || "");
        alert("OTP sent (dev): " + (data.otp || "---"));
      } else {
        alert("OTP send failed: " + (data.message || res.statusText));
      }
    } catch (e) {
      console.error(e);
      alert("OTP send failed");
    }
  };

  const verifyOtpAndRegister = async (mobile, otp) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok)
        return alert("OTP verify failed: " + (data.message || res.statusText));
      // if user present, set onboarding; else open registration form
      if (data.user) {
        setUserOnboarding({
          name: data.user.name,
          mobile: data.user.mobile,
          email: data.user.email,
        });
        alert("Verified and signed in");
        setShowRegistrationModal(false);
      } else {
        // No existing user: fill registration modal fields
        setRegName(regName || "");
        setRegMobile(mobile);
        setShowRegistrationModal(true);
      }
      setOtpSent(false);
      setOtpCode("");
    } catch (e) {
      console.error(e);
      alert("OTP verify failed");
    }
  };

  return (
    <div className={styles.container}>
      {bookingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-red-700 text-sm mb-2">❌ {bookingError}</p>
          <RetryButton onRetry={makeBookingRequest} />
        </div>
      )}
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.salonName}>{salon.salonName}</h1>
        <div className={styles.headerActions}>
          <button className={styles.shareButton}>📤</button>
          <button className={styles.favoriteButton}>❤️</button>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        className={styles.heroSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.imageGallery}>
          {salon.salonImages && salon.salonImages.length > 0 ? (
            <Image
              src={salon.salonImages[0]}
              alt={salon.salonName}
              className={styles.mainImage}
            />
          ) : (
            <div className={styles.placeholderImage}>
              <span>📸</span>
              <p>No images available</p>
            </div>
          )}
        </div>

        <div className={styles.salonBasicInfo}>
          <div className={styles.ratingSection}>
            <div className={styles.mainRating}>
              ⭐ {salon.ratings.overall.toFixed(1)}
            </div>
            <div className={styles.reviewCount}>
              ({salon.ratings.totalReviews} reviews)
            </div>
          </div>

          <div className={styles.locationInfo}>
            <p>📍 {salon.location.address}</p>
            <p>📞 {salon.phone}</p>
          </div>

          <div className={styles.quickStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {salon.stats.totalBookings}
              </span>
              <span className={styles.statLabel}>Total Bookings</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {salon.stats.averageWaitTime}min
              </span>
              <span className={styles.statLabel}>Avg Wait Time</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {salon.stats.repeatCustomers}
              </span>
              <span className={styles.statLabel}>Repeat Customers</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Services Section */}
      <motion.section
        className={styles.servicesSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <h3 className={styles.sectionTitle}>Services & Pricing</h3>
        <div className={styles.servicesGrid}>
          {getFilteredServices().map((service, index) => (
            <motion.div
              key={index}
              className={`${styles.serviceCard} ${
                selectedServices.find((s) => s.name === service.name)
                  ? styles.selected
                  : ""
              }`}
              onClick={() => {
                console.log("Service clicked:", service.name);
                handleServiceClick(service);
                console.log("Current selectedServices:", service);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h4 className={styles.serviceName}>{service.name}</h4>
              <p className={styles.servicePrice}>₹{service.price}</p>
              <p className={styles.serviceDuration}>{service.duration} min</p>
              <p className={styles.serviceGender}>
                {service.gender.join(", ")}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Barber Selection Section */}

      {selectedServices.length > 0 && (
        <motion.section
          className={styles.barbersSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h3 className={styles.sectionTitle}>Choose Your Barber</h3>

          {availableBarbers.length > 0 ? (
            <div className={styles.barbersGrid}>
              {availableBarbers.map((barber, index) => (
                <motion.div
                  key={barber._id || index}
                  className={`${styles.barberCard} ${
                    selectedBarber === barber._id ? styles.selected : ""
                  }`}
                  onClick={() => setSelectedBarber(barber._id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Barber card content */}
                  <div className={styles.barberImage}>
                    {barber.photo ? (
                      <img
                        src={barber.photo}
                        alt={barber.name}
                        className={styles.barberPhoto}
                      />
                    ) : (
                      <div className={styles.defaultBarberImage}>👨‍💼</div>
                    )}
                  </div>
                  <h4 className={styles.barberName}>{barber.name}</h4>
                  <p className={styles.barberExperience}>
                    {barber.experience} yrs experience
                  </p>
                  <div className={styles.barberRating}>
                    <span>⭐</span>
                    <span>{barber.rating}/5</span>
                    <span className="text-gray-500 ml-2">
                      ({barber.totalBookings} bookings)
                    </span>
                  </div>
                  <div className={styles.barberSkills}>
                    {barber.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className={styles.skillChip}>
                        {skill}
                      </span>
                    ))}
                  </div>
                  {barber.bio && (
                    <p className={styles.barberBio}>
                      {barber.bio.length > 80
                        ? `${barber.bio.substring(0, 80)}...`
                        : barber.bio}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-blue-50 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">
                Salon Will Assign Best Available Barber
              </h4>
              <p className="text-blue-600">
                No specialized barbers are currently available for the selected
                services, but the salon will assign the best available barber
                for your appointment.
              </p>
            </div>
          )}
        </motion.section>
      )}

      {selectedServices.length > 0 && availableBarbers.length === 0 && (
        <motion.section
          className={styles.noBarbersSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="text-center py-8 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              No Specialized Barbers Available
            </h3>
            <p className="text-yellow-600">
              Sorry, no barbers are currently available for the selected
              services. Please try different services or contact the salon
              directly.
            </p>
          </div>
        </motion.section>
      )}

      {/* Date & Time Selection */}
      <motion.section
        className={styles.bookingSection}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <h3 className={styles.sectionTitle}>Select Date & Time</h3>
        <div className={styles.dateTimePicker}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
          <div className={styles.timeSlots}>
            {selectedDate ? (
              timeSlots.length === 0 ? (
                <div>No slots available for selected date</div>
              ) : (
                <div className={styles.timeSlotsWrapper}>
                  {timeSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      className={`${styles.timeSlot} ${
                        selectedSlot === slot.time ? styles.selected : ""
                      } ${!slot.available ? styles.disabled : ""}`}
                      onClick={() => {
                        console.log("Slot clicked:", slot.time);
                        handleTimeClick(slot.time);
                        console.log("Current selectedSlot:", slot.time);
                      }}
                      disabled={!slot.available} // ✅ ensure unavailable slots can’t be clicked
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <p>Please select a date</p>
            )}
          </div>
        </div>
      </motion.section>

      {/* Map Section */}
      {salon.location.latitude && salon.location.longitude && (
        <motion.section
          className={styles.mapSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h3 className={styles.sectionTitle}>Location</h3>
          <MapContainer
            center={[salon.location.latitude, salon.location.longitude]}
            zoom={15}
            style={{ height: "300px", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker
              position={[salon.location.latitude, salon.location.longitude]}
            />
          </MapContainer>
        </motion.section>
      )}

      {/* Book Appointment Button */}
      <div className={styles.bookButtonContainer}>
        <button
          onClick={handleBooking}
          disabled={selectedServices.length === 0 || !selectedSlot}
          className={`${styles.bookButton} ${
            selectedServices.length === 0 || !selectedSlot
              ? styles.disabled
              : ""
          }`}
        >
          Book Appointment
          {availableBarbers.length === 0 && selectedServices.length > 0 && (
            <small className={styles.buttonSubtext}>
              (Salon will assign barber)
            </small>
          )}
        </button>
      </div>

      {/* Booking Modal */}
      {/* Registration Modal - shown after booking if user not onboarded */}
      {showRegistrationModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Create your account</h3>
            <p>
              We prefilled your booking info — just confirm to create an
              account.
            </p>
            <input
              placeholder="Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <input
              placeholder="Mobile"
              value={regMobile}
              onChange={(e) => setRegMobile(e.target.value)}
            />
            <input
              placeholder="Email (optional)"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <div style={{ marginTop: "12px" }}>
              <button
                className={styles.confirmButton}
                onClick={handleRegisterAndLink}
              >
                Create Account
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setShowRegistrationModal(false)}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Confirm Your Booking</h3>
            <p>
              <strong>Service:</strong> {chosenService?.name}
            </p>
            <p>
              <strong>Barber:</strong> {chosenBarber?.name}
            </p>
            <p>
              <strong>Date:</strong> {selectedDate}
            </p>
            <p>
              <strong>Time:</strong> {selectedSlot}
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.confirmButton}
                onClick={async () => {
                  setIsBooking(true);
                  // build payload
                  const payload = {
                    salonId: id,
                    service: chosenService
                      ? chosenService.name
                      : selectedServices,
                    barber: chosenBarber
                      ? chosenBarber._id ||
                        chosenBarber._id ||
                        chosenBarber.name
                      : selectedBarber,
                    date: selectedDate,
                    time: selectedSlot,
                    user: userOnboarding || null,
                  };
                  try {
                    const res = await fetch("/api/bookings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) {
                      setIsBooking(false);
                      const err = await res
                        .json()
                        .catch(() => ({ message: "Unknown error" }));
                      alert(
                        "Booking failed: " + (err.message || res.statusText)
                      );
                      return;
                    }
                    const data = await res.json();
                    alert(
                      "Booking confirmed! Booking ID: " +
                        (data.bookingId || data.id || "N/A")
                    );
                    if (!userOnboarding) {
                      setRegName(payload.user?.name || "");
                      setRegMobile(payload.user?.mobile || "");
                      setShowRegistrationModal(true);
                    }
                    setShowBookingModal(false);
                    setIsBooking(false);
                    // lock selected slot locally
                    setTimeSlots((prev) =>
                      prev.map((s) =>
                        s.time === selectedSlot ? { ...s, available: false } : s
                      )
                    );
                    // optionally navigate to confirmation page
                    router.push(
                      "user/bookings/confirmed?id=" +
                        (data.bookingId || data.id)
                    );
                  } catch (e) {
                    console.error(e);
                    alert("Booking failed: " + e.message);
                  }
                }}
              >
                Confirm
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => setShowBookingModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/salons/${id}`);
    const data = await response.json();

    if (!response.ok) {
      return { notFound: true };
    }

    return {
      props: {
        initialSalon: data.salon,
      },
    };
  } catch (error) {
    console.error("SSR fetch error:", error);
    return { notFound: true };
  }
}
