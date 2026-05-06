// ============================================================
// RSC Client Entry Point
// ============================================================
// Menggunakan Effect-TS untuk seluruh pipeline komunikasi:
//
// SSR/Hydrate Flow (first load):
//   1. Baca __RSC_DATA__ dari <script> tag (embedded di HTML)
//   2. parseFlightPayload(ndjson) — parse NDJSON ke FlightPayload
//   3. reconstructTree(payload) — rekonstruksi React element tree
//   4. createRoot().render(tree) — render ke DOM
//
// CSR Flow (fallback / navigation):
//   1. HttpClient.get("/rsc") — fetch flight payload dari server
//   2. parseFlightPayload(ndjson)
//   3. reconstructTree(payload)
//   4. createRoot().render(tree)
//
// Error handling penuh menggunakan Effect tagged errors.
// ============================================================

import * as React from "react";
import { createRoot } from "react-dom/client";
import { Effect, pipe } from "effect";
import { FetchHttpClient, HttpClient } from "@effect/platform";

import { parseFlightPayload, reconstructTree } from "./flight/deserializer.js";
import { globalFlightStats } from "./components/FlightVisualizer.js";

// ── Types ─────────────────────────────────────────────────────

type RSCState =
  | { status: "loading" }
  | { status: "success"; content: React.ReactNode }
  | { status: "error"; message: string; details?: string };

// ── SSR Data Reader ──────────────────────────────────────────

/**
 * Baca flight payload yang di-embed di HTML oleh SSR.
 * Mengembalikan NDJSON string jika tersedia, null jika tidak.
 */
function readSSRData(): string | null {
  const script = document.getElementById("__RSC_DATA__") as HTMLScriptElement | null;
  if (!script || script.type !== "application/x-flight") {
    return null;
  }
  return script.textContent;
}

/**
 * Effect program untuk hydrate dari SSR embedded data.
 * Pipeline:
 *   readSSRData()
 *     → parseFlightPayload (Effect.try)
 *     → reconstructTree (Effect.try)
 */
const hydrateFromSSR = (): Effect.Effect<React.ReactNode | null, Error> =>
  Effect.gen(function* () {
    const ndjson = readSSRData();
    if (!ndjson) {
      yield* Effect.logInfo("[RSC Client] No SSR data found, falling back to fetch");
      return null;
    }

    yield* Effect.logInfo(
      `[RSC Client] Hydrating from SSR data (${ndjson.length} chars)`,
    );

    // Catat waktu (simulasi — SSR sudah render di server)
    globalFlightStats.fetchStartTime = 0;
    globalFlightStats.fetchEndTime = 0;
    globalFlightStats.payloadSize = new TextEncoder().encode(ndjson).length;

    // Parse NDJSON → FlightPayload
    const payload = yield* pipe(
      parseFlightPayload(ndjson),
      Effect.mapError(
        (err: { _tag: string; message?: string }) =>
          new Error(`Parse Error [${err._tag}]: ${err.message ?? String(err)}`),
      ),
    );

    globalFlightStats.nodeCount = payload.nodes.length;

    yield* Effect.logInfo(
      `[RSC Client] SSR Flight payload: ${payload.nodes.length} nodes (root=${payload.rootId})`,
    );

    // Rekonstruksi React tree dari payload
    const tree = yield* pipe(
      reconstructTree(payload),
      Effect.mapError(
        (err: { _tag: string; message?: string }) =>
          new Error(
            `Reconstruct Error [${err._tag}]: ${err.message ?? String(err)}`,
          ),
      ),
    );

    yield* Effect.logInfo("[RSC Client] SSR tree berhasil di-rekonstruksi");

    return tree;
  });

// ── RSC Fetcher ──────────────────────────────────────────────

/**
 * Effect program untuk fetch dan parse RSC flight payload.
 *
 * Pipeline:
 * HttpClient.get("/rsc")
 *   → response.text (raw NDJSON)
 *   → parseFlightPayload (Effect.try)
 *   → reconstructTree (Effect.try)
 *
 * Semua error di-handle dengan tagged errors.
 */
