// ============================================================
// React Server Components - Flight Wire Format Types
// ============================================================
// Inspired by React's actual RSC flight protocol.
// Setiap node diidentifikasi dengan unique string ID.
// Relasi parent-child menggunakan referensi ID (bukan nested).
// Format transport: NDJSON (Newline-Delimited JSON)
// ============================================================

/** Node untuk HTML element (div, p, span, etc.) */
export interface FlightElementNode {
  readonly id: string;
  readonly type: "element";
  readonly tag: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly children: readonly string[];
}

/** Node untuk text primitif */
export interface FlightTextNode {
  readonly id: string;
  readonly type: "text";
  readonly value: string;
}

/**
 * Node untuk client component reference.
 * Server tidak mengirim implementasi component,
 * hanya ID dan props. Client akan lookup di registry.
 */
export interface FlightClientRefNode {
  readonly id: string;
  readonly type: "client_ref";
  readonly componentId: string;
  readonly props: Readonly<Record<string, unknown>>;
}

/** Node untuk null/undefined/false (tidak dirender) */
export interface FlightNullNode {
  readonly id: string;
  readonly type: "null";
}

/** Node untuk array of children */
export interface FlightArrayNode {
  readonly id: string;
  readonly type: "array";
  readonly children: readonly string[];
}

export type FlightNode =
  | FlightElementNode
  | FlightTextNode
  | FlightClientRefNode
  | FlightNullNode
  | FlightArrayNode;

/** Payload lengkap: rootId + semua nodes flat */
export interface FlightPayload {
  readonly rootId: string;
  readonly nodes: readonly FlightNode[];
}

/** Header yang dikirim pertama dalam NDJSON stream */
export interface FlightHeader {
  readonly type: "header";
  readonly rootId: string;
  readonly timestamp: string;
  readonly version: "1.0";
  /**
   * Jika diisi, ini adalah partial flight untuk component tertentu.
   * Client akan extract client_ref nodes dengan componentId ini
   * dan update RSCBoundary yang sesuai (tanpa re-render full page).
   */
  readonly partialFor?: string;
}

export type FlightLine = FlightHeader | FlightNode;
