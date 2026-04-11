# `@sage/static`

Plugin **Vite** untuk **static site generation (SSG)** berbasis **React**: setiap entri di `ssg.config.ts` menghasilkan file HTML (prerender) dan chunk modul klien sendiri agar halaman dapat **dihidrasi** setelah dimuat.

## Yang dilakukan library

- Membaca **`./ssg.config.ts`** (nama file tetap) dan mendeteksi halaman lewat `entries[]` (`path`, `out`, `component` sebagai dynamic import).
- **Development**: middleware dev menangkap pathname yang cocok, merender HTML, menyisipkan entry modul virtual untuk hidrasi.
- **Production**: `vite build` menggabungkan input Rollup per halaman, lalu setelah bundle selesai menulis file HTML ke `build.outDir` dengan tag `<script type="module">` ke chunk yang sesuai.

Detail hook, modul virtual, dan perbedaan dev/build ada di [dokumentasi internal](../../docs/INTERNALS.md).

## Instalasi

```bash
pnpm add @sage/static
# peer: react & react-dom (lihat package.json peerDependencies)
```

Di monorepo ini paket dipasang lewat `workspace:*` dari contoh.

## Pemakaian singkat

**1.** Pasang plugin di `vite.config.ts`:

```ts
import { defineConfig } from "vite"
import { sageStaticPlugin } from "@sage/static/vite"

export default defineConfig({
  plugins: [sageStaticPlugin()],
})
```

**2.** Tambahkan `ssg.config.ts` di akar proyek (sejajar dengan `vite.config.ts`):

```ts
export default {
  entries: [
    {
      component: () => import("./src/App"),
      out: "index.html",
      path: "/",
    },
  ],
}
```

Setiap `component` harus `() => import("...")` dengan path string literal agar plugin dapat menyuntikkan metadata modul. Default export modul harus komponen React.

**3.** (Opsional) Navigasi klien antar rute terdaftar:

```ts
import { useRoutes } from "@sage/static/react"
// navigateTo("/about")
```

## Ekspor paket

| Subpath | Isi |
|---------|-----|
| `@sage/static` | Tipe TypeScript: `Config`, `ConfigEntry`. |
| `@sage/static/vite` | `sageStaticPlugin`. |
| `@sage/static/react` | `Root`, `useRoutes` (shell + routing klien). |

## Pengembangan paket ini

```bash
# dari akar monorepo
pnpm --filter @sage/static build   # keluaran: dist/
pnpm --filter @sage/static dev      # tsup --watch
```

Sumber ada di [`src/`](src); peta file singkat: [`src/README.md`](src/README.md).

## Lisensi

ISC.
