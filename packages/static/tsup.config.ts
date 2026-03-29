import { defineConfig } from 'tsup'

export default defineConfig({
    clean: true,
    dts: true,
    entry: [
        'src/index.ts',
        'src/vite.ts',
        'src/components/document.tsx',
    ],
    format: ['esm'],
    sourcemap: true,
    splitting: false,
})