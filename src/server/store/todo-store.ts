// ============================================================
// Todo In-Memory Store
// ============================================================
// Server-side state yang persists antar request.
// Diinisialisasi dari API external (atau fallback) saat startup.
//
// Semua operasi menggunakan Effect-TS untuk konsistensi.
// ============================================================

import { Effect, Duration, pipe, Ref } from "effect"

export interface Todo {
  readonly id: number
  readonly title: string
  readonly completed: boolean
  readonly userId: number
}

// ── Fallback data ────────────────────────────────────────────

const FALLBACK_TODOS: readonly Todo[] = [
  { id: 1, title: "Pelajari Effect-TS dan RSC", completed: true, userId: 1 },
  { id: 2, title: "Implementasi custom flight protocol", completed: true, userId: 1 },
  { id: 3, title: "Serialize React tree ke NDJSON", completed: false, userId: 1 },
  { id: 4, title: "Deserialize flight di client", completed: false, userId: 1 },
  { id: 5, title: "Deploy ke production", completed: false, userId: 1 },
]

// ── Mutable store menggunakan Effect Ref ────────────────────

// Ref menyimpan array todos yang mutable tapi aman secara concurrent
const todosRef: { current: Ref.Ref<readonly Todo[]> | null } = { current: null }

const getRef = (): Effect.Effect<Ref.Ref<readonly Todo[]>> =>
  Effect.gen(function* () {
    if (todosRef.current === null) {
      todosRef.current = yield* Ref.make<readonly Todo[]>([])
    }
    return todosRef.current
  })

// ── Initialization ───────────────────────────────────────────

/**
 * Inisialisasi store dari API external.
 * Dipanggil sekali saat server startup.
 */
export const initTodoStore: Effect.Effect<void> = Effect.gen(function* () {
  yield* Effect.logInfo("[TodoStore] Initializing...")

  const fetched = yield* pipe(
    Effect.tryPromise({
      try: () =>
        fetch("https://jsonplaceholder.typicode.com/todos?_limit=5&userId=1").then(
          (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json() as Promise<Todo[]>
          },
        ),
      catch: (e) => new Error(String(e)),
    }),
    Effect.timeout(Duration.seconds(5)),
    Effect.catchAll((err) => {
      console.warn("[TodoStore] Fallback data:", String(err))
      return Effect.succeed([...FALLBACK_TODOS] as Todo[])
    }),
  )

  const ref = yield* getRef()
  yield* Ref.set(ref, fetched)

  yield* Effect.logInfo(`[TodoStore] Initialized with ${fetched.length} todos`)
})

// ── CRUD Operations ──────────────────────────────────────────

export const TodoStore = {
  /** Ambil semua todos */
  getAll: (): Effect.Effect<readonly Todo[]> =>
    Effect.gen(function* () {
      const ref = yield* getRef()
      return yield* Ref.get(ref)
    }),

  /** Toggle status completed */
  toggle: (id: number): Effect.Effect<Todo | null> =>
    Effect.gen(function* () {
      const ref = yield* getRef()
      let toggled: Todo | null = null

      yield* Ref.update(ref, (todos) => {
        return todos.map((t) => {
          if (t.id === id) {
            toggled = { ...t, completed: !t.completed }
            return toggled
          }
          return t
        })
      })

      if (toggled) {
        yield* Effect.logInfo(
          `[TodoStore] Toggled #${id} → completed=${(toggled as Todo).completed}`,
        )
      }
      return toggled
    }),

  /** Tambah todo baru */
  add: (title: string): Effect.Effect<Todo> =>
    Effect.gen(function* () {
      const ref = yield* getRef()
      const newTodo: Todo = {
        id: Date.now(),
        title: title.trim(),
        completed: false,
        userId: 1,
      }

      yield* Ref.update(ref, (todos) => [newTodo, ...todos])
      yield* Effect.logInfo(`[TodoStore] Added "${newTodo.title}" (#${newTodo.id})`)

      return newTodo
    }),

  /** Hapus todo */
  remove: (id: number): Effect.Effect<void> =>
    Effect.gen(function* () {
      const ref = yield* getRef()
      yield* Ref.update(ref, (todos) => todos.filter((t) => t.id !== id))
      yield* Effect.logInfo(`[TodoStore] Removed #${id}`)
    }),
}
