// src/components/Maps/SalonMap.js - WITH MANUAL LOCATION SEARCH
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/router";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Navigation, Search, MapPin, Crosshair } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../../styles/SalonMap.module.css";
import { showError, showWarning } from "@/lib/toast";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom salon marker icon
const salonIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64," +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="30" height="30">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [35, 35],
  iconAnchor: [17.5, 35],
  popupAnchor: [0, -35],
  className: "fixed-marker-icon",
});

// User location marker
const userIcon = new L.Icon({
  iconUrl: "/maps/usericon.png",
  iconSize: [50, 50],
  iconAnchor: [25, 25], // ✅ CORRECT - Center of the 50x50 icon
  className: "fixed-user-icon",
});

const SalonCard = ({
  salon,
  userLocation,
  selectedSalon,
  onSalonSelect,
  onBookNow,
  userGender,
}) => {
  const getGenderServices = (gender) => {
    const maleServices = [
      { name: "Haircut", price: 200, icon: "✂️" },
      { name: "Beard Trim", price: 150, icon: "🧔" },
      { name: "Hair Styling", price: 250, icon: "💇‍♂️" },
      { name: "Face Cleanup", price: 300, icon: "🧴" },
    ];

    const femaleServices = [
      { name: "Haircut & Style", price: 400, icon: "💇‍♀️" },
      { name: "Hair Coloring", price: 800, icon: "🎨" },
      { name: "Facial Treatment", price: 600, icon: "✨" },
      { name: "Manicure", price: 350, icon: "💅" },
    ];

    return gender === "Male" ? maleServices : femaleServices;
  };

  const services =
    salon.topServices?.length > 0
      ? salon.topServices.slice(0, 4)
      : getGenderServices(userGender).slice(0, 4);

  return (
    <div className={styles.salonCard}>
      <div className={styles.cardHeader}>
        <img
          src={
            typeof salon.salonImages?.[0] === "string"
              ? salon.salonImages[0]
              : salon.salonImages?.[0]?.url ||
                "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=200&fit=crop"
          }
          alt={salon.salonName}
          className={styles.salonImage}
        />
        <div className={styles.badges}>
          {salon.distance < 2 && (
            <span className={styles.badge}>Very Close</span>
          )}
          {salon.isVerified && <span className={styles.badge}>Verified</span>}
        </div>
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.salonName}>{salon.salonName}</h3>
        <p className={styles.address}>{salon.location.address}</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.icon}>⭐</span>
            <span>
              {(salon.ratings?.overall ?? salon.rating ?? 4.5).toFixed(1)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.icon}>📍</span>
            <span>{salon.distance?.toFixed(1) || "1.2"} km</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.icon}>👥</span>
            <span>{salon.stats?.totalBookings || 0} bookings</span>
          </div>
        </div>

        <div className={styles.services}>
          <h4>Popular Services</h4>
          <div className={styles.serviceGrid}>
            {services.map((service, idx) => (
              <div key={idx} className={styles.serviceItem}>
                <span className={styles.serviceIcon}>
                  {service.icon || "✂️"}
                </span>
                <div>
                  <span className={styles.serviceName}>{service.name}</span>
                  <span className={styles.servicePrice}>₹{service.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.bookButton}
          onClick={() => onBookNow(salon._id)}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

const MapUpdater = ({ selectedSalon, salons }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedSalon) {
      const salon = salons.find((s) => s._id === selectedSalon);
      if (salon && salon.location?.coordinates) {
        map.setView(
          [salon.location.coordinates[1], salon.location.coordinates[0]],
          16
        );
      }
    }
  }, [selectedSalon, salons, map]);

  return null;
};

