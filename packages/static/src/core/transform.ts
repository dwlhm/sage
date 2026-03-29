import { IMPORT_PATH_REGEX } from './matcher'

/**
 * Transforms SSG config source code by injecting `_importPath` metadata
 * next to each dynamic `import()` call. This allows the SSG pipeline to
 * resolve the original import path at runtime without re-parsing.
 *
 * @example
 * // Input:  `{ component: import("./pages/Home") }`
 * // Output: `{ component: import("./pages/Home"),\n_importPath: "./pages/Home" }`
 */
export const transformConfig = (code: string): { code: string; map: undefined } => {
    const transformed = code.replace(
        IMPORT_PATH_REGEX,
        (fullMatch, path) => `${fullMatch},\n_importPath: "${path}"`
    )

    return { code: transformed, map: undefined }
}
