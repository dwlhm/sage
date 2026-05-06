// ============================================================
// Header — Pure Server Component
// ============================================================
// Tidak ada state, tidak ada browser APIs.
// Hanya data statis yang dirender di server.
// ============================================================

import * as React from "react"

export default function Header() {
  const buildTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <header
      style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
        borderBottom: "1px solid #4338ca",
        padding: "1rem 2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚡</span>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e0e7ff" }}>
              RSC + Effect-TS
            </h1>
            <p style={{ fontSize: "0.75rem", color: "#a5b4fc" }}>
              Custom React Server Components dari scratch
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <nav style={{ display: "flex", gap: "1rem" }}>
            {["Home", "Docs", "GitHub"].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  color: "#c7d2fe",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  transition: "background 0.2s",
                }}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Badge server-side rendering */}
          <div
            style={{
              background: "#1a3a2a",
              border: "1px solid #22c55e",
              borderRadius: "20px",
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
              color: "#86efac",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            Server Rendered · {buildTime}
          </div>
        </div>
      </div>
    </header>
  )
}
