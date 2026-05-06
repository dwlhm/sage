// ============================================================
// AddTodoForm — Client Component dengan Effect-TS
// ============================================================
// Form interaktif yang menggunakan Effect untuk:
// - Form submission state management
// - Local todo list management
// ============================================================

import { useState } from "react";
import { Effect, Duration, pipe } from "effect";

interface AddTodoFormProps {
  serverNote?: string;
}

interface LocalTodo {
  id: number;
  title: string;
  addedAt: string;
}

export default function AddTodoForm({ serverNote }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [todos, setTodos] = useState<LocalTodo[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const titleToAdd = title.trim();
    setIsAdding(true);

    // Gunakan Effect untuk simulate async operation
    // (dalam production, ini akan jadi HTTP request ke server)
    const addTodoEffect = pipe(
      Effect.gen(function* () {
        // Simulate network delay
        yield* Effect.sleep(Duration.millis(300));

        const newTodo: LocalTodo = {
          id: Date.now(),
          title: titleToAdd,
          addedAt: new Date().toLocaleTimeString("id-ID"),
        };

        return newTodo;
      }),
      Effect.tap((todo) =>
        Effect.logInfo(`[AddTodoForm] Menambah todo: "${todo.title}"`),
      ),
    );

    try {
      const newTodo = await Effect.runPromise(addTodoEffect);
      setTodos((prev) => [newTodo, ...prev]);
      setTitle("");
      setLastAdded(newTodo.title);
      setTimeout(() => setLastAdded(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div>
      {/* Server note dari props */}
      {serverNote && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "#475569",
            fontFamily: "monospace",
            marginBottom: "0.75rem",
            padding: "0.3rem 0.6rem",
            background: "#0f172a",
            borderRadius: "4px",
            border: "1px solid #1e293b",
          }}
        >
          📌 {serverNote}
        </div>
      )}

      {/* Form input */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tambah todo baru..."
          disabled={isAdding}
          style={{
            flex: 1,
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            color: "#e2e8f0",
            fontSize: "0.875rem",
            outline: "none",
            opacity: isAdding ? 0.7 : 1,
          }}
        />
        <button
          type="submit"
          disabled={isAdding || !title.trim()}
          style={{
            background: isAdding ? "#374151" : "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem 1rem",
            cursor: isAdding || !title.trim() ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: !title.trim() && !isAdding ? 0.5 : 1,
            transition: "all 0.15s",
          }}
        >
          {isAdding ? "⏳ Adding..." : "+ Tambah"}
        </button>
      </form>

      {/* Success feedback */}
      {lastAdded && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.4rem 0.75rem",
            background: "#14532d",
            border: "1px solid #16a34a",
            borderRadius: "4px",
            fontSize: "0.8rem",
            color: "#86efac",
          }}
        >
          ✅ Berhasil ditambah: &ldquo;{lastAdded}&rdquo;
        </div>
      )}

      {/* Local todos list */}
      {todos.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748b",
              marginBottom: "0.5rem",
            }}
          >
            Todos yang ditambah di session ini (client-side only):
          </p>
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
            }}
          >
            {todos.map((todo) => (
              <li
                key={todo.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.4rem 0.75rem",
                  background: "#1a2e1a",
                  border: "1px solid #166534",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                }}
              >
                <span style={{ color: "#bbf7d0" }}>🆕 {todo.title}</span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#4ade80",
                    fontFamily: "monospace",
                  }}
                >
                  {todo.addedAt}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
