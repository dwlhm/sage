import { createUnplugin, type UnpluginFactory } from "unplugin";
import type { ResolvedConfig } from "vite";
import { logSageStaticBuildDone, logSageStaticBuildStart } from "./build-log";
import { buildPages } from "./builder";
import { handleDevRequest } from "./handler";
import { loadClient, loadConfig } from "./loader";
import { mergeSsgBuildRollupInput } from "./ssg-rollup-input";
import { transformConfig } from "./transform";
import {
    getPageParamFromModuleId,
    isSageClientVirtualModule,
    resolveSageClientVirtualId,
} from "./virtual-sage-client";

/** Prevents infinite recursion when `mergeSsgBuildRollupInput` calls `resolveConfig` / `createServer`. */
const loadingSsgRollupInput = { current: false }

const unpluginFactory: UnpluginFactory<undefined, false>
    = () => {
        let resolvedConfig: ResolvedConfig = undefined as unknown as ResolvedConfig
        const clientChunkByImportPath = new Map<string, string>()

        return {
            load(moduleId) {
                if (isSageClientVirtualModule(moduleId)) {
                    return loadClient(moduleId)
                }
            },

            name: "sage-static",

            resolveId(moduleId) {
                if (isSageClientVirtualModule(moduleId)) {
                    return resolveSageClientVirtualId(moduleId)
                }
            },

            transform(code, moduleId) {
                if (moduleId.includes("ssg.config")) {
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
                    return mergeSsgBuildRollupInput(userConfig, env, loadingSsgRollupInput)
                },

                configResolved(config) {
                    resolvedConfig = config
                },

                async configureServer(server) {
                    const ssgConfig = await loadConfig(server)
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
