# Source layout (`@sage/static`)

Peta singkat agar mudah navigasi:

| Folder / file | Isi |
|---------------|-----|
| **`index.ts`**, **`vite.ts`**, **`react.ts`** | Entry publik paket (types, plugin Vite, shell React). |
| **`constants.ts`** | Konstanta global (path `ssg.config`, prefix virtual module Vite, dll.). |
| **`plugin/`** | Integrasi **Vite / unplugin / Rollup**: plugin utama, merge `input`, modul virtual hydrate. |
| **`ssg/`** | Alur **static site generation**: load config, render HTML, build file statik, dev middleware, transform `ssg.config.ts`. |
| **`server/`** | Utilitas **HTTP dev** (response HTML, doctype). |
| **`react/`** | Komponen React internal (document shell, helper, types). Dipublikasikan lewat `@sage/static/react`. |
| **`utils/`** | Kecil & reusable: sanitize, log build. |

Alur membaca kode: mulai dari `vite.ts` → `plugin/unplugin.ts` → folder `ssg/` untuk pipeline render/build.
