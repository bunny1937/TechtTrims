import toast from "react-hot-toast";

// Helper to check current theme
const isDarkMode = () => {
  if (typeof document !== "undefined") {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }
  return true; // default dark
};

export const showSuccess = (message) => {
  toast.success(message);
};

export const showError = (message) => {
  toast.error(message);
};

export const showWarning = (message) => {
  const dark = isDarkMode();
  toast(message, {
    icon: "⚠️",
    style: {
      background: dark ? "#faf6ef" : "#1a0f00", // Opposite
      color: dark ? "#1a0f00" : "#faf6ef", // Opposite
      border: `1px solid #f59e0b`,
    },
  });
};

export const showConfirm = (message, onConfirm) => {
  const dark = isDarkMode();

  toast(
    (t) => (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span>{message}</span>
        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button
            onClick={() => {
              toast.dismiss(t.id);
            }}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: `1px solid ${dark ? "#c9a961" : "#d4af37"}`,
              color: dark ? "#d4af37" : "#c9a961",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              toast.dismiss(t.id);
            }}
            style={{
              padding: "8px 16px",
              background: dark ? "#d4af37" : "#c9a961",
              border: "none",
              color: dark ? "#1a0f00" : "#faf6ef",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    ),
    {
      duration: Infinity,
      style: {
        maxWidth: "400px",
        background: dark ? "#faf6ef" : "#1a0f00", // Opposite
        color: dark ? "#1a0f00" : "#faf6ef", // Opposite
        border: `1px solid ${dark ? "#c9a961" : "#d4af37"}`,
      },
    }
  );
};

export const showLoading = (message) => {
  return toast.loading(message);
};

export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};
