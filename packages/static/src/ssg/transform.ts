import {
    SSG_CONFIG_FILENAME,
    VITE_NULL_BYTE_PLACEHOLDER,
    VITE_VALID_ID_PREFIX,
    VIRTUAL_MODULE_NULL_PREFIX,
} from "../constants"
import { IMPORT_PATH_REGEX } from "./matcher"

/**
 * Transforms SSG config source code by injecting `_importPath` metadata
 * next to each dynamic `import()` call. This allows the SSG pipeline to
 * resolve the original import path at runtime without re-parsing.
 *
 * Injected values use `JSON.stringify` so paths cannot break out of the string literal.
 *
 * @example
 * // Input:  `{ component: import("./pages/Home") }`
 * // Output: `{ component: import("./pages/Home"),\n_importPath: "./pages/Home" }`
 */
export const transformConfig = (code: string): { code: string; map: undefined } => {
    const transformed = code.replace(
        IMPORT_PATH_REGEX,
        (fullMatch, path: string) => `${fullMatch},\n_importPath: ${JSON.stringify(path)}`,
    )

    return { code: transformed, map: undefined }
}

/**
 * True when this module id is the SSG config file (dev / build, absolute or relative, optional query).
 */
export const isSsgConfigModuleId = (moduleId: string): boolean => {
    const withoutQuery = moduleId.split("?")[0] ?? moduleId
    const normalized = withoutQuery.replace(/\\/g, "/")
    return (
        normalized.endsWith(`/${SSG_CONFIG_FILENAME}`)
        || normalized.endsWith(SSG_CONFIG_FILENAME)
    )
}

/**
 * Dynamic `import()` inside a virtual module has no real file path; Vite resolves `/src/...` from the
 * project root, so `./src/App` becomes `/src/App`.
 */
export const transformImportPath = (importPath: string): string => {
    if (importPath.startsWith("/")) {
        return importPath
    }
    const cleaned = importPath.replace(/^\.\//, "")
    return `/${cleaned}`
}

/**
 * Removes the NUL prefix from virtual module ids.
 */
export const transformVirtualModuleId = (moduleId: string): string => {
    if (moduleId.startsWith(VIRTUAL_MODULE_NULL_PREFIX)) {
        return moduleId.slice(VIRTUAL_MODULE_NULL_PREFIX.length)
    }
    return moduleId
}

/**
 * Converts a resolved module id to a Vite dev module url.
 */
export const toViteDevModuleUrl = (resolvedModuleId: string): string =>
    `${VITE_VALID_ID_PREFIX}${resolvedModuleId.replaceAll(VIRTUAL_MODULE_NULL_PREFIX, VITE_NULL_BYTE_PLACEHOLDER)}`
