import { describe, expect, it } from 'vitest'
import { findEntry } from './resolver'
import type { ConfigEntry } from './type'

const entries: ConfigEntry[] = [
    { component: () => Promise.resolve({}), _importPath: './src/app', out: 'index.html', path: '/' },
    { component: () => Promise.resolve({}), _importPath: './src/about', out: 'about/index.html', path: '/about' },
    { component: () => Promise.resolve({}), _importPath: './src/contact', out: 'contact/index.html', path: '/contact' },
]

describe('findEntry', () => {
    it('should find an entry by exact path match', () => {
        const result = findEntry(entries, '/')
        expect(result?.path).toBe('/')
        expect(result?._importPath).toBe('./src/app')
    })

    it('should find a nested path', () => {
        const result = findEntry(entries, '/about')
        expect(result?.path).toBe('/about')
        expect(result?._importPath).toBe('./src/about')
    })

    it('should return undefined when no match found', () => {
        const result = findEntry(entries, '/nonexistent')
        expect(result).toBeUndefined()
    })

    it('should return undefined for empty entries array', () => {
        const result = findEntry([], '/about')
        expect(result).toBeUndefined()
    })
})
