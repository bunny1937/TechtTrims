// components/Maps/LocationPicker.js - Leaflet location picker
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { MapPin, Search, Navigation } from "lucide-react";
import { geocodeAddress, reverseGeocode } from "../../lib/maps";

// Fix for Leaflet icons in Next.js
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon for salons
const salonIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIuNSAxNi41QzIuNSAxNi41IDYuNSAxMi41IDEyIDEyLjVTMjEuNSAxNi41IDIxLjUgMTYuNSIgc3Ryb2tlPSIjRjU5RTBCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTIgMjJWMTIuNSIgc3Ryb2tlPSIjRjU5RTBCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function LocationMarker({ position, setPosition, setAddress, isDarkMode }) {
  const map = useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);

      // Get address for the clicked position
      reverseGeocode(e.latlng.lat, e.latlng.lng)
        .then((address) => setAddress(address))
        .catch(console.error);
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>
        <div
          className={`p-2 ${isDarkMode ? "text-gray-800" : "text-gray-900"}`}
        >
          📍 Selected Location
        </div>
      </Popup>
    </Marker>
  ) : null;
}

const LocationPicker = ({
  onLocationSelect = () => {},
  initialPosition = [19.076, 72.8777], // Mumbai center
  isDarkMode = false,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const mapRef = useRef();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await geocodeAddress(searchQuery);
      const newPos = [result.coordinates[1], result.coordinates[0]]; // lat, lng for Leaflet
      setPosition(newPos);
      setAddress(result.formattedAddress);

      // Fly to the new position
      if (mapRef.current) {
        mapRef.current.flyTo(newPos, 15);
      }
    } catch (error) {
      alert("Location not found. Please try a different search term.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);

          try {
            const address = await reverseGeocode(
              pos.coords.latitude,
              pos.coords.longitude
            );
            setAddress(address);
          } catch (error) {
            console.error("Error getting address:", error);
          }

          if (mapRef.current) {
            mapRef.current.flyTo(newPos, 15);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location");
          setLoading(false);
        }
      );
    }
  };

  const handleConfirm = () => {
    if (position && address && onLocationSelect) {
      onLocationSelect({
        lat: position[0],
        lng: position[1],
        address: address,
      });
    } else {
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="space-y-3">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            />
            <input
              type="text"
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                isDarkMode
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
              }`}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
              isDarkMode
                ? "bg-yellow-500 text-gray-900 hover:bg-yellow-400"
                : "bg-amber-500 text-white hover:bg-amber-600"
            } disabled:opacity-50`}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-xl border-2 border-dashed transition-all duration-300 flex items-center justify-center ${
            isDarkMode
              ? "border-gray-600 text-gray-300 hover:border-gray-500"
              : "border-gray-300 text-gray-600 hover:border-gray-400"
          } disabled:opacity-50`}
        >
          <Navigation className="w-5 h-5 mr-2" />
          {loading ? "Getting location..." : "Use Current Location"}
        </button>
      </div>

      {/* Map Container */}
      <div
        className={`rounded-xl overflow-hidden border-2 ${
          isDarkMode ? "border-gray-600" : "border-gray-300"
        }`}
        style={{ height: "400px" }}
      >
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            setAddress={setAddress}
            isDarkMode={isDarkMode}
          />
        </MapContainer>
      </div>

      {/* Selected Address Display */}
      {address && (
        <div
          className={`p-4 rounded-xl ${
            isDarkMode ? "bg-gray-700" : "bg-gray-100"
          }`}
        >
          <div className="flex items-start">
            <MapPin
              className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                isDarkMode ? "text-yellow-400" : "text-amber-600"
              }`}
            />
            <div>
              <p
                className={`font-medium ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Selected Location:
              </p>
              <p
                className={`text-sm mt-1 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {address}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={!position || !address}
        className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50 ${
          isDarkMode
            ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 hover:from-yellow-400 hover:to-amber-400"
            : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700"
        }`}
      >
        Confirm Location
      </button>
    </div>
  );
};

export default LocationPicker;
