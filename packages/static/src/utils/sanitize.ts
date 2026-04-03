/**
 * Sanitize a string for use as an HTML attribute value.
 * Replaces special characters with their HTML entities.
 * @param val The string to sanitize.
 * @returns The sanitized string.
 */
export const sanitizeAttrValue = (val: string): string =>
    val.replace(/["'<>&]/g, (char) => ({
        '"': '&quot;',
        '&': '&amp;',
        "'": '&#39;',
        '<': '&lt;',
        '>': '&gt;',
    }[char] ?? char))