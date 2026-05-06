// ============================================================
// Server Action Handlers
// ============================================================
// Menangani mutasi server state via /rsc/sync endpoint.
// Semua action menggunakan Effect-TS.
//
// Action tidak mengembalikan flight — client sudah optimistic update.
// Server hanya update state-nya sendiri.
// ============================================================

import { Effect, Data } from "effect"
import { TodoStore } from "./store/todo-store.js"

// ── Error Types ──────────────────────────────────────────────

export class ActionError extends Data.TaggedError("ActionError")<{
  readonly action: string
  readonly message: string
  readonly cause?: unknown
}> {}

// ── Action Payload Types ─────────────────────────────────────

interface ToggleTodoPayload {
  readonly id: number
}

interface AddTodoPayload {
  readonly title: string
}

interface RemoveTodoPayload {
  readonly id: number
}

// ── Action Executor ──────────────────────────────────────────

/**
 * Eksekusi server action berdasarkan nama.
 *
 * Semua action menggunakan Effect-TS untuk:
 * - Type-safe error handling
 * - Logging
 * - Composability
 */
export const executeAction = (
  action: string,
  payload: unknown,
): Effect.Effect<void, ActionError> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[Action] Executing: ${action}`)

    switch (action) {
      case "toggleTodo": {
        const { id } = payload as ToggleTodoPayload
        if (typeof id !== "number") {
          return yield* Effect.fail(
            new ActionError({ action, message: "payload.id harus number" }),
          )
        }
        yield* TodoStore.toggle(id)
        break
      }

      case "addTodo": {
        const { title } = payload as AddTodoPayload
        if (typeof title !== "string" || !title.trim()) {
          return yield* Effect.fail(
            new ActionError({ action, message: "payload.title harus string non-empty" }),
          )
        }
        yield* TodoStore.add(title)
        break
      }

      case "removeTodo": {
        const { id } = payload as RemoveTodoPayload
        if (typeof id !== "number") {
          return yield* Effect.fail(
            new ActionError({ action, message: "payload.id harus number" }),
          )
        }
        yield* TodoStore.remove(id)
        break
      }

      default:
        return yield* Effect.fail(
          new ActionError({ action, message: `Unknown action: "${action}"` }),
        )
    }

    yield* Effect.logInfo(`[Action] Done: ${action}`)
  })
