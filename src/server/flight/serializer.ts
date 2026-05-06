// ============================================================
// RSC Serializer: React Element Tree → Flight Payload
// ============================================================
// Menggunakan Effect-TS untuk:
// - Async server component execution (tryPromise)
// - Mutable state management yang aman (Ref)
// - Error handling dengan tagged errors (Data.TaggedError)
// - Sequential Effect execution untuk konsistensi ID
// ============================================================

import * as React from "react";
import type { ReactNode, ReactElement } from "react";
import { Effect, Ref, Data } from "effect";
import type {
  FlightNode,
  FlightPayload,
  FlightHeader,
  FlightLine,
} from "../../shared/flight-types.js";
import { isClientRef } from "./client-ref.js";

// ── Error Types ─────────────────────────────────────────────

export class RenderError extends Data.TaggedError("RenderError")<{
  readonly message: string;
  readonly cause?: unknown;
  readonly componentName?: string;
}> {}

// ── Internal State ───────────────────────────────────────────

interface SerializerState {
  readonly nextId: number;
  readonly nodes: readonly FlightNode[];
}

// ── State Helpers ────────────────────────────────────────────

/** Dapatkan ID berikutnya dan increment counter */
const allocateId = (ref: Ref.Ref<SerializerState>): Effect.Effect<string> =>
  Ref.modify(ref, (state) => {
    const id = String(state.nextId);
    return [id, { ...state, nextId: state.nextId + 1 }] as const;
  });

/** Daftarkan node ke state */
const registerNode = (
  ref: Ref.Ref<SerializerState>,
  node: FlightNode,
): Effect.Effect<void> =>
  Ref.update(ref, (state) => ({
    ...state,
    nodes: [...state.nodes, node],
  }));

// ── Props Sanitizer ──────────────────────────────────────────

/**
 * Filter props agar hanya yang serializable yang dikirim ke client.
 * Functions, Symbols, dan undefined dibuang.
 */
function sanitizeProps(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;
    if (typeof value === "function") continue;
    if (typeof value === "symbol") continue;
    if (value === undefined) continue;
    if (value instanceof Error) {
      result[key] = { message: value.message, name: value.name };
      continue;
    }
    result[key] = value;
  }
  return result;
}

// ── Children Normalizer ──────────────────────────────────────

/**
 * Normalisasi React children ke array.
 * React.props.children bisa berupa:
 * - undefined/null: []
 * - single element: [element]
 * - array: array (mungkin nested)
 */
function normalizeChildren(children: unknown): ReactNode[] {
  if (children === undefined || children === null) return [];
  if (Array.isArray(children)) {
    return children.flatMap((child) =>
      Array.isArray(child) ? normalizeChildren(child) : [child],
    );
  }
  return [children as ReactNode];
}

// ── Core Serializer ──────────────────────────────────────────

/**
 * Serialisasi satu ReactNode ke FlightNode.
 * Mengembalikan ID dari node yang dibuat.
 *
 * Untuk server components (async functions):
 * - Eksekusi menggunakan Effect.tryPromise
 * - Rekursif serialize hasilnya
 * - Server component itu sendiri TIDAK mendapat node sendiri (transparent)
 */
