import React, { useEffect, useState, useRef } from "react";
import { Navigation, MapPin } from "lucide-react";
import styles from "../../styles/LocationMap.module.css";
import { showWarning } from "@/lib/toast";

if (typeof window !== "undefined") {
  const loadLeafletFix = async () => {
    const L = await import("leaflet");
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "",
      iconRetinaUrl: "",
      shadowUrl: "",
    });
  };
  loadLeafletFix();
}

const LocationMap = ({ location, userLocation, salonName, address, phone }) => {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [map, setMap] = useState(null);
  const [mapTheme, setMapTheme] = useState("standard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualLocation, setManualLocation] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [clickMode, setClickMode] = useState(false);

  const userMarkerRef = useRef(null);
  const salonMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const tileLayerRef = useRef(null);

  const mapThemes = {
    standard: {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      name: "Standard",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    simple: {
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      name: "Simple",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    detailed: {
      url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
      name: "Detailed",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; OpenStreetMap.de",
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      name: "Light",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    terrain: {
      url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
      name: "Terrain",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    satellite: {
      url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      name: "Satellite",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    hybrid: {
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      name: "Hybrid",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
    atlas: {
      url: "https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=20622b4dbbab4ee68c1024d1fc0ceee9",
      name: "Atlas",
      maxZoom: 22,
      maxNativeZoom: 19,
    },
  };

  const effectiveUserLocation =
    isManualMode && manualLocation ? manualLocation : userLocation;
  // ✅ Reset locating state if in manual mode on mount
  useEffect(() => {
    if (isManualMode) {
      setLocating(false);
    }
  }, [isManualMode]);

  // ✅ Load manual location from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("manualLocation");
    const isManual = sessionStorage.getItem("isManualMode") === "true";

    if (stored && isManual) {
      try {
        const parsed = JSON.parse(stored);
        // Ensure both lat/lng and latitude/longitude exist
        const normalized = {
          lat: parsed.lat || parsed.latitude,
          lng: parsed.lng || parsed.longitude,
          latitude: parsed.latitude || parsed.lat,
          longitude: parsed.longitude || parsed.lng,
          address: parsed.address,
        };
        setManualLocation(normalized);
        setIsManualMode(true);
        console.log(
          "📍 LocationMap loaded manual location from storage:",
          normalized
        );
      } catch (e) {
        console.error("Error loading manual location:", e);
      }
    }
  }, []);

  // Add this right after const effectiveUserLocation line
  useEffect(() => {
    console.log("👤 User location changed:", {
      userLocation,
      manualLocation,
      effectiveUserLocation,
      isManualMode,
    });
  }, [userLocation, manualLocation, effectiveUserLocation, isManualMode]);

  // Calculate distance
  useEffect(() => {
    if (!location?.coordinates || !effectiveUserLocation) return;

    const [lng, lat] = location.coordinates;
    const R = 6371;
    const dLat = ((lat - effectiveUserLocation.latitude) * Math.PI) / 180; // Changed
    const dLon = ((lng - effectiveUserLocation.longitude) * Math.PI) / 180; // Changed
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((effectiveUserLocation.latitude * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2); // Changed

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(dist.toFixed(1));
    setDuration(Math.round(dist * 3));
  }, [location, effectiveUserLocation]);

  // Create/update user marker and route line when location changes
  useEffect(() => {
    if (!map || !effectiveUserLocation || !location?.coordinates) return;

    // CRITICAL GUARD: Ensure VALID coordinates
    if (
      !effectiveUserLocation.latitude ||
      !effectiveUserLocation.longitude ||
      isNaN(effectiveUserLocation.latitude) ||
      isNaN(effectiveUserLocation.longitude)
    ) {
      console.warn(
        "⚠️ effectiveUserLocation has invalid coordinates:",
        effectiveUserLocation
      );
      return;
    }

    const L = window.L;
    if (!L) return;

    const [lng, lat] = location.coordinates;

    // 🔥 CHECK: If marker exists and is on map, just UPDATE position
    if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      console.log("📍 Updating existing user marker position");
      userMarkerRef.current.setLatLng([
        effectiveUserLocation.latitude,
        effectiveUserLocation.longitude,
      ]);

      // Update route line
      if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
        console.log("🔄 Updating route line");
        routeLineRef.current.setLatLngs([
          [effectiveUserLocation.latitude, effectiveUserLocation.longitude],
          [lat, lng],
        ]);
      }
      return; // ✅ EXIT EARLY
    }

    // 🔥 CREATE user marker ONLY if it doesn't exist
    if (!userMarkerRef.current) {
      console.log("🆕 Creating user marker");

      const userIcon = L.divIcon({
        html: `
        <div style="
          width: 40px;
          height: 40px;
          background: #4285f4;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
        className: "fixed-user-icon",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      // ✅ SAFE: Create marker with validated coordinates
      const userMarker = L.marker(
        [effectiveUserLocation.latitude, effectiveUserLocation.longitude],
        { icon: userIcon }
      )
        .addTo(map)
        .bindPopup("Your Location");

      userMarkerRef.current = userMarker;
      console.log("✅ User marker created at:", effectiveUserLocation);
    }

    // 🔥 CREATE route line ONLY if it doesn't exist
    if (!routeLineRef.current) {
      console.log("🆕 Creating route line");

      const routeLine = L.polyline(
        [
          [effectiveUserLocation.latitude, effectiveUserLocation.longitude],
          [lat, lng],
        ],
        {
          color: "#c38f0a",
          weight: 3,
          opacity: 0.7,
          dashArray: "10, 10",
        }
      ).addTo(map);

      routeLineRef.current = routeLine;
      console.log("✅ Route line created");
    }
  }, [effectiveUserLocation, location, map]);

  // Theme switching
  useEffect(() => {
    if (!map || !tileLayerRef.current || !mapLoaded) return;

    const L = window.L;
    if (!L) return;

    // Remove old tile layer
    map.removeLayer(tileLayerRef.current);

    // Add new tile layer
    const newTileLayer = L.tileLayer(mapThemes[mapTheme].url, {
      attribution: "© Map Data",
      maxZoom: mapThemes[mapTheme].maxZoom,
      maxNativeZoom: mapThemes[mapTheme].maxNativeZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapTheme]);

  // Search location
  const searchLocation = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(
          query + ", Maharashtra, India"
        )}`
      );
      if (!response.ok) throw new Error("Search failed");

      const allResults = await response.json();
      const userLat = effectiveUserLocation?.latitude || 19.247251;
      const userLng = effectiveUserLocation?.longitude || 73.154063;

      const nearbyResults = allResults
        .map((result) => {
          const lat = parseFloat(result.latitude);
          const lng = parseFloat(result.lon);
          const R = 6371;
          const dLat = ((lat - userLat) * Math.PI) / 180;
          const dLng = ((lng - userLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLat * Math.PI) / 180) *
              Math.cos((lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { ...result, distance: distance.toFixed(1) };
        })
        .filter((r) => parseFloat(r.distance) < 20)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 8);

      setSearchResults(nearbyResults);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
  };

  const handleLocationSelect = (location) => {
    try {
      if (!location) {
        console.error("❌ No location provided");
        return;
      }

      // ✅ Extract lat/lng - handle BOTH formats
      let lat = location.lat || location.latitude;
      let lng = location.lng || location.longitude;

      console.log("🔍 handleLocationSelect received:", { location, lat, lng });

      // ✅ Validate before using isNaN
      if (
        lat === undefined ||
        lat === null ||
        lng === undefined ||
        lng === null
      ) {
        console.error("❌ Coordinates are undefined/null:", {
          lat,
          lng,
          location,
        });
        return;
      }

      // ✅ NOW check for NaN
      if (isNaN(lat) || isNaN(lng)) {
        console.error("❌ NaN coordinates:", { lat, lng });
        return;
      }

      // ✅ Validate numbers
      if (typeof lat !== "number" || typeof lng !== "number") {
        console.error("❌ Invalid coordinate types:", { lat, lng, location });
        return;
      }

      console.log("✅ Selecting location:", {
        lat,
        lng,
        address: location.address,
      });

      // ✅ Store location
      setManualLocation(location);

      // ✅ Store to sessionStorage
      sessionStorage.setItem(
        "manualLocation",
        JSON.stringify({
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          address: location.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        })
      );
      sessionStorage.setItem("isManualMode", "true");

      console.log("💾 Manual location saved to sessionStorage");
    } catch (error) {
      console.error("❌ ERROR in handleLocationSelect:", error, error.stack);
    }
  };

  const enableClickMode = () => {
    if (!map) return;

    setClickMode(true);
    map.getContainer().style.cursor = "crosshair";

    // ✅ Create handler with proper validation
    const handleMapClick = (e) => {
      if (!e || !e.latlng) {
        console.error("❌ Invalid click event");
        return;
      }

      const { lat, lng } = e.latlng;

      // ✅ Validate coordinates
      if (typeof lat !== "number" || typeof lng !== "number") {
        console.error("❌ Invalid coordinates:", { lat, lng });
        return;
      }

      console.log("📍 Map clicked at:", { lat, lng });

      // ✅ First: Set pin with coordinates
      handleLocationSelect({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        latitude: lat,
        longitude: lng,
        accuracy: 5,
        manual: true,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      });

      // ✅ Then: Try reverse geocode for better address
      fetch(`/api/geocode?reverse=true&lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            console.log("✅ Geocoded address:", data.display_name);

            // ✅ Update with better address
            handleLocationSelect({
              lat: parseFloat(lat.toFixed(6)),
              lng: parseFloat(lng.toFixed(6)),
              latitude: lat,
              longitude: lng,
              accuracy: 5,
              manual: true,
              address: data.display_name,
            });
          }
        })
        .catch((err) => {
          console.log("⚠️ Reverse geocode failed, using coordinates");
        });

      // ✅ Cleanup after pin
      setClickMode(false);
      map.getContainer().style.cursor = "";
      map.off("click", handleMapClick);
    };

    // ✅ Attach listener
    map.on("click", handleMapClick);
  };

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !location?.coordinates) return;

    let mapInstance = null;
    const currentTheme = mapThemes[mapTheme]; // ✅ Extract theme outside

    const loadMap = async () => {
      try {
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        const mapContainer = document.getElementById("salon-detail-map");
        if (!mapContainer || mapContainer._leaflet_id) return;

        const [lng, lat] = location.coordinates;
        mapInstance = L.map(mapContainer, {
          center: [lat, lng],
          zoom: 15,
          minZoom: 10,
          maxZoom: 22,
        });

        setMap(mapInstance);

        const initialTileLayer = L.tileLayer(currentTheme.url, {
          attribution: "© Map Data",
          maxZoom: currentTheme.maxZoom,
          maxNativeZoom: currentTheme.maxNativeZoom,
        }).addTo(mapInstance);

        tileLayerRef.current = initialTileLayer;

        const salonIcon = L.divIcon({
          html: "📍",
          className: "custom-salon-icon",
          iconSize: [50, 50],
          iconAnchor: [15, 30],
        });

        const salonMarker = L.marker([lat, lng], { icon: salonIcon })
          .addTo(mapInstance)
          .bindPopup(`<strong>${salonName}</strong>`);

        salonMarkerRef.current = salonMarker;

        setMapLoaded(true);
      } catch (error) {
        console.error("Error loading map:", error);
      }
    };

    loadMap();

    return () => {
      if (userMarkerRef.current && mapInstance) {
        mapInstance.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (routeLineRef.current && mapInstance) {
        mapInstance.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      }
      if (salonMarkerRef.current && mapInstance) {
        mapInstance.removeLayer(salonMarkerRef.current);
        salonMarkerRef.current = null;
      }
      if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.coordinates?.[0], location?.coordinates?.[1], salonName]);

  // ========================================
  // CHANGE: ADD useEffect - Listen for manual location updates
  // ========================================
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "manualLocation") {
        console.log("🔄 Manual location updated:", e.newValue);
        if (e.newValue) {
          try {
            const newLocation = JSON.parse(e.newValue);
            setManualLocation(newLocation);
          } catch (err) {
            console.error("Error parsing manual location:", err);
          }
        }
      } else if (e.key === "isManualMode") {
        console.log("🔄 Manual mode changed:", e.newValue);
        if (e.newValue !== "true") {
          setManualLocation(null);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

  const handleLiveLocation = async () => {
    setLocating(false);

    if (!map) return;

    // ✅ If in manual mode, revert to live
    if (isManualMode) {
      setIsManualMode(false);
      setManualLocation(null);
      setLocating(false);
      sessionStorage.removeItem("manualLocation");
      sessionStorage.removeItem("isManualMode");

      // Try stored location first
      const storedLocation = sessionStorage.getItem("userLocation");
      if (storedLocation) {
        try {
          const locationData = JSON.parse(storedLocation);
          if (locationData.latitude && locationData.longitude) {
            map.flyTo([locationData.latitude, locationData.longitude], 16, {
              animate: true,
              duration: 1.5,
            });
            return;
          }
        } catch (e) {
          console.error("Error with stored location", e);
        }
      }

      // Use live location from hook
      if (userLocation?.latitude && userLocation?.longitude) {
        map.flyTo([userLocation.latitude, userLocation.longitude], 16, {
          animate: true,
          duration: 1.5,
        });
        return;
      }

      return;
    }

    // Already in live mode - just recenter
    const storedLocation = sessionStorage.getItem("userLocation");
    if (storedLocation) {
      try {
        const locationData = JSON.parse(storedLocation);
        if (locationData.latitude && locationData.longitude) {
          setLocating(true);
          map.flyTo([locationData.latitude, locationData.longitude], 16, {
            animate: true,
            duration: 1.5,
          });
          setTimeout(() => setLocating(false), 1500);
          return;
        }
      } catch (e) {
        console.error("Error parsing location", e);
      }
    }

    if (userLocation?.latitude && userLocation?.longitude) {
      setLocating(true);
      map.flyTo([userLocation.latitude, userLocation.longitude], 16, {
        animate: true,
        duration: 1.5,
      });
      setTimeout(() => setLocating(false), 1500);
      return;
    }

    // No location - request geolocation
    if (!navigator.geolocation) {
      showWarning(
        "⚠️ Geolocation not supported. Use Pin button to set manually."
      );
      return;
    }

    setLocating(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      // ✅ CRITICAL: Validate before flyTo
      if (!newLocation.latitude || !newLocation.longitude) {
        console.error("❌ Invalid position from geolocation");
        setLocating(false);
        return;
      }

      // Store in session
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));

      // Fly to location
      map.flyTo([newLocation.latitude, newLocation.longitude], 16, {
        animate: true,
        duration: 1.5,
      });

      setLocating(false);
    } catch (error) {
      console.error("Location error:", error);
      setLocating(false);

      if (error.code === 1) {
        showWarning("🔒 Location Permission Denied");
      } else if (error.code === 2) {
        showWarning("📍 Location unavailable");
      } else if (error.code === 3) {
        showWarning("⏱️ Location request timed out");
      } else {
        showWarning("❌ Unable to get location");
      }
    }
  };

  const handleGetDirections = () => {
    if (!location?.coordinates) return;
    const [lng, lat] = location.coordinates;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      "_blank"
    );
  };

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <div className={styles.headerInfo}>
          <h3>{salonName}</h3>
          <p>{address || "Address not available"}</p>
          {phone && <p className={styles.phone}>{phone}</p>}
          {distance && (
            <div className={styles.routeInfo}>
              <span>📍 {distance} km away</span>
              <span>⏱️ ~{duration} mins</span>
            </div>
          )}
        </div>
        <button
          onClick={handleGetDirections}
          className={styles.directionsButton}
        >
          🗺️ Get Directions
        </button>
      </div>

      <div className={styles.mapControlsTop}>
        <input
          type="text"
          placeholder="Search building, landmark..."
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value;
            setSearchQuery(value);
            if (searchTimeoutRef.current)
              clearTimeout(searchTimeoutRef.current);
            if (value.trim().length >= 3) {
              setSearching(true);
              searchTimeoutRef.current = setTimeout(
                () => searchLocation(value),
                1000
              );
            } else {
              setSearchResults([]);
              setSearching(false);
            }
          }}
          className={styles.searchInput}
        />
        <button
          className={`${styles.clickMapBtn} ${
            clickMode ? styles.clickModeActive : ""
          }`}
          onClick={enableClickMode}
          disabled={clickMode}
        >
          <MapPin size={16} />
          {clickMode ? "Click..." : "Pin"}
        </button>
        {/* <button
          className={styles.recenterButton}
          onClick={() => {
            if (!navigator.geolocation) {
              alert("Geolocation not supported by your browser");
              return;
            }

            // This triggers the "Turn on Location Accuracy" dialog on Android
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coords = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };

                sessionStorage.setItem(
                  "liveUserLocation",
                  JSON.stringify(coords)
                );
                localStorage.setItem(
                  "cachedUserLocation",
                  JSON.stringify(coords)
                );

                if (mapRef.current) {
                  mapRef.current.setView([coords.lat, coords.lng], 15);
                }

                alert("📍 Location updated!");
              },
              (error) => {
                if (error.code === 1) {
                  alert(
                    "⚠️ Location permission denied. Please enable in settings."
                  );
                } else if (error.code === 2) {
                  alert(
                    "⚠️ Location unavailable. Please turn on location services."
                  );
                } else {
                  alert("⚠️ Could not get location. Please try again.");
                }
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          }}
        >
          📍 Use My Location
        </button> */}

        <button
          className={styles.liveLocationTopBtn}
          onClick={handleLiveLocation}
          disabled={locating && !isManualMode}
        >
          <Navigation size={16} className={locating ? styles.spinning : ""} />
          {isManualMode ? "Live" : "Center"}
        </button>
      </div>

      {searching &&
        searchQuery.trim().length >= 3 &&
        searchResults.length > 0 && (
          <div className={styles.searchResultsDropdown}>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className={styles.searchResultItem}
                onClick={() =>
                  handleLocationSelect({
                    lat: parseFloat(result.latitude),
                    lng: parseFloat(result.lon),
                    accuracy: 10,
                    manual: true,
                    address: result.display_name,
                  })
                }
              >
                <MapPin size={14} />
                <div>
                  <strong>
                    {result.name || result.display_name.split(",")[0]}
                  </strong>
                  <p>{result.display_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      {clickMode && (
        <div className={styles.clickModeIndicator}>
          <div className={styles.clickModeContent}>
            <MapPin size={20} className={styles.pulsingIcon} />
            <span>📍 Click anywhere on the map to pin your location</span>
            <button
              className={styles.cancelClickMode}
              onClick={() => {
                setClickMode(false);
                if (map) {
                  map.dragging.enable();
                  map.scrollWheelZoom.enable();
                  map.getContainer().style.cursor = "";
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.mapWrapper}>
        <select
          value={mapTheme}
          onChange={(e) => setMapTheme(e.target.value)}
          className={styles.themeSelector}
        >
          {Object.entries(mapThemes).map(([key, theme]) => (
            <option key={key} value={key}>
              {theme.name}
            </option>
          ))}
        </select>

        <div id="salon-detail-map" style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
};

export default LocationMap;
