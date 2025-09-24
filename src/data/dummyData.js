// data/dummyData.js - Sample data for testing the salon booking platform

export const dummySalons = [
  {
    _id: "salon_001",
    ownerDetails: {
      name: "Rajesh Kumar",
      mobile: "+91 9876543210",
      email: "rajesh@luxurysalon.com",
      password: "$2a$12$hashedPasswordHere", // bcrypt hashed
    },
    salonDetails: {
      name: "Royal Hair Studio",
      address:
        "Shop No. 15, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
      location: {
        type: "Point",
        coordinates: [72.8261, 19.0596], // [longitude, latitude] - Bandra West
      },
      openingHours: {
        open: "09:00",
        close: "21:00",
      },
      images: [
        "/images/salons/royal-hair-studio-1.jpg",
        "/images/salons/royal-hair-studio-2.jpg",
        "/images/salons/royal-hair-studio-3.jpg",
      ],
      description:
        "Premium hair salon offering luxury services with experienced stylists and modern equipment.",
    },
    services: [
      { name: "Haircut", price: 250, duration: 45, genderSpecific: "male" },
      {
        name: "Hair Styling",
        price: 400,
        duration: 60,
        genderSpecific: "male",
      },
      { name: "Beard Trim", price: 150, duration: 30, genderSpecific: "male" },
      {
        name: "Hair Color",
        price: 800,
        duration: 90,
        genderSpecific: "unisex",
      },
      { name: "Facial", price: 600, duration: 60, genderSpecific: "unisex" },
    ],
    barbers: [
      {
        name: "Amit Sharma",
        image: "/images/barbers/amit-sharma.jpg",
        specialization: ["Haircut", "Styling", "Beard"],
        rating: 4.8,
        totalBookings: 1250,
      },
      {
        name: "Vikram Singh",
        image: "/images/barbers/vikram-singh.jpg",
        specialization: ["Hair Color", "Facial", "Styling"],
        rating: 4.6,
        totalBookings: 890,
      },
    ],
    ratings: {
      overall: 4.7,
      totalReviews: 234,
      serviceQuality: 4.8,
      timing: 4.6,
      cleanliness: 4.9,
      ambience: 4.5,
    },
    stats: {
      totalBookings: 2140,
      repeatCustomers: 156,
      averageWaitTime: 12,
    },
    isActive: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-09-20"),
  },
  {
    _id: "salon_002",
    ownerDetails: {
      name: "Priya Mehta",
      mobile: "+91 9765432108",
      email: "priya@glamourstudio.com",
      password: "$2a$12$anotherHashedPasswordHere",
    },
    salonDetails: {
      name: "Glamour Beauty Studio",
      address:
        "2nd Floor, Phoenix Mills, Lower Parel, Mumbai, Maharashtra 400013",
      location: {
        type: "Point",
        coordinates: [72.8347, 19.0144], // Lower Parel
      },
      openingHours: {
        open: "10:00",
        close: "22:00",
      },
      images: [
        "/images/salons/glamour-studio-1.jpg",
        "/images/salons/glamour-studio-2.jpg",
        "/images/salons/glamour-studio-3.jpg",
      ],
      description:
        "Unisex beauty studio specializing in hair, skin, and nail treatments for both men and women.",
    },
    services: [
      {
        name: "Ladies Haircut",
        price: 350,
        duration: 60,
        genderSpecific: "female",
      },
      {
        name: "Hair Styling",
        price: 500,
        duration: 75,
        genderSpecific: "female",
      },
      { name: "Facial", price: 800, duration: 90, genderSpecific: "female" },
      {
        name: "Hair Color",
        price: 1200,
        duration: 120,
        genderSpecific: "female",
      },
      {
        name: "Men's Haircut",
        price: 200,
        duration: 40,
        genderSpecific: "male",
      },
      {
        name: "Manicure & Pedicure",
        price: 600,
        duration: 60,
        genderSpecific: "unisex",
      },
    ],
    barbers: [
      {
        name: "Sneha Patel",
        image: "/images/barbers/sneha-patel.jpg",
        specialization: ["Ladies Cut", "Styling", "Color"],
        rating: 4.9,
        totalBookings: 1580,
      },
      {
        name: "Rohit Joshi",
        image: "/images/barbers/rohit-joshi.jpg",
        specialization: ["Men's Cut", "Styling", "Facial"],
        rating: 4.7,
        totalBookings: 1120,
      },
    ],
    ratings: {
      overall: 4.8,
      totalReviews: 189,
      serviceQuality: 4.9,
      timing: 4.7,
      cleanliness: 4.8,
      ambience: 4.8,
    },
    stats: {
      totalBookings: 2700,
      repeatCustomers: 203,
      averageWaitTime: 8,
    },
    isActive: true,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-09-21"),
  },
  {
    _id: "salon_003",
    ownerDetails: {
      name: "Arjun Reddy",
      mobile: "+91 9654321097",
      email: "arjun@moderncutsalon.com",
      password: "$2a$12$yetAnotherHashedPassword",
    },
    salonDetails: {
      name: "Modern Cut Salon",
      address:
        "Ground Floor, Palladium Mall, High Street Phoenix, Lower Parel, Mumbai 400013",
      location: {
        type: "Point",
        coordinates: [72.8331, 19.0095],
      },
      openingHours: {
        open: "11:00",
        close: "23:00",
      },
      images: [
        "/images/salons/modern-cut-1.jpg",
        "/images/salons/modern-cut-2.jpg",
      ],
      description:
        "Trendy salon focusing on modern cuts and contemporary styling for the urban crowd.",
    },
    services: [
      {
        name: "Trendy Haircut",
        price: 300,
        duration: 50,
        genderSpecific: "male",
      },
      { name: "Buzz Cut", price: 150, duration: 25, genderSpecific: "male" },
      { name: "Hair Wash", price: 100, duration: 20, genderSpecific: "male" },
      {
        name: "Beard Styling",
        price: 200,
        duration: 35,
        genderSpecific: "male",
      },
      {
        name: "Hair Gel Styling",
        price: 250,
        duration: 40,
        genderSpecific: "male",
      },
    ],
    barbers: [
      {
        name: "Kiran Kumar",
        image: "/images/barbers/kiran-kumar.jpg",
        specialization: ["Modern Cuts", "Styling", "Beard"],
        rating: 4.5,
        totalBookings: 950,
      },
    ],
    ratings: {
      overall: 4.5,
      totalReviews: 127,
      serviceQuality: 4.6,
      timing: 4.4,
      cleanliness: 4.7,
      ambience: 4.3,
    },
    stats: {
      totalBookings: 950,
      repeatCustomers: 89,
      averageWaitTime: 15,
    },
    isActive: true,
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-09-19"),
  },
];

