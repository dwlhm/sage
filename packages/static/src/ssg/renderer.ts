import { prerenderToNodeStream } from "react-dom/static"
import type { ViteDevServer } from "vite"
import type { ServerResponse } from "node:http"
import { loadComponent } from "./loader"
import { createElement } from "../react/helper"
import type { Node } from "../react/types"
import Document from "../react/document"
import { sanitizeAttrValue } from "../utils/sanitize"
import { sendHtml } from "../server/response"
import { toViteDevModuleUrl } from "./transform"
import { VIRTUAL_MODULE_NULL_PREFIX, VIRTUAL_SAGE_CLIENT_ID } from "../constants"

export type TRenderToStatic = (children: Node) => Promise<string>

export const renderToStatic: TRenderToStatic = async (children: Node) => new Promise((resolve, reject) => {
    prerenderToNodeStream(children).then(({ prelude }) => {
        let data = ""
        prelude.setEncoding("utf8")
        prelude.on("data", (chunk) => {
            data += chunk
        })
        prelude.on("end", () => resolve(data))
        prelude.on("error", reject)
    }).catch(reject)
})

interface RenderPage {
    server: ViteDevServer
    importPath: string
    pagePath: string
    res: ServerResponse
}

export const renderDevPage = async ({
    server,
    importPath,
    pagePath,
    res,
}: RenderPage): Promise<void> => {
    const Component = await loadComponent(server, importPath)
    const html = await renderToStatic(createElement(Document, undefined, createElement(Component)))
    const transformedHtml = await server.transformIndexHtml(pagePath, html)

    const resolvedClientId = `${VIRTUAL_MODULE_NULL_PREFIX}${VIRTUAL_SAGE_CLIENT_ID}?page=${sanitizeAttrValue(importPath)}`
    const clientEntry = toViteDevModuleUrl(resolvedClientId)

    const htmlWithScript = transformedHtml.replace(
        "</body>",
        `<script type="module" src="${clientEntry}"></script></body>`,
    )

    sendHtml(res, htmlWithScript)
}
