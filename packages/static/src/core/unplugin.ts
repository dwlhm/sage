import { createUnplugin, type UnpluginFactory } from "unplugin";
import { transformConfig } from "./transform";
import { loadConfig } from "./loader";
import { handleDevRequest } from "./handler";

const unpluginFactory: UnpluginFactory<undefined, false>
    = () => ({
        name: 'sage-static',

        transform(code, id) {
            if (id.includes('ssg.config')) {
                return transformConfig(code)
            }
        },

        vite: {
            async configureServer(server) {
                const config = await loadConfig(server)
                server.middlewares.use(handleDevRequest(server, config))
            }
        }
    })

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)