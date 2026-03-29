import { describe, expect, it } from 'vitest'
import { transformConfig } from './transform'

describe('transformConfig', () => {
    it('should inject _importPath for a double-quoted dynamic import', () => {
        const input = '{ component: import("./pages/Home") }'
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/Home"')
        expect(result.code).toContain('import("./pages/Home")')
        expect(result.map).toBeUndefined()
    })

    it('should inject _importPath for a single-quoted dynamic import', () => {
        const input = "{ component: import('./pages/About') }"
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/About"')
    })

    it('should handle multiple dynamic imports in the same code', () => {
        const input = `[
            { component: import("./pages/Home"), path: "/" },
            { component: import("./pages/About"), path: "/about" },
        ]`
        const result = transformConfig(input)

        expect(result.code).toContain('_importPath: "./pages/Home"')
        expect(result.code).toContain('_importPath: "./pages/About"')
    })

    it('should not modify code without dynamic imports', () => {
        const input = 'const x = 42'
        const result = transformConfig(input)

        expect(result.code).toBe(input)
    })

    it('should preserve the original import() call', () => {
        const input = '{ component: import("./pages/Home") }'
        const result = transformConfig(input)

        // The original import() should still be present
        expect(result.code).toMatch(/import\("\.\/pages\/Home"\)/)
    })
})