export const dummyUsers = [
  {
    _id: "user_001",
    name: "Rahul Sharma",
    mobile: "+91 9876543211",
    email: "rahul.sharma@email.com",
    gender: "male",
    location: {
      coordinates: [72.8777, 19.076], // Andheri
      address: "Andheri East, Mumbai, Maharashtra",
    },
    preferences: {
      favoriteServices: ["Haircut", "Beard Trim"],
      preferredPriceRange: { min: 100, max: 500 },
    },
    bookingHistory: ["booking_001", "booking_002"],
    createdAt: new Date("2024-06-15"),
    updatedAt: new Date("2024-09-20"),
  },
  {
    _id: "user_002",
    name: "Anita Desai",
    mobile: "+91 9765432109",
    email: "anita.desai@email.com",
    gender: "female",
    location: {
      coordinates: [72.8261, 19.0596], // Bandra
      address: "Bandra West, Mumbai, Maharashtra",
    },
    preferences: {
      favoriteServices: ["Ladies Haircut", "Facial", "Hair Color"],
      preferredPriceRange: { min: 300, max: 1500 },
    },
    bookingHistory: ["booking_003"],
    createdAt: new Date("2024-07-22"),
    updatedAt: new Date("2024-09-18"),
  },
];

export const dummyBookings = [
  {
    _id: "booking_001",
    userId: "user_001",
    salonId: "salon_001",
    barberName: "Amit Sharma",
    service: {
      name: "Haircut",
      price: 250,
      duration: 45,
    },
    scheduledTime: new Date("2024-09-25T14:30:00Z"),
    status: "confirmed",
    userDetails: {
      name: "Rahul Sharma",
      mobile: "+91 9876543211",
      gender: "male",
    },
    paymentStatus: "paid",
    feedback: {
      submitted: false,
      ratings: {},
      comment: "",
    },
    createdAt: new Date("2024-09-20T10:15:00Z"),
    updatedAt: new Date("2024-09-20T10:15:00Z"),
  },
  {
    _id: "booking_002",
    userId: "user_001",
    salonId: "salon_001",
    barberName: "Vikram Singh",
    service: {
      name: "Facial",
      price: 600,
      duration: 60,
    },
    scheduledTime: new Date("2024-08-15T16:00:00Z"),
    status: "completed",
    userDetails: {
      name: "Rahul Sharma",
      mobile: "+91 9876543211",
      gender: "male",
    },
    paymentStatus: "paid",
    feedback: {
      submitted: true,
      ratings: {
        serviceQuality: 5,
        timing: 4,
        barberPerformance: 5,
        salonAmbience: 4,
        overall: 5,
      },
      comment:
        "Excellent service! Very professional and relaxing facial. Will definitely come back.",
    },
    createdAt: new Date("2024-08-10T09:30:00Z"),
    updatedAt: new Date("2024-08-15T17:15:00Z"),
  },
  {
    _id: "booking_003",
    userId: "user_002",
    salonId: "salon_002",
    barberName: "Sneha Patel",
    service: {
      name: "Ladies Haircut",
      price: 350,
      duration: 60,
    },
    scheduledTime: new Date("2024-09-28T11:00:00Z"),
    status: "confirmed",
    userDetails: {
      name: "Anita Desai",
      mobile: "+91 9765432109",
      gender: "female",
    },
    paymentStatus: "pending",
    feedback: {
      submitted: false,
      ratings: {},
      comment: "",
    },
    createdAt: new Date("2024-09-21T14:22:00Z"),
    updatedAt: new Date("2024-09-21T14:22:00Z"),
  },
];

