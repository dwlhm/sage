// ============================================================
// TodoList — Async Server Component dengan Effect-TS
// ============================================================
// Server component ini:
//   1. Baca todos dari in-memory TodoStore (bukan fetch langsung)
//   2. Pass data ke TodoListClient via RSC flight payload
//
// Menggunakan store memungkinkan:
//   - Data konsisten antar re-render (setelah action/toggle)
//   - Refresh partial tanpa re-fetch API external
// ============================================================

import * as React from "react";
import { Effect } from "effect";
import { createClientRef } from "../flight/client-ref.js";
import { TodoStore } from "../store/todo-store.js";

// Client component reference.
// Server hanya menyimpan ID-nya — implementasi ada di client/components/TodoListClient.tsx
// initialTodos (Todo[]) akan di-serialize ke flight payload dan di-parse di client.
const TodoListClient = createClientRef<{
  initialTodos: readonly {
    id: number;
    title: string;
    completed: boolean;
    userId: number;
  }[];
  serverNote: string;
}>("TodoListClient");

// ── Server Component ─────────────────────────────────────────

export default async function TodoList() {
  // Baca dari in-memory store (diinisialisasi saat startup, diupdate via actions)
  const todos = await Effect.runPromise(TodoStore.getAll());

  return (
    <section
      style={{
        background: "#161616",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
        padding: "1.5rem",
        marginTop: "1.5rem",
      }}
    >
      {/* Header — server-rendered (statis) */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              📋 Server-Fetched Todos
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginTop: "0.25rem",
              }}
            >
              Data dari{" "}
              <code
                style={{
                  background: "#1e293b",
                  color: "#7dd3fc",
                  padding: "0.1rem 0.3rem",
                  borderRadius: "3px",
                  fontSize: "0.75rem",
                }}
              >
                TodoStore
              </code>{" "}
              · dikirim ke client via flight sebagai{" "}
              <code
                style={{
                  background: "#1e293b",
                  color: "#7dd3fc",
                  padding: "0.1rem 0.3rem",
                  borderRadius: "3px",
                  fontSize: "0.75rem",
                }}
              >
                initialTodos
              </code>
            </p>
          </div>

          <span
            style={{
              background: "#14532d",
              color: "#86efac",
              padding: "0.2rem 0.6rem",
              borderRadius: "20px",
              fontSize: "0.7rem",
              border: "1px solid #16a34a",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            {todos.length} todos dari store
          </span>
        </div>
      </div>

      {/*
       * TodoListClient — CLIENT COMPONENT
       *
       * initialTodos di-serialize ke dalam RSC flight payload:
       * {"id":"N","type":"client_ref","componentId":"TodoListClient",
       *  "props":{"initialTodos":[...],"serverNote":"..."}}
       *
       * Client akan:
       *   1. Lookup "TodoListClient" di registry
       *   2. Wrap dalam RSCBoundary (bisa di-update via partial flight)
       *   3. useState(initialTodos) → interaktif
       *   4. Action (toggle/add) → POST /rsc/sync (no flight)
       *   5. Refresh → POST /rsc/sync type=refresh → partial flight update RSCBoundary
       */}
      <TodoListClient
        initialTodos={todos}
        serverNote={`${todos.length} todos · store diinit dari API · ${new Date().toISOString()}`}
      />
    </section>
  );
}
