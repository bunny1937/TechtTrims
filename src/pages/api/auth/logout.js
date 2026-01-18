export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Clear ALL auth cookies
  res.setHeader("Set-Cookie", [
    "authToken=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    "userAuth=; Path=/; SameSite=Strict; Max-Age=0",
    "userData=; Path=/; Max-Age=0",
    "salonAuth=; Path=/; SameSite=Strict; Max-Age=0",
    "barberAuth=; Path=/; SameSite=Strict; Max-Age=0",
  ]);

  return res.status(200).json({ message: "Logged out successfully" });
}
