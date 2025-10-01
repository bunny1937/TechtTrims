import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/SalonAuth.module.css";

export default function SalonLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/salon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store salon session
        localStorage.setItem("salonSession", JSON.stringify(data.salon));
        localStorage.setItem("salonToken", data.token);
        router.push("/salons/dashboard");
      } else {
        alert(data.message || "Login failed");
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
