# sage-gh

Monorepo **pnpm** untuk **`@sage/static`**: plugin Vite yang merender komponen React menjadi HTML statis dan menghidrasinya di browser. Cocok untuk situs multi-halaman dengan satu bundel klien per rute.

## Isi workspace

| Path | Deskripsi |
|------|-----------|
| [`packages/static`](packages/static) | Library npm `@sage/static` (plugin Vite + util React). |
| [`examples/simple`](examples/simple) | Aplikasi contoh minimal: dua rute, `ssg.config.ts`, dan `sageStaticPlugin()`. |

Dokumentasi arsitektur internal: [`docs/INTERNALS.md`](docs/INTERNALS.md).

## Prasyarat

- [Node.js](https://nodejs.org/) (versi yang didukung toolchain Anda)
- [pnpm](https://pnpm.io/) **10.17.1** (sesuai `packageManager` di `package.json`)

## Mulai cepat

```bash
pnpm install
pnpm --filter @sage/static build
pnpm --filter simple dev
```

Buka URL yang ada di `path` pada [`examples/simple/ssg.config.ts`](examples/simple/ssg.config.ts) (misalnya `/` dan `/about`). Build statis contoh: `pnpm --filter simple build` — HTML keluar di `examples/simple/dist` mengikuti field `out` tiap entry.

## Skrip di root

| Skrip | Fungsi |
|-------|--------|
| `pnpm lint` | Menjalankan Oxlint di seluruh workspace. |
| `pnpm lint:fix` | Sama, dengan perbaikan otomatis. |

Tes dan build per-paket dijalankan dari paket masing-masing (lihat README di `packages/static` dan `examples/simple`).

## Lisensi

ISC (lihat `package.json`).
