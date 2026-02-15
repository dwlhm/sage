import { defineConfig } from 'vite'

import { sageStatic } from '@sage/static/vite'

export default defineConfig({
    plugins: [
        sageStatic({
            entry: '/src/entry-sage.tsx',
        }),
    ],
})
