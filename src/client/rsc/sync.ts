// ============================================================
// RSC Sync — RSCBoundary + Client Sync Utilities
// ============================================================
// Sistem reaktif untuk sinkronisasi client-server RSC.
//
// RSCBoundary:
//   - Wrap setiap client component ref dalam tree RSC
//   - Bisa menerima update props dari partial flight
//   - Hanya component yang berubah yang re-render
//
// useRSCAction:
//   - Kirim server action (toggle, add, delete)
//   - Tidak mengharapkan flight response
//   - Client sudah optimistic update
//
// refreshServerComponent:
//   - Minta server re-render component tertentu
//   - Server kirim partial flight
//   - Update RSCBoundary yang sesuai tanpa re-render full page
// ============================================================

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ComponentType,
} from "react";
import * as React from "react";
import { Effect, Data } from "effect";
import { FetchHttpClient, HttpClient, HttpBody } from "@effect/platform";
import type {
  RSCSyncRequest,
  RSCSyncAckResponse,
} from "../../shared/rsc-protocol.js";
import type { FlightNode } from "../../shared/flight-types.js";

// ── Error Types ──────────────────────────────────────────────

export class SyncError extends Data.TaggedError("SyncError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

// ── RSCBoundary Store ─────────────────────────────────────────
//
// Global registry untuk boundary props.
// Ketika partial flight tiba, updateBoundaryProps dipanggil
// dan semua RSCBoundary yang subscribe ke componentId tsb akan re-render.
//
// Tidak menggunakan React Context agar updateBoundaryProps bisa
// dipanggil dari luar React tree (dari Effect pipeline).

type BoundaryPropsListener = (newProps: Record<string, unknown>) => void;

// Map<componentId, current props> — diupdate saat partial flight tiba
const boundaryCurrentProps = new Map<string, Record<string, unknown>>();

// Map<componentId, Set<listener>> — listeners adalah setState dari RSCBoundary
const boundaryListeners = new Map<string, Set<BoundaryPropsListener>>();

/**
 * Update props untuk semua RSCBoundary dengan componentId tertentu.
 * Dipanggil setelah partial flight di-parse di client.
 */
export function updateBoundaryProps(
  componentId: string,
  newProps: Record<string, unknown>,
): void {
  boundaryCurrentProps.set(componentId, newProps);
  const listeners = boundaryListeners.get(componentId);
  if (listeners && listeners.size > 0) {
    for (const listener of listeners) {
      listener(newProps);
    }
    console.log(
      `[RSCBoundary] Updated "${componentId}" → ${listeners.size} boundary(ies) re-rendered`,
    );
  }
}

/**
 * Subscribe ke perubahan props untuk componentId tertentu.
 * Dipanggil oleh RSCBoundary saat mount.
 * Returns unsubscribe function.
 */
function subscribeBoundary(
  componentId: string,
  listener: BoundaryPropsListener,
): () => void {
  if (!boundaryListeners.has(componentId)) {
    boundaryListeners.set(componentId, new Set());
  }
  boundaryListeners.get(componentId)!.add(listener);

  return () => {
    boundaryListeners.get(componentId)?.delete(listener);
  };
}

// ── RSCBoundary Component ─────────────────────────────────────

interface RSCBoundaryProps {
  componentId: string;
  initialProps: Record<string, unknown>;
  registry: Record<string, ComponentType<any>>;
}

/**
 * RSCBoundary membungkus setiap client component ref dalam RSC tree.
 *
 * Lifecycle:
 * 1. Render dengan initialProps dari flight payload
 * 2. Subscribe ke boundaryListeners[componentId]
 * 3. Jika partial flight tiba → listener dipanggil → re-render dengan props baru
 * 4. Unmount → unsubscribe
 *
 * Ini memungkinkan surgical re-render tanpa menyentuh komponen lain di tree.
 */
export function RSCBoundary({
  componentId,
  initialProps,
  registry,
}: RSCBoundaryProps) {
  // Gunakan props dari store jika sudah ada update, otherwise initialProps
  const [currentProps, setCurrentProps] = useState<Record<string, unknown>>(
    () => boundaryCurrentProps.get(componentId) ?? initialProps,
  );

  useEffect(() => {
    // Sync jika store sudah punya props terbaru (mis: dari refresh sebelumnya)
    const stored = boundaryCurrentProps.get(componentId);
    if (stored && stored !== initialProps) {
      setCurrentProps(stored);
    }

    // Subscribe untuk future updates
    const unsubscribe = subscribeBoundary(componentId, (newProps) => {
      setCurrentProps(newProps);
    });

    return unsubscribe;
  }, [componentId]);

  const Component = registry[componentId];

  if (!Component) {
    return React.createElement(
      "div",
      {
        style: {
          padding: "0.5rem 1rem",
          background: "#2a0000",
          border: "1px solid #ff4444",
          borderRadius: "4px",
          fontSize: "0.8rem",
          color: "#ff6666",
        },
      },
      `⚠️ Client component tidak ditemukan di registry: "${componentId}"`,
    );
  }

  return React.createElement(Component, currentProps as any);
}

// ── Effect-based Sync Utilities ───────────────────────────────

/**
 * Kirim server action tanpa mengharapkan flight response.
 *
 * Pattern:
 *   1. Client sudah optimistic update (useState)
 *   2. Action ini hanya notify server untuk update state-nya
 *   3. Server returns ack — tidak ada flight
 *
 * Effect pipeline:
 *   HttpClient.post → HttpBody.json → response.json → validate ack
 */
export const executeServerAction = (
  action: string,
  payload: unknown,
): Effect.Effect<RSCSyncAckResponse, SyncError> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[RSC Sync] Action: ${action}`);

    const client = yield* HttpClient.HttpClient;

    const requestBody = yield* HttpBody.json({
      type: "action",
      action,
      payload,
      expectFlight: false,
    } satisfies RSCSyncRequest).pipe(
      Effect.mapError(
        (e) => new SyncError({ message: `Body error: ${String(e)}` }),
      ),
    );

    const ndjson = yield* Effect.gen(function* () {
      const response = yield* client
        .post("/rsc/sync", { body: requestBody })
        .pipe(
          Effect.mapError(
            (e) =>
              new SyncError({
                message: `Network error: ${String(e)}`,
                cause: e,
              }),
          ),
        );

      const json = yield* response.json.pipe(
        Effect.mapError(
          (e) => new SyncError({ message: `Parse error: ${String(e)}` }),
        ),
      );

      return json as RSCSyncAckResponse;
    }).pipe(Effect.scoped);

    yield* Effect.logInfo(`[RSC Sync] Action "${action}" acked`);
    return ndjson;
  }).pipe(Effect.provide(FetchHttpClient.layer));

/**
 * Refresh sebuah server component dan update RSCBoundary yang sesuai.
 *
 * Pattern:
 *   1. Kirim refresh request ke server
 *   2. Server re-render component, kirim partial NDJSON flight
 *   3. Parse flight, extract client_ref nodes
 *   4. updateBoundaryProps untuk setiap client_ref → surgical re-render
 *
 * TIDAK melakukan full page re-render. Hanya RSCBoundary yang relevan
 * yang akan re-render.
 */
export const refreshServerComponent = (
  componentId: string,
): Effect.Effect<{ updatedComponents: string[] }, SyncError> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[RSC Sync] Refreshing: ${componentId}`);

    const client = yield* HttpClient.HttpClient;

    const requestBody = yield* HttpBody.json({
      type: "refresh",
      componentId,
    } satisfies RSCSyncRequest).pipe(
      Effect.mapError(
        (e) => new SyncError({ message: `Body error: ${String(e)}` }),
      ),
    );

    const ndjson = yield* Effect.gen(function* () {
      const response = yield* client
        .post("/rsc/sync", { body: requestBody })
        .pipe(
          Effect.mapError(
            (e) =>
              new SyncError({
                message: `Network error: ${String(e)}`,
                cause: e,
              }),
          ),
        );

      // Jika server mengembalikan ack (tidak ada client components untuk diupdate)
      const contentType = response.headers["content-type"] ?? "";
      if (contentType.includes("application/json")) {
        yield* response.json.pipe(
          Effect.mapError(
            (e) => new SyncError({ message: `Parse ack error: ${String(e)}` }),
          ),
        );
        return null;
      }

      // Partial flight NDJSON
      return yield* response.text.pipe(
        Effect.mapError(
          (e) => new SyncError({ message: `Read error: ${String(e)}` }),
        ),
      );
    }).pipe(Effect.scoped);

    if (!ndjson) {
      yield* Effect.logInfo(
        `[RSC Sync] No client components to update for "${componentId}"`,
      );
      return { updatedComponents: [] };
    }

    // Parse NDJSON dan update boundaries
    const lines = ndjson
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const updatedComponents: string[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line) as Record<string, unknown>;

        if (data.type === "header") {
          const partialFor = data.partialFor as string | undefined;
          if (partialFor) {
            yield* Effect.logInfo(
              `[RSC Sync] Partial flight for: ${partialFor}`,
            );
          }
          continue;
        }

        // Update boundary untuk setiap client_ref node
        if (data.type === "client_ref") {
          const node = data as unknown as FlightNode & { type: "client_ref" };
          updateBoundaryProps(
            node.componentId,
            node.props as Record<string, unknown>,
          );
          updatedComponents.push(node.componentId);
        }
      } catch {
        // Skip invalid lines
      }
    }

    yield* Effect.logInfo(
      `[RSC Sync] Updated boundaries: [${updatedComponents.join(", ")}]`,
    );

    return { updatedComponents };
  }).pipe(Effect.provide(FetchHttpClient.layer));

