import React, { useEffect, useState, useRef } from "react";
import { Navigation, MapPin } from "lucide-react";
import styles from "../../styles/LocationMap.module.css";

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
    const dLat = ((lat - effectiveUserLocation.lat) * Math.PI) / 180;
    const dLon = ((lng - effectiveUserLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((effectiveUserLocation.lat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    setDistance(dist.toFixed(1));
    setDuration(Math.round(dist * 3));
  }, [location, effectiveUserLocation]);

  // Create/update user marker and route line when location changes
  useEffect(() => {
    if (!map || !effectiveUserLocation || !location?.coordinates) return;

    const L = window.L;
    if (!L) return;

    const [lng, lat] = location.coordinates;

    // 🔥 CHECK: If marker exists and is on map, just UPDATE position
    if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      console.log("📍 Updating existing user marker position");
      userMarkerRef.current.setLatLng([
        effectiveUserLocation.lat,
        effectiveUserLocation.lng,
      ]);

      // Update route line
      if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
        console.log("🔄 Updating route line");
        routeLineRef.current.setLatLngs([
          [effectiveUserLocation.lat, effectiveUserLocation.lng],
          [lat, lng],
        ]);
      }
      return; // ✅ EXIT EARLY - Don't create new markers
    }

    // 🔥 CREATE user marker ONLY if it doesn't exist
    if (!userMarkerRef.current) {
      console.log("🆕 Creating user marker for the first time");

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

      const userMarker = L.marker(
        [effectiveUserLocation.lat, effectiveUserLocation.lng],
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
          [effectiveUserLocation.lat, effectiveUserLocation.lng],
          [lat, lng],
        ],
        {
          color: "#d4af37",
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
      const userLat = effectiveUserLocation?.lat || 19.247251;
      const userLng = effectiveUserLocation?.lng || 73.154063;

      const nearbyResults = allResults
        .map((result) => {
          const lat = parseFloat(result.lat);
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

  const handleLocationSelect = (loc) => {
    setManualLocation(loc);
    setIsManualMode(true);
    if (map) {
      map.flyTo([loc.lat, loc.lng], 16, { animate: true, duration: 1.5 });
    }
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
  };

  const enableClickMode = () => {
    if (!map) return;

    setClickMode(true);

    // ✅ DON'T DISABLE MAP INTERACTIONS - Keep it scrollable!
    // Just change cursor to indicate pin mode is active
    map.getContainer().style.cursor = "crosshair";

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;

      handleLocationSelect({
        lat,
        lng,
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
      setClickMode(false);
      map.getContainer().style.cursor = "";
      map.off("click", handleMapClick);
    };

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

  const handleLiveLocation = async () => {
    if (!map) return;

    // If in manual mode, revert to live
    if (isManualMode) {
      setIsManualMode(false);
      setManualLocation(null);

      // Check session storage
      const storedLocation = sessionStorage.getItem("userLocation");
      if (storedLocation) {
        try {
          const locationData = JSON.parse(storedLocation);
          map.flyTo([locationData.lat, locationData.lng], 16, {
            animate: true,
            duration: 1.5,
          });
          return;
        } catch (e) {
          console.error("Error with stored location", e);
        }
      }

      if (userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], 16, {
          animate: true,
          duration: 1.5,
        });
      }
      return;
    }

    // Check session storage first
    const storedLocation = sessionStorage.getItem("userLocation");
    if (storedLocation) {
      try {
        const locationData = JSON.parse(storedLocation);
        setLocating(true);
        map.flyTo([locationData.lat, locationData.lng], 16, {
          animate: true,
          duration: 1.5,
        });
        setTimeout(() => setLocating(false), 1500);
        return;
      } catch (e) {
        console.error("Error parsing location", e);
      }
    }

    // Use live location from hook
    if (effectiveUserLocation) {
      setLocating(true);
      map.flyTo([effectiveUserLocation.lat, effectiveUserLocation.lng], 16, {
        animate: true,
        duration: 1.5,
      });
      setTimeout(() => setLocating(false), 1500);
      return;
    }

    // NO LOCATION - FORCE REQUEST
    if (!navigator.geolocation) {
      alert(
        "⚠️ Geolocation not supported.\n\nPlease use the 'Pin' button to set your location manually."
      );
      return;
    }

    setLocating(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      // Store in session
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));

      // Calculate new distance
      if (location?.coordinates) {
        const [lng, lat] = location.coordinates;
        const R = 6371;
        const dLat = ((lat - newLocation.lat) * Math.PI) / 180;
        const dLon = ((lng - newLocation.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((newLocation.lat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;

        setDistance(dist.toFixed(1));
        alert(
          `✅ Live Location Set!\n\nYou are ${dist.toFixed(
            1
          )} km away from this salon.`
        );
      }

      map.flyTo([newLocation.lat, newLocation.lng], 16, {
        animate: true,
        duration: 1.5,
      });

      setLocating(false);
    } catch (error) {
      console.error("Location error:", error);
      setLocating(false);

      if (error.code === 1) {
        alert(
          "🔒 Location Permission Denied\n\n" +
            "To see your distance:\n" +
            "1. Click the lock icon in address bar\n" +
            "2. Allow location access\n" +
            "3. Try again\n\n" +
            "Or use the 'Pin' button to set manually."
        );
      } else if (error.code === 2) {
        alert(
          "📍 Location unavailable. Please check your device settings or use the 'Pin' button."
        );
      } else if (error.code === 3) {
        alert(
          "⏱️ Location request timed out. Please try again or use the 'Pin' button."
        );
      } else {
        alert(
          "❌ Unable to get location. Please use the 'Pin' button to set manually."
        );
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
        <button
          className={styles.liveLocationTopBtn}
          onClick={handleLiveLocation}
          disabled={locating}
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
                    lat: parseFloat(result.lat),
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
