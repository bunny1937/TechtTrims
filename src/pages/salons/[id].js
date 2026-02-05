// pages/salons/[id].js
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import styles from "../../styles/SalonDetail.module.css";
import { UserDataManager } from "../../lib/userData";
import RetryButton from "@/components/RetryButton";
import ReviewsSection from "@/components/Salon/ReviewSection";
import ImageCarousel from "@/components/ImageCarousel";
import LocationMap from "../../components/Maps/LocationMap";
import { useLocation } from "../../hooks/useLocation";
import QueueDisplay from "@/components/Walkin/QueueDisplay";
import { showError, showSuccess, showWarning } from "@/lib/toast";

// Dynamic map import to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
// Helper to format time difference
const formatTime = (date) => {
  if (!date) return "N/A";
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000 / 60); // minutes
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to format remaining time
const formatTimeRemaining = (expiryDate) => {
  if (!expiryDate) return "N/A";
  const remaining = Math.ceil((new Date(expiryDate) - new Date()) / 1000 / 60); // minutes
  if (remaining < 0) return "Expired";
  if (remaining < 1) return "< 1 min";
  return `${remaining}m`;
};
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
  const [allBookings, setAllBookings] = useState([]); // NEW: Store all bookings for queue details
  const [csrfToken, setCsrfToken] = useState(null);
  const {
    userLocation,
    locationStatus,
    locationError,
    requestLocationPermission,
  } = useLocation();
  // ADD THESE NEW STATES
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const dataCache = useRef({
    services: null,
    barbers: null,
    bookings: null,
  });

  useEffect(() => {
    const fetchCSRFToken = async () => {
      try {
        const response = await fetch("/api/auth/csrf-token", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        // Retry after 2 seconds
        setTimeout(fetchCSRFToken, 2000);
      }
    };

    fetchCSRFToken();
  }, []);

  useEffect(() => {
    // Only run once when component mounts
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("userOnboardingData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserInfo(parsed);
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

  // ✅ OPTIMIZED: Memoized fetch with cache comparison
  const fetchAllBookings = useCallback(async () => {
    if (!id) return;

    try {
      await fetch("/api/walkin/booking/mark-expired", { method: "POST" });
      const res = await fetch(`/api/salons/${id}/bookings-detailed`, {
        cache: "no-store",
      });
      const data = await res.json();

      const now = new Date();
      const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);
      const activeBookings = data.bookings.filter((b) => {
        if (b.isExpired) return false;
        if (b.queueStatus === "RED" && b.expiresAt) {
          // ✅ CHECK IF expiresAt EXISTS
          return new Date(b.expiresAt) > bufferTime;
        }
        return true; // ✅ INCLUDE PREBOOKS WITHOUT expiresAt
      });

      // Only update if changed
      if (
        JSON.stringify(activeBookings) !==
        JSON.stringify(dataCache.current.bookings)
      ) {
        dataCache.current.bookings = activeBookings;
        setAllBookings(activeBookings);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [id]);

  // Initial fetch only
  useEffect(() => {
    if (id) {
      fetchAllBookings();
    }
  }, [id, fetchAllBookings]);

  // ✅ OPTIMIZED: Memoized with cache
  const fetchBarberStates = useCallback(async () => {
    if (bookingMode !== "walkin" || !id) return;

    try {
      const res = await fetch(`/api/walkin/salon-state?salonId=${id}`);
      const data = await res.json();

      // Only update if changed
      if (
        JSON.stringify(data.barbers) !==
        JSON.stringify(dataCache.current.barbers)
      ) {
        dataCache.current.barbers = data.barbers;
        setBarberStates(data.barbers);
      }
    } catch (error) {
      console.error("Error fetching barber states:", error);
    }
  }, [bookingMode, id]);

  // Initial fetch
  useEffect(() => {
    if (bookingMode === "walkin" && id) {
      fetchBarberStates();
    }
  }, [bookingMode, id, fetchBarberStates]);

  // ✅ NEW: Dynamic polling based on activity
  useEffect(() => {
    if (!id || !isOnline || bookingMode !== "walkin") return;

    let pollInterval = 5000; // Start with 5 seconds

    const pollData = async () => {
      const timeSinceLastUpdate = Date.now() - lastUpdate;

      // Dynamic interval based on activity
      if (timeSinceLastUpdate < 30000) {
        pollInterval = 3000; // Recent activity - poll every 3s
      } else if (timeSinceLastUpdate < 60000) {
        pollInterval = 5000; // Moderate - poll every 5s
      } else {
        pollInterval = 10000; // Low activity - poll every 10s
      }

      await Promise.all([fetchAllBookings(), fetchBarberStates()]);
    };

    const intervalId = setInterval(pollData, pollInterval);

    return () => clearInterval(intervalId);
  }, [
    id,
    isOnline,
    lastUpdate,
    bookingMode,
    fetchAllBookings,
    fetchBarberStates,
  ]);

  // ✅ KEEP SERVICES POLLING - But optimize with visibility
  useEffect(() => {
    if (!id) return;

    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/salons/${id}`);
        if (res.ok) {
          const data = await res.json();

          // Only update if services changed
          if (
            JSON.stringify(data.salon.services) !==
            JSON.stringify(dataCache.current.services)
          ) {
            dataCache.current.services = data.salon.services;
            setSalon((prevSalon) => ({
              ...prevSalon,
              services: data.salon.services,
            }));
          }
        }
      } catch (error) {
        console.error("Error polling services:", error);
      }
    };

    fetchServices();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchServices();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll only when visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchServices();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id]);

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

  // NEW: Poll services to catch enabled/disabled changes (ONLY when page visible)
  useEffect(() => {
    if (!id) return;

    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/salons/${id}`);
        if (res.ok) {
          const data = await res.json();

          // Update salon state with fresh services
          setSalon((prevSalon) => ({
            ...prevSalon,
            services: data.salon.services,
          }));
        }
      } catch (error) {
        console.error("Error polling services:", error);
      }
    };

    // Initial fetch
    fetchServices();

    // Visibility-aware polling - refresh when user comes back to page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchServices();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Poll every 10 seconds ONLY when page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchServices();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id]);

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

          // Fetch barbers who can perform the selected service
          const res = await fetch(
            `/api/salons/barbers/available?salonId=${
              salon._id
            }&service=${encodeURIComponent(firstServiceName)}`,
          );

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const barbers = await res.json();
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
  // ========================================
  // CHANGE 1: ADD useEffect - Sync manual location on mount
  // ========================================
  useEffect(() => {
    const isManual = sessionStorage.getItem("isManualMode") === "true";
    const manualLocation = sessionStorage.getItem("manualLocation");

    if (isManual && manualLocation) {
      try {
        const location = JSON.parse(manualLocation);
      } catch (e) {
        console.error("Error loading manual location:", e);
      }
    }
  }, []);

  // ========================================
  // CHANGE 2: ADD useEffect - Listen for storage changes
  // ========================================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "isManualMode" || e.key === "manualLocation") {
        // Force LocationMap to re-render by updating state
        // If you have a state for this, update it here
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const chosenService =
    salon?.services && selectedServices
      ? { name: selectedServices, ...(salon.services[selectedServices] || {}) }
      : null;
  const chosenBarber =
    salon?.barbers && selectedBarber
      ? salon.barbers.find(
          (b) => (b.id || b._id || b.name) === selectedBarber,
        ) || null
      : null;
  const [showBookingModal, setShowBookingModal] = useState(false);

  // ✅ NEW: Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Client re-fetch (optional, keeps data fresh if user navigates without reload)
  const computeTimeSlotsForDate = useCallback(
    (dateStr) => {
      if (!dateStr || !salon) return [];

      const slots = [];
      const now = new Date();
      const selectedDateObj = new Date(dateStr + "T00:00:00");
      const isToday = selectedDateObj.toDateString() === now.toDateString();

      // ✅ BLOCK TODAY FOR PREBOOK
      if (isToday) {
        return []; // No slots for today - use walk-in!
      }

      // ... rest of code for future dates

      // ✅ GET ACTUAL SALON HOURS FOR THIS DAY
      const dayName = selectedDateObj
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const dayHours = salon.operatingHours?.[dayName];

      if (!dayHours || dayHours.closed) {
        return []; // Salon closed this day
      }

      // ✅ PARSE SALON HOURS
      const [openHour, openMin] = dayHours.open.split(":").map(Number);
      const [closeHour, closeMin] = dayHours.close.split(":").map(Number);

      // Handle 24:00 (midnight next day)
      const actualCloseHour = closeHour === 24 ? 23 : closeHour;
      const actualCloseMin = closeHour === 24 ? 30 : closeMin;

      // ✅ FOR TODAY: Start from current time + 30min buffer
      let startHour, startMin;
      if (isToday) {
        const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
        startHour = bufferTime.getHours();
        startMin = bufferTime.getMinutes() >= 30 ? 30 : 0;

        // If current time + buffer is past closing, return empty
        if (
          startHour > actualCloseHour ||
          (startHour === actualCloseHour && startMin >= actualCloseMin)
        ) {
          return [];
        }
      } else {
        startHour = openHour;
        startMin = openMin;
      }

      // ✅ FIX: Get booked times correctly
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
          .map((b) => b.time), // ✅ FIXED
      );

      // ✅ GENERATE SLOTS FROM SALON HOURS
      for (let hour = startHour; hour <= actualCloseHour; hour++) {
        const minuteStart = hour === startHour ? startMin : 0;
        const minuteEnd = hour === actualCloseHour ? actualCloseMin : 60;

        for (let minute = minuteStart; minute < minuteEnd; minute += 30) {
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
    [salon, selectedDate],
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
      }),
    );

    if (!userOnboarding) return servicesArray;

    return servicesArray.filter(
      (service) =>
        service.gender.includes(userOnboarding.gender) ||
        service.gender.includes("All"),
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
      showWarning(
        "This barber is temporarily unavailable. Please select another barber.",
      );
      return;
    }

    setSelectedBarber(barberId);
    if (bookingMode === "prebook") {
      setTimeout(() => setCurrentStep(3), 1000); // 🔥 THIS LINE
    }
  };

  const handleTimeClick = (time) => {
    setSelectedTime(time);
    setSelectedSlot(time); // optional: keep both in sync
  };

  const makeBookingRequest = async () => {
    try {
      setBookingError(null);
      const response = await fetch("/api/prebook/create", {
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
        showWarning(
          "Sorry! This time slot was just booked by another customer. Please select a different time.",
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
      setIsWalkinBooking(false);
      showWarning("Please select at least one service");
      return;
    }

    // ✅ Pre-book mode: require date & time
    if (bookingMode === "prebook" && (!selectedDate || !selectedSlot)) {
      showWarning("Please select date and time");
      return;
    }

    // ✅ Walk-in mode: NO date/time needed, just barber selection
    if (!selectedBarber) {
      setIsWalkinBooking(false);
      showWarning("Please select a barber");
      return;
    }

    try {
      // ✅ BETTER: Wait for token + retry logic
      if (!csrfToken) {
        // Wait max 2 seconds for token
        const startTime = Date.now();
        while (!csrfToken && Date.now() - startTime < 2000) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!csrfToken) {
          showError("Security check failed. Refresh page and try again.");
          return;
        }
      }

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
        0,
      );

      // ✅ GET userToken FIRST
      const currentUserInfo = UserDataManager.getStoredUserData();
      const userToken = localStorage.getItem("userToken");
      const now = new Date();

      // ✅ BRANCH: Different logic based on booking mode
      if (bookingMode === "walkin") {
        // ========== WALK-IN BOOKING ==========
        const walkinPayload = {
          salonId: salon?._id || id,
          barberId: selectedBarber,
          service: allServices,
          // 👇 REQUIRED BY BACKEND
          date: now.toISOString().split("T")[0],
          time: now.toTimeString().slice(0, 5),
          price: totalPrice,
          customerName: currentUserInfo?.name || "Guest",
          customerPhone:
            currentUserInfo?.phone || currentUserInfo?.mobile || "",
          customerEmail: currentUserInfo?.email || "",
          userId: currentUserInfo?._id || currentUserInfo?.id || null,
          estimatedDuration: selectedServices[0]?.duration || 45,
        };
        const walkinResponse = await fetch("/api/walkin/create-booking", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken, // ✅ CSRF token included
          },
          credentials: "include",
          body: JSON.stringify(walkinPayload),
        });

        const walkinResult = await walkinResponse.json();

        if (!walkinResponse.ok) {
          throw new Error(walkinResult.message || "Walk-in booking failed");
        }
        // Refresh all data immediately
        await Promise.all([fetchAllBookings(), fetchBarberStates()]);

        // Reset form
        setSelectedServices([]);
        setSelectedBarber(null);

        const bookingId = walkinResult?.booking?.bookingId;

        if (!bookingId) {
          throw new Error("Booking ID missing from walk-in response");
        }

        router.push(`/walkin/confirmation?bookingId=${bookingId}`);

        // Reset form
        setSelectedServices([]);
        setSelectedBarber(null);
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
            currentUserInfo?.phone ||
            currentUserInfo?.mobile ||
            currentUserInfo?.phoneNumber ||
            "", // ✅ FIXED WITH FALLBACK
          customerEmail: currentUserInfo?.email || null,
          customerGender: currentUserInfo?.gender || null,
          customerLocation: userLocation || null, // ✅ ADD THIS
          user: currentUserInfo,
          userId: currentUserInfo?._id || currentUserInfo?.id || null,
        };
        const makeBookingRequest = async () => {
          try {
            setBookingError(null);

            // ✅ WAIT FOR CSRF TOKEN
            if (!csrfToken) {
              const startTime = Date.now();
              while (!csrfToken && Date.now() - startTime < 2000) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
              if (!csrfToken) {
                throw new Error(
                  "Security check failed. Please refresh the page.",
                );
              }
            }
            console.log("🔍 Prebook Payload:", prebookPayload); // ✅ ADD THIS

            const response = await fetch("/api/prebook/create", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken, // ✅ ADD THIS
                ...(userToken && { Authorization: `Bearer ${userToken}` }),
              },
              credentials: "include", // ✅ ADD THIS
              body: JSON.stringify(prebookPayload),
            });

            // Handle 409 conflict
            if (response.status === 409) {
              const errorData = await response.json();
              showWarning(
                "Sorry! This time slot was just booked by another customer. Please select a different time.",
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
        // Extract the booking ID correctly
        const bookingId =
          bookingResult.bookingId || bookingResult._id || bookingResult.id;

        // Reset form
        setSelectedServices([]);
        setSelectedBarber(null);
        setSelectedDate("");
        setSelectedSlot("");

        // Redirect to booking confirmation page
        router.push(`/prebook/confirmation?bookingId=${bookingId}`); // ✅ Match param name
      }
    } catch (error) {
      console.error("❌ Booking error:", error);
      showError(`Booking failed: ${error.message}`);
    } finally {
      setIsWalkinBooking(false);
      setIsBooking(false);
    }
  };

  const handleRegisterAndLink = async () => {
    // call registration API
    if (!regName || !regMobile)
      return showWarning("Please enter name and mobile");
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
        return showError(
          "Registration failed: " + (data.message || res.statusText),
        );
      }
      // set onboarding and close modal
      setUserOnboarding({ name: regName, mobile: regMobile, email: regEmail });
      setShowRegistrationModal(false);
      showSuccess("Account created! You are now registered.");
    } catch (e) {
      console.error(e);
      showError("Registration failed: " + e.message);
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
      {/* Location Status Feedback */}

      {locationError && locationStatus === "denied" && !isManualMode() && (
        <div className={styles.locationBannerError}>
          <span>⚠️</span>
          <div>
            <p>
              <strong>Location Permission Required</strong>
            </p>
            <p>{locationError}</p>
            <button onClick={() => window.location.reload()}>
              Allow Location Access
            </button>
          </div>
        </div>
      )}

      {locationError && locationStatus === "error" && (
        <div className={styles.locationBannerWarning}>
          <span>⏱️</span>
          <p>{locationError}</p>
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

      {/* ✅ Mode Toggle with Prebook Info */}
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeButton} ${
            bookingMode === "prebook" ? styles.active : ""
          }`}
          onClick={() => setBookingMode("prebook")}
        >
          📅 Pre-book
          <span className={styles.modeSubtext}>Schedule appointment</span>
        </button>
        <button
          className={`${styles.modeButton} ${
            bookingMode === "walkin" ? styles.active : ""
          }`}
          onClick={() => setBookingMode("walkin")}
        >
          ⚡ Walk-in
          <span className={styles.modeSubtext}>Join queue now</span>
        </button>
      </div>

      {/* Prebook Info Banner */}
      {bookingMode === "prebook" && (
        <div className={styles.prebookInfoBanner}>
          <span className={styles.prebookIcon}>📅</span>
          <div className={styles.prebookInfo}>
            <strong>Pre-booking Mode</strong>
            <p>
              Reserve your spot in advance. You&apos;ll be moved to priority
              queue 1 hour before your scheduled time.
            </p>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.CarouselContainer}>
          <ImageCarousel images={salon.galleryImages} autoPlayInterval={4000} />
        </div>

        <div className={styles.salonBasicInfo}>
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
      </section>
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
        {/* Step 1: Services */}
        {currentStep === 1 && (
          <div key="step1" className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Select Services</h3>
            <div className={styles.servicesGrid}>
              {getFilteredServices().map((service, index) => {
                // Check if service is disabled (handle undefined as enabled by default)
                const isDisabled = service.enabled === false;

                return (
                  <div
                    key={index}
                    className={`${styles.serviceCard} ${
                      selectedServices.find((s) => s.name === service.name)
                        ? styles.selected
                        : ""
                    } ${isDisabled ? styles.disabledService : ""}`}
                    onClick={() => {
                      if (isDisabled) {
                        alert(
                          `${service.name} is currently unavailable. Please select another service.`,
                        );
                        return;
                      }
                      handleServiceClick(service);
                    }}
                    style={{
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      pointerEvents: isDisabled ? "none" : "auto",
                    }}
                  >
                    {/* Disabled Overlay */}
                    {isDisabled && (
                      <div className={styles.disabledOverlay}>
                        <span className={styles.disabledBadge}>
                          ❌ DISABLED
                        </span>
                      </div>
                    )}

                    <h4 className={styles.serviceName}>{service.name}</h4>
                    <p className={styles.servicePrice}>₹{service.price}</p>
                    <p className={styles.serviceDuration}>
                      {service.duration} min
                    </p>
                  </div>
                );
              })}
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
          </div>
        )}

        {/* Step 2: Barbers + Status (Walk-in only shows status here) */}
        {currentStep === 2 && (
          <div key="step2" className={styles.cardContent}>
            <h3 className={styles.cardTitle}>Choose Your Barber</h3>
            {availableBarbers.length > 0 ? (
              <div className={styles.barbersGrid}>
                <div
                  key="any-barber"
                  className={`${styles.barberCard} ${styles.anyBarberCard} ${
                    selectedBarber === "ANY" ? styles.selected : ""
                  }`}
                  onClick={() => handleBarberClick("ANY")}
                >
                  <div className={styles.anyBarberIcon}>👥</div>
                  <h3>Any Available Barber</h3>
                  <p className={styles.flexibleText}>
                    Book now - A barber will be assigned at the salon
                  </p>
                  <span className={styles.flexibleBadge}>Flexible</span>
                </div>

                {availableBarbers.map((barber) => {
                  const barberState =
                    bookingMode === "walkin" && Array.isArray(barberStates)
                      ? barberStates.find(
                          (b) => b.barberId === barber._id.toString(),
                        )
                      : null;

                  // NEW: Get per-barber queue data
                  const barberBookings =
                    allBookings?.filter(
                      (b) => b.barberId === barber._id.toString(),
                    ) || [];
                  const greenBookings = barberBookings.filter(
                    (b) => b.queueStatus === "GREEN",
                  );
                  const orangeBookings = barberBookings
                    .filter((b) => b.queueStatus === "ORANGE")
                    .sort(
                      (a, b) => new Date(a.arrivedAt) - new Date(b.arrivedAt),
                    );
                  const redBookings = barberBookings.filter(
                    (b) =>
                      b.queueStatus === "RED" &&
                      !b.isExpired &&
                      new Date(b.expiresAt) > new Date(),
                  );

                  return (
                    <div
                      key={barber._id}
                      className={`${styles.barberCard} ${
                        selectedBarber === barber._id ? styles.selected : ""
                      } ${
                        barber.isAvailable === false
                          ? styles.unavailableCard
                          : ""
                      }`}
                      onClick={() => {
                        if (barber.isAvailable === false) {
                          alert(
                            `${barber.name} is currently unavailable. Please select another barber.`,
                          );
                          return;
                        }
                        handleBarberClick(barber._id);
                      }}
                      style={{
                        opacity: barber.isAvailable === false ? 0.5 : 1,
                        cursor:
                          barber.isAvailable === false
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {/* Unavailable Overlay */}
                      {barber.isAvailable === false && (
                        <div className={styles.unavailableOverlay}>
                          <span className={styles.unavailableText}>
                            ❌ UNAVAILABLE
                          </span>
                        </div>
                      )}

                      {/* Walk-in Status Badge */}
                      {bookingMode === "walkin" &&
                        barberState &&
                        barber.isAvailable !== false && (
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
                                {orangeBookings.length > 0 && (
                                  <span className={styles.queueBadge}>
                                    {orangeBookings.length} in priority queue
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
                          width={120}
                          height={120}
                          className={styles.barberImage}
                          unoptimized
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

                      {/* Walk-in: Show wait time estimate at bottom */}
                      {bookingMode === "walkin" &&
                        barberState &&
                        barber.isAvailable !== false && (
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
                                  orangeBookings.length * 45}{" "}
                                mins
                              </span>
                            )}
                          </div>
                        )}

                      {/* Per-Barber Queue Summary (Walk-in only) */}
                      {bookingMode === "walkin" &&
                        barber.isAvailable !== false && (
                          <div className={styles.queueSummaryMini}>
                            {greenBookings.length > 0 && (
                              <span className={styles.greenDot}>●</span>
                            )}
                            {orangeBookings.length > 0 && (
                              <span className={styles.orangeCount}>
                                {orangeBookings.length}
                              </span>
                            )}
                            {redBookings.length > 0 && (
                              <span className={styles.greyCount}>
                                +{redBookings.length}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">
                  Salon Will Assign Best Available Barber
                </h4>
              </div>
            )}

            {/* NEW: Complete Salon Queue Overview */}
            {bookingMode === "walkin" && allBookings && (
              <section className={styles.salonQueueOverview}>
                <h3 className={styles.queueOverviewTitle}>
                  💈 Live Salon Queue Status
                </h3>

                {/* Overall Salon Stats */}
                <div className={styles.overallStats}>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>🟢</span>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>
                        {
                          allBookings.filter((b) => b.queueStatus === "GREEN")
                            .length
                        }
                      </span>
                      <span className={styles.statLabel}>Now Serving</span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>🟠</span>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>
                        {
                          allBookings.filter((b) => b.queueStatus === "ORANGE")
                            .length
                        }
                      </span>
                      <span className={styles.statLabel}>Priority Queue</span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>⚫</span>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>
                        {
                          allBookings.filter((b) => b.queueStatus === "RED")
                            .length
                        }
                      </span>
                      <span className={styles.statLabel}>
                        Booked (Not Arrived)
                      </span>
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statIcon}>💺</span>
                    <div className={styles.statContent}>
                      <span className={styles.statValue}>
                        {availableBarbers?.length || 0}
                      </span>
                      <span className={styles.statLabel}>Total Chairs</span>
                    </div>
                  </div>
                </div>

                {/* Per-Barber Queue Display */}
                <div className={styles.barbersQueueContainer}>
                  {availableBarbers.map((barber, barberIndex) => {
                    const barberBookings = allBookings.filter(
                      (b) => b.barberId === barber._id,
                    );
                    const greenBooking = barberBookings.find(
                      (b) => b.queueStatus === "GREEN",
                    );
                    const orangeBookings = barberBookings
                      .filter((b) => b.queueStatus === "ORANGE")
                      .sort(
                        (a, b) => new Date(a.arrivedAt) - new Date(b.arrivedAt),
                      );
                    const redBookings = barberBookings.filter(
                      (b) => b.queueStatus === "RED",
                    );

                    return (
                      <div key={barber._id} className={styles.barberQueueCard}>
                        {/* Barber Header */}
                        <div className={styles.barberQueueHeader}>
                          <div className={styles.barberInfo}>
                            <h4 className={styles.barberQueueName}>
                              {barber.name}
                            </h4>
                            <span className={styles.chairBadge}>
                              Chair #{barberIndex + 1}
                            </span>
                          </div>
                          <div className={styles.queueCount}>
                            <span className={styles.countBadge}>
                              {orangeBookings.length + redBookings.length}{" "}
                              waiting
                            </span>
                          </div>
                        </div>

                        {/* Chair Status */}
                        <div className={styles.chairStatusRow}>
                          <div className={styles.chairIconBox}>
                            <span className={styles.chairEmoji}>💺</span>
                            <span className={styles.chairLabel}>CHAIR</span>
                          </div>
                          {greenBooking ? (
                            <div className={styles.servingBox}>
                              <span className={styles.servingIndicator}>
                                🟢
                              </span>
                              <div className={styles.servingDetails}>
                                <span className={styles.servingName}>
                                  {greenBooking.customerName}
                                </span>
                                <span className={styles.servingStatus}>
                                  Now Serving
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.availableBox}>
                              <span className={styles.availableText}>
                                Available
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Queue Line */}
                        <div className={styles.queueLineContainer}>
                          <div className={styles.queueLineLabel}>
                            QUEUE ({orangeBookings.length + redBookings.length}{" "}
                            waiting)
                          </div>
                          <div className={styles.queueLine}>
                            {/* Priority Queue (ORANGE) */}
                            {orangeBookings.map((booking, idx) => (
                              <div
                                key={booking._id}
                                className={`${styles.queueDot} ${styles.orangeDot}`}
                              >
                                <span className={styles.dotNumber}>
                                  #{idx + 1}
                                </span>
                                <span className={styles.dotName}>
                                  {booking.customerName}
                                </span>
                                <span className={styles.dotStatus}>
                                  Arrived
                                </span>
                              </div>
                            ))}

                            {/* Temporary Queue (RED) */}
                            {redBookings.map((booking, idx) => {
                              const bookingTime = new Date(
                                booking.createdAt,
                              ).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                              const remaining = Math.max(
                                0,
                                Math.ceil(
                                  (new Date(booking.expiresAt) - new Date()) /
                                    1000 /
                                    60,
                                ),
                              );

                              return (
                                <div
                                  key={booking._id}
                                  className={`${styles.queueDot} ${styles.redDot}`}
                                >
                                  <span className={styles.dotNumber}>⚫</span>
                                  <span className={styles.dotName}>
                                    {booking.customerName}
                                  </span>
                                  <span className={styles.dotStatus}>
                                    Booked
                                  </span>
                                  <span className={styles.dotTime}>
                                    Booked at - {bookingTime}
                                  </span>
                                  <span className={styles.dotExpiry}>
                                    {remaining}m
                                  </span>
                                </div>
                              );
                            })}

                            {/* Empty State */}
                            {barberBookings.length === 0 && (
                              <div className={styles.emptyQueue}>
                                <span>No one in queue</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats */}
                        <div className={styles.barberQuickStats}>
                          <div className={styles.quickStat}>
                            <span className={styles.quickStatLabel}>
                              Serving:
                            </span>
                            <span className={styles.quickStatValue}>
                              {greenBooking ? "1" : "0"}
                            </span>
                          </div>
                          <div className={styles.quickStat}>
                            <span className={styles.quickStatLabel}>
                              Priority:
                            </span>
                            <span className={styles.quickStatValue}>
                              {orangeBookings.length}
                            </span>
                          </div>
                          <div className={styles.quickStat}>
                            <span className={styles.quickStatLabel}>
                              Booked:
                            </span>
                            <span className={styles.quickStatValue}>
                              {redBookings.length}
                            </span>
                          </div>
                          <div className={styles.quickStat}>
                            <span className={styles.quickStatLabel}>
                              Est. Wait:
                            </span>
                            <span className={styles.quickStatValue}>
                              {greenBooking
                                ? Math.max(
                                    0,
                                    Math.ceil(
                                      (new Date(
                                        greenBooking.expectedCompletionTime,
                                      ) -
                                        new Date()) /
                                        1000 /
                                        60,
                                    ),
                                  ) +
                                  orangeBookings.length * 30
                                : orangeBookings.length * 30}
                              m
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

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
          </div>
        )}

        {/* Step 3: Date & Time (Pre-book only) */}
        {currentStep === 3 && bookingMode === "prebook" && (
          <section
            className={styles.bookingSection}
            style={{ transformOrigin: "left center" }}
          >
            <h3 className={styles.sectionTitle}>Select Date & Time</h3>

            <div className={styles.dateTimePicker}>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={
                  new Date(Date.now() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                max={
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
                className={styles.dateInput}
              />

              <div className={styles.timeSlots}>
                {!selectedDate ? (
                  <p className={styles.selectDatePrompt}>
                    Please select a date first
                  </p>
                ) : timeSlots.length === 0 ? (
                  <div className={styles.noSlotsMessage}>
                    <span className={styles.warningIcon}>⚠️</span>
                    <div>
                      <strong>No slots available for same-day booking</strong>
                      <p>
                        Pre-booking is for future appointments. Please select
                        tomorrow onwards, or switch to <strong>Walk-in</strong>{" "}
                        mode for same-day bookings.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.timeSlotsWrapper}>
                    {timeSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        className={`${styles.timeSlot} ${
                          selectedSlot === slot.time ? styles.selected : ""
                        } ${!slot.available ? styles.disabled : ""}`}
                        onClick={() => handleTimeClick(slot.time)}
                        disabled={!slot.available}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ ADD NAVIGATION BUTTONS */}
            <div className={styles.stepNavigation}>
              <button
                className={styles.prevButton}
                onClick={() => setCurrentStep(2)}
              >
                ← Back
              </button>

              <button
                onClick={handleBooking}
                disabled={
                  isBooking ||
                  !selectedDate ||
                  !selectedSlot ||
                  timeSlots.length === 0
                }
                className={`${styles.bookButton} ${
                  !selectedDate || !selectedSlot || timeSlots.length === 0
                    ? styles.disabled
                    : ""
                }`}
              >
                {isBooking ? "Booking..." : "Confirm Pre-booking"}
              </button>
            </div>
          </section>
        )}
      </div>
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
                      showError(
                        "Booking failed: " + (err.message || res.statusText),
                      );
                      return;
                    }
                    const data = await res.json();
                    showSuccess(
                      "Booking confirmed! Booking ID: " +
                        (data.bookingId || data.id || "N/A"),
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
                        s.time === selectedSlot
                          ? { ...s, available: false }
                          : s,
                      ),
                    );
                    // optionally navigate to confirmation page
                    router.push(
                      "user/bookings/confirmed?id=" +
                        (data.bookingId || data.id),
                    );
                  } catch (e) {
                    console.error(e);
                    showError("Booking failed: " + e.message);
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
// ✅ NEW - Static generation with ISR
export async function getStaticPaths() {
  return {
    paths: [], // No pre-render, generate on-demand
    fallback: "blocking",
  };
}

export async function getStaticProps({ params }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/salons/${params.id}?public=true`,
    );

    if (!response.ok) {
      return { notFound: true };
    }

    const data = await response.json();

    return {
      props: {
        initialSalon: data.salon,
      },
      revalidate: 300, // 5 minutes
    };
  } catch (error) {
    console.error("SSG salon fetch error:", error);
    return { notFound: true };
  }
}