// 🔧 FINAL FIX: Add proper headers + rate limiting
// 🔧 FIXED: Location Search Component with WORKING click on map
const LocationSearch = ({
  onLocationSelect,
  isSearching,
  setIsSearching,
  userLocation,
  mapRef,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const searchTimeoutRef = useRef(null);
  const mapClickHandlerRef = useRef(null);

  // Search function
  const searchLocation = useCallback(
    async (query) => {
      if (!query || query.trim().length < 3) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use your backend API proxy
        const response = await fetch(
          `/api/geocode?query=${encodeURIComponent(
            query + ", Maharashtra, India"
          )}`
        );

        if (!response.ok) throw new Error("Search failed");

        const allResults = await response.json();

        // Filter by distance
        const userLat = userLocation?.latitude || 19.247251;
        const userLng = userLocation?.longitude || 73.154063;

        const nearbyResults = allResults
          .map((result) => {
            const lat = parseFloat(resultlatitude);
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
      } finally {
        setLoading(false);
      }
    },
    [userLocation]
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 3) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(() => searchLocation(value), 1000);
    } else {
      setSearchResults([]);
      setLoading(false);
    }
  };

  const selectResult = (result) => {
    onLocationSelect({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      latitude: parseFloat(result.lat), // ADD THIS
      longitude: parseFloat(result.lon), // ADD THIS
      accuracy: 10,
      manual: true,
      address: result.displayname,
    });
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  // 🔥 FIXED: Click on map mode
  const enableClickMode = () => {
    if (!mapRef) {
      console.error("❌ mapRef is null!");
      return;
    }

    console.log("✅ Enabling click mode");
    setClickMode(true);
    setSearchQuery("");
    setSearchResults([]);

    // Disable all map interactions
    mapRef.dragging.disable();
    mapRef.scrollWheelZoom.disable();
    mapRef.doubleClickZoom.disable();
    mapRef.touchZoom.disable();
    mapRef.boxZoom.disable();
    mapRef.keyboard.disable();

    // Change cursor
    const container = mapRef.getContainer();
    container.style.cursor = "crosshair";
    console.log("🎯 Cursor changed to crosshair");

    // Create click handler
    const handleMapClick = (e) => {
      console.log("🖱️ Map clicked!", e.latlng);
      const { lat, lng } = e.latlng;

      // Set location immediately with coordinates
      const location = {
        lat: lat,
        lng: lng,
        latitude: lat, // ✅ ADD THIS
        longitude: lng,
        accuracy: 5,
        manual: true,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };

      console.log("📍 Setting location:", location);
      onLocationSelect(location);

      // ✅ USE YOUR BACKEND API (not OpenStreetMap directly)
      fetch(`/api/geocode?reverse=true&lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.display_name) {
            location.address = data.display_name;
            onLocationSelect(location);
          }
        })
        .catch((err) =>
          console.log("Reverse geocode failed, using coordinates")
        );

      // Cleanup
      disableClickMode();
      setIsSearching(false);
    };

    // Store reference and attach
    mapClickHandlerRef.current = handleMapClick;
    mapRef.on("click", handleMapClick);
    console.log("✅ Click handler attached");
  };

  const disableClickMode = () => {
    if (!mapRef) return;

    console.log("🔄 Disabling click mode");
    setClickMode(false);

    // Re-enable all map interactions
    mapRef.dragging.enable();
    mapRef.scrollWheelZoom.enable();
    mapRef.doubleClickZoom.enable();
    mapRef.touchZoom.enable();
    mapRef.boxZoom.enable();
    mapRef.keyboard.enable();

    // Reset cursor
    mapRef.getContainer().style.cursor = "";

    // Remove click handler
    if (mapClickHandlerRef.current) {
      mapRef.off("click", mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
      console.log("✅ Click handler removed");
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      disableClickMode();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.locationSearchPanel}>
      <div className={styles.searchHeader}>
        <h3>{clickMode ? "📍 Click on map" : "🔍 Search Location"}</h3>
        <button
          className={styles.closeSearchBtn}
          onClick={() => {
            setIsSearching(false);
            disableClickMode();
          }}
        >
          ✕
        </button>
      </div>

      {clickMode ? (
        <div className={styles.clickModeInfo}>
          <p>📍 Click anywhere on the map to set your location</p>
          <p className={styles.clickModeHint}>
            Map is frozen. Click to select.
          </p>
          <button className={styles.backToSearchBtn} onClick={disableClickMode}>
            ← Back to search
          </button>
        </div>
      ) : (
        <>
          <div className={styles.mapControls}>
            <button
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

                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView(
                        [coords.lat, coords.lng],
                        15
                      );
                    }

                    setMapCenter(coords);
                    setIsManualMode(false);
                    sessionStorage.removeItem("isManualMode");

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
            </button>
          </div>

          <div className={styles.alternativeOption}>
            <button className={styles.clickMapBtn} onClick={enableClickMode}>
              🗺️ Click on map to set location
            </button>
          </div>

          <div className={styles.alternativeOption}>
            <button className={styles.clickMapBtn} onClick={enableClickMode}>
              📍 Click on map to set location
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchLocation(searchQuery);
            }}
            className={styles.searchForm}
          >
            <input
              type="text"
              placeholder="Or search building/landmark..."
              value={searchQuery}
              onChange={handleInputChange}
              className={styles.searchInput}
            />
            <button
              type="submit"
              className={styles.searchBtn}
              disabled={loading || !searchQuery.trim()}
            >
              {loading ? "🔄" : "Search"}
            </button>
          </form>

          {loading && (
            <div className={styles.loadingResults}>
              <p>Searching...</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className={styles.searchResultItem}
                  onClick={() => selectResult(result)}
                >
                  <MapPin size={16} className={styles.resultIcon} />
                  <div className={styles.resultText}>
                    <strong>
                      {result.name || result.display_name.split(",")[0]}{" "}
                      <span className={styles.resultDistance}>
                        · {result.distance}km
                      </span>
                    </strong>
                    <p>{result.display_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ZoomIndicator = () => {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };

    map.on("zoomend", updateZoom);

    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map]);

  return <div className={styles.zoomIndicator}>Zoom: {zoom.toFixed(1)}</div>;
};

const SalonMap = ({
  salons,
  userLocation,
  onRevertToLive,
  selectedSalon,
  onSalonSelect,
  onBookNow,
  userGender,
  onLocationChange,
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const selectedSalonData = salons.find((s) => s._id === selectedSalon);
  const router = useRouter();
  const [mapTheme, setMapTheme] = useState("standard");
  const [selectedSalonPopup, setSelectedSalonPopup] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [clickMode, setClickMode] = useState(false); // ✅ ADD THIS
  const mapClickHandlerRef = useRef(null);
  // 🔧 Track initialization and user marker
  const hasInitialized = useRef(false);
  const userMarkerRef = useRef(null);

  // 🔧 NEW: Manual location state
  const [manualLocation, setManualLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

  const mapThemes = {
    standard: {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      name: "Standard",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; Google Maps",
    },
    simple: {
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      name: "Simple",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; OpenStreetMap Humanitarian",
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
      maxNativeZoom: 22,
      attribution: "&copy; CARTO",
    },
    terrain: {
      url: "https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
      name: "Terrain",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; Google Maps",
    },
    hybrid: {
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      name: "Hybrid",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; Google Maps",
    },
    satellite: {
      url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      name: "Satellite",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; Google Maps",
    },
    atlas: {
      url: `https://{s}.tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=${process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY}`,
      name: "Atlas",
      maxZoom: 22,
      maxNativeZoom: 22,
      attribution: "&copy; Thunderforest",
    },
  };

  // 🔧 Use manual location if set, otherwise use live location
  const effectiveUserLocation =
    isManualMode && manualLocation ? manualLocation : userLocation;

  const defaultCenter = useMemo(() => {
    return effectiveUserLocation?.latitude && effectiveUserLocation?.longitude
      ? [effectiveUserLocation.latitude, effectiveUserLocation.longitude]
      : [19.076, 72.8777]; // Mumbai default
  }, [effectiveUserLocation?.latitude, effectiveUserLocation?.longitude]);

  // 🔧 PREVENT continuous re-centering
  useEffect(() => {
    if (!mapRef || hasInitialized.current) return;

    // Only center on initial load
    if (defaultCenter) {
      mapRef.setView(defaultCenter, 15);
      hasInitialized.current = true;
      console.log("🗺️ Map initialized at:", defaultCenter);
    }
  }, [mapRef, defaultCenter]); // No dependency on userLocation

  // 🔧 STABILIZE user marker position updates
  useEffect(() => {
    if (!mapRef || !effectiveUserLocation || !userMarkerRef.current) return;

    const MIN_UPDATE_DISTANCE = 0.0005; // ~50m threshold

    const currentPos = userMarkerRef.current.getLatLng();
    const latDiff = Math.abs(currentPos.lat - effectiveUserLocation.latitude);
    const lngDiff = Math.abs(currentPos.lng - effectiveUserLocation.longitude);

    // Only update if moved significantly
    if (latDiff > MIN_UPDATE_DISTANCE || lngDiff > MIN_UPDATE_DISTANCE) {
      console.log("📍 Updating user marker position");
      userMarkerRef.current.setLatLng([
        effectiveUserLocation.latitude,
        effectiveUserLocation.longitude,
      ]);
    } else {
      console.log("📍 Skipping minor position update");
    }
  }, [effectiveUserLocation, mapRef]);

  // ✅ FIX: Recreate user marker when effectiveUserLocation changes
  useEffect(() => {
    if (!mapRef) return;
    if (!effectiveUserLocation) return;

    const lat = effectiveUserLocation.latitude ?? effectiveUserLocation.lat;
    const lng = effectiveUserLocation.longitude ?? effectiveUserLocation.lng;

    if (!lat || !lng) return;

    if (!userMarkerRef.current) {
      console.log("📍 Creating user marker at:", [lat, lng]);

      const userIcon = L.icon({
        iconUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234285F4'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3C/svg%3E",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(
        mapRef
      );

      console.log("✅ User marker created");
    } else {
      // Update existing marker position
      const lat = effectiveUserLocation.latitude ?? effectiveUserLocation.lat;
      const lng = effectiveUserLocation.longitude ?? effectiveUserLocation.lng;
      if (lat && lng) {
        userMarkerRef.current.setLatLng([lat, lng]);
      }
      console.log("📍 User marker updated");
    }
  }, [effectiveUserLocation, mapRef, isManualMode]);

  // 🔧 Load manual location from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("manualLocation");
    const isManual = sessionStorage.getItem("isManualMode") === "true";

    if (stored && isManual) {
      try {
        const parsed = JSON.parse(stored);
        if (!parsed.latitude && parsed.lat) {
          parsed.latitude = parsed.lat;
          parsed.longitude = parsed.lng;
        }
        setManualLocation(parsed);
        setIsManualMode(true);
        console.log("📍 Loaded manual location from session storage");
      } catch (e) {
        console.error("Error parsing stored manual location", e);
      }
    }
  }, []);

  // ========================================
  // CHANGE: Replace handleLocationSelect
  // ========================================
  const handleLocationSelect = (location) => {
    if (!location?.lat || !location?.lng) {
      console.error("❌ Invalid location:", location);
      return;
    }

    console.log("📍 Pinning location:", location);

    const normalizedLocation = {
      lat: location.lat,
      lng: location.lng,
      latitude: location.lat,
      longitude: location.lng,
      address: location.address || "",
    };

    setManualLocation(normalizedLocation);
    setIsManualMode(true);

    // ✅ CLEAR to force recalculation
    sessionStorage.removeItem("manualLocationDistances");

    sessionStorage.setItem(
      "manualLocation",
      JSON.stringify(normalizedLocation)
    );
    sessionStorage.setItem("isManualMode", "true");

    if (
      mapRef?._container &&
      normalizedLocation.lat &&
      normalizedLocation.lng
    ) {
      try {
        mapRef.flyTo([normalizedLocation.lat, normalizedLocation.lng], 16, {
          animate: true,
          duration: 1.5,
        });
        console.log("🗺️ Map flew to:", normalizedLocation);
      } catch (e) {
        console.error("❌ Fly error:", e);
      }
    }

    // ✅ CRITICAL: Call parent to calculate distances
    if (onLocationChange) {
      console.log("📍 Calling onLocationChange with new pin");
      onLocationChange(normalizedLocation);
    }
  };
  const handleRevertToLive = async () => {
    console.log("📍 Reverted to live location");

    // ✅ Clear manual mode
    setIsManualMode(false);
    sessionStorage.removeItem("manualLocation");
    sessionStorage.removeItem("isManualMode");

    // ✅ Wait for userLocation to be available from hook
    if (!userLocation?.latitude && !userLocation?.lng) {
      console.warn("⚠️ Live location not available yet, requesting permission");
      await requestLocationPermission();
      return;
    }

    // ✅ Use correct property names with fallback
    const lat = userLocation.latitude || userLocation.lat;
    const lng = userLocation.longitude || userLocation.lng;

    if (!lat || !lng) {
      console.error(
        "❌ Cannot flyTo - coordinates still undefined",
        userLocation
      );
      return;
    }

    if (mapRef) {
      try {
        mapRef.flyTo([lat, lng], 16, {
          animate: true,
          duration: 1.5,
        });
        console.log("✅ Flew to live location:", [lat, lng]);
      } catch (err) {
        console.error("❌ flyTo error:", err);
      }
    }

    // ✅ Notify parent to update distances with live location
    if (onLocationChange) {
      onLocationChange(userLocation);
    }
  };
  const ThemeSelector = () => (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 text-black">
      <select
        value={mapTheme}
        onChange={(e) => setMapTheme(e.target.value)}
        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.entries(mapThemes).map(([key, theme]) => (
          <option key={key} value={key}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );

  const PopupOpener = ({ salons }) => {
    const map = useMap();

    useEffect(() => {
      const timer = setTimeout(() => {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.getPopup()) {
            layer.openPopup();
          }
        });
      }, 100);

      return () => clearTimeout(timer);
    }, [map, salons]);

    return null;
  };

  const handleLiveLocationClick = async () => {
    console.log("🔴 Live location button clicked, isManualMode:", isManualMode);

    // ✅ If in manual mode, switch to live
    if (isManualMode) {
      console.log("🔄 Switching from manual to live mode");
      setIsManualMode(false);
      setManualLocation(null);

      // ✅ Clear ALL manual data
      sessionStorage.removeItem("isManualMode");
      sessionStorage.removeItem("manualLocation");
      sessionStorage.removeItem("manualLocationDistances");

      console.log("✅ Manual mode cleared, switching to live GPS");

      // ✅ Callback to parent with current userLocation
      if (onLocationChange && userLocation) {
        onLocationChange(userLocation);
      }
      return;
    }

    // If in manual mode, just revert to live tracking
    if (isManualMode) {
      if (onRevertToLive) {
        onRevertToLive();
      }
      return;
    }

    // Check session storage first
    const storedLocation = sessionStorage.getItem("userLocation");

    if (storedLocation) {
      try {
        const locationData = JSON.parse(storedLocation);
        console.log("✅ Using stored location from session", locationData);

        // Use stored location
        if (onLocationChange) {
          onLocationChange(locationData);
        }

        // Center map
        if (mapRef) {
          mapRef.flyTo([locationData.latitude, locationData.longitude], 16, {
            animate: true,
            duration: 1.5,
          });
        }
        return;
      } catch (e) {
        console.error("Error parsing stored location", e);
      }
    }

    // USE THE EXISTING liveUserLocation FROM HOOK!
    if (userLocation) {
      console.log("✅ Using live location from hook", userLocation);

      // Store in session
      sessionStorage.setItem(
        "userLocation",
        JSON.stringify({
          lat: userLocation.latitude,
          lng: userLocation.longitude,
          accuracy: userLocation.accuracy,
          timestamp: Date.now(),
        })
      );

      if (onLocationChange) {
        onLocationChange(userLocation);
      }

      // ✅ Guard against undefined coordinates
      if (mapRef && userLocation?.latitude && userLocation?.longitude) {
        mapRef.flyTo([userLocation.latitude, userLocation.longitude], 16, {
          animate: true,
          duration: 1.5,
        });
      } else if (mapRef && userLocation?.lat && userLocation?.lng) {
        // Fallback for lat/lng format
        mapRef.flyTo([userLocation.lat, userLocation.lng], 16, {
          animate: true,
          duration: 1.5,
        });
      } else {
        console.warn(
          "⚠️ Cannot flyTo - userLocation coordinates invalid:",
          userLocation
        );
      }

      return;
    }

    // NO LOCATION FOUND - FORCE REQUEST
    console.log("❌ No location found - requesting from browser");

    if (!navigator.geolocation) {
      showWarning(
        "⚠️ Geolocation Not Supported\n\nYour browser doesn't support location services. Please use the 'Search Location' button to set your location manually."
      );
      return;
    }

    setLoadingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      console.log("✅ Location obtained:", newLocation);

      // Store in session immediately
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));

      if (onLocationChange) {
        onLocationChange(newLocation);
      }

      if (mapRef) {
        mapRef.flyTo([newLocation.lat, newLocation.lng], 16, {
          // ✅ CORRECT

          animate: true,
          duration: 1.5,
        });
      }

      setLoadingLocation(false);
    } catch (error) {
      console.error("❌ Location error:", error);
      setLoadingLocation(false);

      // Show user-friendly showWarnings based on error type
      if (error.code === 1) {
        // PERMISSION_DENIED
        showWarning(
          "🔒 Location Permission Denied\n\n" +
            "To see live nearby salons:\n\n" +
            "1. Click the lock icon (🔒) in your browser's address bar\n" +
            "2. Allow location access for this site\n" +
            "3. Refresh the page\n\n" +
            "Or use the 'Search Location' button to set manually."
        );
      } else if (error.code === 2) {
        // POSITION_UNAVAILABLE
        showWarning(
          "📍 Location Unavailable\n\n" +
            "Unable to determine your location.\n\n" +
            "Please check:\n" +
            "• Location services are enabled on your device\n" +
            "• You have a stable internet connection\n\n" +
            "Or use the 'Search Location' button."
        );
      } else if (error.code === 3) {
        // TIMEOUT
        showWarning(
          "⏱️ Location Request Timeout\n\n" +
            "Taking too long to get your location.\n\n" +
            "Please try again or use the 'Search Location' button."
        );
      } else {
        showError(
          "❌ Unable to Get Location\n\n" +
            "Something went wrong while getting your location.\n\n" +
            "Please use the 'Search Location' button to set manually."
        );
      }
    }
  };

  // Search location function
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
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);

          // ✅ Return object with BOTH property names
          const locationObj = {
            ...result,
            lat: lat,
            lng: lng,
            latitude: lat,
            longitude: lng,
            address: result.display_name || result.displayname,
            manual: true,
          };

          // Distance calculation using lat/lng
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

          return { ...locationObj, distance: distance.toFixed(1) };
        })
        .filter((r) => parseFloat(r.distance) < 20)
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 8);

      setSearchResults(nearbyResults);
      setSearching(false);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setSearching(false);
    }
  };

  return (
    <div className={styles.mapWrapper}>
      {/* Controls above map */}
      <div className={styles.mapControlsTop}>
        {/* Search input - takes most space */}
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

        {/* Click on map button */}
        {/* Click on map button */}
        <button
          className={styles.clickMapBtn}
          onClick={() => {
            if (!mapRef) {
              console.error("Map not ready");
              return;
            }

            // Set crosshair cursor
            mapRef.getContainer().style.cursor = "crosshair";
            setClickMode(true);

            // Attach click handler
            const handleMapClick = (e) => {
              const { lat, lng } = e.latlng;

              handleLocationSelect({
                lat,
                lng,
                latitude: lat, // ✅ ADD THIS
                longitude: lng,
                accuracy: 5,
                manual: true,
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              });

              // Try reverse geocode
              fetch(`/api/geocode?reverse=true&lat=${lat}&lon=${lng}`)
                .then((res) => res.json())
                .then((data) => {
                  if (data.display_name) {
                    handleLocationSelect({
                      lat,
                      lng,
                      accuracy: 5,
                      manual: true,
                      address: data.display_name,
                    });
                  }
                })
                .catch(() => console.log("Using coordinates"));

              // Reset
              mapRef.getContainer().style.cursor = "";
              setClickMode(false);
              mapRef.off("click", handleMapClick);
            };

            mapRef.on("click", handleMapClick);
          }}
          title="Click on map to set location"
        >
          <MapPin size={16} />
          <span>Pin</span>
        </button>

        {/* My Location button */}
        <button
          className={styles.liveLocationTopBtn}
          onClick={handleLiveLocationClick}
          disabled={loadingLocation}
          title="Get my current location"
        >
          {loadingLocation ? (
            <Navigation size={16} className={styles.spinning} />
          ) : (
            <Navigation size={16} />
          )}
          <span>{loadingLocation ? "..." : "Live"}</span>
        </button>
      </div>

      {/* Search results dropdown */}
      {/* Search results dropdown */}
      {searching && searchQuery.trim().length >= 3 && (
        <div className={styles.searchResultsDropdown}>
          {searchResults.length > 0 ? (
            // Show results
            searchResults.map((result, idx) => (
              <div
                key={idx}
                className={styles.searchResultItem}
                onClick={() => {
                  handleLocationSelect({
                    lat: parseFloat(result.lat), // ✅ CORRECT
                    lng: parseFloat(result.lon), // ✅ CORRECT (not longitude)
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon),
                    accuracy: 10,
                    manual: true,
                    address: result.display_name,
                  });
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearching(false);
                }}
              >
                <MapPin size={14} className={styles.resultIcon} />
                <div className={styles.resultText}>
                  <strong>
                    {result.name || result.display_name.split(",")[0]}
                    <span className={styles.resultDistance}>
                      {" "}
                      · {result.distance}km
                    </span>
                  </strong>
                  <p>{result.display_name}</p>
                </div>
              </div>
            ))
          ) : (
            // No results fallback
            <div className={styles.noResults}>
              <p>🔍 No locations found</p>
              <p className={styles.noResultsHint}>
                Try searching for a nearby landmark or use the &quot;Pin&quot;
                button to click on the map
              </p>
            </div>
          )}
        </div>
      )}

      <div className={styles.mapContainer}>
        <ThemeSelector />

        {/* 🔧 NEW: Location Search Panel */}
        {isSearching && (
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            userLocation={effectiveUserLocation}
            mapRef={mapRef}
          />
        )}

        {/* 🔧 Manual Location Indicator */}
        {isManualMode && manualLocation?.address && (
          <div className={styles.manualLocationIndicator}>
            <MapPin size={16} />
            <span>Manual: {manualLocation.address.substring(0, 50)}...</span>
          </div>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={15}
          minZoom={10}
          maxZoom={22}
          className={styles.map}
          ref={setMapRef}
          whenReady={(map) => setMapRef(map.target)}
          whenCreated={setMapInstance}
        >
          <TileLayer
            url={mapThemes[mapTheme].url}
            attribution="&copy; Map Data"
            maxZoom={22}
            maxNativeZoom={22}
          />
          <ZoomIndicator />
          {/* Add traffic overlay when traffic theme is selected */}
          {mapTheme === "traffic" && (
            <TileLayer
              url="https://mt1.google.com/vt/lyrs=h,traffic&x={x}&y={y}&z={z}"
              attribution="Traffic"
              opacity={1}
              zIndex={1000}
            />
          )}
          <PopupOpener salons={salons} />
          <MapUpdater selectedSalon={selectedSalon} salons={salons} />

          {/* User location marker - 🔧 WITH REF */}
          {(isManualMode ? manualLocation : effectiveUserLocation)?.latitude &&
            (isManualMode ? manualLocation : effectiveUserLocation)
              ?.longitude && (
              <Marker
                position={[
                  (isManualMode ? manualLocation : effectiveUserLocation)
                    .latitude,
                  (isManualMode ? manualLocation : effectiveUserLocation)
                    .longitude,
                ]}
                icon={userIcon}
                ref={userMarkerRef}
              >
                <Popup>
                  <div className={styles.userPopup}>
                    <strong>
                      {isManualMode ? "📍 Manual Location" : "📍 Your Location"}
                    </strong>
                    <p className="text-xs mt-1">
                      Lat:{" "}
                      {(isManualMode
                        ? manualLocation
                        : effectiveUserLocation
                      ).latitude.toFixed(6)}
                      <br />
                      Lng:{" "}
                      {(isManualMode
                        ? manualLocation
                        : effectiveUserLocation
                      ).longitude.toFixed(6)}
                      <br />
                      {isManualMode
                        ? "Set manually"
                        : `Accuracy: ±${
                            effectiveUserLocation.accuracy?.toFixed(0) ||
                            "Unknown"
                          }m`}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

          {/* Salon markers with always-open popups */}
          {salons.map((salon) => (
            <Marker
              key={salon._id}
              position={[
                salon.location.coordinates[1],
                salon.location.coordinates[0],
              ]}
              icon={salonIcon}
              eventHandlers={{
                click: () => onSalonSelect(salon),
              }}
            >
              <Popup
                autoClose={false}
                closeButton={false}
                closeOnClick={false}
                closeOnEscapeKey={false}
                autoPan={false}
                className="custom-popup"
              >
                <div className="text-center p-2 min-w-[20px]">
                  <h3 className="font-bold text-sm mb-1">{salon.salonName}</h3>
                  <p className="text-xs font-medium text-blue-600 ">
                    {salon.distance && salon.distance !== "—"
                      ? parseFloat(salon.distance).toFixed(2)
                      : "—"}
                    km away
                  </p>

                  <div className="flex flex-col gap-1">
                    <button
                      className="text-xs bg-orange-500 text-white rounded px-4 py-1 font-medium hover:bg-orange-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSalonPopup(salon);
                      }}
                    >
                      View Details
                    </button>
                    <button
                      className="text-xs bg-purple-500 text-white rounded px-2 py-1 font-medium hover:bg-purple-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        const lat = salon.location.coordinates[1];
                        const lng = salon.location.coordinates[0];
                        window.open(
                          `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
                          "_blank"
                        );
                      }}
                    >
                      🚶 Street View
                    </button>
                    <button
                      className="text-xs bg-blue-500 text-white rounded px-2 py-1 font-medium hover:bg-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://maps.google.com/maps?daddr=${salon.location.coordinates[1]},${salon.location.coordinates[0]}`
                        );
                      }}
                    >
                      Get Directions
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* 🔧 UPDATED: Location Controls */}
        {/* {mapRef && (
          <LiveLocationControl
            userLocation={effectiveUserLocation}
            map={mapRef}
            isManualLocation={isManualMode}
            onRevertToLive={handleRevertToLive}
            onOpenSearch={() => setIsSearching(true)}
          />
        )} */}

        {/* Salon Details Card */}
        {selectedSalonPopup && (
          <div
            className={styles.salonPopupOverlay}
            onClick={() => setSelectedSalonPopup(null)}
          >
            <div
              className={styles.salonPopupCard}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.popupClose}
                onClick={() => setSelectedSalonPopup(null)}
              >
                ×
              </button>
              <SalonCard
                salon={selectedSalonPopup}
                userLocation={effectiveUserLocation}
                onSalonSelect={onSalonSelect}
                onBookNow={onBookNow}
                userGender={userGender}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalonMap;
