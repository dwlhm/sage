// ============================================================
// Client Component Reference Factory
// ============================================================
// Server tidak import implementasi client component langsung.
// Sebaliknya, server menggunakan "stub" yang hanya membawa ID.
// RSC serializer akan mengenali stub ini dan membuat client_ref node.
// ============================================================

import * as React from "react";
import type { FC, ReactNode } from "react";

const CLIENT_REF_MARKER = Symbol.for("rsc.client_ref");

export interface ClientRefMeta {
  [CLIENT_REF_MARKER]: true;
  __componentId: string;
}

export type ClientRef<P extends Record<string, unknown>> = FC<P> &
  ClientRefMeta;

export function isClientRef(
  fn: unknown,
): fn is ClientRef<Record<string, unknown>> {
  return (
    typeof fn === "function" &&
    (fn as unknown as Record<symbol, unknown>)[CLIENT_REF_MARKER] === true
  );
}

function trySerializeProps(props: Record<string, unknown>): string {
  try {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "children") continue;
      if (typeof value === "function" || typeof value === "symbol" || value === undefined) continue;
      if (value instanceof Error) {
        sanitized[key] = { message: value.message, name: value.name };
        continue;
      }
      sanitized[key] = value;
    }
    return Buffer.from(JSON.stringify(sanitized)).toString("base64");
  } catch {
    return "";
  }
}

export function createClientRef<P extends Record<string, unknown>>(
  componentId: string,
): ClientRef<P> {
  const stub = ((props: P): ReactNode => {
    const { children: _children, ...restProps } = props as Record<string, unknown>;
    const encodedProps = trySerializeProps(restProps);
    return React.createElement("div", {
      "data-client-ref": componentId,
      "data-ssr-props": encodedProps || undefined,
      style: { padding: "1rem", background: "#111", borderRadius: "8px", border: "1px dashed #333", color: "#888", textAlign: "center", fontSize: "0.85rem" },
    }, `Loading ${componentId}...`);
  }) as unknown as ClientRef<P>;

  Object.defineProperty(stub, CLIENT_REF_MARKER, {
    value: true,
    writable: false,
    enumerable: false,
  });
  Object.defineProperty(stub, "__componentId", {
    value: componentId,
    writable: false,
    enumerable: false,
  });
  Object.defineProperty(stub, "displayName", {
    value: `ClientRef(${componentId})`,
    writable: false,
  });

  return stub as ClientRef<P>;
}
