export const sanitizeAttrValue = (val: string): string =>
    val.replace(/["'<>&]/g, (c) => ({
        '"': '&quot;',
        '&': '&amp;',
        "'": '&#39;',
        '<': '&lt;',
        '>': '&gt;',
    }[c] ?? c))