// ── React Hooks ───────────────────────────────────────────────

/**
 * Hook untuk menggunakan server action dengan loading state.
 *
 * Usage:
 * ```tsx
 * const { execute, isExecuting, error } = useRSCAction("toggleTodo")
 * // Dalam handler:
 * await execute({ id: todo.id })
 * ```
 */
export function useRSCAction(actionName: string) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionNameRef = useRef(actionName);
  actionNameRef.current = actionName;

  const execute = useCallback(async (payload: unknown): Promise<boolean> => {
    setIsExecuting(true);
    setError(null);

    try {
      await Effect.runPromise(
        executeServerAction(actionNameRef.current, payload),
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error(`[useRSCAction] ${actionNameRef.current}:`, message);
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { execute, isExecuting, error };
}

/**
 * Hook untuk refresh server component dengan loading state.
 *
 * Usage:
 * ```tsx
 * const { refresh, isRefreshing, lastRefreshed } = useRSCRefresh("TodoList")
 * // Dalam handler:
 * await refresh()
 * ```
 */
export function useRSCRefresh(serverComponentId: string) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(serverComponentId);
  idRef.current = serverComponentId;

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsRefreshing(true);
    setError(null);

    try {
      const result = await Effect.runPromise(
        refreshServerComponent(idRef.current),
      );
      setLastRefreshed(new Date());
      console.log(
        `[useRSCRefresh] Refreshed "${idRef.current}", updated: [${result.updatedComponents.join(", ")}]`,
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error(`[useRSCRefresh] ${idRef.current}:`, message);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { refresh, isRefreshing, lastRefreshed, error };
}
