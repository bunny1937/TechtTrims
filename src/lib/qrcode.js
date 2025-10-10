import QRCode from "qrcode";

export async function generateQRCode(bookingCode) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(bookingCode, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error("QR code generation error:", error);
    return null;
  }
}

export function generateBookingCode() {
  const prefix = "TT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}
