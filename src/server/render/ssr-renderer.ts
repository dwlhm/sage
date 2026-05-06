import * as React from "react";
import { renderToPipeableStream } from "react-dom/server";
import { Effect } from "effect";
import { Writable } from "node:stream";

import App from "../components/App.js";
import { serializeToFlight, payloadToNDJSON } from "../flight/serializer.js";

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f0f; color: #ececec; }
  #root { min-height: 100vh; }
  .loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; color: #888; }
  .spinner { width: 40px; height: 40px; border: 3px solid #333; border-top-color: #7c3aed; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-container { padding: 2rem; max-width: 600px; margin: 2rem auto; background: #1a0000; border: 1px solid #ff4444; border-radius: 8px; }
  .error-container h2 { color: #ff4444; margin-bottom: 1rem; }
  .error-container pre { background: #2a0000; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; margin-bottom: 1rem; }
  .error-container button { background: #7c3aed; color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 4px; cursor: pointer; }
`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface SSROptions {
  viteDevServerUrl?: string;
}

const isDev = process.env.NODE_ENV !== "production";

const HTML_HEAD = (flightPayload: string, css: string, clientScriptUrl: string, viteClientUrl: string | null) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RSC + Effect-TS</title>
    <style>${css}</style>
    <script type="application/x-flight" id="__RSC_DATA__">${escapeHtml(flightPayload)}</script>
    ${viteClientUrl ? `<script type="module" src="${viteClientUrl}"></script>` : ""}
  </head>
  <body>
    <div id="root">`;

const HTML_TAIL = (clientScriptUrl: string) => `</div>
    <script type="module" src="${clientScriptUrl}"></script>
  </body>
</html>`;

/**
 * Render full page dengan SSR menggunakan streaming.
 *
 * Pipeline:
 * 1. Serialize App ke Flight payload (untuk client hydrate)
 * 2. Render App ke HTML stream via renderToPipeableStream
 * 3. Prepend HTML head + flight data sebelum stream body
 * 4. Append HTML tail setelah stream selesai
 */
export const renderPageToHTML = (
  path: string = "/",
  options?: SSROptions,
): Effect.Effect<string, Error> =>
  Effect.async<string, Error>((resume) => {
    const renderStart = Date.now();

    const clientScriptUrl = options?.viteDevServerUrl
      ? `${options.viteDevServerUrl}/src/client/main.tsx`
      : "/src/client/main.tsx";
    const viteClientUrl = options?.viteDevServerUrl
      ? `${options.viteDevServerUrl}/@vite/client`
      : null;

    // Step 1: Serialize ke Flight payload
    Effect.runPromise(
      Effect.gen(function* () {
        const payload = yield* serializeToFlight(
          React.createElement(App, { path, nodeCount: 0 }),
        );
        return payloadToNDJSON(payload);
      }),
    ).then((flightPayload) => {
      const headHtml = HTML_HEAD(flightPayload, BASE_CSS, clientScriptUrl, viteClientUrl);

      // Step 2: Stream render App component tree
      const chunks: Buffer[] = [];
      const writable = new Writable({
        write(chunk: Buffer, _encoding: string, callback: () => void) {
          chunks.push(chunk);
          callback();
        },
      });

      writable.on("finish", () => {
        const bodyHtml = Buffer.concat(chunks).toString("utf-8");
        const fullHtml = headHtml + bodyHtml + HTML_TAIL(clientScriptUrl);
        const renderTime = Date.now() - renderStart;

        Effect.runPromise(
          Effect.logInfo(
            `[SSR] Done: ${fullHtml.length} bytes HTML, ${flightPayload.length} bytes flight, ${renderTime}ms`,
          ),
        );
        resume(Effect.succeed(fullHtml));
      });

      writable.on("error", (err: Error) => {
        resume(Effect.fail(new Error(`Stream error: ${String(err)}`)));
      });

      const { pipe } = renderToPipeableStream(
        React.createElement(App, { path, nodeCount: 0 }),
        {
          onShellReady() {
            pipe(writable);
          },
          onError(error) {
            resume(
              Effect.fail(
                new Error(`SSR render error: ${String(error)}`),
              ),
            );
          },
        },
      );
    }).catch((err) => {
      resume(Effect.fail(new Error(`Flight serialization error: ${String(err)}`)));
    });
  });
