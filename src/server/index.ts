// ============================================================
// Effect HTTP Server — Entry Point
// ============================================================
// Routes:
//   GET  /rsc         — Full RSC flight payload (NDJSON)
//   POST /rsc/sync    — Sync endpoint:
//                         type='action'  → mutasi store, return ack (no flight)
//                         type='refresh' → re-render component, return partial flight
//   GET  /health      — Health check
// ============================================================

import { createServer } from "node:http";
import * as React from "react";

import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { serializeToFlight, payloadToNDJSON } from "./flight/serializer.js";
import { renderPageToHTML } from "./render/ssr-renderer.js";
import App from "./components/App.js";
import TodoList from "./components/TodoList.js";
import { initTodoStore } from "./store/todo-store.js";
import { executeAction } from "./actions.js";
import type { RSCSyncRequest } from "../shared/rsc-protocol.js";

const PORT = 3001;

// ── Component Registry ────────────────────────────────────────
// Mapping dari componentId ke factory function server component.
// Digunakan saat partial refresh via /rsc/sync.

const serverComponentFactory: Record<string, () => React.ReactElement> = {
  TodoList: () => React.createElement(TodoList),
};

// ── SSR HTML Handler ──────────────────────────────────────────

/**
 * Handler untuk GET /
 * 
 * Server-Side Rendering (SSR):
 * 1. Render App component tree ke HTML string
 * 2. Serialize ke flight payload (untuk client hydrate)
 * 3. Return full HTML page dengan embedded data
 * 
 * Client akan membaca __RSC_DATA__ dan skip fetch /rsc.
 */
const htmlHandler = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const path = url.searchParams.get("path") ?? url.pathname ?? "/";

  yield* Effect.logInfo(`[SSR] Serving HTML: path=${path}`);

  // Di development, arahkan script tag ke Vite dev server
  const isDev = process.env.NODE_ENV !== "production";
  const viteDevServerUrl = isDev ? "http://localhost:5173" : undefined;

  const html = yield* renderPageToHTML(path, { viteDevServerUrl });

  return HttpServerResponse.text(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-SSR": "true",
    },
  });
});

// ── RSC Handler (full page) ───────────────────────────────────

const rscHandler = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const path = url.searchParams.get("path") ?? "/";

  yield* Effect.logInfo(`[RSC] Full render: path=${path}`);

  const payload = yield* serializeToFlight(
    React.createElement(App, { path, nodeCount: 0 }),
  );

  yield* Effect.logInfo(
    `[RSC] Done: ${payload.nodes.length} nodes, root=${payload.rootId}`,
  );

  const ndjson = payloadToNDJSON(payload);

  return HttpServerResponse.text(ndjson, {
    status: 200,
    headers: {
      "Content-Type": "application/x-flight; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "X-RSC-Version": "1.0",
      "X-Node-Count": String(payload.nodes.length),
    },
  });
});

// ── RSC Sync Handler ─────────────────────────────────────────

/**
 * Handler untuk POST /rsc/sync
 *
 * Effect pipeline:
 * 1. Parse JSON body sebagai RSCSyncRequest
 * 2. Jika 'action': execute via actionRegistry → return ack
 * 3. Jika 'refresh': re-render server component → return partial flight NDJSON
 */
const syncHandler = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;

  // Parse request body
  const body = yield* request.json.pipe(
    Effect.mapError((e) => new Error(`Failed to parse body: ${String(e)}`)),
  ) as Effect.Effect<RSCSyncRequest>;

  const syncRequest = body as unknown as RSCSyncRequest;

  yield* Effect.logInfo(`[RSC Sync] type=${syncRequest.type}`);

  // ── Case 1: Server Action (no flight) ──
  if (syncRequest.type === "action") {
    const { action, payload } = syncRequest;

    // Execute action menggunakan Effect
    yield* executeAction(action, payload).pipe(
      Effect.catchAll((err) => {
        // Log error tapi tidak gagalkan request
        return Effect.logWarning(`[RSC Sync] Action error: ${err.message}`);
      }),
    );

    // Return ack — TIDAK mengembalikan flight
    // Client sudah melakukan optimistic update, tidak perlu re-render
    return yield* HttpServerResponse.json({
      type: "ack",
      action,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Case 2: Component Refresh (partial flight) ──
  if (syncRequest.type === "refresh") {
    const { componentId } = syncRequest;

    yield* Effect.logInfo(`[RSC Sync] Refreshing component: ${componentId}`);

    // Cek apakah component ada di registry
    const factory = serverComponentFactory[componentId];
    if (!factory) {
      return yield* HttpServerResponse.json(
        {
          type: "error",
          message: `Unknown component: ${componentId}`,
          code: "NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Re-render hanya component yang diminta (bukan full page)
    const element = factory();
    const fullPayload = yield* serializeToFlight(element);

    // Extract hanya client_ref nodes yang relevan untuk partial update.
    // Client tidak butuh seluruh subtree HTML — hanya props untuk client boundaries.
    const clientRefNodes = fullPayload.nodes.filter(
      (n) => n.type === "client_ref",
    );

    if (clientRefNodes.length === 0) {
      // Tidak ada client component untuk di-update
      return yield* HttpServerResponse.json({
        type: "ack",
        timestamp: new Date().toISOString(),
      });
    }

    // Buat partial payload — hanya client_ref nodes
    // rootId menunjuk ke client_ref pertama (utama)
    const partialPayload = {
      rootId: clientRefNodes[0]!.id,
      nodes: clientRefNodes,
    };

    // Serialize ke NDJSON dengan header partialFor
    const header = JSON.stringify({
      type: "header",
      rootId: partialPayload.rootId,
      timestamp: new Date().toISOString(),
      version: "1.0",
      partialFor: componentId, // ← tandai sebagai partial flight
    });
    const nodeLines = partialPayload.nodes.map((n) => JSON.stringify(n));
    const ndjson = [header, ...nodeLines].join("\n");

    yield* Effect.logInfo(
      `[RSC Sync] Partial flight: ${clientRefNodes.length} client_ref nodes for "${componentId}"`,
    );

    return HttpServerResponse.text(ndjson, {
      status: 200,
      headers: {
        "Content-Type": "application/x-flight; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "X-RSC-Partial": componentId,
      },
    });
  }

  // Fallback
  return yield* HttpServerResponse.json(
    {
      type: "error",
      message: "Invalid sync request type",
      code: "BAD_REQUEST",
    },
    { status: 400 },
  );
});

// ── Health Check ──────────────────────────────────────────────

const healthHandler = Effect.gen(function* () {
  return yield* HttpServerResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── CORS Preflight ────────────────────────────────────────────

const corsPreflightHandler = Effect.succeed(
  HttpServerResponse.empty({
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  }),
);

// ── Router ────────────────────────────────────────────────────

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", htmlHandler),
  HttpRouter.get("/rsc", rscHandler),
  HttpRouter.post("/rsc/sync", syncHandler),
  HttpRouter.get("/health", healthHandler),
  HttpRouter.options("/*", corsPreflightHandler),
);

// ── Server Layer ──────────────────────────────────────────────

const HttpLive = HttpServer.serve(router, HttpMiddleware.logger).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
);

// ── Main ──────────────────────────────────────────────────────
// Inisialisasi store sebelum server mulai

NodeRuntime.runMain(
  Effect.gen(function* () {
    // Init TodoStore dari API external (sekali saat startup)
    yield* initTodoStore;
    yield* Effect.logInfo(
      "[Server] Store initialized, starting HTTP server...",
    );
  }).pipe(Effect.flatMap(() => Layer.launch(HttpLive))),
);
