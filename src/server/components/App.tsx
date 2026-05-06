// ============================================================
// App — Root Server Component
// ============================================================
// Komponen root yang menggabungkan semua server dan client components.
// Ini adalah entry point untuk RSC rendering.
// ============================================================

import * as React from "react"
import { createClientRef } from "../flight/client-ref.js"
import Header from "./Header.js"
import TodoList from "./TodoList.js"

// Client component references
const Counter = createClientRef<{
  initialCount: number
  label: string
}>("Counter")

const FlightVisualizer = createClientRef<{
  nodeCount: number
  renderTime: string
}>("FlightVisualizer")

interface AppProps {
  readonly path?: string
  readonly nodeCount?: number
}

export default async function App({ path = "/", nodeCount = 0 }: AppProps) {
  const renderStart = Date.now()

  // Simulate beberapa async work di server
  const serverInfo = await new Promise<{
    env: string
    nodeVersion: string
    uptime: number
  }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          env: process.env.NODE_ENV ?? "development",
          nodeVersion: process.version,
          uptime: Math.floor(process.uptime()),
        }),
      10
    )
  )

  const renderTime = `${Date.now() - renderStart}ms`

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Server Component: Header */}
      <Header />

      <main
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* Hero Section */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Server Info Panel */}
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🖥️</span>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#f1f5f9",
                }}
              >
                Server Component
              </h2>
              <span
                style={{
                  marginLeft: "auto",
                  background: "#14532d",
                  color: "#86efac",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  border: "1px solid #16a34a",
                }}
              >
                SERVER
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {[
                ["Path", path],
                ["Environment", serverInfo.env],
                ["Node.js", serverInfo.nodeVersion],
                ["Uptime", `${serverInfo.uptime}s`],
                ["Render Time", renderTime],
                ["Rendered At", new Date().toISOString()],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    padding: "0.375rem 0",
                    borderBottom: "1px solid #1f2937",
                  }}
                >
                  <span style={{ color: "#94a3b8" }}>{label}</span>
                  <code
                    style={{
                      color: "#a5b4fc",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                    }}
                  >
                    {value}
                  </code>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#0f172a",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "#64748b",
                fontFamily: "monospace",
              }}
            >
              <p style={{ color: "#4ade80" }}>// RSC Pipeline (Effect-TS)</p>
              <p>serializeToFlight(App)</p>
              <p style={{ paddingLeft: "1rem", color: "#818cf8" }}>|{">"} Effect.gen</p>
              <p style={{ paddingLeft: "1rem", color: "#818cf8" }}>|{">"} Ref.modify (ID alloc)</p>
              <p style={{ paddingLeft: "1rem", color: "#818cf8" }}>|{">"} Effect.forEach (children)</p>
              <p style={{ paddingLeft: "1rem", color: "#818cf8" }}>|{">"} payloadToNDJSON</p>
            </div>
          </div>

          {/* Client Component Panel */}
          <div
            style={{
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "12px",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🌐</span>
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#f1f5f9",
                }}
              >
                Client Component
              </h2>
              <span
                style={{
                  marginLeft: "auto",
                  background: "#1e1b4b",
                  color: "#a5b4fc",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  border: "1px solid #4338ca",
                }}
              >
                CLIENT
              </span>
            </div>

            <p
              style={{
                fontSize: "0.85rem",
                color: "#94a3b8",
                marginBottom: "1rem",
                lineHeight: 1.6,
              }}
            >
              Komponen di bawah adalah{" "}
              <strong style={{ color: "#a5b4fc" }}>Client Component</strong>.
              Server hanya mengirim reference-nya (ID + props) dalam flight payload.
              Client yang akan load dan render implementasinya.
            </p>

            {/* Client Counter Component */}
            <Counter initialCount={42} label="Effect Counter" />
          </div>
        </section>

        {/* RSC Architecture Explanation */}
        <section
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#e2e8f0",
              marginBottom: "1rem",
            }}
          >
            🔄 RSC + Effect-TS Architecture
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.75rem",
            }}
          >
            {[
              {
                step: "1",
                icon: "⚛️",
                title: "Server Render",
                desc: "React elements di-serialize menggunakan Effect Ref & tryPromise",
                color: "#1e3a5f",
                border: "#1d4ed8",
              },
              {
                step: "2",
                icon: "📡",
                title: "Flight Stream",
                desc: "NDJSON dikirim via HTTP. Client refs jadi reference node",
                color: "#1a2e1a",
                border: "#15803d",
              },
              {
                step: "3",
                icon: "🔌",
                title: "Effect Client",
                desc: "HttpClient dari @effect/platform fetch & parse flight payload",
                color: "#2d1b4e",
                border: "#7c3aed",
              },
              {
                step: "4",
                icon: "🖼️",
                title: "React Render",
                desc: "Tree direkonstruksi. Client components di-load dari registry",
                color: "#1a1a2e",
                border: "#4f46e5",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  background: item.color,
                  border: `1px solid ${item.border}`,
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {item.step}
                  </span>
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                </div>
                <h3
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#f1f5f9",
                    marginBottom: "0.375rem",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Flight Visualizer Client Component */}
        <FlightVisualizer
          nodeCount={nodeCount}
          renderTime={renderTime}
        />

        {/* Server Component: TodoList dengan Effect data fetching */}
        <TodoList />
      </main>

      <footer
        style={{
          borderTop: "1px solid #1a1a1a",
          padding: "1.5rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "#475569",
          marginTop: "2rem",
        }}
      >
        <p>
          RSC + Effect-TS · No Framework · Custom Flight Protocol ·{" "}
          <code style={{ color: "#a5b4fc" }}>@effect/platform-node</code> +{" "}
          <code style={{ color: "#a5b4fc" }}>Vite</code>
        </p>
      </footer>
    </div>
  )
}
