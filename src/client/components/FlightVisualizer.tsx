// ============================================================
// FlightVisualizer — Client Component
// ============================================================
// Menampilkan informasi tentang RSC flight payload yang diterima.
// Mendemonstrasikan bahwa client component bisa menerima
// data dari server melalui props dalam flight payload.
// ============================================================

import { useState, useEffect } from "react"

interface FlightVisualizerProps {
  nodeCount?: number
  renderTime?: string
}

interface FlightStats {
  fetchStartTime: number
  fetchEndTime: number | null
  payloadSize: number | null
  nodeCount: number
  renderTime: string
}

// Global flight stats — di-set oleh main.tsx setelah flight diterima
export let globalFlightStats: FlightStats = {
  fetchStartTime: 0,
  fetchEndTime: null,
  payloadSize: null,
  nodeCount: 0,
  renderTime: "0ms",
}

export default function FlightVisualizer({
  nodeCount = 0,
  renderTime = "?",
}: FlightVisualizerProps) {
  const [stats, setStats] = useState(globalFlightStats)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    // Update stats dari global (di-set oleh main.tsx)
    const interval = setInterval(() => {
      setStats({ ...globalFlightStats })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const fetchDuration =
    stats.fetchEndTime && stats.fetchStartTime
      ? stats.fetchEndTime - stats.fetchStartTime
      : null

  return (
    <section
      style={{
        background: "#0d1117",
        border: "1px solid #21262d",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#e6edf3",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>📊</span> RSC Flight Stats
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              background: "#1e3a5f",
              color: "#60a5fa",
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              fontSize: "0.7rem",
              border: "1px solid #1d4ed8",
            }}
          >
            CLIENT COMPONENT
          </span>
          <button
            onClick={() => setShowRaw((s) => !s)}
            style={{
              background: showRaw ? "#1e3a5f" : "transparent",
              color: "#60a5fa",
              border: "1px solid #1d4ed8",
              borderRadius: "4px",
              padding: "0.2rem 0.6rem",
              cursor: "pointer",
              fontSize: "0.7rem",
            }}
          >
            {showRaw ? "Hide" : "Show"} Details
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
        }}
      >
        {[
          {
            label: "Flight Nodes",
            value: stats.payloadSize !== null ? String(stats.nodeCount || nodeCount) : String(nodeCount),
            icon: "🔢",
            color: "#1e3a5f",
          },
          {
            label: "Payload Size",
            value:
              stats.payloadSize !== null
                ? `${(stats.payloadSize / 1024).toFixed(1)} KB`
                : "...",
            icon: "📦",
            color: "#1a2e1a",
          },
          {
            label: "Fetch Time",
            value: fetchDuration !== null ? `${fetchDuration}ms` : "...",
            icon: "⚡",
            color: "#2d1b4e",
          },
          {
            label: "Server Render",
            value: renderTime,
            icon: "🖥️",
            color: "#1a1a2e",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: item.color,
              borderRadius: "8px",
              padding: "0.75rem",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>
              {item.icon}
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#e2e8f0",
                marginBottom: "0.1rem",
              }}
            >
              {item.value}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {showRaw && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#010409",
            borderRadius: "6px",
            fontSize: "0.72rem",
            color: "#7d8590",
            lineHeight: 1.8,
            border: "1px solid #21262d",
          }}
        >
          <p style={{ color: "#58a6ff" }}>// Effect-TS Flight Pipeline</p>
          <p style={{ color: "#3fb950" }}>Effect.gen(function* () {"{"}</p>
          <p style={{ paddingLeft: "1.5rem" }}>
            const client = yield*{" "}
            <span style={{ color: "#d2a8ff" }}>HttpClient.HttpClient</span>
          </p>
          <p style={{ paddingLeft: "1.5rem" }}>
            const response = yield* client.
            <span style={{ color: "#79c0ff" }}>get</span>
            <span style={{ color: "#a5d6ff" }}>(&ldquo;/rsc&rdquo;)</span>
          </p>
          <p style={{ paddingLeft: "1.5rem" }}>
            const ndjson = yield* response.
            <span style={{ color: "#79c0ff" }}>text</span>
          </p>
          <p style={{ paddingLeft: "1.5rem" }}>
            const payload = yield*{" "}
            <span style={{ color: "#d2a8ff" }}>parseFlightPayload</span>(ndjson)
          </p>
          <p style={{ paddingLeft: "1.5rem" }}>
            return yield*{" "}
            <span style={{ color: "#d2a8ff" }}>reconstructTree</span>(payload)
          </p>
          <p style={{ color: "#3fb950" }}>{"}"}).pipe(</p>
          <p style={{ paddingLeft: "1.5rem" }}>
            Effect.provide(
            <span style={{ color: "#ffa657" }}>FetchHttpClient.layer</span>)
          </p>
          <p>)</p>
        </div>
      )}
    </section>
  )
}
