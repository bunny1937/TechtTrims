// pages/salon-details/[id].js - CHANGE FROM basic details TO comprehensive details page
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  MapPin,
  Clock,
  Phone,
  Star,
  Navigation,
  Share2,
  Heart,
} from "lucide-react";

// Dynamic imports to avoid SSR issues
const LocationMap = dynamic(() => import("../../components/Maps/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-300 h-64 rounded-xl"></div>
  ),
});

export default function SalonDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchSalonDetails = useCallback(async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/salons/${id}`);
      const data = await response.json();

      if (data.success) {
        setSalon(data.salon);
      } else {
        console.error("Failed to fetch salon details");
      }
    } catch (error) {
      console.error("Error fetching salon details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchSalonDetails();
    }
    getUserLocation();
  }, [id, fetchSalonDetails]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location access denied");
        }
      );
    }
  };

  const getDirections = () => {
    if (salon?.location?.coordinates && userLocation) {
      const [lng, lat] = salon.location.coordinates;
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`;
      window.open(url, "_blank");
    } else if (salon?.location?.coordinates) {
      const [lng, lat] = salon.location.coordinates;
      const url = `https://www.google.com/maps/place/${lat},${lng}`;
      window.open(url, "_blank");
    }
  };

  const handleBookNow = () => {
    router.push(`/salons/${id}`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon.salonName,
          text: `Check out ${salon.salonName} - a great salon near you!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const getGenderServices = (gender) => {
    const maleServices = [
      {
        name: "Haircut",
        price: 200,
        duration: 30,
        icon: "✂️",
        description: "Professional haircut with styling",
      },
      {
        name: "Beard Trim",
        price: 150,
        duration: 20,
        icon: "🧔",
        description: "Beard shaping and trimming",
      },
      {
        name: "Hair Styling",
        price: 250,
        duration: 25,
        icon: "💇‍♂️",
        description: "Hair styling with premium products",
      },
      {
        name: "Face Cleanup",
        price: 300,
        duration: 45,
        icon: "🧴",
        description: "Deep face cleansing treatment",
      },
      {
        name: "Hair Wash",
        price: 100,
        duration: 15,
        icon: "🚿",
        description: "Professional hair wash",
      },
      {
        name: "Massage",
        price: 400,
        duration: 60,
        icon: "💆‍♂️",
        description: "Relaxing head and shoulder massage",
      },
    ];

    const femaleServices = [
      {
        name: "Haircut & Style",
        price: 400,
        duration: 60,
        icon: "💇‍♀️",
        description: "Cut and professional styling",
      },
      {
        name: "Hair Coloring",
        price: 800,
        duration: 120,
        icon: "🎨",
        description: "Professional hair coloring service",
      },
      {
        name: "Facial Treatment",
        price: 600,
        duration: 75,
        icon: "✨",
        description: "Deep cleansing facial treatment",
      },
      {
        name: "Manicure",
        price: 350,
        duration: 45,
        icon: "💅",
        description: "Complete nail care and polish",
      },
      {
        name: "Pedicure",
        price: 400,
        duration: 50,
        icon: "🦶",
        description: "Foot care and nail treatment",
      },
      {
        name: "Hair Treatment",
        price: 500,
        duration: 60,
        icon: "🌿",
        description: "Nourishing hair treatment",
      },
    ];

    return gender === "Male" ? maleServices : femaleServices;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading salon details...</p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Salon not found
          </h2>
          <button
            onClick={() => router.back()}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const services =
    salon.services || getGenderServices(salon.targetGender || "Male");
  const salonCoords = salon.location?.coordinates
    ? [salon.location.coordinates[1], salon.location.coordinates[0]]
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite
                    ? "text-red-500 bg-red-50"
                    : "text-gray-600 hover:text-red-500 hover:bg-gray-100"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-200 rounded-xl overflow-hidden">
                <img
                  src={
                    salon.salonImages?.[0]?.url ||
                    salon.salonImages?.[0] ||
                    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop"
                  }
                  alt={salon.salonName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Additional images */}
              {salon.salonImages && salon.salonImages.length > 1 && (
                <div className="grid grid-cols-3 gap-4">
                  {salon.salonImages.slice(1, 4).map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-200 rounded-lg overflow-hidden"
                    >
                      <img
                        src={typeof image === "string" ? image : image.url}
                        alt={`${salon.salonName} ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Salon Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {salon.salonName}
                  </h1>
                  {salon.isVerified && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{salon.location?.address}</span>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 mr-1" />
                    <span className="font-medium">
                      {(salon.ratings?.overall || 4.5).toFixed(1)}
                    </span>
                    <span className="text-gray-500 ml-1">
                      ({salon.ratings?.totalReviews || 0} reviews)
                    </span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span>{salon.stats?.totalBookings || 0} bookings</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span>{salon.distance?.toFixed(1) || "1.2"} km away</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-gray-400 mr-3" />
                    <span>{salon.phone || "Not available"}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-gray-400 mr-3" />
                    <span>
                      {salon.openingTime || "09:00"} -{" "}
                      {salon.closingTime || "21:00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleBookNow}
                  className="flex-1 bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  Book Appointment
                </button>
                <button
                  onClick={getDirections}
                  className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Navigation className="w-5 h-5 mr-2" />
                  Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "services", label: "Services" },
              { id: "reviews", label: "Reviews" },
              { id: "location", label: "Location" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-amber-500 text-amber-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* About */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4">
                  About {salon.salonName}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {salon.description ||
                    `Welcome to ${salon.salonName}, your premier destination for professional grooming and beauty services. Our experienced team is dedicated to providing top-quality treatments in a comfortable and hygienic environment.`}
                </p>
              </div>

              {/* Popular Services Preview */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4">Popular Services</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.slice(0, 4).map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{service.icon}</span>
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-gray-500">
                            {service.duration} min
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-amber-600">
                        ₹{service.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Wait Time</span>
                    <span className="font-medium">
                      {salon.stats?.averageWaitTime || 15} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Repeat Customers</span>
                    <span className="font-medium">
                      {salon.stats?.repeatCustomers || 85}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Bookings</span>
                    <span className="font-medium">
                      {salon.stats?.totalBookings || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {salon.amenities && salon.amenities.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Amenities</h3>
                  <div className="space-y-2">
                    {salon.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-2xl font-semibold mb-6">All Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedService(service)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-3xl mb-3">{service.icon}</div>
                  <h4 className="text-lg font-semibold mb-2">{service.name}</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    {service.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-amber-600">
                      ₹{service.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {service.duration} min
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-2xl font-semibold mb-6">Customer Reviews</h3>
            {salon.recentFeedback && salon.recentFeedback.length > 0 ? (
              <div className="space-y-6">
                {salon.recentFeedback.map((review, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{review.userName}</h4>
                        <div className="flex items-center mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm text-gray-500">
                            {new Date(review.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {review.service}
                      </span>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">💬</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No reviews yet
                </h4>
                <p className="text-gray-500">
                  Be the first to review this salon!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "location" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-semibold mb-4">
                Location & Directions
              </h3>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2" />
                <span>{salon.location?.address}</span>
              </div>
            </div>

            {salonCoords && (
              <div style={{ height: "400px" }}>
                <LocationMap
                  salonLocation={salonCoords}
                  userLocation={userLocation}
                  salonName={salon.salonName}
                  address={salon.location?.address}
                />
              </div>
            )}

            <div className="p-6">
              <button
                onClick={getDirections}
                className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center justify-center"
              >
                <Navigation className="w-5 h-5 mr-2" />
                Get Directions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            className="bg-white rounded-xl p-6 max-w-md w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{selectedService.icon}</div>
              <h3 className="text-2xl font-bold mb-2">
                {selectedService.name}
              </h3>
              <p className="text-gray-600">{selectedService.description}</p>
            </div>

            <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-500">Price</span>
                <div className="text-2xl font-bold text-amber-600">
                  ₹{selectedService.price}
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">Duration</span>
                <div className="text-lg font-semibold">
                  {selectedService.duration} min
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setSelectedService(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedService(null);
                  handleBookNow();
                }}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Book Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
