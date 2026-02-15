# @sage/static

Generate static HTML from your React application using Vite.

## Installation

```bash
pnpm add @sage/static
```

## Usage

### 1. Define your entry point

Create a file (e.g., `src/main.tsx`) that defines your application using `defineStatic`.

```typescript
// src/main.tsx
import { defineStatic } from '@sage/static'
import App from './App'

export default defineStatic({
  app: App,
})
```

### 2. Configure Vite

Add the `sageStatic` plugin to your `vite.config.ts`.

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { sageStatic } from '@sage/static/vite'

export default defineConfig({
  plugins: [
    sageStatic({
      entry: './src/dist/main.js' // Path to your built entry file or source if supported
    })
  ]
})
```

## API Reference

### `defineStatic(options)`

Helper function to define the static application configuration.

**Options:**

- `app` (React.ElementType): The root React component of your application.
- `foo` (string): Example configuration string.

**Returns:** `IUserOptions`

### Vite Plugin

Import from `@sage/static/vite`.

**Options:**

- `entry` (string): Path to the entry file that exports the `defineStatic` configuration.