const serializeNode = (
  node: ReactNode,
  stateRef: Ref.Ref<SerializerState>,
): Effect.Effect<string, RenderError> =>
  Effect.gen(function* () {
    // ── null / undefined / boolean ──
    if (
      node === null ||
      node === undefined ||
      node === false ||
      node === true
    ) {
      const id = yield* allocateId(stateRef);
      yield* registerNode(stateRef, { id, type: "null" });
      return id;
    }

    // ── Primitif: string / number ──
    if (typeof node === "string" || typeof node === "number") {
      const id = yield* allocateId(stateRef);
      yield* registerNode(stateRef, {
        id,
        type: "text",
        value: String(node),
      });
      return id;
    }

    // ── Array ──
    if (Array.isArray(node)) {
      const childIds = yield* Effect.forEach(
        node,
        (child) => serializeNode(child as ReactNode, stateRef),
        { concurrency: 1 }, // Sequential agar ID konsisten
      );
      const id = yield* allocateId(stateRef);
      yield* registerNode(stateRef, {
        id,
        type: "array",
        children: childIds,
      });
      return id;
    }

    const element = node as ReactElement;

    // ── React.Fragment ──
    if (element.type === React.Fragment) {
      const children = normalizeChildren(
        (element.props as { children?: ReactNode }).children,
      );
      if (children.length === 0) {
        const id = yield* allocateId(stateRef);
        yield* registerNode(stateRef, { id, type: "null" });
        return id;
      }
      if (children.length === 1) {
        return yield* serializeNode(children[0]!, stateRef);
      }
      const childIds = yield* Effect.forEach(
        children,
        (child) => serializeNode(child, stateRef),
        { concurrency: 1 },
      );
      const id = yield* allocateId(stateRef);
      yield* registerNode(stateRef, { id, type: "array", children: childIds });
      return id;
    }

    // ── Host Element (div, p, span, etc.) ──
    if (typeof element.type === "string") {
      const { children: childrenProp, ...restProps } = element.props as {
        children?: ReactNode;
        [key: string]: unknown;
      };

      const childrenArray = normalizeChildren(childrenProp);
      const childIds = yield* Effect.forEach(
        childrenArray,
        (child) => serializeNode(child, stateRef),
        { concurrency: 1 },
      );

      const id = yield* allocateId(stateRef);
      yield* registerNode(stateRef, {
        id,
        type: "element",
        tag: element.type,
        props: sanitizeProps(restProps as Record<string, unknown>),
        children: childIds,
      });
      return id;
    }

    // ── Component (Function atau Class) ──
    if (typeof element.type === "function") {
      const componentFn = element.type as Function;

      // Client Component Reference
      if (isClientRef(componentFn)) {
        const { children: _c, ...props } = element.props as Record<
          string,
          unknown
        >;
        const id = yield* allocateId(stateRef);
        yield* registerNode(stateRef, {
          id,
          type: "client_ref",
          componentId: componentFn.__componentId,
          props: sanitizeProps(props),
        });
        return id;
      }

      // Server Component — eksekusi dan rekursif serialize hasilnya
      const componentName = componentFn.name || "AnonymousServerComponent";

      const result = yield* Effect.tryPromise({
        try: async () => {
          const rendered = componentFn(element.props);
          // Await jika async component
          return rendered instanceof Promise ? await rendered : rendered;
        },
        catch: (cause) =>
          new RenderError({
            message: `Gagal render server component <${componentName}>`,
            cause,
            componentName,
          }),
      });

      // Server component itu sendiri transparent — gunakan ID dari hasilnya
      return yield* serializeNode(result as ReactNode, stateRef);
    }

    // ── Fallback ──
    const id = yield* allocateId(stateRef);
    yield* registerNode(stateRef, { id, type: "null" });
    return id;
  });

// ── Public API ───────────────────────────────────────────────

/**
 * Serialisasi React element tree ke FlightPayload.
 *
 * Effect pipeline:
 * 1. Buat Ref untuk mutable serializer state
 * 2. Rekursif serialize element tree
 * 3. Kumpulkan semua nodes yang terdaftar
 * 4. Return FlightPayload dengan rootId dan semua nodes
 */
export const serializeToFlight = (
  element: ReactElement,
): Effect.Effect<FlightPayload, RenderError> =>
  Effect.gen(function* () {
    // Init mutable state menggunakan Effect Ref
    const stateRef = yield* Ref.make<SerializerState>({
      nextId: 0,
      nodes: [],
    });

    yield* Effect.logDebug("[RSC Serializer] Mulai serialisasi...");

    // Serialize seluruh tree
    const rootId = yield* serializeNode(element, stateRef);

    // Ambil hasil akhir
    const finalState = yield* Ref.get(stateRef);

    yield* Effect.logDebug(
      `[RSC Serializer] Selesai. Root: ${rootId}, Total nodes: ${finalState.nodes.length}`,
    );

    return {
      rootId,
      nodes: finalState.nodes,
    };
  });

/**
 * Konversi FlightPayload ke NDJSON string untuk streaming HTTP.
 *
 * Format:
 * Line 1: {"type":"header","rootId":"...","timestamp":"...","version":"1.0"}
 * Line 2+: {"id":"0","type":"element",...}
 * ...
 */
export const payloadToNDJSON = (payload: FlightPayload): string => {
  const header: FlightHeader = {
    type: "header",
    rootId: payload.rootId,
    timestamp: new Date().toISOString(),
    version: "1.0",
  };

  const lines: string[] = [
    JSON.stringify(header),
    ...payload.nodes.map((node) => JSON.stringify(node)),
  ];

  return lines.join("\n");
};
