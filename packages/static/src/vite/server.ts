import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IUserOptions } from '../define';
import { factory } from '../factory';
import type { TRenderToStatic } from '../render';
import type { ViteDevServer } from 'vite';
import { createStaticMiddleware } from './middleware';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StaticPluginOptions {
    entry: string;
}

export const loadStaticModule = async (server: ViteDevServer) => {
    const renderModulePath = resolve(__dirname, '../render');
    const staticModule = await server.ssrLoadModule(renderModulePath);
    return staticModule.default as TRenderToStatic;
};

export const loadUserOptions = async (server: ViteDevServer, entryPath: string) => {
    const userModule = await server.ssrLoadModule(entryPath);
    const userFn = userModule.default;
    if (typeof userFn !== 'function') {
        throw new Error(`The entry file "${entryPath}" must export a default function.`);
    }
    let userOptions = userFn();
    if (userOptions.static) {
        userOptions = userOptions.static;
    }
    return userOptions as IUserOptions;
};

export const configureServer = async (server: ViteDevServer, options: StaticPluginOptions) => {
    try {
        const staticFn = await loadStaticModule(server);
        const userOptions = await loadUserOptions(server, options.entry);

        const staticFactory = factory({
            render: staticFn,
            userOptions,
        });

        server.middlewares.use(createStaticMiddleware(staticFactory));
    } catch (error) {
        server.config.logger.error(
            `[@sage/static] Failed to initialize plugin: ${(error as Error).message}`,
            { error: error as Error }
        );
    }
};
