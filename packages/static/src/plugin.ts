import { type StaticPluginOptions, configureServer } from './vite/server';
import { type UnpluginFactory, createUnplugin } from "unplugin";

export const unpluginFactory: UnpluginFactory<StaticPluginOptions, any> = (options) => ({
  name: '@sage/static',
  vite: {
    configureServer: (server) => configureServer(server, options),
  },
});

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);
