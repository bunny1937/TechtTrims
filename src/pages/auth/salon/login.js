import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/SalonAuth.module.css";

export default function SalonLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only redirect if already logged in as salon
    const salonToken = localStorage.getItem("salonToken");
    const salonSession = localStorage.getItem("salonSession");

    if (salonToken || salonSession) {
      router.push("/salons/dashboard");
    }
    // DO NOT check onboarding - salon owners can login anytime
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/salon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json(); // ✅ ONLY ONE PARSE
        localStorage.setItem("salonToken", data.token);
        localStorage.setItem("salonSession", JSON.stringify(data.salon));

        alert(`Welcome back, ${data.salon.salonName}!`);

        // Force redirect to salon dashboard
        window.location.href = "/salons/dashboard";
      } else {
        const error = await response.json();
        alert(error.message || "Login failed");
      }
    } catch (error) {
      alert("Login error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <h1>Salon Owner Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p>
          Don&#39;t have an account?
          <a onClick={() => router.push("/auth/salon/register")}>
            {" "}
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
