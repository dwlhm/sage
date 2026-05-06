# ADR-002: Custom NDJSON Flight Protocol

**Status:** Accepted  
**Date:** 2026-05-06  
**Context:** react-efftch-ts project

## Context

React Server Components require a mechanism to serialize the server component tree and transmit it to the client. React's actual RSC implementation uses a proprietary binary protocol. For this project, we needed a wire format that is:

- Human-readable for debugging
- Streamable over HTTP
- Supports partial updates (individual component refresh)
- Can represent the full React element tree including client component references

## Decision

Implement a custom **NDJSON (Newline-Delimited JSON) flight protocol** with the following structure:

### Wire Format

```
Line 1: Header
  {"type":"header","rootId":"175","timestamp":"2026-05-06T10:14:17.199Z","version":"1.0"}

Line 2+: Flight Nodes
  {"id":"0","type":"element","tag":"div","props":{"style":{...}},"children":["1","2"]}
  {"id":"1","type":"text","value":"Hello"}
  {"id":"2","type":"client_ref","componentId":"Counter","props":{"initialCount":42}}
  {"id":"3","type":"null"}
  {"id":"4","type":"array","children":["5","6","7"]}
```

### Node Types

| Type | Fields | Purpose |
|---|---|---|
| `element` | `id, tag, props, children` | Host DOM elements (div, p, span, etc.) |
| `text` | `id, value` | String/number primitives |
| `client_ref` | `id, componentId, props` | Pointer to a client component with serializable props |
| `null` | `id` | null/undefined/false placeholders |
| `array` | `id, children` | Collection of child node IDs |

### Key Design Decisions

1. **Flat graph with ID references** — Parent-child relationships use string IDs, not nested objects. This enables partial updates (the client can replace a subtree by ID without re-parsing the whole tree).

2. **Sequential ID allocation** — IDs are allocated sequentially (`0, 1, 2, ...`) using `Effect.Ref.modify` for deterministic ordering, which simplifies debugging and testing.

3. **Props sanitization** — Functions, Symbols, and `undefined` are stripped during serialization. `Error` objects become `{message, name}`. This prevents non-serializable data from reaching the client.

4. **Server components are transparent** — When the serializer encounters a server component function, it executes it and serializes the result. The server component itself gets no node in the flight payload.

5. **Client refs use a Symbol marker** — Server-side `createClientRef("ID")` creates a stub function tagged with `Symbol.for("rsc.client_ref")`. The serializer detects this marker and emits a `client_ref` node instead of trying to execute the function.

### Partial Updates

For the `/rsc/sync?type=refresh` endpoint, the server re-renders a single component, serializes it, then **extracts only `client_ref` nodes** and returns them as a partial flight payload with `partialFor: componentId` in the header.

## Consequences

### Positive

- **Debuggable** — NDJSON is human-readable; each line is valid JSON
- **Streamable** — Can be sent line-by-line over HTTP without buffering the entire payload
- **Partial update support** — Flat ID-referenced graph enables surgical subtree replacement
- **No external dependencies** — Pure JSON, no binary protocol or custom parser needed

### Negative

- **Larger payload** — JSON is more verbose than binary (React's actual protocol uses a compact binary format)
- **No built-in suspense handling** — Unlike React's real RSC protocol, our implementation doesn't support streaming suspense boundaries
- **Manual serialization** — We must handle every React node type ourselves (no fallback to React's serializer)
