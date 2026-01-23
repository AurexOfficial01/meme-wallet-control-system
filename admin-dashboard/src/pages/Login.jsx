import React, { useState } from "react";
import "./styles.css";

const ADMIN_PASSWORD = "Fire1234"; // your password

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_auth", "true");
      window.location.href = "/dashboard";
    } else {
      setError("Wrong password");
    }
  };

  return (
    <div className="login-container">
      <h2>Admin Login</h2>

      <input
        type="password"
        placeholder="Enter admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
