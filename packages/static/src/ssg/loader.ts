import type { ViteDevServer } from "vite"
import type { Config } from "./types"
import { getPageParamFromModuleId } from "../plugin/virtual-module"
import { transformImportPath } from "./transform"
import { SSG_CONFIG_PATH } from "../constants"
import type { Component } from "../react/types"

const NON_EMPTY = 1

const validateConfigEntryFields = (raw: Record<string, unknown>, index: number): void => {
    if (typeof raw._importPath !== "string" || raw._importPath.length < NON_EMPTY) {
        throw new TypeError(`${SSG_CONFIG_PATH}: entries[${index}]._importPath must be a non-empty string`)
    }
    if (typeof raw.path !== "string" || !raw.path.startsWith("/")) {
        throw new TypeError(`${SSG_CONFIG_PATH}: entries[${index}].path must be an absolute URL path (e.g. "/about")`)
    }
    if (typeof raw.out !== "string" || raw.out.length < NON_EMPTY) {
        throw new TypeError(`${SSG_CONFIG_PATH}: entries[${index}].out must be a non-empty string`)
    }
    if (typeof raw.component !== "function") {
        throw new TypeError(`${SSG_CONFIG_PATH}: entries[${index}].component must be a dynamic import (function)`)
    }
}

const validateConfigEntry = (entry: unknown, index: number): void => {
    if (typeof entry !== "object" || entry === null) {
        throw new TypeError(`${SSG_CONFIG_PATH}: entries[${index}] must be an object`)
    }
    validateConfigEntryFields(entry as Record<string, unknown>, index)
}

export const loadComponent = async (
    server: ViteDevServer,
    importPath: string,
): Promise<Component> => {
    const mod: Record<string, unknown> = await server.ssrLoadModule(importPath)
    if (typeof mod.default !== "function") {
        throw new TypeError(`Module "${importPath}" does not export a valid default component`)
    }
    return mod.default as Component
}

export const loadConfig = async (server: ViteDevServer): Promise<Config> => {
    const configModule: Record<string, unknown> = await server.ssrLoadModule(SSG_CONFIG_PATH)

    if (!configModule.default || typeof configModule.default !== "object") {
        throw new TypeError(`${SSG_CONFIG_PATH} must export a default object`)
    }

    const config = configModule.default as Config
    if (!Array.isArray(config.entries)) {
        throw new TypeError(`${SSG_CONFIG_PATH} must export { entries: [...] }`)
    }

    for (let index = 0; index < config.entries.length; index++) {
        validateConfigEntry(config.entries[index], index)
    }

    return config
}

export const loadDevClient = (moduleId: string, config?: Config) => {
    const page = getPageParamFromModuleId(moduleId)
    if (!page) {
        return
    }

    const routesCode = config?.entries.map((item) => `
        ${JSON.stringify(item.path)}: () => import(${JSON.stringify(transformImportPath(item._importPath))})
    `).join(",")

    const rootImport = JSON.stringify(transformImportPath(page))

    return `
        import React from "react"
        import { hydrateRoot } from "react-dom/client"
        import { Root } from "@sage/static/react"

        const mount = async () => {
            const routes = {${routesCode}}
            const { default: Component } = await import(${rootImport})
            hydrateRoot(
                document,
                React.createElement(Root, { routes }, React.createElement(Component))
            )
        }

        mount()
    `
}
