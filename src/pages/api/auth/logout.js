export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ✅ Clear HttpOnly cookie
  res.setHeader("Set-Cookie", [
    "authToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
    "userData=; Path=/; Max-Age=0",
  ]);

  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
}
