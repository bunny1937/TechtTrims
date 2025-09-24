// pages/salons/[id].js
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../../styles/SalonDetail.module.css";
import Image from "next/image";

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

  useEffect(() => {
    const stored = localStorage.getItem("userOnboardingData");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserInfo(parsed);
        console.log("Loaded userInfo from onboarding:", parsed);
      } catch (err) {
        console.error("Failed to parse onboarding data:", err);
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
    [salon]
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
    if (selectedServices.length > 0 && selectedSlot && selectedDate) {
      try {
        const payload = {
          salonId: id,
          service: selectedServices[0].name, // API expects single service
          barber: selectedBarber,
          date: selectedDate,
          time: selectedSlot,
          user: userInfo,
          price: selectedServices[0].price,
          customerName: userInfo?.name || "Guest",
          customerPhone: userInfo?.mobile || "",
        };

        const res = await fetch("/api/bookings/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Booking failed");

        const data = await res.json();
        console.log("✅ Booking confirmed with:", data);

        // Redirect to booking confirmation page
        router.push(`/booking/confirmed?id=${data.bookingId || data._id}`);
      } catch (err) {
        console.error("❌ Booking error:", err);
        alert("Something went wrong. Please try again.");
      }
    } else {
      console.log("⚠ Please select at least one service and a time slot.");
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
      {salon.barbers && salon.barbers.length > 0 && (
        <motion.section
          className={styles.barbersSection}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h3 className={styles.sectionTitle}>Choose a Barber</h3>
          <div className={styles.barbersGrid}>
            {salon.barbers.map((barber, index) => (
              <motion.div
                key={barber.id || index}
                className={`${styles.barberCard} ${
                  selectedBarber === (barber.id || barber._id || barber.name)
                    ? styles.selected
                    : ""
                }`}
                onClick={() =>
                  setSelectedBarber(barber.id || barber._id || barber.name)
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Image
                  src={barber.image || "/default-barber.png"}
                  alt={barber.name}
                  className={styles.barberImage}
                />
                <h4 className={styles.barberName}>{barber.name}</h4>
                <p className={styles.barberExperience}>
                  {barber.experience} yrs experience
                </p>
              </motion.div>
            ))}
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
          onClick={() => {
            console.log("Book Appointment clicked");
            console.log("Selected Service:", selectedServices);
            console.log("Selected Slot:", selectedTime);
            console.log("Selected Barber:", selectedBarber);
            console.log("User Details:", userInfo);
            handleBooking();
          }}
          disabled={selectedServices.length === 0 || !selectedSlot}
        >
          Book Appointment
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
                      ? chosenBarber.id || chosenBarber._id || chosenBarber.name
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
                      "/booking/confirmed?id=" + (data.bookingId || data.id)
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
