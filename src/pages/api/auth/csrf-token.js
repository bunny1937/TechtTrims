import { generateCSRFToken } from "../../../lib/middleware/csrf";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ FIX: No identifier needed anymore
    const csrfToken = await generateCSRFToken();

    console.log("✅ [API] CSRF token sent to client");

    res.status(200).json({ csrfToken });
  } catch (error) {
    console.error("❌ [API] CSRF token generation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
