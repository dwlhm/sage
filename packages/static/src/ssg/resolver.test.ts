import { describe, expect, it } from "vitest"
import { findEntry, normalizeRequestPathname } from "./resolver"
import type { ConfigEntry } from "./types"

const entries: ConfigEntry[] = [
    { component: () => Promise.resolve({}), _importPath: "./src/app", out: "index.html", path: "/" },
    { component: () => Promise.resolve({}), _importPath: "./src/about", out: "about/index.html", path: "/about" },
    { component: () => Promise.resolve({}), _importPath: "./src/contact", out: "contact/index.html", path: "/contact" },
]

describe("normalizeRequestPathname", () => {
    it("strips query string", () => {
        expect(normalizeRequestPathname("/about?ref=1")).toBe("/about")
    })

    it("strips hash", () => {
        expect(normalizeRequestPathname("/about#section")).toBe("/about")
    })

    it("strips query and hash", () => {
        expect(normalizeRequestPathname("/?x=1#y")).toBe("/")
    })
})

describe("findEntry", () => {
    it("should find an entry by exact path match", () => {
        const result = findEntry(entries, "/")
        expect(result?.path).toBe("/")
        expect(result?._importPath).toBe("./src/app")
    })

    it("should find a nested path", () => {
        const result = findEntry(entries, "/about")
        expect(result?.path).toBe("/about")
        expect(result?._importPath).toBe("./src/about")
    })

    it("should return undefined when no match found", () => {
        const result = findEntry(entries, "/nonexistent")
        expect(result).toBeUndefined()
    })

    it("should return undefined for empty entries array", () => {
        const result = findEntry([], "/about")
        expect(result).toBeUndefined()
    })

    it("matches pathname when URL would include query (via normalize)", () => {
        const url = "/about?cache=bust"
        const pathname = normalizeRequestPathname(url)
        const result = findEntry(entries, pathname)
        expect(result?.path).toBe("/about")
    })
})
