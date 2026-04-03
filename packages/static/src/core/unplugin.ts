import { createUnplugin, type UnpluginFactory } from "unplugin";
import type { ResolvedConfig } from "vite";
import { transformConfig } from "./transform";
import { loadClient, loadConfig } from "./loader";
import { handleDevRequest } from "./handler";
import { buildPages } from "./builder";

const unpluginFactory: UnpluginFactory<undefined, false>
    = () => {
        let resolvedConfig: ResolvedConfig = undefined as unknown as ResolvedConfig

        return {
            load(id) {
                if (id.includes('virtual:sage-client')) {
                    return loadClient(id)
                }
            },

            name: 'sage-static',

            resolveId(id) {
                if (id.startsWith('virtual:sage-client')) {
                    return `\0${id}`
                }
            },

            transform(code, id) {
                if (id.includes('ssg.config')) {
                    return transformConfig(code)
                }
            },

            vite: {
                async closeBundle() {
                    if (resolvedConfig.command === 'build') {
                        console.log('\n🌿 sage-static: Generating static pages...')
                        await buildPages(resolvedConfig)
                        console.log('🌿 sage-static: Done!\n')
                    }
                },

                configResolved(config) {
                    resolvedConfig = config
                },

                async configureServer(server) {
                    const config = await loadConfig(server)
                    server.middlewares.use(handleDevRequest(server, config))
                },
            },
        }
    }

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)