import { useState, useEffect } from "react";

export default function ServiceTimeMonitor({ booking }) {
  const [timeState, setTimeState] = useState({
    elapsed: 0,
    remaining: 0,
    percent: 0,
    alert: null,
  });

  useEffect(() => {
    if (booking.status !== "started" || !booking.serviceStartedAt) return;

    const updateTime = () => {
      const started = new Date(booking.serviceStartedAt);
      const now = new Date();
      const elapsedMs = now - started;
      const elapsedMin = Math.floor(elapsedMs / (1000 * 60));

      const duration = booking.estimatedDuration || 45;
      const extended = booking.timeExtended || 0;
      const totalDuration = duration + extended;
      const remainingMin = Math.max(0, totalDuration - elapsedMin);
      const percent = Math.min(100, (elapsedMin / totalDuration) * 100);

      let alert = null;
      const overagePercent = (elapsedMin / totalDuration) * 100;

      if (overagePercent >= 125) {
        alert = "critical"; // 🔴 Red
      } else if (overagePercent >= 110) {
        alert = "danger"; // 🟠 Orange
      } else if (overagePercent >= 100) {
        alert = "warning"; // 🟡 Yellow
      }

      setTimeState({
        elapsed: elapsedMin,
        remaining: remainingMin,
        percent,
        alert,
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const duration = booking.estimatedDuration || 45;
  const extended = booking.timeExtended || 0;
  const totalDuration = duration + extended;

  return (
    <div
      style={{
        background:
          timeState.alert === "critical"
            ? "#fee2e2"
            : timeState.alert === "danger"
            ? "#fed7aa"
            : timeState.alert === "warning"
            ? "#fef3c7"
            : "#f0fdf4",
        padding: "12px",
        borderRadius: "8px",
        marginBottom: "12px",
        borderLeft:
          timeState.alert === "critical"
            ? "4px solid #dc2626"
            : timeState.alert === "danger"
            ? "4px solid #f97316"
            : timeState.alert === "warning"
            ? "4px solid #f59e0b"
            : "4px solid #10b981",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
          {timeState.elapsed}m / {totalDuration}m
        </span>
        {timeState.alert && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color:
                timeState.alert === "critical"
                  ? "#991b1b"
                  : timeState.alert === "danger"
                  ? "#92400e"
                  : "#78350f",
            }}
          >
            {timeState.alert === "critical" && "🔴 CRITICAL"}
            {timeState.alert === "danger" && "🟠 OVERTIME"}
            {timeState.alert === "warning" && "🟡 TIME UP"}
          </span>
        )}
      </div>

      <div
        style={{
          height: "10px",
          background: "#e5e7eb",
          borderRadius: "5px",
          overflow: "hidden",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            height: "100%",
            background:
              timeState.alert === "critical"
                ? "linear-gradient(90deg, #fca5a5, #dc2626)"
                : timeState.alert === "danger"
                ? "linear-gradient(90deg, #fb923c, #f97316)"
                : timeState.alert === "warning"
                ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                : "linear-gradient(90deg, #10b981, #059669)",
            width: `${Math.min(100, timeState.percent)}%`,
            transition: "width 1s linear",
          }}
        />
      </div>

      {extended > 0 && (
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          ➕ Extended: {extended}m | Total: {totalDuration}m
        </div>
      )}

      {timeState.alert && (
        <div style={{ fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>
          {timeState.alert === "critical" &&
            "🔴 Will auto-complete in 2min if not done"}
          {timeState.alert === "danger" &&
            "🟠 Service over limit! Mark done or extend"}
          {timeState.alert === "warning" &&
            "🟡 Time's up! Extend or mark as done"}
        </div>
      )}
    </div>
  );
}
