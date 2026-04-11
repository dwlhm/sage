# Contoh `simple`

Aplikasi **Vite + React** yang memakai **`@sage/static`** dari workspace: dua halaman statis (`/` dan `/about`), konfigurasi SSG terpusat, dan navigasi klien lewat `useRoutes`.

## Yang diperlihatkan

- [`vite.config.ts`](vite.config.ts) — `sageStaticPlugin()` sebagai satu-satunya plugin.
- [`ssg.config.ts`](ssg.config.ts) — `entries`: `path` URL, `out` relatif ke `dist`, `component` sebagai dynamic import.
- [`src/app.tsx`](src/app.tsx) — state lokal + tombol ke `/about` memakai `navigateTo`.
- [`src/About.tsx`](src/About.tsx) — halaman kedua.

`index.html` di root tetap ada agar pola input Rollup Vite default tetap valid; halaman SSG dilayani middleware (dev) dan generator (build), bukan dari isi `#root` di HTML itu saja.

## Menjalankan

Dari **akar repositori** (setelah `pnpm install`):

```bash
pnpm --filter @sage/static build   # pertama kali / setelah ubah library
pnpm --filter simple dev
```

Atau dari folder ini:

```bash
pnpm dev
```

Build produksi:

```bash
pnpm build
```

Keluaran HTML dan aset ada di `dist/`, struktur file HTML mengikuti `out` di `ssg.config.ts`.

## Lisensi

ISC (paket private contoh).
