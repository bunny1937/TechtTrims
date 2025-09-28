import { useRouter } from "next/router";

export default function OwnerSidebar({ closeSidebar }) {
  const router = useRouter();

  const menuItems = [
    { icon: "👤", label: "Profile", path: "/salons/profile" },
    { icon: "📊", label: "Dashboard", path: "/salons/dashboard" },
    { icon: "📅", label: "Bookings", path: "/salons/bookings" },
    {
      icon: "👨‍💼",
      label: "Barber Management",
      href: "/salons/barbers",
      path: "/salons/barbers",
    },

    { icon: "👥", label: "Staff", path: "/salons/staff" },
    { icon: "✂️", label: "Services", path: "/salons/services" },
    { icon: "💰", label: "Payments", path: "/salons/payments" },
    { icon: "📈", label: "Analytics", path: "/salons/analytics" },
    { icon: "⚙️", label: "Settings", path: "/salons/settings" },
  ];

  const handleLogout = () => {
    // Confirm logout
    if (window.confirm("Are you sure you want to logout?")) {
      // Clear salon-specific data
      localStorage.removeItem("ownerToken");
      localStorage.removeItem("salonToken");
      localStorage.removeItem("salonSession");

      alert("Logged out successfully!");
      router.push("/auth/salon/login");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-md">
      {/* Logo */}
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold gold-gradient-text">
            💈 SalonBook Pro
          </h2>
          <p className="text-sm text-text-secondary">Owner Dashboard</p>
        </div>
        {/* Mobile close button */}
        {closeSidebar && (
          <button
            onClick={closeSidebar}
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
          >
            ❌
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              router.push(item.path);
              if (closeSidebar) closeSidebar();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
              router.pathname === item.path
                ? "bg-primary text-white shadow-md"
                : "hover:bg-gray-100 text-text-primary"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="capitalize">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="btn btn-secondary w-full flex items-center justify-center gap-2"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
