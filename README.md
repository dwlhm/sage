# README — react-efftch-ts

A from-scratch implementation of **React Server Components (RSC)** with a custom flight protocol, built entirely on **Effect-TS** — no Next.js, no RSC framework.

## Overview

This project demonstrates how RSC works under the hood by implementing:

- **Custom flight protocol** — NDJSON-based wire format that serializes React server component trees into a flat graph of nodes with ID references
- **Server-side rendering (SSR)** — Full HTML generation on first load with embedded flight data for instant hydration
- **Effect-TS throughout** — HTTP server, state management, error handling, async pipelines, all powered by Effect
- **Partial updates** — Surgical client component re-renders via `RSCBoundary` without re-rendering the entire tree
- **Optimistic UI** — Mutations with ack-only server responses, no flight data roundtrip for actions

## Architecture

```
┌─────────────────────┐        ┌─────────────────────┐
│  Vite Dev Server    │        │  Effect HTTP Server │
│  :5173              │        │  :3001              │
│                     │        │                     │
│  Client JS/TS       │◄───────│  SSR HTML           │
│  HMR                │  HTML  │  + embedded flight  │
│  Proxy /rsc, /api   │───────►│                     │
│                     │ fetch  │                     │
│                     │◄───────│  /rsc (flight NDJSON)│
│                     │ fetch  │                     │
│                     │───────►│  /rsc/sync (action) │
└─────────────────────┘        └─────────────────────┘
```

### Key Components

| Layer | Description |
|---|---|
| **Flight Serializer** | `ReactElement → FlightPayload (NDJSON)` using Effect-Ref for ID allocation |
| **Flight Deserializer** | `NDJSON → ReactNode tree` with client_ref nodes wrapped in RSCBoundary |
| **SSR Renderer** | `renderToPipeableStream` + embedded flight payload in `<script>` tag |
| **RSC Sync** | Action (ack-only) and Refresh (partial flight) protocols |
| **TodoStore** | In-memory Effect-Ref store with concurrent-safe mutations |

### Quick Start

```bash
npm install
npm run dev
```

Then open **http://localhost:3001** (SSR served by Effect server, client assets by Vite).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both server (:3001) and Vite (:5173) |
| `npm run dev:server` | Effect HTTP server with hot reload |
| `npm run dev:client` | Vite dev server |
| `npm run build` | Build client and server |
| `npm run start` | Run production server |

### Project Structure

```
src/
├── shared/          # Types: flight-types, rsc-protocol
├── server/          # Effect HTTP server (port 3001)
│   ├── index.ts     # Router, handlers, server entry
│   ├── actions.ts   # Server action executor
│   ├── store/       # TodoStore (Effect-Ref)
│   ├── flight/      # Serializer, client-ref factory
│   ├── render/      # SSR renderer (renderToPipeableStream)
│   └── components/  # Server components (App, TodoList, Header)
└── client/          # Client code (Vite, port 5173)
    ├── main.tsx     # Entry: SSR hydrate → CSR fallback
    ├── flight/      # Deserializer (NDJSON → ReactNode)
    ├── rsc/         # RSCBoundary, sync hooks
    └── components/  # Client components + registry
```

### Documentation

- [ADR-001: Use Effect-TS as Primary Framework](docs/adr/001-use-effect-ts.md)
- [ADR-002: Custom NDJSON Flight Protocol](docs/adr/002-custom-flight-protocol.md)
- [ADR-003: RSCBoundary for Partial Updates](docs/adr/003-rsc-boundary-partial-updates.md)
- [ADR-004: SSR with Embedded Flight Data](docs/adr/004-ssr-embedded-flight.md)
