import type { Connect, ViteDevServer } from "vite"
import type { ServerResponse } from "node:http"
import { findEntry, normalizeRequestPathname } from "./resolver"
import { renderDevPage } from "./renderer"
import type { Config } from "./types"

/**
 * Handle vite dev request.
 */
export const handleDevRequest = (server: ViteDevServer, config: Config): Connect.NextHandleFunction =>
    (req, res, next) => {
        if (!req.url) {
            next()
            return
        }

        const pathname = normalizeRequestPathname(req.url)
        const entry = findEntry(config.entries, pathname)
        if (!entry) {
            next()
            return
        }

        void renderDevPage({
            importPath: entry._importPath,
            pagePath: entry.path,
            res: res as ServerResponse,
            server,
        })
            .catch((error: unknown) => {
                next(error)
            })
    }
