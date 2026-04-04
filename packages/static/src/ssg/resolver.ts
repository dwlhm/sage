import type { ConfigEntry } from "./types"

/**
 * Strips query and fragment so dev middleware matches `entry.path` to the URL pathname only.
 */
export const normalizeRequestPathname = (url: string): string =>
    url.split("?")[0]?.split("#")[0] ?? ""

/**
 * Find a matching config entry by URL path (exact match on pathname; no query/hash).
 * Pure function — no side effects, easy to test.
 */
export const findEntry = (entries: readonly ConfigEntry[], pathname: string): ConfigEntry | undefined =>
    entries.find((entry) => entry.path === pathname)
