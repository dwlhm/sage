import { describe, expect, it } from "vitest"
import { isSsgConfigModuleId, transformConfig } from "./transform"

describe("isSsgConfigModuleId", () => {
    it("matches basename at end of posix path", () => {
        expect(isSsgConfigModuleId("/Users/app/ssg.config.ts")).toBe(true)
    })

    it("matches with query string", () => {
        expect(isSsgConfigModuleId("/app/ssg.config.ts?v=1")).toBe(true)
    })

    it("matches windows-style separators", () => {
        expect(isSsgConfigModuleId("C:\\app\\ssg.config.ts")).toBe(true)
    })

    it("rejects other config names", () => {
        expect(isSsgConfigModuleId("/app/vite.config.ts")).toBe(false)
    })
})

describe("transformConfig", () => {
    it("should inject _importPath for a double-quoted dynamic import", () => {
        const input = '{ component: import("./pages/Home") }'
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/Home"')
        expect(result.code).toContain('import("./pages/Home")')
        expect(result.map).toBeUndefined()
    })

    it("should inject _importPath for a single-quoted dynamic import", () => {
        const input = "{ component: import('./pages/About') }"
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/About"')
    })

    it("should handle multiple dynamic imports in the same code", () => {
        const input = `[
            { component: import("./pages/Home"), path: "/" },
            { component: import("./pages/About"), path: "/about" },
        ]`
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/Home"')
        expect(result.code).toContain('_importPath: "./pages/About"')
    })

    it("should not modify code without dynamic imports", () => {
        const input = "const x = 42"
        const result = transformConfig(input)

        expect(result.code).toBe(input)
    })

    it("should preserve the original import() call", () => {
        const input = '{ component: import("./pages/Home") }'
        const result = transformConfig(input)

        expect(result.code).toMatch(/import\("\.\/pages\/Home"\)/)
    })
})
