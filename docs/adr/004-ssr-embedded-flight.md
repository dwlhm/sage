# ADR-004: SSR with Embedded Flight Data

**Status:** Accepted  
**Date:** 2026-05-06  
**Context:** react-efftch-ts project

## Context

After implementing the client-side RSC fetch flow, the first page load required a roundtrip: client boots → fetches `/rsc` → parses → renders. This resulted in a visible loading spinner on first load. To improve the first-contentful-paint (FCP), we needed server-side rendering.

The challenges:
- React 19's `renderToStaticMarkup` does not handle async components (throws "component suspended" error)
- Client needs flight payload to hydrate interactive client components
- Development environment uses Vite (port 5173) for client assets while server runs on port 3001

## Decision

Implement SSR using **`renderToPipeableStream`** with **embedded flight payload** in the HTML response.

### Pipeline

```
1. serializeToFlight(App) → FlightPayload → NDJSON
2. renderToPipeableStream(App, { onShellReady }) → HTML stream
3. Combine: HTML_HEAD + <script id="__RSC_DATA__"> + stream body + HTML_TAIL
4. Return complete HTML string
```

### HTML Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <style>/* BASE_CSS */</style>
    <!-- Flight payload embedded as HTML-escaped NDJSON -->
    <script type="application/x-flight" id="__RSC_DATA__">
      {"type":"header","rootId":"175",...}\n{"id":"0",...}\n...
    </script>
    <!-- Vite HMR client (development only) -->
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root">
      <!-- Streamed HTML from renderToPipeableStream -->
    </div>
    <!-- Client entry point -->
    <script type="module" src="http://localhost:5173/src/client/main.tsx"></script>
  </body>
</html>
```

### Client Bootstrap Strategy

Two-priority hydration:

```
Priority 1: hydrateFromSSR()
  → Read __RSC_DATA__ from <script> tag
  → parseFlightPayload + reconstructTree
  → createRoot().render(tree) — no network request

Priority 2 (fallback): fetchRSCContent(path)
  → HttpClient.get("/rsc")
  → parseFlightPayload + reconstructTree
  → createRoot().render(tree)
```

### Development vs Production

In development, the SSR HTML must reference the Vite dev server for client assets:
- `script src` points to `http://localhost:5173/src/client/main.tsx`
- `@vite/client` HMR script is injected via `renderPageToHTML(options.viteDevServerUrl)`

In production, paths are relative (`/src/client/main.tsx` resolved by the static file server).

### Why renderToPipeableStream Over renderToStaticMarkup

- `renderToStaticMarkup` is synchronous and cannot handle async server components (throws "component suspended" error)
- `renderToPipeableStream` supports async components and streaming, with `onShellReady` callback to begin transmission once the outer HTML shell is ready

## Consequences

### Positive

- **Instant first paint** — Full HTML is served on the first request, no loading spinner
- **No redundant fetch** — Flight payload is embedded, client skips the `/rsc` fetch
- **Graceful degradation** — If `__RSC_DATA__` is missing, client falls back to CSR fetch
- **Debuggable** — Flight payload is visible in page source

### Negative

- **Larger initial HTML** — The NDJSON is embedded in the page (typically 20KB+ for the App component), increasing TTFB slightly
- **Double rendering** — Server renders App twice: once for flight serialization, once for HTML streaming. This could be optimized by reusing the serialized tree.
- **Dev/Prod complexity** — Different script URLs in development vs production require conditional logic
- **XSS risk** — Flight payload must be HTML-escaped before embedding to prevent injection attacks

### Future Improvements

1. **Cache flight payload** — Serialize once per request, reuse for both HTML and embedded data
2. **Streaming SSR** — Send head + flight data immediately, stream body as it renders
3. **Selective SSR** — Only SSR above-the-fold components, lazy-render the rest via CSR
4. **Production build** — Use a proper static file server (e.g., nginx) to serve built Vite assets instead of proxying to Vite dev server
