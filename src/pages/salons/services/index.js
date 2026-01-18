// src/pages/salons/services/index.js - COMPLETE NEW FILE
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "../../../components/OwnerSidebar";
import styles from "../../../styles/salon/SalonServices.module.css";
import dashboardStyles from "../../../styles/SalonDashboard.module.css";
import { showSuccess, showError, showWarning } from "../../../lib/toast";

export default function ServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: "",
    price: "",
    description: "",
    duration: 30,
    enabled: true,
  });

  useEffect(() => {
    const salonSession = localStorage.getItem("salonSession");
    if (!salonSession) {
      router.push("/auth/login");
      return;
    }

    const salonData = JSON.parse(salonSession);
    setSalon(salonData);
    const salonId = salonData._id || salonData.id;
    loadServices(salonId);
  }, [router]);

  const loadServices = async (salonId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/salons/profile?salonId=${salonId}`);
      const data = await res.json();

      // Convert services object to array
      const servicesArray = Object.entries(data.services || {}).map(
        ([key, value]) => ({
          id: key,
          name: value.name || key,
          price: value.price || "0",
          description: value.description || "",
          duration: value.duration || 30,
          enabled: value.enabled !== false,
        }),
      );

      setServices(servicesArray);
      setSalon(data);
    } catch (error) {
      console.error("Error loading services:", error);
      showError("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!newService.name || !newService.price) {
      showWarning("Name and price are required");
      return;
    }

    try {
      const salonId = salon._id || salon.id;

      // Create new services object
      const updatedServices = {
        ...salon.services,
        [newService.name]: {
          name: newService.name,
          price: newService.price,
          description: newService.description,
          duration: newService.duration,
          enabled: newService.enabled,
        },
      };

      const res = await fetch("/api/salons/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          services: updatedServices,
        }),
      });

      if (res.ok) {
        showSuccess("Service added successfully!");
        setShowAddForm(false);
        setNewService({
          name: "",
          price: "",
          description: "",
          duration: 30,
          enabled: true,
        });
        loadServices(salonId);
      } else {
        throw new Error("Failed to add service");
      }
    } catch (error) {
      console.error("Error adding service:", error);
      showError("Failed to add service");
    }
  };

  const startEditing = (service) => {
    setEditingService({ ...service });
  };

  const cancelEditing = () => {
    setEditingService(null);
  };

  const saveService = async () => {
    if (!editingService.name || !editingService.price) {
      showWarning("Name and price are required");
      return;
    }

    try {
      const salonId = salon._id || salon.id;

      // Update services object
      const updatedServices = { ...salon.services };

      // If name changed, delete old key and add new one
      if (editingService.id !== editingService.name) {
        delete updatedServices[editingService.id];
      }

      updatedServices[editingService.name] = {
        name: editingService.name,
        price: editingService.price,
        description: editingService.description,
        duration: editingService.duration,
        enabled: editingService.enabled,
      };

      const res = await fetch("/api/salons/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          services: updatedServices,
        }),
      });

      if (res.ok) {
        showSuccess("Service updated successfully!");
        setEditingService(null);
        loadServices(salonId);
      } else {
        throw new Error("Failed to update service");
      }
    } catch (error) {
      console.error("Error updating service:", error);
      showError("Failed to update service");
    }
  };

  const deleteService = async (serviceId) => {
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      const salonId = salon._id || salon.id;

      // Remove service from object
      const updatedServices = { ...salon.services };
      delete updatedServices[serviceId];

      const res = await fetch("/api/salons/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          services: updatedServices,
        }),
      });

      if (res.ok) {
        showSuccess("Service deleted successfully!");
        loadServices(salonId);
      } else {
        throw new Error("Failed to delete service");
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      showError("Failed to delete service");
    }
  };

  const toggleEnabled = async (serviceId, currentStatus) => {
    try {
      const salonId = salon._id || salon.id;

      const updatedServices = {
        ...salon.services,
        [serviceId]: {
          ...salon.services[serviceId],
          enabled: !currentStatus,
        },
      };

      const res = await fetch("/api/salons/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          services: updatedServices,
        }),
      });

      if (res.ok) {
        loadServices(salonId);
      }
    } catch (error) {
      console.error("Error toggling service:", error);
      showError("Failed to toggle service status");
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
            <p>Loading services...</p>
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
          <h2 className={dashboardStyles.mobileTitle}>Services</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={showAddForm ? styles.cancelButton : styles.addButton}
          >
            {showAddForm ? "Cancel" : "+ Add New Service"}
          </button>
        </div>

        <div className={styles.container}>
          {/* Add Form */}
          {showAddForm && (
            <div className={styles.formCard}>
              <h2>Add New Service</h2>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Haircut"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: e.target.value })
                    }
                    className={styles.input}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={newService.duration}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        duration: parseInt(e.target.value) || 30,
                      })
                    }
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label>Description</label>
                <textarea
                  placeholder="Describe the service..."
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newService.enabled}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        enabled: e.target.checked,
                      })
                    }
                    className={styles.checkbox}
                  />
                  <span>Enable this service</span>
                </label>
              </div>

              <button
                onClick={handleAddService}
                className={styles.submitButton}
              >
                Add Service
              </button>
            </div>
          )}

          {/* Services Grid */}
          {services.length > 0 ? (
            <div className={styles.servicesGrid}>
              {services.map((service) => (
                <div key={service.id} className={styles.serviceCard}>
                  {editingService && editingService.id === service.id ? (
                    /* EDIT MODE */
                    <>
                      <div className={styles.formField}>
                        <label>Name</label>
                        <input
                          type="text"
                          value={editingService.name}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              name: e.target.value,
                            })
                          }
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Price (₹)</label>
                        <input
                          type="number"
                          value={editingService.price}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              price: e.target.value,
                            })
                          }
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Duration (minutes)</label>
                        <input
                          type="number"
                          value={editingService.duration}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              duration: parseInt(e.target.value) || 30,
                            })
                          }
                          className={styles.input}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label>Description</label>
                        <textarea
                          value={editingService.description}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                          className={styles.textarea}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={editingService.enabled}
                            onChange={(e) =>
                              setEditingService({
                                ...editingService,
                                enabled: e.target.checked,
                              })
                            }
                            className={styles.checkbox}
                          />
                          <span>Enabled</span>
                        </label>
                      </div>

                      <div className={styles.actions}>
                        <button
                          onClick={saveService}
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
                      <div className={styles.serviceHeader}>
                        <div className={styles.serviceInfo}>
                          <h3>{service.name}</h3>
                          <p className={styles.servicePrice}>
                            ₹{service.price}
                          </p>
                          <p className={styles.serviceDuration}>
                            {service.duration} minutes
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            toggleEnabled(service.id, service.enabled)
                          }
                          className={`${styles.statusBadge} ${
                            service.enabled ? styles.enabled : styles.disabled
                          }`}
                        >
                          {service.enabled ? "ENABLED" : "DISABLED"}
                        </button>
                      </div>

                      {service.description && (
                        <div className={styles.serviceDescription}>
                          <p>{service.description}</p>
                        </div>
                      )}

                      <div className={styles.actions}>
                        <button
                          onClick={() => startEditing(service)}
                          className={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteService(service.id)}
                          className={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No services found.</p>
              <button onClick={() => setShowAddForm(true)}>
                Add Your First Service
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
