"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken, setAdmin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setToken(result.data.token);
        setAdmin(result.data.admin);
        router.push("/dashboard");
      } else {
        setError(result.message || "Email atau password salah");
        setIsLoading(false);
      }
    } catch {
      setError("Tidak dapat terhubung ke server");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        position: "relative",
      }}
    >
      {/* Subtle dot grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.6,
        }}
      />

      <div
        className="animate-fade-in-up"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "400px",
          padding: "0 24px",
        }}
      >
        {/* Card */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "40px 32px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px var(--border)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 16px",
                borderRadius: "var(--radius)",
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--foreground)",
                letterSpacing: "1.5px",
                marginBottom: "4px",
              }}
            >
              LUXCHAIN
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted-foreground)",
              }}
            >
              Sign in to admin dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                background: "rgba(224, 92, 92, 0.08)",
                border: "1px solid rgba(224, 92, 92, 0.25)",
                borderRadius: "calc(var(--radius) - 2px)",
                padding: "10px 14px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "var(--destructive)",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@luxchain.com"
                required
                style={{
                  width: "100%",
                  height: "40px",
                  padding: "0 12px",
                  background: "var(--input-background)",
                  border: "1px solid var(--border)",
                  borderRadius: "calc(var(--radius) - 2px)",
                  color: "var(--foreground)",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--ring)";
                  e.target.style.boxShadow = "0 0 0 2px rgba(0,0,0,0.05)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    height: "40px",
                    padding: "0 38px 0 12px",
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    borderRadius: "calc(var(--radius) - 2px)",
                    color: "var(--foreground)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--ring)";
                    e.target.style.boxShadow = "0 0 0 2px rgba(200,169,110,0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    padding: "2px",
                    display: "flex",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                height: "40px",
                background: isLoading ? "var(--muted)" : "var(--primary)",
                color: isLoading ? "var(--muted-foreground)" : "var(--primary-foreground)",
                border: "none",
                borderRadius: "calc(var(--radius) - 2px)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {isLoading ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: "spin 1s linear infinite" }}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "11px",
            color: "var(--muted-foreground)",
            marginTop: "20px",
            letterSpacing: "1.5px",
          }}
        >
          FASHION · BLOCKCHAIN · VERIFY
        </p>
      </div>
    </div>
  );
}
