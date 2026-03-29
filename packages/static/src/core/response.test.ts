import { describe, expect, it, vi } from 'vitest'
import { sendHtml } from './response'

const createMockResponse = () => ({
    end: vi.fn(),
    setHeader: vi.fn(),
    statusCode: 0,
})

describe('sendHtml', () => {
    it('should set Content-Type header to text/html', () => {
        const res = createMockResponse()
        sendHtml(res as any, '<html></html>')

        expect(res.setHeader).toHaveBeenCalledWith(
            'Content-Type',
            'text/html; charset=utf-8'
        )
    })

    it('should prepend <!DOCTYPE html> to the response body', () => {
        const res = createMockResponse()
        sendHtml(res as any, '<html><body>Hello</body></html>')

        expect(res.end).toHaveBeenCalledWith(
            '<!DOCTYPE html><html><body>Hello</body></html>'
        )
    })

    it('should default to status code 200', () => {
        const res = createMockResponse()
        sendHtml(res as any, '<html></html>')

        expect(res.statusCode).toBe(200)
    })

    it('should allow custom status codes', () => {
        const res = createMockResponse()
        sendHtml(res as any, '<html>Not Found</html>', 404)

        expect(res.statusCode).toBe(404)
    })

    it('should handle empty HTML string', () => {
        const res = createMockResponse()
        sendHtml(res as any, '')

        expect(res.end).toHaveBeenCalledWith('<!DOCTYPE html>')
    })
})
