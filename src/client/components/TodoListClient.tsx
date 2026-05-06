// ============================================================
// TodoListClient — Interactive Client Component dengan RSC Sync
// ============================================================
// Menerima initialTodos dari server via RSC flight props.
//
// Sync strategy:
//   - Toggle checkbox  → optimistic update + executeServerAction (no flight)
//   - Tambah todo      → optimistic update + executeServerAction (no flight)
//   - Sync dari server → refreshServerComponent → partial flight → merge
//
// Saat partial flight tiba (refresh):
//   - Server todos diperbarui (reflect server state terkini)
//   - Client-added todos (id > 1_000_000_000) dipertahankan
//   - Stats realtime selalu akurat
// ============================================================

import { useState, useEffect, useTransition } from "react";
import { useRSCAction, useRSCRefresh } from "../rsc/sync.js";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

interface TodoListClientProps {
  initialTodos: readonly Todo[];
  serverNote?: string;
}

export default function TodoListClient({
  initialTodos,
  serverNote,
}: TodoListClientProps) {
  // ── State ──────────────────────────────────────────────────
  const [todos, setTodos] = useState<Todo[]>(() => [...initialTodos]);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ── RSC Sync Hooks ─────────────────────────────────────────
  const toggleAction = useRSCAction("toggleTodo");
  const addAction = useRSCAction("addTodo");
  const {
    refresh,
    isRefreshing,
    lastRefreshed,
    error: refreshError,
  } = useRSCRefresh("TodoList");

  // ── Merge server todos saat RSCBoundary menerima update ─────
  // Dipanggil ketika refreshServerComponent() berhasil dan
  // RSCBoundary men-trigger re-render dengan initialTodos baru.
  useEffect(() => {
    setTodos((prev) => {
      // Pertahankan client-added todos (id > 1_000_000_000 = timestamp-based)
      const clientAdded = prev.filter((t) => t.id > 1_000_000_000);
      // Server todos yang fresh (reflect state server setelah actions)
      const serverTodos = [...initialTodos];
      // Merge: server todos + client-added todos yang belum ada di server
      return [...serverTodos, ...clientAdded];
    });
  }, [initialTodos]);

  // ── Derived State ──────────────────────────────────────────
  const completedCount = todos.filter((t) => t.completed).length;
  const pendingCount = todos.length - completedCount;
  const clientAddedCount = todos.filter((t) => t.id > 1_000_000_000).length;

  // ── Handlers ───────────────────────────────────────────────

  /**
   * Toggle checkbox.
   *
   * 1. Optimistic update: langsung ubah local state
   * 2. Server action: kirim ke /rsc/sync (no flight)
   * 3. Jika server error: revert (opsional, di sini kita biarkan)
   */
  const toggleTodo = async (id: number) => {
    // Step 1: Optimistic update
    startTransition(() => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
      );
    });

    // Step 2: Notify server (tanpa menunggu flight balik)
    await toggleAction.execute({ id });
  };

  /**
   * Tambah todo baru.
   *
   * 1. Optimistic add: tambah ke list dengan client-generated ID
   * 2. Server action: kirim ke /rsc/sync (no flight)
   *
   * Todo baru (ID timestamp) masuk ke list yang SAMA dengan server todos.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || isAdding) return;

    setIsAdding(true);

    // Step 1: Optimistic add
    const optimisticTodo: Todo = {
      id: Date.now(), // timestamp ID → mudah dibedakan dari server todos
      title,
      completed: false,
      userId: 1,
    };
    setTodos((prev) => [optimisticTodo, ...prev]);
    setNewTitle("");
    setJustAdded(title);
    setTimeout(() => setJustAdded(null), 3000);

    // Step 2: Notify server
    await addAction.execute({ title });
    setIsAdding(false);
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      {/* Server note badge */}
      {serverNote && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "#475569",
            fontFamily: "monospace",
            marginBottom: "1rem",
            padding: "0.3rem 0.75rem",
            background: "#0f172a",
            borderRadius: "4px",
            border: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              background: "#1e3a5f",
              color: "#60a5fa",
              padding: "0.1rem 0.4rem",
              borderRadius: "3px",
              fontSize: "0.65rem",
              border: "1px solid #1d4ed8",
            }}
          >
            SERVER DATA
          </span>
          {serverNote}
        </div>
      )}

      {/* Stats realtime */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            background: completedCount > 0 ? "#14532d" : "#1a1a1a",
            color: completedCount > 0 ? "#86efac" : "#64748b",
            padding: "0.2rem 0.7rem",
            borderRadius: "12px",
            fontSize: "0.75rem",
            border: `1px solid ${completedCount > 0 ? "#16a34a" : "#2a2a2a"}`,
            transition: "all 0.2s",
          }}
        >
          ✓ {completedCount} selesai
        </span>
        <span
          style={{
            background: pendingCount > 0 ? "#1e1b4b" : "#1a1a1a",
            color: pendingCount > 0 ? "#a5b4fc" : "#64748b",
            padding: "0.2rem 0.7rem",
            borderRadius: "12px",
            fontSize: "0.75rem",
            border: `1px solid ${pendingCount > 0 ? "#4338ca" : "#2a2a2a"}`,
            transition: "all 0.2s",
          }}
        >
          ◌ {pendingCount} pending
        </span>
        {clientAddedCount > 0 && (
          <span
            style={{
              background: "#14532d",
              color: "#4ade80",
              padding: "0.2rem 0.7rem",
              borderRadius: "12px",
              fontSize: "0.75rem",
              border: "1px solid #166534",
            }}
          >
            ✦ {clientAddedCount} baru (lokal)
          </span>
        )}
        <span
          style={{
            background: "#1a1a1a",
            color: "#475569",
            padding: "0.2rem 0.7rem",
            borderRadius: "12px",
            fontSize: "0.75rem",
            border: "1px solid #2a2a2a",
          }}
        >
          {todos.length} total
        </span>
      </div>

      {/* Todo list */}
      <ul
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {todos.map((todo) => {
          const isClientAdded = todo.id > 1_000_000_000;
          const isSyncing = toggleAction.isExecuting;

          return (
            <li
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 1rem",
                background: todo.completed ? "#0f2417" : "#1a1a1a",
                border: `1px solid ${todo.completed ? "#166534" : isClientAdded ? "#166534" : "#2a2a2a"}`,
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s",
                userSelect: "none",
                opacity: isSyncing ? 0.85 : 1,
              }}
            >
              {/* Checkbox interaktif */}
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "16px",
                  height: "16px",
                  accentColor: "#22c55e",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />

              {/* Judul */}
              <span
                style={{
                  flex: 1,
                  fontSize: "0.9rem",
                  color: todo.completed ? "#6ee7b7" : "#cbd5e1",
                  textDecoration: todo.completed ? "line-through" : "none",
                  opacity: todo.completed ? 0.75 : 1,
                  transition: "all 0.15s",
                }}
              >
                {todo.title}
              </span>

              {/* Badge */}
              <span
                style={{
                  fontSize: "0.65rem",
                  color: isClientAdded ? "#4ade80" : "#475569",
                  fontFamily: "monospace",
                  padding: "0.1rem 0.4rem",
                  background: isClientAdded ? "#14532d" : "transparent",
                  borderRadius: "3px",
                  flexShrink: 0,
                }}
              >
                {isClientAdded ? "✦ lokal" : `#${todo.id}`}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Add todo form */}
      <div
        style={{
          marginTop: "1.25rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid #2a2a2a",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: "0.5rem" }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah todo baru..."
            disabled={isAdding}
            style={{
              flex: 1,
              background: "#111",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              color: "#e2e8f0",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isAdding || !newTitle.trim()}
            style={{
              background: isAdding
                ? "#374151"
                : newTitle.trim()
                  ? "#4f46e5"
                  : "#1e1b4b",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.5rem 1.1rem",
              cursor: isAdding || !newTitle.trim() ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
              opacity: !newTitle.trim() && !isAdding ? 0.4 : 1,
              transition: "all 0.15s",
            }}
          >
            {isAdding ? "⏳" : "+ Tambah"}
          </button>
        </form>

        {/* Success toast */}
        {justAdded && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.4rem 0.75rem",
              background: "#14532d",
              border: "1px solid #16a34a",
              borderRadius: "6px",
              fontSize: "0.8rem",
              color: "#86efac",
            }}
          >
            ✅ <strong>&ldquo;{justAdded}&rdquo;</strong> ditambah (optimistic)
          </div>
        )}

        {/* Action sync indicator */}
        {(toggleAction.isExecuting || addAction.isExecuting) && (
          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.72rem",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span
              style={{
                animation: "spin 1s linear infinite",
                display: "inline-block",
              }}
            >
              ⟳
            </span>
            Syncing ke server...
          </div>
        )}
      </div>

      {/* Sync from server section */}
      <div
        style={{
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "1px solid #1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#475569" }}>
          {lastRefreshed ? (
            <span style={{ color: "#64748b" }}>
              ↻ Last synced: {lastRefreshed.toLocaleTimeString("id-ID")}
            </span>
          ) : (
            <span>Belum sync dari server sejak load</span>
          )}
          {refreshError && (
            <span style={{ color: "#f87171", marginLeft: "0.5rem" }}>
              ⚠ {refreshError}
            </span>
          )}
        </div>

        <button
          onClick={refresh}
          disabled={isRefreshing}
          title="Ambil data terbaru dari server (partial flight — hanya component ini yang update)"
          style={{
            background: isRefreshing ? "#374151" : "#0f172a",
            color: isRefreshing ? "#9ca3af" : "#60a5fa",
            border: "1px solid #1d4ed8",
            borderRadius: "6px",
            padding: "0.35rem 0.9rem",
            cursor: isRefreshing ? "not-allowed" : "pointer",
            fontSize: "0.78rem",
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.15s",
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
            }}
          >
            ↻
          </span>
          {isRefreshing ? "Syncing..." : "Sync dari Server"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
