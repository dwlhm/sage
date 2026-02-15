// oxlint-disable sort-imports
import { describe, expect, it, vi } from 'vitest';
import { unpluginFactory } from './plugin';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
}));

vi.mock('node:url', () => ({
    fileURLToPath: (url: string) => url,
}));

// Mock bundle exports
vi.mock('./render.tsx', () => ({ default: vi.fn(() => 'rendered html') }));
vi.mock('./render.js', () => ({ default: vi.fn(() => 'rendered html') }));

describe('unpluginFactory', () => {
    it('should be a function', () => {
        expect(typeof unpluginFactory).toBe('function');
    });

    it('should return a plugin object', () => {
        const plugin = unpluginFactory({ entry: 'src/main.tsx' }, { framework: 'vite' });
        expect(plugin).toHaveProperty('name', '@sage/static');
        expect(plugin).toHaveProperty('vite');
    });

    it('should have a configureServer hook', () => {
        const plugin = unpluginFactory({ entry: 'src/main.tsx' }, { framework: 'vite' });
        // @ts-ignore - we know vite exists on the plugin for this test
        const vitePlugin = plugin.vite;
        expect(vitePlugin).toHaveProperty('configureServer');
        expect(typeof vitePlugin.configureServer).toBe('function');
    });
});
