// src/pages/salons/profile.js - COMPLETE FILE
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../components/OwnerSidebar";
import styles from "../../styles/salon/SalonProfile.module.css";
import dashboardStyles from "../../styles/SalonDashboard.module.css";
import { showSuccess, showError } from "../../lib/toast";

export default function SalonProfilePage() {
  const router = useRouter();
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Helper functions for time conversion
  const normalizeTime = (time) => {
    if (!time) return "09:00";
    if (time === "24:00" || time === "2400") return "23:59";
    if (time === "00:00" || time === "0000") return "00:00";
    if (time.length === 4) {
      return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
    }
    return time;
  };

  const denormalizeTime = (time) => {
    if (time === "23:59") return "24:00";
    return time;
  };

  useEffect(() => {
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    const salonId = salonData._id || salonData.id;

    if (!salonId) {
      showError("Invalid salon session");
      router.push("/auth/login");
      return;
    }

    setSalon(salonData);
    setFormData(salonData);
    loadSalonDetails(salonId);
  }, [router]);

  const loadSalonDetails = async (salonId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/salons/profile?salonId=${salonId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch salon details");
      }
      const data = await res.json();
      setSalon(data);
      setFormData(data);
    } catch (error) {
      console.error("Error loading salon:", error);
      showError("Failed to load salon profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const salonId = salon._id || salon.id;
      const res = await fetch(`/api/salons/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, ...formData }),
      });

      if (res.ok) {
        const result = await res.json();
        showSuccess("Profile updated successfully");
        setIsEditing(false);
        setSalon(result.salon);
        setFormData(result.salon);

        // Update localStorage
        localStorage.setItem("salonSession", JSON.stringify(result.salon));
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showError("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className={dashboardStyles.dashboardWrapper}>
        <div className={dashboardStyles.sidebarDesktop}>
          <OwnerSidebar />
        </div>
        <main className={dashboardStyles.mainContent}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={dashboardStyles.dashboardWrapper}>
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div
          className={dashboardStyles.sidebarOverlay}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={dashboardStyles.sidebarMobile}
            onClick={(e) => e.stopPropagation()}
          >
            <OwnerSidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className={dashboardStyles.sidebarDesktop}>
        <OwnerSidebar />
      </div>

      {/* Main Content */}
      <main className={dashboardStyles.mainContent}>
        {/* Mobile Top Bar */}
        <div className={dashboardStyles.mobileTopBar}>
          <button
            className={dashboardStyles.menuButton}
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h2 className={dashboardStyles.mobileTitle}>
            Salon Profile
            <span></span>
          </h2>
          <button
            className={isEditing ? styles.saveButton : styles.editButton}
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          >
            {isEditing ? "💾 Save Changes" : "✏️ Edit Profile"}
          </button>
        </div>

        <div className={styles.container}>
          {/* Basic Information */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>📋 Basic Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Salon Name</label>
                <input
                  type="text"
                  value={formData.salonName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, salonName: e.target.value })
                  }
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label>Owner Name</label>
                <input
                  type="text"
                  value={formData.ownerName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>

              <div className={styles.formField}>
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={!isEditing}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label>Full Address</label>
              <textarea
                value={formData.location?.address || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      address: e.target.value,
                    },
                  })
                }
                disabled={!isEditing}
                className={styles.textarea}
                rows="3"
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>🕐 Operating Hours</h2>
            <p className={styles.helpText}>
              Note: Use 23:59 for midnight closing (displays as 24:00)
            </p>
            <div className={styles.hoursGrid}>
              {[
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
              ].map((day) => (
                <div key={day} className={styles.dayRow}>
                  <span className={styles.dayLabel}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </span>
                  <input
                    type="time"
                    value={normalizeTime(formData.operatingHours?.[day]?.open)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          [day]: {
                            ...formData.operatingHours?.[day],
                            open: denormalizeTime(e.target.value),
                          },
                        },
                      })
                    }
                    disabled={!isEditing}
                    className={styles.timeInput}
                  />
                  <span className={styles.separator}>to</span>
                  <input
                    type="time"
                    value={normalizeTime(formData.operatingHours?.[day]?.close)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          [day]: {
                            ...formData.operatingHours?.[day],
                            close: denormalizeTime(e.target.value),
                          },
                        },
                      })
                    }
                    disabled={!isEditing}
                    className={styles.timeInput}
                  />
                  {formData.operatingHours?.[day]?.close === "24:00" && (
                    <span className={styles.displayTime}>(Midnight)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>📊 Statistics</h2>
            <div className={styles.statsRow}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total Bookings</span>
                <span className={styles.statValue}>
                  {salon?.stats?.totalBookings || 0}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Rating</span>
                <span className={styles.statValue}>
                  ⭐ {salon?.ratings?.overall?.toFixed(1) || "0.0"}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total Reviews</span>
                <span className={styles.statValue}>
                  {salon?.ratings?.totalReviews || 0}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Status</span>
                <span
                  className={`${styles.statValue} ${
                    salon?.isActive ? styles.activeText : styles.inactiveText
                  }`}
                >
                  {salon?.isActive ? "✅ Active" : "❌ Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
