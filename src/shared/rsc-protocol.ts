// ============================================================
// RSC Sync Protocol Types
// ============================================================
// Types untuk komunikasi client ↔ server via /rsc/sync endpoint.
//
// Ada dua jenis request:
//   1. 'action'  — mutasi server state, TIDAK expect flight balik
//   2. 'refresh' — minta server re-render component, expect partial flight
// ============================================================

/**
 * Server action request.
 * Client mengirim ini saat ada perubahan yang perlu di-persist ke server
 * TANPA mengharapkan flight response (client sudah optimistic update).
 */
export interface RSCSyncActionRequest {
  readonly type: "action"
  readonly action: string
  readonly payload: unknown
  /** Selalu false — jika butuh flight, gunakan RSCSyncRefreshRequest */
  readonly expectFlight: false
}

/**
 * Component refresh request.
 * Client meminta server me-render ulang sebuah server component
 * dan mengembalikan partial flight untuk component tersebut.
 */
export interface RSCSyncRefreshRequest {
  readonly type: "refresh"
  /** ID server component yang ingin di-refresh (mis: "TodoList") */
  readonly componentId: string
}

export type RSCSyncRequest = RSCSyncActionRequest | RSCSyncRefreshRequest

/**
 * Ack response — dikirim saat action berhasil diproses.
 * Content-Type: application/json
 */
export interface RSCSyncAckResponse {
  readonly type: "ack"
  readonly action?: string
  readonly timestamp: string
}

/**
 * Error response
 */
export interface RSCSyncErrorResponse {
  readonly type: "error"
  readonly message: string
  readonly code: string
}

/**
 * Partial flight response — dikirim saat refresh berhasil.
 * Content-Type: application/x-flight
 * Body: NDJSON dengan header.partialFor = componentId
 *
 * Note: Partial flight hanya berisi nodes untuk component yang di-refresh,
 * bukan seluruh page tree. Client akan extract client_ref nodes dan
 * update RSCBoundary yang sesuai.
 */
export type RSCSyncFlightResponse = string // raw NDJSON
