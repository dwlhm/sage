import type { ConfigEntry } from "./type"

/**
 * Find a matching config entry by URL path.
 * Pure function — no side effects, easy to test.
 */
export const findEntry = (entries: readonly ConfigEntry[], url: string): ConfigEntry | undefined =>
    entries.find((entry) => entry.path === url)