# ADR-001: Use Effect-TS as Primary Framework

**Status:** Accepted  
**Date:** 2026-05-06  
**Context:** react-efftch-ts project

## Context

The project needed a functional, type-safe foundation for both server-side HTTP handling and client-side async operations. The alternatives considered were:

1. **Express/Fastify + plain Promises** — conventional but error-prone, no unified error model
2. **Next.js** — provides RSC out of the box but hides the internals we wanted to understand
3. **Effect-TS** — functional effect system with typed errors, structured concurrency, resource safety

## Decision

Use **Effect-TS** as the primary framework for all application logic on both server and client.

Specifically:
- `@effect/platform` + `@effect/platform-node` for HTTP server routing, request/response handling
- `Effect` monad for async pipelines (fetching, serialization, deserialization)
- `Effect.Ref` for concurrent-safe mutable server state (TodoStore)
- `Data.TaggedError` for type-safe error types
- `Effect.try` / `Effect.tryPromise` for bridging Promise-based APIs
- `FetchHttpClient.layer` for client-side HTTP operations

## Consequences

### Positive

- **Unified error model** — All errors are typed and tagged, no unhandled rejections
- **Resource safety** — `Effect.scoped` ensures proper cleanup of HTTP connections
- **Composability** — Effect pipelines compose naturally without callback hell
- **Structured concurrency** — Automatic cancellation, timeout support (`Effect.timeout`)
- **No framework lock-in** — Effect is a library, not a framework; we control the architecture

### Negative

- **Learning curve** — Team members unfamiliar with FP/Effect need onboarding
- **Boilerplate** — More verbose than raw Promise chains for simple operations
- **Ecosystem maturity** — Smaller community than Express/Fastify; fewer third-party integrations

### Neutral

- Effect adds ~200KB to the client bundle (acceptable for a demo/project of this scope)
