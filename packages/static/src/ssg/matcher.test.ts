import { describe, expect, it } from "vitest"
import { IMPORT_PATH_REGEX } from "./matcher"

describe("IMPORT_PATH_REGEX", () => {
    it("should match import with double quotes", () => {
        const input = 'import("./pages/Home")'
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(1)
        expect(match[0][1]).toBe("./pages/Home")
    })

    it("should match import with single quotes", () => {
        const input = "import('./pages/About')"
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(1)
        expect(match[0][1]).toBe("./pages/About")
    })

    it("should match import with backtick quotes", () => {
        const input = "import(`./pages/Dynamic`)"
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(1)
        expect(match[0][1]).toBe("./pages/Dynamic")
    })

    it("should match multiple imports in the same string", () => {
        const input = `
            import("./pages/Home")
            import("./pages/About")
        `
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(2)
        expect(match[0][1]).toBe("./pages/Home")
        expect(match[1][1]).toBe("./pages/About")
    })

    it("should capture the path without quotes", () => {
        const input = 'import("@/components/Header")'
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match[0][1]).toBe("@/components/Header")
    })

    it("should handle whitespace inside import()", () => {
        const input = 'import(  "./pages/Home"  )'
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(1)
        expect(match[0][1]).toBe("./pages/Home")
    })

    it("should not match regular import statements", () => {
        const input = 'import React from "react"'
        const match = [...input.matchAll(IMPORT_PATH_REGEX)]

        expect(match).toHaveLength(0)
    })
})
