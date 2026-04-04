import { createUnplugin, type UnpluginFactory } from "unplugin"
import type { ResolvedConfig } from "vite"
import { logSageStaticBuildDone, logSageStaticBuildStart } from "../utils/build-log"
import { buildPages } from "../ssg/builder"
import { handleDevRequest } from "../ssg/handler"
import { loadConfig, loadDevClient } from "../ssg/loader"
import { mergeSsgBuildRollupInput } from "./rollup"
import { isSsgConfigModuleId, transformConfig } from "../ssg/transform"
import type { Config } from "../ssg/types"
import {
    getPageParamFromModuleId,
    isSageClientVirtualModule,
    resolveSageClientVirtualId,
} from "./virtual-module"

/** Prevents infinite recursion when `mergeSsgBuildRollupInput` calls `resolveConfig` / `createServer`. */
const loadingSsgRollupInput = { current: false }

const unpluginFactory: UnpluginFactory<undefined, false> = () => {
    let resolvedConfig = undefined as unknown as ResolvedConfig
    const clientChunkByImportPath = new Map<string, string>()
    let activeConfig: Config | undefined

    return {
        load(moduleId) {
            if (isSageClientVirtualModule(moduleId)) {
                return loadDevClient(moduleId, activeConfig)
            }
        },

        name: "sage-static",

        resolveId(moduleId) {
            if (isSageClientVirtualModule(moduleId)) {
                return resolveSageClientVirtualId(moduleId)
            }
        },

        transform(code, moduleId) {
            if (isSsgConfigModuleId(moduleId)) {
                return transformConfig(code)
            }
        },

        vite: {
            async closeBundle() {
                if (resolvedConfig.command === "build") {
                    logSageStaticBuildStart()
                    await buildPages(resolvedConfig, clientChunkByImportPath)
                    logSageStaticBuildDone()
                }
            },

            config(userConfig, env) {
                return mergeSsgBuildRollupInput({
                    config: userConfig,
                    env,
                    loadingGuard: loadingSsgRollupInput,
                    onConfigLoaded: (config) => {
                        activeConfig = config
                    },
                })
            },

            configResolved(config) {
                resolvedConfig = config
            },

            async configureServer(server) {
                const ssgConfig = await loadConfig(server)
                activeConfig = ssgConfig
                server.middlewares.use(handleDevRequest(server, ssgConfig))
            },

            generateBundle(_options, bundle) {
                for (const chunk of Object.values(bundle)) {
                    if (chunk.type === "chunk" && chunk.facadeModuleId) {
                        const page = getPageParamFromModuleId(chunk.facadeModuleId)
                        if (page) {
                            clientChunkByImportPath.set(page, chunk.fileName)
                        }
                    }
                }
            },
        },
    }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)
