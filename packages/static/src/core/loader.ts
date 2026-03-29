import type { ViteDevServer } from "vite";
import React from "react";
import type { Config } from "./type";

const SSG_CONFIG_PATH = './ssg.config.ts'

export const loadComponent = async (server: ViteDevServer, importPath: string): Promise<React.ComponentType> => {
    const mod: Record<string, unknown> = await server.ssrLoadModule(importPath)
    if (typeof mod.default !== 'function') {
        throw new TypeError(`Module "${importPath}" does not export a valid default component`)
    }
    return mod.default as React.ComponentType
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
