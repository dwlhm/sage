# ADR-003: RSCBoundary for Partial Updates

**Status:** Accepted  
**Date:** 2026-05-06  
**Context:** react-efftch-ts project

## Context

When the client receives a partial flight payload (via `POST /rsc/sync?type=refresh`), it needs to update only the affected client component without re-rendering the entire tree. The deserializer reconstructs the tree from flight nodes, but `client_ref` nodes must be wrapped in a mechanism that:

- Can receive new props from outside the React tree (the HTTP response handler is not a React component)
- Re-renders only itself when new props arrive
- Subscribes/unsubscribes cleanly on mount/unmount

React Context was considered but rejected because `updateBoundaryProps()` is called from an Effect program (outside React's rendering cycle).

## Decision

Implement **`RSCBoundary`** — a React component that acts as a subscription boundary for client component updates.

### Architecture

```
Global Store (module-level):
  boundaryCurrentProps: Map<componentId, Record<string, unknown>>
  boundaryListeners: Map<componentId, Set<(props) => void>>

Deserializer creates:
  <RSCBoundary
    componentId="TodoListClient"
    initialProps={{ initialTodos: [...], serverNote: "..." }}
    registry={clientRegistry}
  />
```

### RSCBoundary Lifecycle

1. **Mount:** Reads `initialProps`, subscribes `setState` to `boundaryListeners[componentId]`
2. **Partial flight arrives:** `updateBoundaryProps(componentId, newProps)` is called
3. **Notify:** All listeners for that `componentId` receive `setState(newProps)`
4. **Re-render:** Only the RSCBoundary component re-renders with new props
5. **Remount:** The inner client component receives updated props and re-renders
6. **Unmount:** Listener is removed from the set

### Sync Hooks

Two custom hooks wrap the sync logic:

- **`useRSCAction(actionName)`** — Returns `{ execute, isExecuting, error }`. Sends `POST /rsc/sync` with `type: "action"`. Server returns `{ type: "ack" }` — no flight data.

- **`useRSCRefresh(componentId)`** — Returns `{ refresh, isRefreshing, lastRefreshed, error }`. Sends `POST /rsc/sync` with `type: "refresh"`. Server returns partial flight, which is parsed and applied via `updateBoundaryProps`.

### Why Not React Context

- Context updates require a Provider in the React tree, but `updateBoundaryProps()` is called from a non-React context (Effect HTTP handler)
- Context causes re-renders of all consumers, while `RSCBoundary` isolates updates to a single component
- Module-level Map allows cross-tree updates (multiple boundaries with the same `componentId`)

## Consequences

### Positive

- **Surgical updates** — Only the affected client component re-renders, not the entire tree
- **Decoupled from React tree** — Updates can be triggered from any code (HTTP handlers, Effect pipelines, timers)
- **Multiple boundaries supported** — Multiple `RSCBoundary` components can subscribe to the same `componentId`
- **Simple API** — `useRSCAction` and `useRSCRefresh` hooks provide clean interfaces

### Negative

- **Module-level state** — Global Map is not SSR-safe (would need per-request isolation in production)
- **Memory leak risk** — If a component unmounts without cleaning up its listener (mitigated by useEffect cleanup)
- **Not type-safe** — Props passed to `updateBoundaryProps` are `Record<string, unknown>`, losing type information

### Trade-offs Accepted

- Global state is acceptable for a demo/single-user application. For multi-tenant use, a request-scoped store would be needed.
- Type safety is sacrificed for simplicity; runtime validation could be added if needed.