const fetchRSCContent = (path: string): Effect.Effect<React.ReactNode, Error> =>
  Effect.gen(function* () {
    // Catat waktu mulai
    globalFlightStats.fetchStartTime = Date.now();

    yield* Effect.logInfo(
      `[RSC Client] Fetching flight payload untuk path: ${path}`,
    );

    // Dapatkan HTTP client dari context (provided via FetchHttpClient.layer)
    const client = yield* HttpClient.HttpClient;

    // Fetch flight payload + baca body dalam satu Scope
    const ndjson = yield* pipe(
      Effect.gen(function* () {
        const response = yield* client.get(
          `/rsc?path=${encodeURIComponent(path)}`,
        );
        return yield* response.text;
      }),
      Effect.scoped,
      Effect.mapError(
        (err: unknown) => new Error(`HTTP/Read Error: ${JSON.stringify(err)}`),
      ),
    );

    // Catat statistik
    globalFlightStats.fetchEndTime = Date.now();
    globalFlightStats.payloadSize = new TextEncoder().encode(ndjson).length;

    yield* Effect.logInfo(
      `[RSC Client] Diterima ${ndjson.length} chars, ` +
        `${globalFlightStats.fetchEndTime - globalFlightStats.fetchStartTime}ms`,
    );

    // Parse NDJSON → FlightPayload
    const payload = yield* pipe(
      parseFlightPayload(ndjson),
      Effect.mapError(
        (err: { _tag: string; message?: string }) =>
          new Error(`Parse Error [${err._tag}]: ${err.message ?? String(err)}`),
      ),
    );

    // Update stats dengan node count yang real
    globalFlightStats.nodeCount = payload.nodes.length;

    yield* Effect.logInfo(
      `[RSC Client] Flight payload: ${payload.nodes.length} nodes (root=${payload.rootId})`,
    );

    // Rekonstruksi React tree dari payload
    const tree = yield* pipe(
      reconstructTree(payload),
      Effect.mapError(
        (err: { _tag: string; message?: string }) =>
          new Error(
            `Reconstruct Error [${err._tag}]: ${err.message ?? String(err)}`,
          ),
      ),
    );

    yield* Effect.logInfo("[RSC Client] Tree berhasil direkonstruksi");

    return tree;
  }).pipe(
    // Provide FetchHttpClient implementation (menggunakan browser Fetch API)
    Effect.provide(FetchHttpClient.layer),
  );

// ── RSC Root Component ───────────────────────────────────────

function RSCRoot() {
  const [state, setState] = React.useState<RSCState>({ status: "loading" });

  React.useEffect(() => {
    // Priority 1: Try hydrate from SSR embedded data
    Effect.runPromise(hydrateFromSSR())
      .then((content: React.ReactNode | null) => {
        if (content) {
          setState({ status: "success", content });
          return;
        }
        // Priority 2: Fall back to fetch /rsc
        const path = window.location.pathname;
        return Effect.runPromise(fetchRSCContent(path))
          .then((fetchedContent: React.ReactNode) => {
            setState({ status: "success", content: fetchedContent });
          });
      })
      .catch((err: unknown) => {
        console.error("[RSC Client] Fatal error:", err);
        setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
          details: err instanceof Error ? err.stack : undefined,
        });
      });
  }, []);

  if (state.status === "loading") {
    return (
      <div className="loading">
        <div className="spinner" />
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "0.5rem" }}>
            Fetching RSC Flight Payload...
          </p>
          <p style={{ fontSize: "0.8rem", color: "#555" }}>
            Effect.gen → HttpClient.get → parseFlightPayload → reconstructTree
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="error-container">
        <h2>🚨 RSC Error</h2>
        <pre>{state.message}</pre>
        {state.details && (
          <details style={{ marginTop: "0.5rem" }}>
            <summary
              style={{ cursor: "pointer", color: "#999", fontSize: "0.8rem" }}
            >
              Stack trace
            </summary>
            <pre
              style={{
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: "#888",
              }}
            >
              {state.details}
            </pre>
          </details>
        )}
        <button onClick={() => window.location.reload()}>🔄 Retry</button>
      </div>
    );
  }

  return <>{state.content}</>;
}

// ── Bootstrap ─────────────────────────────────────────────────

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root tidak ditemukan di DOM");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <React.Suspense
      fallback={
        <div className="loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      }
    >
      <RSCRoot />
    </React.Suspense>
  </React.StrictMode>,
);
