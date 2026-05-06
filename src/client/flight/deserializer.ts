// ============================================================
// RSC Deserializer: Flight Payload → React Element Tree
// ============================================================
// Menggunakan Effect-TS untuk:
// - Error handling saat parsing NDJSON (Data.TaggedError)
// - Parsing dengan Effect.try
// - Logging via Effect.logDebug
//
// Perubahan dari versi sebelumnya:
// - client_ref nodes di-wrap dalam RSCBoundary (bukan langsung createElement)
// - RSCBoundary memungkinkan surgical re-render via partial flight
// ============================================================

import * as React from "react";
import type { ReactNode } from "react";
import { Effect, Data } from "effect";
import type {
  FlightNode,
  FlightPayload,
  FlightLine,
  FlightHeader,
} from "../../shared/flight-types.js";
import { clientRegistry } from "../components/registry.js";
import { RSCBoundary } from "../rsc/sync.js";

// ── Error Types ─────────────────────────────────────────────

export class DeserializeError extends Data.TaggedError("DeserializeError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class ParseError extends Data.TaggedError("ParseError")<{
  readonly message: string;
  readonly line?: string;
  readonly cause?: unknown;
}> {}

export class MissingNodeError extends Data.TaggedError("MissingNodeError")<{
  readonly nodeId: string;
}> {}

export class UnknownComponentError extends Data.TaggedError(
  "UnknownComponentError",
)<{
  readonly componentId: string;
}> {}

// ── Node Reconstruction ──────────────────────────────────────

/**
 * Rekonstruksi satu FlightNode menjadi ReactNode.
 *
 * Perbedaan dari versi sebelumnya:
 * - "client_ref" → RSCBoundary (bukan langsung Component)
 *   RSCBoundary bisa menerima props baru via updateBoundaryProps()
 *   tanpa re-render seluruh tree.
 */
function reconstructNode(
  id: string,
  nodeMap: Map<string, FlightNode>,
): ReactNode {
  const node = nodeMap.get(id);
  if (!node) {
    console.warn(`[RSC Deserializer] Node tidak ditemukan: ${id}`);
    return null;
  }

  switch (node.type) {
    case "null":
      return null;

    case "text":
      return node.value;

    case "element": {
      const children = node.children.map((childId) =>
        reconstructNode(childId, nodeMap),
      );
      const props = { ...node.props, key: `el-${node.id}` };
      return React.createElement(node.tag, props, ...children);
    }

    case "array": {
      return node.children.map((childId, index) =>
        React.createElement(
          React.Fragment,
          { key: `arr-${node.id}-${index}` },
          reconstructNode(childId, nodeMap),
        ),
      );
    }

    case "client_ref": {
      // Wrap dalam RSCBoundary alih-alih langsung render Component.
      // RSCBoundary akan subscribe ke updateBoundaryProps(componentId)
      // sehingga bisa di-update via partial flight tanpa menyentuh nodes lain.
      return React.createElement(RSCBoundary, {
        key: `boundary-${node.id}`,
        componentId: node.componentId,
        initialProps: node.props as Record<string, unknown>,
        registry: clientRegistry,
      });
    }
  }
}

// ── NDJSON Parser ────────────────────────────────────────────

export const parseFlightPayload = (
  ndjson: string,
): Effect.Effect<FlightPayload, ParseError> =>
  Effect.gen(function* () {
    yield* Effect.logDebug(
      `[RSC Deserializer] Parsing ${ndjson.length} bytes NDJSON`,
    );

    const lines = ndjson
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return yield* Effect.fail(
        new ParseError({ message: "Flight payload kosong" }),
      );
    }

    let rootId: string | null = null;
    const nodes: FlightNode[] = [];

    for (const line of lines) {
      const parsed = yield* Effect.try({
        try: () => JSON.parse(line) as FlightLine,
        catch: (e) =>
          new ParseError({
            message: `Gagal parse JSON line: ${String(e)}`,
            line,
            cause: e,
          }),
      });

      if (parsed.type === "header") {
        const header = parsed as FlightHeader;
        rootId = header.rootId;
        yield* Effect.logDebug(
          `[RSC Deserializer] Header: rootId=${rootId}, partialFor=${header.partialFor ?? "none"}`,
        );
      } else {
        nodes.push(parsed as FlightNode);
      }
    }

    if (!rootId) {
      return yield* Effect.fail(
        new ParseError({
          message: "Flight payload tidak memiliki header dengan rootId",
        }),
      );
    }

    yield* Effect.logDebug(
      `[RSC Deserializer] Parsed ${nodes.length} nodes, root=${rootId}`,
    );

    return { rootId, nodes };
  });

// ── Tree Reconstructor ────────────────────────────────────────

export const reconstructTree = (
  payload: FlightPayload,
): Effect.Effect<ReactNode, DeserializeError> =>
  Effect.try({
    try: () => {
      const nodeMap = new Map<string, FlightNode>(
        payload.nodes.map((node) => [node.id, node]),
      );

      console.log(
        `[RSC Deserializer] Reconstructing tree dari root=${payload.rootId} ` +
          `dengan ${nodeMap.size} nodes`,
      );

      return reconstructNode(payload.rootId, nodeMap);
    },
    catch: (e) =>
      new DeserializeError({
        message: `Gagal rekonstruksi React tree: ${String(e)}`,
        cause: e,
      }),
  });

// ── Combined Pipeline ─────────────────────────────────────────

export const deserializeFlight = (
  ndjson: string,
): Effect.Effect<ReactNode, ParseError | DeserializeError> =>
  Effect.gen(function* () {
    const payload = yield* parseFlightPayload(ndjson);
    const tree = yield* reconstructTree(payload);
    return tree;
  });
