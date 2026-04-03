import { defineConfig } from 'tsup'

export default defineConfig({
    clean: true,
    dts: true,
    entry: [
        'src/index.ts',
        'src/vite.ts',
        'src/react.ts',
    ],
    external: ['vite'],
    format: ['esm'],
    sourcemap: true,
    splitting: false,
})