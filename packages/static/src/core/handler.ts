import type { Connect, ViteDevServer } from "vite";
import type { ServerResponse } from "node:http";
import React from "react";
import { findEntry } from "./resolver";
import { sendHtml } from "./response";
import { loadComponent } from "./loader";
import { renderToStatic } from "./renderer";
import type { Config } from "./type";
import Document from "../components/document";

interface RenderPage {
    server: ViteDevServer,
    importPath: string,
    pagePath: string,
    res: ServerResponse,
    root: React.ComponentType<{ children: React.ReactNode }>
}

const renderPage = async ({
    server,
    importPath,
    pagePath,
    res,
    root,
}: RenderPage): Promise<void> => {
    const Component = await loadComponent(server, importPath)
    const html = await renderToStatic(React.createElement(root || Document, undefined, React.createElement(Component)))
    const transformedHtml = await server.transformIndexHtml(pagePath, html)

    const clientEntry = `\0virtual:sage-client?page=${importPath}`

    const htmlWithScript = transformedHtml.replace(
        "</body>",
        `<script type="module" src="${clientEntry}"></script></body>`
    )

    sendHtml(res, htmlWithScript)
}

export const handleDevRequest = (server: ViteDevServer, config: Config): Connect.NextHandleFunction =>
    (req, res, next) => {
        if (!req.url) { next(); return }

        const entry = findEntry(config.entries, req.url)
        if (!entry) { next(); return }

        void renderPage({
            importPath: entry._importPath,
            pagePath: entry.path,
            res: res as ServerResponse,
            root: Document,
            server,
        })
            .catch((error: unknown) => { next(error) })
    }
