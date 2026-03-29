import { defineConfig } from 'vite'

import { sageStaticPlugin } from '@sage/static/vite'


export default defineConfig({
    plugins: [
        sageStaticPlugin()
    ],
})
