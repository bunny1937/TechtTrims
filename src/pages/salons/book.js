// pages/salons/book.js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import styles from "../../styles/Booking.module.css";
import { showError, showSuccess, showWarning } from "@/lib/toast";

export default function BookingPage() {
  const router = useRouter();
  const { salonId, serviceId, serviceName, price } = router.query;

  const [mobile, setMobile] = useState("");
  const [barbers, setBarbers] = useState([]);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Get user info from session
    const sessionData = sessionStorage.getItem("userSession");
    if (sessionData) {
      const userData = JSON.parse(sessionData);
      setUserInfo(userData);
    }

    // Fetch barbers
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedBarber, selectedDate]);

  const fetchBarbers = async () => {
    // Mock data - in production, fetch from API
    setBarbers([
      {
        id: "1",
        name: "Raj Kumar",
        rating: 4.5,
        specialization: "Hair Styling",
        bookings: 1250,
      },
      {
        id: "2",
        name: "Amit Singh",
        rating: 4.8,
        specialization: "Beard Expert",
        bookings: 980,
      },
      {
        id: "3",
        name: "Priya Sharma",
        rating: 4.7,
        specialization: "Color Specialist",
        bookings: 850,
      },
    ]);
  };

  const fetchAvailableSlots = async () => {
    // Generate time slots
    const allSlots = [];
    for (let hour = 9; hour < 21; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${min
          .toString()
          .padStart(2, "0")}`;
        allSlots.push({
          time,
          available: Math.random() > 0.3, // Mock availability
          waitTime: Math.floor(Math.random() * 15),
        });
      }
    }
    setSlots(allSlots);
  };

  const handleBooking = async () => {
    if (!mobile || !selectedBarber || !selectedDate || !selectedSlot) {
      showWarning("Please fill all required fields");
      return;
    }

    const bookingData = {
      salonId,
      serviceId,
      barberId: selectedBarber,
      date: selectedDate,
      timeSlot: selectedSlot,
      userDetails: {
        name: userInfo?.name || "Guest",
        mobile,
        gender: userInfo?.gender || "other",
      },
    };

    try {
      const response = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (response.ok) {
        const result = await response.json();
        // Show success and redirect to confirmation
        showSuccess("Booking Confirmed!");
        const bookingId = result?.booking?.id || result?.bookingId;
        if (bookingId) router.push(`/bookings?id=${bookingId}`);
        else router.push("/bookings");
      } else {
        showError("Booking failed. Please try again.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      showWarning("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <h1>Book Appointment</h1>
      <div className={styles.serviceInfo}>
        <h2>{serviceName}</h2>
        <span className={styles.price}>₹{price}</span>
      </div>

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label>📱 Mobile Number</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="Enter your mobile number"
            maxLength="10"
          />
        </div>

        <div className={styles.formGroup}>
          <label>👨‍🦱 Select Barber</label>
          <div className={styles.barberGrid}>
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className={`${styles.barberCard} ${
                  selectedBarber === barber.id ? styles.selected : ""
                }`}
                onClick={() => setSelectedBarber(barber.id)}
              >
                <div className={styles.barberInfo}>
                  <h3>{barber.name}</h3>
                  <p>
                    ⭐ {barber.rating} | {barber.specialization}
                  </p>
                  <p>{barber.bookings} bookings</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>📅 Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {slots.length > 0 && (
          <div className={styles.formGroup}>
            <label>⏰ Select Time Slot</label>
            <div className={styles.slotGrid}>
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  className={`${styles.slotBtn} 
                      ${!slot.available ? styles.unavailable : ""} 
                      ${selectedSlot === slot.time ? styles.selected : ""}`}
                  onClick={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                >
                  {slot.time}
                  {slot.available && slot.waitTime > 0 && (
                    <span className={styles.waitTime}>
                      ~{slot.waitTime}min wait
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.userDetails}>
          <p>Booking for: {userInfo?.name || "Guest"}</p>
          <p>Gender: {userInfo?.gender || "Not specified"}</p>
        </div>

        <button className={styles.confirmBtn} onClick={handleBooking}>
          Confirm Booking
        </button>
      </div>
    </div>
  );
}
