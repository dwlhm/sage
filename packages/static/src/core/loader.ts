import type { ComponentType } from "react";
import type { ViteDevServer } from "vite";
import type { Config } from "./type";
import { getPageParamFromModuleId, pageImportToViteRootSpecifier } from "./virtual-sage-client";

const SSG_CONFIG_PATH = './ssg.config.ts'

export const loadComponent = async (
    server: ViteDevServer,
    importPath: string,
): Promise<ComponentType> => {
    const mod: Record<string, unknown> = await server.ssrLoadModule(importPath)
    if (typeof mod.default !== 'function') {
        throw new TypeError(`Module "${importPath}" does not export a valid default component`)
    }
    return mod.default as ComponentType
}

export const loadConfig = async (server: ViteDevServer): Promise<Config> => {
    const configModule: Record<string, unknown> = await server.ssrLoadModule(SSG_CONFIG_PATH)

    if (!configModule.default || typeof configModule.default !== 'object') {
        throw new TypeError(`${SSG_CONFIG_PATH} must export a default object`)
    }

    const config = configModule.default as Config
    if (!Array.isArray(config.entries)) {
        throw new TypeError(`${SSG_CONFIG_PATH} must export { entries: [...] }`)
    }

    return config
}

export const loadClient = (moduleId: string) => {
    const page = getPageParamFromModuleId(moduleId)
    if (!page) {
        return
    }

    const rootImport = JSON.stringify(pageImportToViteRootSpecifier(page))

    return `
        import React from "react"
        import { hydrateRoot } from "react-dom/client"
        import { Root } from "@sage/static/react"

        const mount = async () => {
            const { default: Component } = await import(${rootImport})
            hydrateRoot(
                document,
                React.createElement(Root, null, React.createElement(Component))
            )
        }

        mount()
    `
}
