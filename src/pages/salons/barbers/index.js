// src/pages/salons/barbers/index.js - COMPLETE FILE WITH INLINE EDITING
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonBarbers.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";
import { showError, showSuccess, showWarning } from "@/lib/toast";

export default function SalonBarbersPage() {
  const router = useRouter();
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [salonId, setSalonId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [newBarber, setNewBarber] = useState({
    name: "",
    experience: 0,
    skills: [],
    bio: "",
    photo: "",
  });

  const availableSkills = [
    "Haircut",
    "Shaving",
    "Hair Styling",
    "Beard Trim",
    "Hair Color",
    "Facial",
  ];

  // Add polling to refresh barbers periodically
  useEffect(() => {
    if (!salonId) return;

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      const fetchBarbers = async () => {
        try {
          const res = await axios.get(`/api/salons/barbers?salonId=${salonId}`);
          setBarbers(res.data);
        } catch (err) {
          console.error("Error refreshing barbers:", err);
        }
      };

      fetchBarbers();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [salonId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const salonSession = localStorage.getItem("salonSession");

      if (salonSession) {
        try {
          const salonData = JSON.parse(salonSession);
          const id = salonData._id || salonData.id;

          if (id) {
            setSalonId(id);
          } else {
            showWarning("Invalid salon session data");
          }
        } catch (err) {
          showError("Failed to parse salon session");
        }
      } else {
        showError("No salon session found. Please login first.");
        setTimeout(() => router.push("/auth/salon/login"), 2000);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!salonId) return;

    const fetchBarbers = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/salons/barbers?salonId=${salonId}`);
        setBarbers(res.data);
        setError("");
      } catch (err) {
        setError(
          `Failed to fetch barbers: ${err.response?.data?.error || err.message}`
        );
      }
      setLoading(false);
    };

    fetchBarbers();
  }, [salonId]);

  const handleCreate = async () => {
    if (!newBarber.name) return showWarning("Name is required");
    if (!salonId) return showError("No salon session found");

    try {
      const res = await axios.post("/api/salons/barbers", {
        ...newBarber,
        salonId,
      });
      setBarbers([...barbers, res.data]);
      setNewBarber({ name: "", experience: 0, skills: [], bio: "", photo: "" });
      setShowForm(false);
      setError("");
    } catch (err) {
      setError(
        `Failed to create barber: ${err.response?.data?.error || err.message}`
      );
    }
  };

  const handleSkillToggle = (skill, isEditing = false) => {
    if (isEditing && editingBarber) {
      setEditingBarber((prev) => ({
        ...prev,
        skills: prev.skills.includes(skill)
          ? prev.skills.filter((s) => s !== skill)
          : [...prev.skills, skill],
      }));
    } else {
      setNewBarber((prev) => ({
        ...prev,
        skills: prev.skills.includes(skill)
          ? prev.skills.filter((s) => s !== skill)
          : [...prev.skills, skill],
      }));
    }
  };

  const toggleAvailability = async (barberId, currentStatus) => {
    try {
      const res = await axios.put(`/api/salons/barbers/toggle-availability`, {
        barberId: barberId,
        isAvailable: !currentStatus,
      });

      // Update local state
      setBarbers(
        barbers.map((b) =>
          b._id === barberId ? { ...b, isAvailable: !currentStatus } : b
        )
      );

      console.log("✅ Availability updated:", res.data);
    } catch (err) {
      console.error("❌ Toggle availability error:", err);
      alert(
        `Failed to update barber status: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  };

  const startEditing = (barber) => {
    setEditingBarber({ ...barber });
  };

  const cancelEditing = () => {
    setEditingBarber(null);
  };

  const saveBarber = async () => {
    if (!editingBarber.name) return showWarning("Name is required");

    try {
      const res = await axios.put(`/api/salons/barbers/${editingBarber._id}`, {
        name: editingBarber.name,
        experience: editingBarber.experience,
        skills: editingBarber.skills,
        bio: editingBarber.bio,
      });

      setBarbers(
        barbers.map((b) => (b._id === editingBarber._id ? res.data : b))
      );
      setEditingBarber(null);
      showSuccess("Barber updated successfully!");
    } catch (err) {
      showError(
        "Failed to update barber: " + (err.response?.data?.error || err.message)
      );
    }
  };

  if (loading || !salonId) {
    return (
      <div className={dashboardStyles.dashboardWrapper}>
        <div className={dashboardStyles.sidebarDesktop}>
          <OwnerSidebar />
        </div>
        <main className={dashboardStyles.mainContent}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading barbers...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={dashboardStyles.dashboardWrapper}>
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

      <div className={dashboardStyles.sidebarDesktop}>
        <OwnerSidebar />
      </div>

      <main className={dashboardStyles.mainContent}>
        <div className={dashboardStyles.mobileTopBar}>
          <button
            className={dashboardStyles.menuButton}
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h2 className={dashboardStyles.mobileTitle}>Barber Management</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={showForm ? styles.cancelButton : styles.addButton}
          >
            {showForm ? "Cancel" : "+ Add New Barber"}
          </button>
        </div>

        <div className={styles.container}>
          {error && <div className={styles.errorAlert}>{error}</div>}

          {/* Add Form */}
          {showForm && (
            <div className={styles.formCard}>
              <h2>Add New Barber</h2>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Barber Name *</label>
                  <input
                    type="text"
                    placeholder="Enter barber name"
                    value={newBarber.name}
                    onChange={(e) =>
                      setNewBarber({ ...newBarber, name: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newBarber.experience}
                    onChange={(e) =>
                      setNewBarber({
                        ...newBarber,
                        experience: parseInt(e.target.value) || 0,
                      })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.skillsLabel}>
                  Skills & Specializations
                </label>
                <div className={styles.skillsGrid}>
                  {availableSkills.map((skill) => (
                    <label key={skill} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newBarber.skills.includes(skill)}
                        onChange={() => handleSkillToggle(skill)}
                        className={styles.checkbox}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.formField}>
                <label>Bio/Accomplishments</label>
                <textarea
                  placeholder="Describe achievements, awards, specialties..."
                  value={newBarber.bio}
                  onChange={(e) =>
                    setNewBarber({ ...newBarber, bio: e.target.value })
                  }
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <button onClick={handleCreate} className={styles.submitButton}>
                Add Barber
              </button>
            </div>
          )}

          {/* Barbers Grid */}
          {barbers.length > 0 ? (
            <div className={styles.barbersGrid}>
              {barbers.map((barber) => (
                <div key={barber._id} className={styles.barberCard}>
                  {editingBarber && editingBarber._id === barber._id ? (
                    /* EDIT MODE */
                    <>
                      <div className={styles.formField}>
                        <label>Name</label>
                        <input
                          type="text"
                          value={editingBarber.name}
                          onChange={(e) =>
                            setEditingBarber({
                              ...editingBarber,
                              name: e.target.value,
                            })
                          }
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Experience (years)</label>
                        <input
                          type="number"
                          value={editingBarber.experience}
                          onChange={(e) =>
                            setEditingBarber({
                              ...editingBarber,
                              experience: parseInt(e.target.value) || 0,
                            })
                          }
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Skills</label>
                        <div className={styles.skillsGrid}>
                          {availableSkills.map((skill) => (
                            <label key={skill} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={editingBarber.skills.includes(skill)}
                                onChange={() => handleSkillToggle(skill, true)}
                                className={styles.checkbox}
                              />
                              <span>{skill}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className={styles.formField}>
                        <label>Bio</label>
                        <textarea
                          value={editingBarber.bio}
                          onChange={(e) =>
                            setEditingBarber({
                              ...editingBarber,
                              bio: e.target.value,
                            })
                          }
                          rows={3}
                          className={styles.textarea}
                        />
                      </div>

                      <div className={styles.actions}>
                        <button
                          onClick={saveBarber}
                          className={styles.submitButton}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    /* VIEW MODE */
                    <>
                      <div className={styles.barberHeader}>
                        <div className={styles.barberInfo}>
                          <h3>{barber.name}</h3>
                          <p className={styles.experience}>
                            {barber.experience} years experience
                          </p>
                          <div className={styles.rating}>
                            <span>⭐</span>
                            <span className={styles.ratingValue}>
                              {barber.rating}/5
                            </span>
                            <span className={styles.bookingsCount}>
                              ({barber.totalBookings} bookings)
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            toggleAvailability(barber._id, barber.isAvailable)
                          }
                          className={`${styles.statusBadge} ${
                            barber.isAvailable !== false
                              ? styles.available
                              : styles.unavailable
                          }`}
                        >
                          {barber.isAvailable !== false
                            ? "AVAILABLE"
                            : "UNAVAILABLE"}
                        </button>
                      </div>

                      {barber.skills && barber.skills.length > 0 && (
                        <div className={styles.skillsSection}>
                          <span className={styles.skillsLabel}>
                            Specializations:
                          </span>
                          <div className={styles.skillsTags}>
                            {barber.skills.map((skill) => (
                              <span key={skill} className={styles.skillTag}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {barber.bio && (
                        <div className={styles.bio}>{barber.bio}</div>
                      )}

                      <div className={styles.actions}>
                        <button
                          onClick={() => startEditing(barber)}
                          className={styles.editButton}
                        >
                          Edit Details
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No barbers found for this salon.</p>
              <button onClick={() => setShowForm(true)}>
                Add Your First Barber
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
