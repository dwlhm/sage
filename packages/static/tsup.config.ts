import { defineConfig } from 'tsup'

export default defineConfig({
    clean: true,
    dts: true,
    entry: ['src/index.ts', 'src/vite/plugin.ts', 'src/render.tsx'],
    format: ['esm'],
    sourcemap: true,
    splitting: false,
})