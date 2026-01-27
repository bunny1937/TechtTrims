// src/pages/barber/settings.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/barber/BarberSettings.module.css";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Bell,
  Calendar,
  ChevronLeft,
  Save,
  Eye,
  EyeOff,
  Clock,
  Shield,
  LogOut,
  Camera,
} from "lucide-react";
import BarberSidebar from "@/components/Barber/BarberSidebar";

export default function BarberSettings() {
  const router = useRouter();
  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Active tab
  const [activeTab, setActiveTab] = useState("profile");

  // Profile data
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    skills: [],
    experience: "",
    profileImage: "",
  });

  // Password data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    bookingAlerts: true,
    reviewAlerts: true,
    promotionAlerts: false,
  });

  // Availability settings
  const [availabilitySettings, setAvailabilitySettings] = useState({
    monday: { enabled: true, start: "09:00", end: "18:00" },
    tuesday: { enabled: true, start: "09:00", end: "18:00" },
    wednesday: { enabled: true, start: "09:00", end: "18:00" },
    thursday: { enabled: true, start: "09:00", end: "18:00" },
    friday: { enabled: true, start: "09:00", end: "18:00" },
    saturday: { enabled: true, start: "09:00", end: "18:00" },
    sunday: { enabled: false, start: "09:00", end: "18:00" },
  });

  // Load barber session
  useEffect(() => {
    const barberSession = sessionStorage.getItem("barberSession");
    if (!barberSession) {
      router.push("/auth/barber/login");
      return;
    }
    const barberData = JSON.parse(barberSession);
    setBarber(barberData);
    loadSettings(barberData._id || barberData.id);
  }, []);

  // Load settings
  const loadSettings = async (barberId) => {
    try {
      setLoading(true);

      const res = await fetch(`/api/barber/settings?barberId=${barberId}`);

      if (!res.ok) {
        throw new Error("Failed to load settings");
      }

      const data = await res.json();
      setProfileData(data.profile || {});
      setNotificationSettings(data.notifications || {});
      setAvailabilitySettings(data.availability || {});
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save profile
  const saveProfile = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/barber/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber._id || barber.id,
          ...profileData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Update session
      const updatedBarber = { ...barber, ...profileData };
      sessionStorage.setItem("barberSession", JSON.stringify(updatedBarber));
      setBarber(updatedBarber);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const changePassword = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setMessage({ type: "error", text: "Passwords do not match" });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setMessage({
          type: "error",
          text: "Password must be at least 6 characters",
        });
        return;
      }

      setSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/barber/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber._id || barber.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save notifications
  const saveNotifications = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/barber/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber._id || barber.id,
          ...notificationSettings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save notifications");
      }

      setMessage({
        type: "success",
        text: "Notification settings saved!",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save availability
  const saveAvailability = async () => {
    try {
      setSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/barber/settings/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber._id || barber.id,
          availability: availabilitySettings,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save availability");
      }

      setMessage({
        type: "success",
        text: "Availability updated successfully!",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem("barberSession");
    router.push("/auth/barber/login");
  };

  if (loading) {
    return (
      <div className={styles.dashboardWrapper}>
        <BarberSidebar barber={barber} />
        <main className={styles.mainContent}>
          <div className={styles.loading}>Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <BarberSidebar barber={barber} currentPage="settings" />

      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button
                className={styles.backButton}
                onClick={() => router.push("/barber/dashboard")}
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <div className={styles.headerTitle}>
                <SettingsIcon className={styles.headerIcon} size={28} />
                <div>
                  <h1>Settings</h1>
                  <p>{barber?.name}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Message */}
          {message.text && (
            <div
              className={`${styles.message} ${
                message.type === "success"
                  ? styles.messageSuccess
                  : styles.messageError
              }`}
            >
              {message.text}
            </div>
          )}

          <div className={styles.settingsLayout}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "profile" ? styles.tabActive : ""
                }`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={20} />
                Profile
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "password" ? styles.tabActive : ""
                }`}
                onClick={() => setActiveTab("password")}
              >
                <Lock size={20} />
                Password
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "notifications" ? styles.tabActive : ""
                }`}
                onClick={() => setActiveTab("notifications")}
              >
                <Bell size={20} />
                Notifications
              </button>
              <button
                className={`${styles.tabButton} ${
                  activeTab === "availability" ? styles.tabActive : ""
                }`}
                onClick={() => setActiveTab("availability")}
              >
                <Calendar size={20} />
                Availability
              </button>
              <button className={styles.logoutButton} onClick={handleLogout}>
                <LogOut size={20} />
                Logout
              </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className={styles.tabContent}>
                  <h2 className={styles.tabTitle}>
                    <User className={styles.tabIcon} />
                    Profile Information
                  </h2>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      placeholder="Your full name"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      className={styles.input}
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      placeholder="your@email.com"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone</label>
                    <input
                      type="tel"
                      className={styles.input}
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          phone: e.target.value,
                        })
                      }
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Bio</label>
                    <textarea
                      className={styles.textarea}
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      placeholder="Tell customers about yourself..."
                      rows={4}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Years of Experience</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={profileData.experience}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          experience: e.target.value,
                        })
                      }
                      placeholder="5"
                    />
                  </div>

                  <button
                    className={styles.saveButton}
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <div className={styles.tabContent}>
                  <h2 className={styles.tabTitle}>
                    <Shield className={styles.tabIcon} />
                    Change Password
                  </h2>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Current Password</label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        className={styles.input}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="Enter current password"
                      />
                      <button
                        className={styles.eyeButton}
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            current: !showPasswords.current,
                          })
                        }
                      >
                        {showPasswords.current ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>New Password</label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        className={styles.input}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        placeholder="Enter new password"
                      />
                      <button
                        className={styles.eyeButton}
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            new: !showPasswords.new,
                          })
                        }
                      >
                        {showPasswords.new ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Confirm New Password</label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        className={styles.input}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Confirm new password"
                      />
                      <button
                        className={styles.eyeButton}
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirm: !showPasswords.confirm,
                          })
                        }
                      >
                        {showPasswords.confirm ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    className={styles.saveButton}
                    onClick={changePassword}
                    disabled={saving}
                  >
                    <Lock size={18} />
                    {saving ? "Changing..." : "Change Password"}
                  </button>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className={styles.tabContent}>
                  <h2 className={styles.tabTitle}>
                    <Bell className={styles.tabIcon} />
                    Notification Preferences
                  </h2>

                  <div className={styles.toggleGroup}>
                    <div className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <h3>Email Notifications</h3>
                        <p>Receive updates via email</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              emailNotifications: e.target.checked,
                            })
                          }
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <h3>SMS Notifications</h3>
                        <p>Receive updates via SMS</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.smsNotifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              smsNotifications: e.target.checked,
                            })
                          }
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <h3>Booking Alerts</h3>
                        <p>Get notified about new bookings</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.bookingAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              bookingAlerts: e.target.checked,
                            })
                          }
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <h3>Review Alerts</h3>
                        <p>Get notified about customer reviews</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.reviewAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              reviewAlerts: e.target.checked,
                            })
                          }
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <div className={styles.toggleInfo}>
                        <h3>Promotional Alerts</h3>
                        <p>Receive promotional offers and tips</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notificationSettings.promotionAlerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              promotionAlerts: e.target.checked,
                            })
                          }
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>
                  </div>

                  <button
                    className={styles.saveButton}
                    onClick={saveNotifications}
                    disabled={saving}
                  >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              )}

              {/* Availability Tab */}
              {activeTab === "availability" && (
                <div className={styles.tabContent}>
                  <h2 className={styles.tabTitle}>
                    <Clock className={styles.tabIcon} />
                    Weekly Availability
                  </h2>

                  <div className={styles.availabilityList}>
                    {Object.entries(availabilitySettings).map(
                      ([day, schedule]) => (
                        <div key={day} className={styles.availabilityItem}>
                          <div className={styles.dayHeader}>
                            <label className={styles.dayToggle}>
                              <input
                                type="checkbox"
                                checked={schedule.enabled}
                                onChange={(e) =>
                                  setAvailabilitySettings({
                                    ...availabilitySettings,
                                    [day]: {
                                      ...schedule,
                                      enabled: e.target.checked,
                                    },
                                  })
                                }
                              />
                              <span className={styles.dayName}>
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </span>
                            </label>
                          </div>
                          {schedule.enabled && (
                            <div className={styles.timeInputs}>
                              <div className={styles.timeGroup}>
                                <label>Start</label>
                                <input
                                  type="time"
                                  className={styles.timeInput}
                                  value={schedule.start}
                                  onChange={(e) =>
                                    setAvailabilitySettings({
                                      ...availabilitySettings,
                                      [day]: {
                                        ...schedule,
                                        start: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </div>
                              <span className={styles.timeSeparator}>—</span>
                              <div className={styles.timeGroup}>
                                <label>End</label>
                                <input
                                  type="time"
                                  className={styles.timeInput}
                                  value={schedule.end}
                                  onChange={(e) =>
                                    setAvailabilitySettings({
                                      ...availabilitySettings,
                                      [day]: {
                                        ...schedule,
                                        end: e.target.value,
                                      },
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>

                  <button
                    className={styles.saveButton}
                    onClick={saveAvailability}
                    disabled={saving}
                  >
                    <Save size={18} />
                    {saving ? "Saving..." : "Save Availability"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
