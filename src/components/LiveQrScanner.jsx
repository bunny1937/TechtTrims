"use client";

import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function LiveQrScanner({ salonId, onClose, onVerified }) {
  const scannerRef = useRef(null);
  const lockedRef = useRef(false);
  const audioRef = useRef(null);

  const [state, setState] = useState("idle");
  // idle | scanning | verifying | success | error | offline

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    audioRef.current = new Audio("/sounds/scan-success.mp3");
  }, []);

  const startScanner = async () => {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }

    try {
      setState("scanning");

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      const cameraId =
        devices.find((d) => d.label.toLowerCase().includes("back"))?.id ||
        devices[0]?.id;

      if (!cameraId) throw new Error("No camera found");

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: 260 },
        handleScan,
        () => {},
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("Camera access failed");
      setState("error");
    }
  };

  const handleScan = async (text) => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    // 🔒 HARD CLIENT VALIDATION (important)
    const BOOKING_CODE_REGEX = /^ST-[A-Z0-9]{4,8}$/;

    if (!BOOKING_CODE_REGEX.test(text)) {
      lockedRef.current = false;
      setErrorMsg("Invalid QR code");
      setState("error");
      return;
    }

    setState("verifying");

    try {
      console.log("🔥 SCAN VERIFY PAYLOAD:", {
        bookingCode: text,
        salonId,
      });

      const res = await fetch("/api/walkin/verify-arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode: text,
          salonId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        lockedRef.current = false;
        setErrorMsg(data.message || "Verification failed");
        setState("error");
        return;
      }

      // ✅ VERIFIED BY SERVER
      setState("success");

      audioRef.current?.play().catch(() => {});
      navigator.vibrate?.(150);

      await scannerRef.current?.stop();

      setTimeout(() => {
        onVerified?.(data); // optional callback
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      lockedRef.current = false;
      setErrorMsg("Network error");
      setState("error");
    }
  };

  const close = async () => {
    await scannerRef.current?.stop().catch(() => {});
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={overlay}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={card}
        >
          <h3 style={title}>Scan Booking QR</h3>

          <div style={frame}>
            <div id="qr-reader" />
            {state === "scanning" && <div style={scanLine} />}
          </div>

          {state === "verifying" && (
            <div style={infoBox}>🔍 Verifying booking…</div>
          )}

          {state === "success" && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={successBox}
            >
              ✅ Booking Verified
            </motion.div>
          )}

          {state === "offline" && <p style={errorText}>📴 You are offline</p>}

          {state === "error" && <p style={errorText}>❌ {errorMsg}</p>}

          {state === "idle" && (
            <button style={primaryBtn} onClick={startScanner}>
              Start Camera
            </button>
          )}

          <button style={secondaryBtn} onClick={close}>
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ---------- STYLES ---------- */

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const card = {
  background: "var(--card-bg)",
  color: "var(--text-primary)",
  padding: 20,
  borderRadius: 18,
  width: 360,
};

const title = {
  fontWeight: 700,
  marginBottom: 10,
  textAlign: "center",
};

const frame = {
  position: "relative",
  width: 280,
  height: 280,
  margin: "12px auto",
  borderRadius: 14,
  overflow: "hidden",
  border: "2px solid var(--accent)",
};

const scanLine = {
  position: "absolute",
  left: 0,
  right: 0,
  height: 3,
  background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
  animation: "scan 1.2s infinite",
};

const successBox = {
  color: "#10b981",
  fontWeight: 800,
  textAlign: "center",
  marginTop: 10,
};

const infoBox = {
  textAlign: "center",
  fontSize: 14,
  marginTop: 6,
};

const primaryBtn = {
  width: "100%",
  padding: 12,
  background: "var(--accent)",
  color: "#fff",
  borderRadius: 12,
  fontWeight: 600,
};

const secondaryBtn = {
  width: "100%",
  padding: 10,
  marginTop: 8,
  background: "#e5e7eb",
  borderRadius: 12,
};

const errorText = {
  color: "#dc2626",
  fontSize: 13,
  textAlign: "center",
};
