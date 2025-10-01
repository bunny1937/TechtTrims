import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/UserAuth.module.css";

export default function UserLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        const result = await response.json();
        // Store token and user info
        localStorage.setItem("userToken", result.token);
        localStorage.setItem(
          "authenticatedUserData",
          JSON.stringify(result.user)
        );

        // Trigger user data sync
        await UserDataManager.fetchAndStoreUserData();

        alert(`Welcome back, ${result.user.name}!`);
        router.push("/user/dashboard");
      } else {
        const error = await response.json();
        setError(error.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <button
            onClick={() => router.push("/")}
            className={styles.backButton}
          >
            ← Back to Home
          </button>
        </div>

        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Login to your TechTrims account</p>

        {error && (
          <div className={styles.error}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className={styles.authLinks}>
          <p className={styles.authLink}>
            Don&#39;t have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/user/register")}
              className={styles.linkButton}
            >
              Create Account
            </button>
          </p>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <p className={styles.authLink}>
            Are you a salon owner?{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/salon/login")}
              className={styles.linkButton}
            >
              Login as Salon
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