export const dummyFeedback = [
  {
    _id: "feedback_001",
    bookingId: "booking_002",
    userId: "user_001",
    salonId: "salon_001",
    ratings: {
      serviceQuality: 5,
      timing: 4,
      barberPerformance: 5,
      salonAmbience: 4,
      overall: 5,
    },
    comment:
      "Excellent service! Very professional and relaxing facial. Will definitely come back.",
    createdAt: new Date("2024-08-15T17:15:00Z"),
  },
];

// Popular services by gender
export const popularServices = {
  male: [
    { name: "Haircut", avgPrice: 200, popularity: 95 },
    { name: "Beard Trim", avgPrice: 125, popularity: 78 },
    { name: "Hair Styling", avgPrice: 350, popularity: 65 },
    { name: "Facial", avgPrice: 550, popularity: 45 },
  ],
  female: [
    { name: "Ladies Haircut", avgPrice: 350, popularity: 92 },
    { name: "Hair Color", avgPrice: 1000, popularity: 76 },
    { name: "Facial", avgPrice: 700, popularity: 84 },
    { name: "Hair Styling", avgPrice: 450, popularity: 88 },
  ],
  unisex: [
    { name: "Hair Wash", avgPrice: 120, popularity: 70 },
    { name: "Hair Treatment", avgPrice: 800, popularity: 55 },
    { name: "Scalp Massage", avgPrice: 300, popularity: 62 },
  ],
};

// Time slots for bookings (24-hour format)
export const availableTimeSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
];

