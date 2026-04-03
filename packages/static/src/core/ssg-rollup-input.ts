/**
 * Builds Rollup `input` entries for SSG client bundles and merges them with the user config.
 */

import fs from "node:fs"
import path from "node:path"
import { createServer, resolveConfig, type ConfigEnv, type UserConfig } from "vite"
import type { ConfigEntry } from "./type"
import { loadConfig } from "./loader"
import { VIRTUAL_MODULE_NULL_PREFIX, VIRTUAL_SAGE_CLIENT_ID } from "./virtual-sage-client"

const ENTRY_OUT_SANITIZE = /[^a-zA-Z0-9_-]/g

type RollupInputOption =
    | Record<string, string>
    | string
    | readonly string[]
    | undefined

const virtualClientInputKey = (entryOut: string): string =>
    `sage-client-${entryOut.replace(ENTRY_OUT_SANITIZE, "_")}`

/** One Rollup entry per SSG page so each HTML can load its own hydrate chunk. */
export const buildVirtualClientRollupInputs = (entries: readonly ConfigEntry[]): Record<string, string> => {
    const inputs: Record<string, string> = {}
    for (const entry of entries) {
        const key = virtualClientInputKey(entry.out)
        inputs[key] = `${VIRTUAL_MODULE_NULL_PREFIX}${VIRTUAL_SAGE_CLIENT_ID}?page=${entry._importPath}`
    }
    return inputs
}

const assignArrayRollupInput = (
    merged: Record<string, string>,
    userInput: readonly string[],
): void => {
    for (let index = 0; index < userInput.length; index++) {
        merged[`entry${index}`] = userInput[index]
    }
}

const assignDefaultIndexHtmlIfPresent = (merged: Record<string, string>, projectRoot: string): void => {
    const indexPath = path.resolve(projectRoot, "index.html")
    if (fs.existsSync(indexPath)) {
        merged.index = indexPath
    }
}

/** Handles every `rollupOptions.input` shape except `undefined` (handled separately). */
const assignUserRollupInputWhenDefined = (
    merged: Record<string, string>,
    userInput: Exclude<RollupInputOption, undefined>,
): void => {
    if (typeof userInput === "object" && userInput !== null && !Array.isArray(userInput)) {
        Object.assign(merged, userInput)
        return
    }
    if (typeof userInput === "string") {
        merged.main = userInput
        return
    }
    if (Array.isArray(userInput)) {
        assignArrayRollupInput(merged, userInput)
    }
}

/**
 * Preserves the user’s `rollupOptions.input` (string, array, or object) and appends SSG client entries.
 */
const assignUserRollupInput = (
    merged: Record<string, string>,
    projectRoot: string,
    userInput: RollupInputOption,
): void => {
    if (userInput === undefined) {
        assignDefaultIndexHtmlIfPresent(merged, projectRoot)
        return
    }
    assignUserRollupInputWhenDefined(merged, userInput)
}

export const mergeRollupInputWithSsgClients = (
    projectRoot: string,
    userInput: RollupInputOption,
    ssgClientInputs: Record<string, string>,
): Record<string, string> => {
    const merged: Record<string, string> = {}
    assignUserRollupInput(merged, projectRoot, userInput)
    Object.assign(merged, ssgClientInputs)
    return merged
}

/**
 * Loads `ssg.config.ts` the same way as the app: temporary Vite server with the project’s resolved plugins
 * so `_importPath` injection and TS transforms apply.
 */
export const loadSsgConfigFromBuildContext = async (projectRoot: string) => {
    const resolved = await resolveConfig({ root: projectRoot }, "build")
    const server = await createServer({
        appType: "custom",
        configFile: false,
        plugins: [...resolved.plugins],
        root: resolved.root,
        server: { middlewareMode: true },
    })
    try {
        return await loadConfig(server)
    } finally {
        await server.close()
    }
}

const buildRollupInputWithSsgClients = async (config: UserConfig): Promise<Record<string, string>> => {
    const root = config.root ?? process.cwd()
    const ssg = await loadSsgConfigFromBuildContext(root)
    const extraInputs = buildVirtualClientRollupInputs(ssg.entries)
    return mergeRollupInputWithSsgClients(root, config.build?.rollupOptions?.input, extraInputs)
}

/**
 * When resolving the user Vite config, merges Rollup inputs so each SSG page gets a client bundle.
 * Uses `loadingGuard` to skip nested config merges while we spin up a temporary server to read `ssg.config.ts`.
 */
export const mergeSsgBuildRollupInput = async (
    config: UserConfig,
    env: ConfigEnv,
    loadingGuard: { current: boolean },
): Promise<UserConfig | Record<string, never>> => {
    if (loadingGuard.current) {
        return {}
    }
    if (env.command !== "build") {
        return {}
    }
    loadingGuard.current = true
    try {
        const merged = await buildRollupInputWithSsgClients(config)
        return {
            build: {
                rollupOptions: {
                    input: merged,
                },
            },
        }
    } finally {
        loadingGuard.current = false
    }
}
