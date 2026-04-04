import type { ServerResponse } from "node:http"

const HTTP_OK = 200

export const HTML_DOCTYPE = "<!DOCTYPE html>"

/**
 * Ensures HTML has a doctype (avoids quirks mode) without duplicating if already present.
 */
export const ensureHtmlDocument = (html: string): string => {
    const trimmed = html.trimStart()
    if (/^<!doctype\b/i.test(trimmed)) {
        return html
    }
    return `${HTML_DOCTYPE}${html}`
}

/**
 * Sends an HTML response with proper Content-Type header and DOCTYPE prefix.
 *
 * @param res    - Node.js ServerResponse
 * @param html   - HTML string (fragment starting at `<html>` or full document)
 * @param statusCode - HTTP status code (default: 200)
 */
export const sendHtml = (res: ServerResponse, html: string, statusCode = HTTP_OK): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.statusCode = statusCode
    res.end(ensureHtmlDocument(html))
}