// Mumbai area coordinates for testing nearby functionality
export const mumbaiAreas = [
  { name: "Bandra West", coordinates: [72.8261, 19.0596] },
  { name: "Andheri East", coordinates: [72.8777, 19.076] },
  { name: "Lower Parel", coordinates: [72.8347, 19.0144] },
  { name: "Powai", coordinates: [72.905, 19.1176] },
  { name: "Juhu", coordinates: [72.8261, 19.1075] },
  { name: "Worli", coordinates: [72.817, 19.0176] },
  { name: "Colaba", coordinates: [72.8342, 18.9067] },
  { name: "Malad West", coordinates: [72.8405, 19.1864] },
];

// Admin user for testing
export const dummyAdmin = {
  _id: "admin_001",
  username: "admin",
  email: "admin@luxurysalon.com",
  password: "$2a$12$adminHashedPasswordHere", // bcrypt hashed "admin123"
  role: "super_admin",
  permissions: [
    "manage_salons",
    "manage_users",
    "view_analytics",
    "manage_bookings",
  ],
  createdAt: new Date("2024-01-01"),
  lastLogin: new Date("2024-09-21"),
};

// Sample analytics data for dashboard
export const analyticsData = {
  totalSalons: 156,
  totalUsers: 2847,
  totalBookings: 12459,
  monthlyBookings: [
    { month: "Jan", bookings: 890 },
    { month: "Feb", bookings: 1205 },
    { month: "Mar", bookings: 1156 },
    { month: "Apr", bookings: 1389 },
    { month: "May", bookings: 1547 },
    { month: "Jun", bookings: 1678 },
    { month: "Jul", bookings: 1456 },
    { month: "Aug", bookings: 1789 },
    { month: "Sep", bookings: 1349 },
  ],
  topServices: [
    { service: "Haircut", count: 4567, revenue: 913400 },
    { service: "Hair Styling", count: 2134, revenue: 853600 },
    { service: "Facial", count: 1876, revenue: 1313200 },
    { service: "Hair Color", count: 1234, revenue: 1234000 },
    { service: "Beard Trim", count: 2345, revenue: 293125 },
  ],
  revenueByMonth: [
    { month: "Jan", revenue: 234000 },
    { month: "Feb", revenue: 312000 },
    { month: "Mar", revenue: 289000 },
    { month: "Apr", revenue: 387000 },
    { month: "May", revenue: 445000 },
    { month: "Jun", revenue: 523000 },
    { month: "Jul", revenue: 467000 },
    { month: "Aug", revenue: 589000 },
    { month: "Sep", revenue: 445000 },
  ],
};

// Helper function to seed database (for testing)
export const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding database with dummy data...");

    // This would be used in your API routes to populate initial data
    const seedData = {
      salons: dummySalons,
      users: dummyUsers,
      bookings: dummyBookings,
      feedback: dummyFeedback,
      admin: dummyAdmin,
    };

    console.log("✅ Database seeded successfully!");
    return seedData;
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
};

// Utility function to generate random booking data
export const generateRandomBooking = (userId, salonId, barberName) => {
  const services = [
    "Haircut",
    "Facial",
    "Hair Styling",
    "Beard Trim",
    "Hair Color",
  ];
  const prices = [200, 500, 400, 150, 800];
  const durations = [45, 60, 75, 30, 90];

  const randomService = Math.floor(Math.random() * services.length);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);

  return {
    _id: `booking_${Date.now()}`,
    userId,
    salonId,
    barberName,
    service: {
      name: services[randomService],
      price: prices[randomService],
      duration: durations[randomService],
    },
    scheduledTime: futureDate,
    status: "confirmed",
    userDetails: {
      name: "New User",
      mobile: "+91 9999999999",
      gender: "male",
    },
    paymentStatus: "pending",
    feedback: {
      submitted: false,
      ratings: {},
      comment: "",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Export all data as default
const dummyData = {
  salons: dummySalons,
  users: dummyUsers,
  bookings: dummyBookings,
  feedback: dummyFeedback,
  admin: dummyAdmin,
  popularServices,
  availableTimeSlots,
  mumbaiAreas,
  analyticsData,
  seedDatabase,
  generateRandomBooking,
};

export default dummyData;
