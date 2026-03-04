import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    throw new Error("Missing Google ID token");
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // HARD SECURITY ASSERTIONS
    if (!payload.email) throw new Error("Google token missing email");
    if (!payload.sub) throw new Error("Google token missing subject");
    if (!payload.email_verified) throw new Error("Google email not verified");

    return {
      provider: "google",
      providerSubject: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name || null,
      picture: payload.picture || null,
    };
  } catch (error) {
    console.error("❌ Google token verification failed:", error);
    throw new Error("Invalid Google token");
  }
}
