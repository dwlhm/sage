// ============================================================
// Counter — Client Component
// ============================================================
// "use client" marker menandai ini sebagai client component.
// Komponen ini memiliki state dan event handlers.
// Server hanya mengirim reference-nya dalam flight payload.
// ============================================================

import { useState } from "react"

interface CounterProps {
  initialCount?: number
  label?: string
}

export default function Counter({
  initialCount = 0,
  label = "Count",
}: CounterProps) {
  const [count, setCount] = useState(initialCount)
  const diff = count - initialCount

  return (
    <div
      style={{
        background: "#1e1b4b",
        border: "1px solid #4338ca",
        borderRadius: "10px",
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "#a5b4fc" }}>{label}</span>
        {diff !== 0 && (
          <span
            style={{
              fontSize: "0.7rem",
              color: diff > 0 ? "#86efac" : "#fca5a5",
              background: diff > 0 ? "#14532d" : "#450a0a",
              padding: "0.1rem 0.4rem",
              borderRadius: "4px",
            }}
          >
            {diff > 0 ? "+" : ""}
            {diff} dari initial
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: "3rem",
          fontWeight: 700,
          textAlign: "center",
          color: "#e0e7ff",
          fontFamily: "monospace",
          margin: "0.5rem 0 1rem",
          letterSpacing: "-0.02em",
        }}
      >
        {count}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "center",
        }}
      >
        {[
          { label: "−", onClick: () => setCount((c) => c - 1), color: "#dc2626" },
          {
            label: "Reset",
            onClick: () => setCount(initialCount),
            color: "#4338ca",
          },
          { label: "+", onClick: () => setCount((c) => c + 1), color: "#16a34a" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            style={{
              background: btn.color,
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.4rem 1rem",
              cursor: "pointer",
              fontSize: btn.label === "Reset" ? "0.75rem" : "1rem",
              fontWeight: 600,
              flex: btn.label === "Reset" ? 1 : 0,
              minWidth: "2.5rem",
              transition: "opacity 0.15s",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.4rem 0.75rem",
          background: "#0f0a1e",
          borderRadius: "4px",
          fontSize: "0.7rem",
          color: "#6366f1",
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        useState({initialCount}) · Browser Only
      </div>
    </div>
  )
}
