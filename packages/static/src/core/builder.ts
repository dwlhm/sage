import { createServer, type ResolvedConfig, type ViteDevServer } from 'vite'
import React, { ComponentType } from 'react'
import path from 'node:path'
import fs from 'node:fs/promises'
import { loadConfig, loadComponent } from './loader'
import { renderToStatic } from './renderer'
import Document from '../components/document'
import { pageImportToViteRootSpecifier } from './virtual-sage-client'

interface RenderEntryOptions {
    entry: { _importPath: string; out: string };
    outDir: string;
    server: ViteDevServer;
}

const resolveOutDir = (resolvedConfig: ResolvedConfig): string => {
    if (path.isAbsolute(resolvedConfig.build.outDir)) {
        return resolvedConfig.build.outDir
    }
    return path.resolve(resolvedConfig.root, resolvedConfig.build.outDir)
}

const scriptSrcForChunk = (outPath: string, outDir: string, chunkFileName: string): string => {
    const chunkAbs = path.join(outDir, chunkFileName)
    let rel = path.relative(path.dirname(outPath), chunkAbs)
    if (!rel.startsWith('.')) {
        rel = `./${rel}`
    }
    return rel.split(path.sep).join('/')
}

const renderEntry = async ({
    entry,
    outDir,
    server,
    outPath,
    routes,
    clientChunkFileName,
}: RenderEntryOptions & {
    outPath: string;
    routes: Record<string, () => Promise<ComponentType>>;
    clientChunkFileName: string | undefined;
}): Promise<void> => {
    const Component = await loadComponent(server, entry._importPath)
    let html = await renderToStatic(
        React.createElement(
            Document,
            { children: React.createElement(Component), routes }
        ),
    )

    if (clientChunkFileName) {
        const src = scriptSrcForChunk(outPath, outDir, clientChunkFileName)
        html = html.replace(
            '</body>',
            `<script type="module" src="${src}"></script></body>`,
        )
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, html, 'utf8')
}

export const buildPages = async (
    resolvedConfig: ResolvedConfig,
    clientChunkByImportPath?: ReadonlyMap<string, string>,
): Promise<void> => {
    const server = await createServer({
        plugins: resolvedConfig.plugins.map(plugin => {
            if (plugin.name === 'sage-static') {
                return {
                    ...plugin,
                    closeBundle: undefined,
                    config: undefined,
                    configResolved: undefined,
                    configureServer: undefined,
                    generateBundle: undefined,
                }
            }
            return plugin
        }),
        root: resolvedConfig.root,
        server: { middlewareMode: true },
    })

    try {
        const config = await loadConfig(server)
        const outDir = resolveOutDir(resolvedConfig)

        const routes = config.entries.reduce((acc, entry) => {
            acc[entry.path] = () => import(pageImportToViteRootSpecifier(entry._importPath))
            return acc
        }, {} as Record<string, () => Promise<ComponentType>>)

        await Promise.all(
            config.entries.map(async (entry) => {
                const outPath = path.resolve(outDir, entry.out)
                const clientChunkFileName = clientChunkByImportPath?.get(entry._importPath)
                await renderEntry({
                    clientChunkFileName,
                    entry,
                    outDir,
                    outPath,
                    routes,
                    server,
                })
            }),
        )
    } finally {
        await server.close()
    }
}
