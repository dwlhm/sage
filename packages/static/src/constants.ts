/** Vite dev server prefix for resolved module URLs. */
export const VITE_VALID_ID_PREFIX = "/@id/"

/** Vite replaces NUL in `/@id/` URLs so browsers can request virtual modules. */
export const VITE_NULL_BYTE_PLACEHOLDER = "__x00__"

/** Rollup virtual module id prefix (single NUL byte). */
export const VIRTUAL_MODULE_NULL_PREFIX = "\u0000"

export const VIRTUAL_SAGE_CLIENT_ID = "virtual:sage-client"

/** Basename of the SSG config file (must match `SSG_CONFIG_PATH`). */
export const SSG_CONFIG_FILENAME = "ssg.config.ts"

export const SSG_CONFIG_PATH = `./${SSG_CONFIG_FILENAME}` as const
