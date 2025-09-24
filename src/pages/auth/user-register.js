// src/pages/auth/user-register.js - Add prefill functionality
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function UserRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
  });
  const [prefillData, setPrefillData] = useState(null);

  // Load prefill data on component mount
  // src/pages/auth/user-register.js - Use existing userOnboardingData
  useEffect(() => {
    // First check for userOnboardingData (from booking flow)
    const onboardingData = localStorage.getItem("userOnboardingData");
    const savedPrefillData = localStorage.getItem("userPrefillData");

    let prefillInfo = null;

    if (onboardingData) {
      try {
        const data = JSON.parse(onboardingData);

        prefillInfo = {
          name: data.name || "",
          gender: data.gender || "",
          location: data.location || null,
          source: "onboarding",
        };

        setPrefillData(prefillInfo);

        // Prefill form with onboarding data
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          gender: data.gender?.toLowerCase() || prev.gender,
          // Could also prefill location if you have address field
        }));

        console.log("Form prefilled from onboarding data");
      } catch (error) {
        console.error("Error parsing onboarding data:", error);
      }
    } else if (savedPrefillData) {
      // Fallback to feedback prefill data
      try {
        const data = JSON.parse(savedPrefillData);

        prefillInfo = {
          name: data.name || "",
          phone: data.phone || "",
          lastBooking: data.lastBooking || null,
          source: "feedback",
        };

        setPrefillData(prefillInfo);

        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || prev.phone,
        }));
      } catch (error) {
        console.error("Error parsing prefill data:", error);
      }
    }
  }, []);

  // src/pages/auth/user-register.js - Clear both data sources
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/auth/user-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();

        // Store auth token
        localStorage.setItem("userToken", result.token);

        // Clear both prefill data sources after successful registration
        localStorage.removeItem("userPrefillData");
        localStorage.removeItem("userOnboardingData");

        alert("Registration successful! Welcome to TechTrims!");
        router.push("/user/dashboard"); // or wherever you want to redirect
      } else {
        const error = await response.json();
        alert(`Registration failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>

        {/* Show prefill info if available */}
        {prefillData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">
              ✅ Complete your registration
            </h3>
            {prefillData.source === "onboarding" ? (
              <div className="text-sm text-green-700">
                <p>
                  Welcome back, <strong>{prefillData.name}</strong>!
                </p>
                <p>Gender: {prefillData.gender}</p>
                {prefillData.location && (
                  <p className="text-xs text-green-600 mt-1">
                    📍 Location: {prefillData.location.address}
                  </p>
                )}
              </div>
            ) : prefillData.source === "feedback" ? (
              <p className="text-sm text-green-700">
                Based on your recent booking: {prefillData.lastBooking?.service}
                {prefillData.lastBooking?.date &&
                  ` on ${prefillData.lastBooking.date}`}
              </p>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender *
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
