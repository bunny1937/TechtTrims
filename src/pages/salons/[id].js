// pages/salons/[id].js
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import styles from "../../styles/SalonDetail.module.css";
import Image from "next/image";
import { UserDataManager } from "../../lib/userData";
import RetryButton from "@/components/RetryButton";
import ReviewsSection from "@/components/Salon/ReviewSection";
import ImageCarousel from "@/components/ImageCarousel";
import LocationMap from "../../components/Maps/LocationMap";
import { useLocation } from "../../hooks/useLocation";

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
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

export default function SalonDetail({ initialSalon }) {
  const router = useRouter();
  const { id, mode } = router.query;
  const [bookingMode, setBookingMode] = useState(mode || "prebook");
  const [salonStats, setSalonStats] = useState({
    availableNow: 0,
    totalWaiting: 0,
    totalBooked: 0,
    avgWaitTime: 0,
  });
  const [barberStates, setBarberStates] = useState([]);
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
  const [isWalkinBooking, setIsWalkinBooking] = useState(false); // ADD THIS
  const [isBooking, setIsBooking] = useState(false);
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [bookingError, setBookingError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Services, 2: Barbers, 3: Date/Time (prebook only)
  const [salonStatus, setSalonStatus] = useState("open"); // open, paused, closing
  const [pauseInfo, setPauseInfo] = useState(null);
  const [closingCountdown, setClosingCountdown] = useState(null); // seconds remaining
  const [showClosingTimer, setShowClosingTimer] = useState(false);
  const [salonClosed, setSalonClosed] = useState(false);
  const { userLocation, locationStatus, requestLocationPermission } =
    useLocation();

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
  // ✅ NEW: Fetch real-time barber states for walk-in mode

  // Poll salon status
  const checkSalonStatus = useCallback(async () => {
    if (!salon?._id) return;

    try {
      const res = await fetch(`/api/salons/status?salonId=${salon._id}`);
      const data = await res.json();
      setSalonStatus(data.status);
      setPauseInfo(data);
    } catch (error) {
      console.error("Status check error:", error);
    }
  }, [salon?._id]); // Only recreate if salon ID changes

  useEffect(() => {
    if (bookingMode !== "walkin" || !id) return;

    const fetchBarberStates = async () => {
      try {
        const res = await fetch(`/api/walkin/salon-state?salonId=${id}`);
        const data = await res.json();
        setBarberStates(data.barbers || []);
      } catch (error) {
        console.error("Error fetching barber states:", error);
      }
    };

    fetchBarberStates();

    // Update every 30 seconds
    const interval = setInterval(fetchBarberStates, 30000);

    return () => clearInterval(interval);
  }, [bookingMode, id]);

  // Poll salon status every 5 seconds
  useEffect(() => {
    if (!salon?._id) return;

    // Initial check
    checkSalonStatus();

    // Visibility-aware polling
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSalonStatus(); // Check immediately when user returns
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 10-second polling when active, pause when inactive
    const interval = setInterval(() => {
      if (!document.hidden) {
        checkSalonStatus();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [salon, checkSalonStatus]);

  // Real-time closing countdown
  useEffect(() => {
    if (!pauseInfo?.closingTime) return;

    const checkClosingTime = () => {
      const now = new Date();
      const [hours, minutes] = pauseInfo.closingTime.split(":");
      const closingTime = new Date();
      closingTime.setHours(parseInt(hours), parseInt(minutes), 20, 0); // +20s buffer

      const secondsRemaining = Math.floor((closingTime - now) / 1000);

      if (secondsRemaining <= 60 && secondsRemaining > 0) {
        // Show countdown when less than 60 seconds
        setShowClosingTimer(true);
        setClosingCountdown(secondsRemaining);
      } else if (secondsRemaining <= 0) {
        // Salon is closed!
        setSalonClosed(true);
        setShowClosingTimer(false);
        checkSalonStatus(); // Force refresh status
      } else {
        setShowClosingTimer(false);
      }
    };

    // Check every second
    checkClosingTime();
    const interval = setInterval(checkClosingTime, 1000);

    return () => clearInterval(interval);
  }, [pauseInfo?.closingTime, checkSalonStatus]);

  useEffect(() => {
    if (bookingMode !== "walkin" || !id) return;

    const fetchSalonStats = async () => {
      try {
        const res = await fetch(`/api/walkin/salon-state?salonId=${id}`);
        const data = await res.json();

        setSalonStats({
          availableNow: data.availableNow || 0,
          totalWaiting: data.totalWaiting || 0,
          totalBooked: data.totalBooked || 0,
          totalServing: data.totalServing || 0,
          avgWaitTime: data.avgWaitTime || 0,
        });

        // ✅ Store barber states with time left
        setBarberStates(data.barbers || []);
      } catch (error) {
        console.error("Error fetching salon stats:", error);
      }
    };

    fetchSalonStats();
    const interval = setInterval(fetchSalonStats, 15000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [bookingMode, id]);

  useEffect(() => {
    console.log(
      "🔎 Button enable check → Services:",
      selectedServices,
      "Time:",
      selectedTime
    );
  }, [selectedServices, selectedTime]);

  const isSalonOpen = () => {
    if (!salon?.operatingHours && !salon?.openingHours) return true; // Default open if no hours

    const now = new Date();
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase(); // ✅ valid + works correctly

    const currentTime = now.getHours() * 100 + now.getMinutes();

    const hours = salon.operatingHours?.[currentDay] || salon.openingHours;

    if (!hours || hours.closed) return false;

    const openTime = parseInt(hours.open?.replace(":", "") || "0900");
    const closeTime = parseInt(hours.close?.replace(":", "") || "2100");

    return currentTime >= openTime && currentTime < closeTime;
  };

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
        setTimeout(() => setCurrentStep(2), 1000); // 🔥 THIS LINE
        return [...prev, service];
      }
    });
  };

  // 🔥 Auto-flip on barber selection (prebook only)
  const handleBarberClick = (barberId) => {
    const barberState = barberStates?.find((b) => b.barberId === barberId);

    if (barberState?.isPaused) {
      alert(
        "This barber is temporarily unavailable. Please select another barber."
      );
      return;
    }

    setSelectedBarber(barberId);
    if (bookingMode === "prebook") {
      setTimeout(() => setCurrentStep(3), 1000); // 🔥 THIS LINE
    }
  };

  const handleTimeClick = (time) => {
    console.log("Time selected:", time);
    setSelectedTime(time);
    setSelectedSlot(time); // optional: keep both in sync
  };

  const makeBookingRequest = async () => {
    try {
      setBookingError(null);
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userToken && { Authorization: `Bearer ${userToken}` }),
        },
        body: JSON.stringify(payload),
      });

      // ✅ Handle 409 conflict INSIDE makeBookingRequest
      if (response.status === 409) {
        const errorData = await response.json();
        alert(
          "Sorry! This time slot was just booked by another customer. Please select a different time."
        );
        window.location.reload();
        throw new Error("Slot already booked");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Booking failed");
      }

      const bookingResult = await response.json();
      return bookingResult;
    } catch (error) {
      setBookingError(error.message);
      throw error;
    }
  };

  const handleBooking = async () => {
    if (isWalkinBooking || isBooking) return;
    setIsWalkinBooking(true);
    // ✅ Basic service validation (required for both modes)
    if (selectedServices.length === 0) {
      alert("Please select at least one service");
      return;
    }

    // ✅ Pre-book mode: require date & time
    if (bookingMode === "prebook" && (!selectedDate || !selectedSlot)) {
      alert("Please select date and time");
      return;
    }

    // ✅ Walk-in mode: NO date/time needed, just barber selection
    if (!selectedBarber) {
      alert("Please select a barber");
      return;
    }

    try {
      console.log(
        "📌 Booking with:",
        selectedServices,
        selectedSlot,
        selectedBarber,
        userInfo
      );

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

      // ✅ GET userToken FIRST
      const currentUserInfo = UserDataManager.getStoredUserData();
      const userToken = localStorage.getItem("userToken");

      // ✅ BRANCH: Different logic based on booking mode
      if (bookingMode === "walkin") {
        // ========== WALK-IN BOOKING ==========
        // ========== WALK-IN BOOKING ==========
        const walkinPayload = {
          salonId: salon?._id || id,
          barberId: selectedBarber,
          service: allServices,
          price: totalPrice,
          customerName: currentUserInfo?.name || "Guest",
          customerPhone:
            currentUserInfo?.phone || currentUserInfo?.mobile || "",
          customerEmail: currentUserInfo?.email || "",
          userId: currentUserInfo?._id || currentUserInfo?.id || null,
          estimatedDuration: selectedServices[0]?.duration || 45,
        };

        console.log("✅ Walk-in Booking payload:", walkinPayload);

        const walkinResponse = await fetch("/api/walkin/create-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(walkinPayload),
        });

        if (!walkinResponse.ok) {
          const errorData = await walkinResponse.json();
          throw new Error(errorData.message || "Walk-in booking failed");
        }

        const walkinResult = await walkinResponse.json();
        console.log("✅ Walk-in booking confirmed:", walkinResult);

        // Reset form
        setSelectedServices([]);
        setSelectedBarber(null);

        // Redirect to walk-in confirmation with QR code
        router.push(
          `/walkin/confirmation?bookingId=${walkinResult.booking.bookingId}`
        );
      } else {
        // ========== PRE-BOOK BOOKING (EXISTING) ==========
        const prebookPayload = {
          salonId: salon?._id || id,
          service: allServices,
          barber:
            selectedBarber === "ANY"
              ? "Unassigned"
              : selectedBarberDetails?.name || "Any Available",
          barberId: selectedBarber === "ANY" ? null : selectedBarber || null,
          assignmentStatus: selectedBarber === "ANY" ? "pending" : "assigned",
          date: selectedDate,
          time: selectedSlot,
          price: totalPrice,
          customerName: currentUserInfo?.name || "Guest",
          customerPhone:
            currentUserInfo?.phone || currentUserInfo?.mobile || "",
          customerAge: currentUserInfo?.age || null,
          user: currentUserInfo,
          userId: currentUserInfo?._id || currentUserInfo?.id || null,
        };

        console.log("✅ Pre-book Booking payload:", prebookPayload);

        const makeBookingRequest = async () => {
          try {
            setBookingError(null);
            const response = await fetch("/api/bookings/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(userToken && { Authorization: `Bearer ${userToken}` }),
              },
              body: JSON.stringify(prebookPayload),
            });

            // Handle 409 conflict
            if (response.status === 409) {
              const errorData = await response.json();
              alert(
                "Sorry! This time slot was just booked by another customer. Please select a different time."
              );
              window.location.reload();
              throw new Error("Slot already booked");
            }

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Booking failed");
            }

            const bookingResult = await response.json();
            return bookingResult;
          } catch (error) {
            setBookingError(error.message);
            throw error;
          }
        };

        // Make the booking request
        const bookingResult = await makeBookingRequest();

        console.log("✅ Pre-book Booking confirmed:", bookingResult);

        // Extract the booking ID correctly
        const bookingId =
          bookingResult.bookingId || bookingResult._id || bookingResult.id;

        // Reset form
        setSelectedServices([]);
        setSelectedBarber(null);
        setSelectedDate("");
        setSelectedSlot("");

        // Redirect to booking confirmation page
        router.push(`/booking/confirmed?id=${bookingId}`);
      }
    } catch (error) {
      console.error("❌ Booking error:", error);
      alert(`Booking failed: ${error.message}`);
    } finally {
      setIsWalkinBooking(false);
      setIsBooking(false);
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

  return (
    <div className={styles.container}>
      {/* Floating Closing Countdown */}
      {showClosingTimer && closingCountdown > 0 && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background:
              closingCountdown <= 20
                ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            padding: "20px 30px",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            animation:
              closingCountdown <= 20 ? "pulse 0.5s infinite" : "slideDown 0.3s",
            minWidth: "200px",
          }}
        >
          <div style={{ fontSize: "48px", fontWeight: "700", lineHeight: 1 }}>
            {closingCountdown}
          </div>
          <div
            style={{ fontSize: "16px", fontWeight: 600, textAlign: "center" }}
          >
            {closingCountdown <= 20
              ? "🚨 Salon closing NOW!"
              : "⏰ Salon closing soon"}
          </div>
          <div style={{ fontSize: "13px", opacity: 0.9 }}>
            Bookings will be blocked
          </div>
        </div>
      )}

      {/* Salon Closed Overlay */}
      {salonClosed && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "24px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔒</div>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "12px",
                color: "#1f2937",
              }}
            >
              Salon Closed
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "24px",
              }}
            >
              This salon is now closed. Please come back during operating hours.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "12px 32px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      )}

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
      {/* Real-time Salon Status with Time */}
      {salonStatus === "paused" && pauseInfo && (
        <div className={styles.pausedBanner}>
          <span>⏸️ {pauseInfo.pauseReason || "Salon temporarily paused"}</span>
          <span className={styles.resumeTime}>
            {(() => {
              if (!pauseInfo?.pauseUntil) return "soon";

              try {
                const resumeTime = new Date(pauseInfo.pauseUntil);
                if (isNaN(resumeTime.getTime())) return "soon";

                return resumeTime.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
              } catch (error) {
                return "soon";
              }
            })()}
          </span>
        </div>
      )}

      {salonStatus === "closing" && pauseInfo && (
        <div className={styles.closingBanner}>
          <span>⚠️ Salon closing soon</span>
          <span className={styles.resumeTime}>
            Closes at {pauseInfo.closingTime}
          </span>
        </div>
      )}

      {/* ✅ NEW: Mode Toggle */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeButton} ${
            bookingMode === "prebook" ? styles.active : ""
          }`}
          onClick={() => setBookingMode("prebook")}
        >
          📅 Pre-book
        </button>
        <button
          className={`${styles.modeButton} ${
            bookingMode === "walkin" ? styles.active : ""
          }`}
          onClick={() => setBookingMode("walkin")}
        >
          ⚡ Walk-in
        </button>
      </div>

      {/* Hero Section */}
      <motion.section
        className={styles.heroSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.CarouselContainer}>
          <ImageCarousel images={salon.galleryImages} autoPlayInterval={4000} />
        </div>

        <div className={styles.salonBasicInfo}>
          {/* <div className={styles.ratingSection}>
            <div className={styles.mainRating}>
              ⭐ {salon.ratings.overall.toFixed(1)}
            </div>
            <div className={styles.reviewCount}>
              ({salon.ratings.totalReviews} reviews)
            </div>
          </div> */}
          {/* 
          <div className={styles.locationInfo}>
            <p>📍 {salon.location.address}</p>
            <p>📞 {salon.phone}</p>
          </div> */}
          {/* Map Section */}
          <LocationMap
            location={salon.location}
            userLocation={userLocation} // This now comes from useLocation hook
            salonName={salon.salonName}
            address={salon.location?.address}
            phone={salon.phone}
          />
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
      <ReviewsSection salonId={salon._id} />

      {/* Services Section */}
      {/* Booking Progress Steps */}
      <div className={styles.bookingProgressBar}>
        <div
          className={`${styles.progressStep} ${
            currentStep >= 1 ? styles.active : ""
          }`}
        >
          <span className={styles.stepNumber}>1</span>
          <span className={styles.stepLabel}>Services</span>
        </div>
        <div className={styles.progressLine}></div>
        <div
          className={`${styles.progressStep} ${
            currentStep >= 2 ? styles.active : ""
          }`}
        >
          <span className={styles.stepNumber}>2</span>
          <span className={styles.stepLabel}>Barber</span>
        </div>
        {bookingMode === "prebook" && (
          <>
            <div className={styles.progressLine}></div>
            <div
              className={`${styles.progressStep} ${
                currentStep >= 3 ? styles.active : ""
              }`}
            >
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepLabel}>Date & Time</span>
            </div>
          </>
        )}
      </div>

      {/* Stepped Booking Card */}
      <div className={styles.bookingCard}>
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.43, 0.13, 0.23, 0.96],
              }}
              className={styles.cardContent}
            >
              <h3 className={styles.cardTitle}>Select Services</h3>
              <div className={styles.servicesGrid}>
                {getFilteredServices().map((service, index) => (
                  <motion.div
                    key={index}
                    className={`${styles.serviceCard} ${
                      selectedServices.find((s) => s.name === service.name)
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => handleServiceClick(service)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h4 className={styles.serviceName}>{service.name}</h4>
                    <p className={styles.servicePrice}>₹{service.price}</p>
                    <p className={styles.serviceDuration}>
                      {service.duration} min
                    </p>
                  </motion.div>
                ))}
              </div>
              {/* <div className={styles.cardActions}>
              <button
                className={styles.nextButton}
                disabled={selectedServices.length === 0}
                onClick={() => setCurrentStep(2)}
              >
                Next: Choose Barber →
              </button>
            </div> */}
            </motion.div>
          )}

          {/* Step 2: Barbers + Status (Walk-in only shows status here) */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.43, 0.13, 0.23, 0.96],
              }}
              className={styles.cardContent}
            >
              <h3 className={styles.cardTitle}>Choose Your Barber</h3>
              {availableBarbers.length > 0 ? (
                <div className={styles.barbersGrid}>
                  <motion.div
                    key="any-barber"
                    className={`${styles.barberCard} ${styles.anyBarberCard} ${
                      selectedBarber === "ANY" ? styles.selected : ""
                    }`}
                    onClick={() => handleBarberClick("ANY")}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={styles.anyBarberIcon}>👥</div>
                    <h3>Any Available Barber</h3>
                    <p className={styles.flexibleText}>
                      Book now - A barber will be assigned at the salon
                    </p>
                    <span className={styles.flexibleBadge}>Flexible</span>
                  </motion.div>
                  {availableBarbers.map((barber) => {
                    const barberState =
                      bookingMode === "walkin"
                        ? barberStates.find(
                            (b) => b.barberId === barber._id.toString()
                          )
                        : null;

                    return (
                      <motion.div
                        key={barber._id}
                        className={`${styles.barberCard} ${
                          selectedBarber === barber._id ? styles.selected : ""
                        }`}
                        onClick={() => handleBarberClick(barber._id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {bookingMode === "walkin" && barberState && (
                          <div className={styles.walkInStatusBadge}>
                            {barberState.isPaused ? (
                              <span className={styles.pausedBadge}>
                                ⏸ Queue Paused
                              </span>
                            ) : (
                              <>
                                {barberState.status === "AVAILABLE" && (
                                  <span className={styles.availableNow}>
                                    ✅ Available Now
                                  </span>
                                )}
                                {barberState.status === "OCCUPIED" && (
                                  <span className={styles.occupiedNow}>
                                    🟢 Busy ({barberState.timeLeft}m left)
                                  </span>
                                )}
                                {barberState.queueCount > 0 && (
                                  <span className={styles.queueBadge}>
                                    {barberState.queueCount} in queue
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        <div className={styles.barberPhoto}>
                          <img
                            src={barber.photo || "/default-barber.png"}
                            alt={barber.name}
                            className={styles.barberImage}
                          />
                        </div>

                        <h4 className={styles.barberName}>{barber.name}</h4>
                        <p className={styles.barberExperience}>
                          {barber.experience} years experience
                        </p>

                        {barber.rating && (
                          <p className={styles.barberRating}>
                            ⭐ {barber.rating}/5
                          </p>
                        )}

                        {/* {barber.skills && barber.skills.length > 0 && (
                          <div className={styles.barberSkills}>
                            {barber.skills.slice(0, 3).map((skill, idx) => (
                              <span key={idx} className={styles.skillChip}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        )} */}

                        {/* ✅ Walk-in: Show wait time estimate at bottom */}
                        {bookingMode === "walkin" && barberState && (
                          <div className={styles.waitEstimate}>
                            {barberState.isPaused ? (
                              <span className={styles.pausedWait}>
                                Temporarily Unavailable
                              </span>
                            ) : barberState.status === "AVAILABLE" ? (
                              <span className={styles.noWait}>No Wait</span>
                            ) : (
                              <span className={styles.waitTime}>
                                ~
                                {barberState.timeLeft +
                                  barberState.queueCount * 45}{" "}
                                mins
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-blue-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">
                    Salon Will Assign Best Available Barber
                  </h4>
                </div>
              )}{" "}
              {/* Chair Visualization */}
              <div className={styles.chairsSection}>
                {/* <h4 className={styles.chairsTitle}>💈 Barber Chairs</h4> */}
                <div className={styles.chairsGrid}>
                  {barberStates.map((barber, index) => (
                    <div key={barber.barberId} className={styles.chairItem}>
                      <div
                        className={`${styles.chair} ${
                          barber.status === "AVAILABLE"
                            ? styles.available
                            : barber.status === "OCCUPIED"
                            ? styles.occupied
                            : styles.available
                        }`}
                      >
                        <div className={styles.chairIcon}>💺</div>
                        <div
                          className={`${styles.chairStatus} ${
                            barber.isPaused
                              ? styles.paused
                              : barber.status === "AVAILABLE"
                              ? styles.green
                              : barber.status === "OCCUPIED"
                              ? styles.orange
                              : styles.green
                          }`}
                        >
                          {barber.isPaused ? "⏸" : "●"}
                        </div>
                      </div>
                      <p className={styles.chairLabel}>Chair #{index + 1}</p>
                      <p className={styles.chairBarber}>{barber.name}</p>

                      {barber.isPaused ? (
                        <div className={styles.chairPaused}>
                          <span className={styles.chairBadgePaused}>
                            ⏸ Queue Paused
                          </span>
                          <p className={styles.pausedMessage}>
                            Barber is temporarily unavailable
                          </p>
                        </div>
                      ) : barber.status === "AVAILABLE" ? (
                        <span className={styles.chairBadge}>Available</span>
                      ) : (
                        <div className={styles.chairBusy}>
                          <span className={styles.chairBadgeOccupied}>
                            In Service
                          </span>
                          <p className={styles.chairCustomer}>
                            {barber.currentCustomer}
                          </p>
                          <p className={styles.chairTime}>
                            ~{barber.timeLeft}m left
                          </p>
                          {barber.queueCount > 0 && (
                            <p className={styles.chairQueue}>
                              {barber.queueCount} waiting
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Walk-in: Show real-time status below barbers */}
              <motion.section
                className={styles.realTimeStatus}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className={styles.statusTitle}>📊 Live Salon Status</h3>

                <div className={styles.statusGrid}>
                  <div className={styles.statusCard}>
                    <div className={styles.statusIcon}>🟢</div>
                    <div className={styles.statusValue}>
                      {salonStats.totalServing}
                    </div>
                    <div className={styles.statusLabel}>Serving Now</div>
                    {barberStates
                      .filter((b) => b.status === "OCCUPIED")
                      .map((b) => (
                        <div key={b.barberId} className={styles.miniInfo}>
                          {b.name}: {b.timeLeft}m
                        </div>
                      ))}
                  </div>

                  <div className={styles.statusCard}>
                    <div className={styles.statusIcon}>🟠</div>
                    <div className={styles.statusValue}>
                      {salonStats.totalWaiting}
                    </div>
                    <div className={styles.statusLabel}>In Queue</div>
                  </div>

                  <div className={styles.statusCard}>
                    <div className={styles.statusIcon}>🔴</div>
                    <div className={styles.statusValue}>
                      {salonStats.totalBooked}
                    </div>
                    <div className={styles.statusLabel}>
                      Booked (Not Arrived)
                    </div>
                  </div>

                  <div className={styles.statusCard}>
                    <div className={styles.statusIcon}>⏱️</div>
                    <div className={styles.statusValue}>
                      ~{salonStats.avgWaitTime} min
                    </div>
                    <div className={styles.statusLabel}>Avg Wait</div>
                  </div>
                </div>

                {/* Legend */}
                {/* <div className={styles.statusLegend}>
                    <div className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.green}`}>
                        ●
                      </span>
                      <span>Available</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.orange}`}>
                        ●
                      </span>
                      <span>In Service</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.red}`}>
                        ●
                      </span>
                      <span>Booked</span>
                    </div>
                  </div> */}
              </motion.section>
              <div className={styles.cardActions}>
                <button
                  className={styles.prevButton}
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back
                </button>
                <div className={styles.bookButtonContainer}>
                  <button
                    onClick={handleBooking}
                    disabled={
                      isWalkinBooking ||
                      isBooking ||
                      selectedServices.length === 0 ||
                      !selectedBarber ||
                      (bookingMode === "prebook" && !selectedSlot) ||
                      (bookingMode === "walkin" && !isSalonOpen())
                    }
                    className={`${styles.bookButton} ${
                      selectedServices.length === 0 ||
                      !selectedBarber ||
                      (bookingMode === "prebook" && !selectedSlot) ||
                      (bookingMode === "walkin" && !isSalonOpen())
                        ? styles.disabled
                        : ""
                    }`}
                  >
                    {isWalkinBooking || isBooking
                      ? "Processing..."
                      : bookingMode === "walkin" && !isSalonOpen()
                      ? "Salon is Closed"
                      : bookingMode === "walkin"
                      ? "Book Walk-in Now"
                      : "Book Appointment"}

                    {availableBarbers.length === 0 &&
                      selectedServices.length > 0 && (
                        <small className={styles.buttonSubtext}>
                          (Salon will assign barber)
                        </small>
                      )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Date & Time (Pre-book only) */}
          {currentStep === 3 && bookingMode === "prebook" && (
            <motion.section
              className={styles.bookingSection}
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
              style={{ transformOrigin: "left center" }}
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
          )}
        </AnimatePresence>
      </div>

      {/* Map Section 
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
      )}*/}

      {/* Book Appointment Button */}

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
                      ? chosenBarber._id || chosenBarber.name
                      : selectedBarber,
                    date: selectedDate,
                    time: selectedSlot,
                    user: {
                      ...(userOnboarding || {}),
                      phoneNumber:
                        userOnboarding?.phoneNumber ||
                        userOnboarding?.phone ||
                        userOnboarding?.mobile ||
                        "",
                      age: userOnboarding?.age || null,
                    },
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
