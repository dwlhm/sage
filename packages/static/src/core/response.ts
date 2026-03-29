import type { ServerResponse } from 'node:http'

const HTTP_OK = 200

/**
 * Sends an HTML response with proper Content-Type header and DOCTYPE prefix.
 *
 * @param res    - Node.js ServerResponse
 * @param html   - HTML string (without DOCTYPE)
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendHtml = (res: ServerResponse, html: string, statusCode = HTTP_OK): void => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.statusCode = statusCode
    res.end(`<!DOCTYPE html>${html}`)
}

