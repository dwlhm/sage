/**
 * Helpers for the `virtual:sage-client` module that hydrates each SSG page in the browser.
 *
 * Vite/Rollup mark virtual modules with a leading NUL byte so they cannot collide with real
 * filesystem paths. We normalize ids the same way in dev and during `vite build`.
 */

import {
    VIRTUAL_MODULE_NULL_PREFIX,
    VIRTUAL_SAGE_CLIENT_ID,
} from "../constants"

export { VIRTUAL_MODULE_NULL_PREFIX, VIRTUAL_SAGE_CLIENT_ID } from "../constants"

const INDEX_NOT_FOUND = -1
const QUERY_SEPARATOR_LENGTH = 1

export const stripVirtualModulePrefix = (moduleId: string): string => {
    if (moduleId.startsWith(VIRTUAL_MODULE_NULL_PREFIX)) {
        return moduleId.slice(VIRTUAL_MODULE_NULL_PREFIX.length)
    }
    return moduleId
}

export const isSageClientVirtualModule = (moduleId: string): boolean =>
    stripVirtualModulePrefix(moduleId).startsWith(VIRTUAL_SAGE_CLIENT_ID)

/** Returns the id Rollup expects for this virtual module (with NUL prefix). */
export const resolveSageClientVirtualId = (moduleId: string): string =>
    `${VIRTUAL_MODULE_NULL_PREFIX}${stripVirtualModulePrefix(moduleId)}`

/**
 * Reads the `page` query param from a virtual client module id
 * (e.g. `virtual:sage-client?page=./src/App.tsx`).
 */
export const getPageParamFromModuleId = (moduleId: string): string | undefined => {
    const withoutNull = stripVirtualModulePrefix(moduleId)
    const queryStart = withoutNull.indexOf("?")
    if (queryStart === INDEX_NOT_FOUND) {
        return undefined
    }
    const queryString = withoutNull.slice(queryStart + QUERY_SEPARATOR_LENGTH)
    const params = new URLSearchParams(queryString)
    return params.get("page") ?? undefined
}
