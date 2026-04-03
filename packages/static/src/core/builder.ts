import { createServer, type ResolvedConfig, type ViteDevServer } from 'vite'
import React from 'react'
import path from 'node:path'
import fs from 'node:fs/promises'
import { loadConfig, loadComponent } from './loader'
import { renderToStatic } from './renderer'
import Document from '../components/document'

interface RenderEntryOptions {
    entry: { _importPath: string; out: string };
    outDir: string;
    root: React.ComponentType<{ children: React.ReactNode }>;
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
    root,
    server,
    outPath,
    clientChunkFileName,
}: RenderEntryOptions & {
    outPath: string;
    clientChunkFileName: string | undefined;
}): Promise<void> => {
    const Component = await loadComponent(server, entry._importPath)
    let html = await renderToStatic(
        React.createElement(
            root || Document,
            undefined,
            React.createElement(Component),
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
        plugins: resolvedConfig.plugins.filter(plugin => plugin.name !== 'sage-static'),
        root: resolvedConfig.root,
        server: { middlewareMode: true },
    })

    try {
        const config = await loadConfig(server)
        const outDir = resolveOutDir(resolvedConfig)

        await Promise.all(
            config.entries.map(async (entry) => {
                const outPath = path.resolve(outDir, entry.out)
                const clientChunkFileName = clientChunkByImportPath?.get(entry._importPath)
                await renderEntry({
                    clientChunkFileName,
                    entry,
                    outDir,
                    outPath,
                    root: config.root,
                    server,
                })
            }),
        )
    } finally {
        await server.close()
    }
}
