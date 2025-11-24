import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@/styles/Login.css";
import Header from "@/components/Header";
import BackgroundAnimation from "@/components/r3f/BackgroundAnimation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

async function handleLogin(e) {
  e.preventDefault();

  try {
    const res = await fetch("https://sentry-3.onrender.com/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailAddress: email,
        password: password,
      }),
    });

    const data = await res.json();
    console.log("Response:", data);

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // Store as Bearer token
    localStorage.setItem("token", `Bearer ${data.token}`);

    alert("Login successful!");
    navigate("/profile");
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}


  return (
    <>
      <Header />
      <BackgroundAnimation />

      <div className="page-wrapper">
        <div className="login-container">
          <div className="login-card">
            <h1 className="login-title">Welcome Back</h1>

            <form className="login-form" onSubmit={handleLogin}>
              <label className="login-label">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="login-input"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
              />

              <label className="login-label">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="login-input"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
              />

              <button type="submit" className="login-button">
                Login
              </button>
            </form>

            <p className="signup-link-text">
              Don’t have an account?{" "}
              <Link to="/register" className="signup-link">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
