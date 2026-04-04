import type { ComponentType, ReactNode } from "react"

/**
 * Shape of the config after transform injects `_importPath`.
 * Maps to what `ssg.config.ts` exports after the `transformConfig` pass.
 */
export interface ConfigEntry {
    component: () => Promise<unknown>
    _importPath: string
    out: string
    path: string
}

export interface Config {
    entries: ConfigEntry[]
    /** Optional document shell; reserved for future use. */
    root?: ComponentType<{ children: ReactNode }>
}
