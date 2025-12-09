// Enhanced validation
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, phone, gender, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !gender || !password) {
      return res.status(400).json({
        message: "All fields are required",
        required: ["name", "email", "phone", "gender", "password"],
      });
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedPhone = phone.trim();

    // Validate name
    if (sanitizedName.length < 3) {
      return res
        .status(400)
        .json({ message: "Name must be at least 3 characters long" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate phone format (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(sanitizedPhone)) {
      return res.status(400).json({
        message:
          "Invalid phone number. Use 10-digit Indian format (starting with 6-9)",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one lowercase letter",
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one number",
      });
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least one special character (!@#$%^&*)",
      });
    }

    // Validate gender
    if (!["male", "female", "other"].includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email: sanitizedEmail }, { phone: sanitizedPhone }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email or phone number",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = {
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      gender: gender.toLowerCase(),
      role: "user",
      hashedPassword,
      bookingHistory: [],
      preferences: {},
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    const result = await db.collection("users").insertOne(newUser);

    // Generate JWT token
    const token = generateToken(result.insertedId, "user", sanitizedEmail);

    // Remove password from response
    const { hashedPassword: _, ...userResponse } = newUser;
    userResponse._id = result.insertedId;

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
