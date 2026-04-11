# Arsitektur internal `@sage/static`

Dokumen ini menjelaskan **bagaimana library dijalankan di dalam Vite**: hook mana yang terpasang, urutan eksekusi, sumber data, dan kontrak antar modul. Untuk pemetaan file singkat di `src/`, lihat juga `packages/static/src/README.md`.

---

## 1. Peran paket

`@sage/static` memakai **unplugin** sebagai inti, diekspos ke Vite sebagai `sageStaticPlugin()` (`packages/static/src/vite.ts` → `plugin/unplugin.ts`).

Perilaku tingkat tinggi:

- **Dev**: middleware HTTP menangkap request yang `pathname`-nya sama persis dengan salah satu `entry.path` di `./ssg.config.ts`, merender React ke string HTML (prerender), menyisipkan entry script ke modul virtual, lalu mengirim respons.
- **Build**: Rollup mendapat **satu input tambahan per entry SSG** (modul virtual klien). Setelah bundle utama selesai, hook `closeBundle` menjalankan **`buildPages`**: SSR tiap entry ke file HTML di `build.outDir`, dengan `<script type="module">` mengarah ke chunk Rollup yang sesuai.

Konfigurasi sumber kebenaran untuk daftar halaman: modul **`./ssg.config.ts`** (konstanta `SSG_CONFIG_PATH` di `constants.ts`). Nama file ini **hard-coded**.

---

## 2. Permukaan publik (ringkas)

| Import | Isi |
|--------|-----|
| `@sage/static` | Tipe `Config`, `ConfigEntry` saja (`index.ts`). |
| `@sage/static/vite` | `sageStaticPlugin`. |
| `@sage/static/react` | `Root` (default export `document.tsx`) dan `useRoutes` — dipakai kode aplikasi yang perlu navigasi klien antar `path` terdaftar. |

Artefak build library: `tsup` → `dist/*` (`tsup.config.ts`).

---

## 3. Bentuk config runtime dan injeksi `_importPath`

Tipe `ConfigEntry` (`ssg/types.ts`) menyertakan `_importPath: string` yang **tidak ditulis manual** di sumber `ssg.config.ts`. Nilai itu disuntikkan oleh **`transformConfig`** (`ssg/transform.ts`) pada fase `transform` plugin: untuk setiap substring yang cocok `IMPORT_PATH_REGEX` (`ssg/matcher.ts`), yaitu pola `import("...")` / `import('...')` / template literal, plugin menambahkan properti sibling:

```text
, _importPath: "<path literal>"
```

**Alasan:** entry menyimpan `component: () => import("./foo")`. Saat runtime, path modul tidak tersedia sebagai nilai terpisah tanpa introspeksi; injeksi sumber menjaga path sebagai string literal ter-escape (`JSON.stringify` di replacement) sehingga `loadConfig` bisa memvalidasi dan memakai `entry._importPath` untuk `ssrLoadModule` dan untuk query modul virtual.

**Kontrak penulis config:** `component` harus berupa dynamic import dengan path literal yang bisa ditangkap regex; penyusunan lain dapat lolos TypeScript tetapi gagal validasi atau kehilangan `_importPath`.

`loadConfig` (`ssg/loader.ts`) memuat modul default object, memastikan `entries` array, dan memvalidasi tiap entry (`path` absolut, `out` non-kosong, `component` fungsi, `_importPath` string non-kosong).

---

## 4. Plugin unplugin: state dan hook

Factory di `plugin/unplugin.ts` mengembalikan objek plugin dengan closure:

- `resolvedConfig`: `ResolvedConfig` Vite setelah `configResolved`.
- `clientChunkByImportPath`: `Map<string, string>` — kunci `_importPath` entry, nilai nama file chunk Rollup untuk build.
- `activeConfig`: `Config` terakhir yang dimuat (untuk `load` modul virtual di dev).

### 4.1 `resolveId` / `load`

- Jika id adalah modul klien Sage (`isSageClientVirtualModule` → `virtual-module.ts`), `resolveId` menormalisasi id dengan prefix NUL (`\0`) yang diharapkan Rollup/Vite (`resolveSageClientVirtualId`).
- `load` memanggil `loadDevClient(moduleId, activeConfig)` yang mengembalikan **string sumber** entry klien: impor `Root` dari `@sage/static/react`, bangun objek `routes` dari `config.entries`, dynamic import halaman saat ini dari query `page`, lalu `hydrateRoot(document, ...)`.

Query `page` berisi `_importPath` mentah; di HTML dev, nilai disanitasi untuk aman di atribut (`sanitizeAttrValue` di `renderer.ts`).

### 4.2 `transform`

Hanya untuk modul yang `isSsgConfigModuleId` benar (path berakhiran `ssg.config.ts`, abaikan query): jalankan `transformConfig`.

### 4.3 Hook khusus Vite

| Hook | Fungsi |
|------|--------|
| `config` | Memanggil `mergeSsgBuildRollupInput` (`plugin/rollup.ts`) **hanya jika** `env.command === "build"` dan guard rekursi `loadingGuard.current` false. Menggabungkan `rollupOptions.input` pengguna dengan input virtual per entry. Callback `onConfigLoaded` mengisi `activeConfig`. |
| `configResolved` | Menyimpan `resolvedConfig`. |
| `configureServer` | `loadConfig(server)` → set `activeConfig` → `server.middlewares.use(handleDevRequest(server, ssgConfig))`. |
| `generateBundle` | Untiap chunk bertipe `chunk` dengan `facadeModuleId`, jika id tersebut punya param halaman (`getPageParamFromModuleId`), catat `clientChunkByImportPath.set(page, chunk.fileName)`. |
| `closeBundle` | Jika `resolvedConfig.command === "build"`, panggil `buildPages(resolvedConfig, clientChunkByImportPath)`. |

Nama plugin: `sage-static` — dipakai `buildPages` untuk **menghapus** hook-hok plugin ini pada salinan plugin saat membuat server sekunder (hindari SSG ganda / side effect).

---

## 5. Penggabungan Rollup `input` saat build

`mergeSsgBuildRollupInput` (`plugin/rollup.ts`):

1. **Guard rekursi** `loadingSsgRollupInput`: saat merge sedang berjalan, `resolveConfig` / `createServer` internal tidak boleh memicu merge bersarang; hook mengembalikan `{}`.

2. **`loadSsgConfigFromBuildContext`**: `resolveConfig({ root }, "build")`, lalu `createServer` middleware-mode dengan **plugin yang sama** seperti konteks build, `loadConfig(server)`, lalu `server.close()`. Ini memastikan transform `ssg.config.ts` dan pipeline TypeScript konsisten dengan build sungguhan.

3. **`buildVirtualClientRollupInputs`**: untuk tiap entry, key stabil `sage-client-<sanitized out>` → nilai string id virtual `\0virtual:sage-client?page=<entry._importPath>`.

4. **`mergeRollupInputWithSsgClients`**: jika user tidak mengatur `input`, dan ada `index.html` di root proyek, tambahkan sebagai `index` (perilaku Vite umum). Lalu **assign** input virtual SSG (objek user / string / array dinormalisasi ke record string).

Hasil akhir: Rollup mem-build chunk klien terpisah per halaman; `facadeModuleId` pada chunk mengarah ke modul virtual sehingga `generateBundle` bisa memetakan `_importPath` → `chunk.fileName`.

---

## 6. Alur development server

1. Request masuk middleware `handleDevRequest` (`ssg/handler.ts`).
2. `normalizeRequestPathname` membuang query dan hash.
3. `findEntry(entries, pathname)` (`ssg/resolver.ts`): pencocokan **persis** `entry.path === pathname` (tanpa routing bertingkat).
4. `renderDevPage` (`ssg/renderer.ts`):
   - `loadComponent(server, importPath)` → `ssrLoadModule`, `default` harus komponen.
   - Tree: `createElement(Document, undefined, createElement(Component))` — perhatikan di dev **`routes` tidak** disalurkan ke `Document` di cabang ini (beda dengan build; lihat bagian 7).
   - `renderToStatic`: `react-dom/static` `prerenderToNodeStream`, kumpulkan prelude ke string.
   - `server.transformIndexHtml(pagePath, html)` untuk integrasi transform HTML Vite.
   - Sisip `<script type="module" src="<toViteDevModuleUrl(...)>"` sebelum `</body>`; src menunjuk modul virtual klien dengan query `page` = import path.

5. `sendHtml` (`server/response.ts`): header, DOCTYPE jika belum ada.

**Catatan konsistensi:** Di `renderDevPage`, `Document` dipanggil tanpa prop `routes`; navigasi `useRoutes` di klien mengandalkan `Root` di dalam kode yang dihasilkan `loadDevClient`, yang **memang** meneruskan `routes`. Artinya shell SSR dev tidak membungkus `RoutesProvider` dengan routes yang sama seperti klien — perilaku tepi yang perlu diingat jika memperluas `Document` untuk dev/build parity.

---

## 7. Alur `buildPages`

`buildPages` (`ssg/builder.ts`):

1. `createServer` middleware-mode, `root` sama dengan proyek, plugin disalin tetapi entri bernama `sage-static` di-**strip** field `closeBundle`, `config`, `configResolved`, `configureServer`, `generateBundle` agar tidak rekursi.

2. `loadConfig(server)` lagi di server ini.

3. Bangun `routes: Record<string, () => Promise<ComponentType>>` dengan `entry.path` → `import(transformImportPath(entry._importPath))`. `transformImportPath` mengubah path relatif `./x` menjadi `/x` agar konsisten dengan resolusi Vite untuk import di konteks virtual/build.

4. Untuk tiap entry: `loadComponent`, lalu render:

   ```ts
   React.createElement(Document, { routes }, React.createElement(Component))
   ```

   Jadi di **build**, `Document` menerima **`routes`** (tidak seperti dev di `renderDevPage` saat ini).

5. Jika ada `clientChunkFileName` dari map `clientChunkByImportPath`, hitung path relatif dari direktori file HTML output ke file chunk di `outDir` (`scriptSrcForChunk`), sisipkan tag script sebelum `</body>`.

6. Tulis file ke `path.resolve(outDir, entry.out)` dengan `ensureHtmlDocument`.

---

## 8. Modul virtual dan id

- **Prefix NUL** (`\0`): konvensi Rollup agar id tidak bentrok dengan path disk; Vite memetakan ke URL dev dengan placeholder `__x00__` (`constants.ts`, `toViteDevModuleUrl`).

- **Id logis:** `virtual:sage-client` + query `page=<_importPath>`.

- **`getPageParamFromModuleId`**: parse query setelah strip prefix NUL, ambil `page`.

---

## 9. Lapisan React internal

- **`react/document.tsx`**: default export (diekspos sebagai `Root`) — struktur `<html lang>`, `<head>`, `<body>`, `RoutesProvider` dengan `routes`, children = komponen halaman. Menyediakan `useRoutes` / `navigateTo` (dynamic import + `history.pushState` + `setState` untuk subtree aktif) dan `popstate`.

- **`react/helper.ts`**: re-export `createElement` untuk renderer (hindari bundling ganda / konsistensi).

- **`react/client.tsx`**: `Client` + `hydrateRoot` ke `document.body` — tidak dipakai oleh string yang dihasilkan `loadDevClient` saat ini (yang memakai `hydrateRoot(document, ...)` langsung).

---

## 10. Batasan perilaku (impl implementasi)

- Routing URL: hanya equality string pada pathname; tidak ada glob, parameter, atau normalisasi trailing slash.
- `ssg.config.ts` harus dapat di-transform oleh regex `import(\s*['"\`...\`])`; pola kompleks atau path terhitung dinamis tidak didukung.
- `Config.root` di tipe ada tetapi **belum** terhubung ke pipeline render — shell tetap komponen `Document` internal.
- Paritas dev/build untuk prop `routes` pada `Document` di SSR seperti dijelaskan di atas.

---

## 11. Verifikasi di kode

Tes unit di `packages/static/src` (mis. `resolver.test.ts`, `transform.test.ts`, `matcher.test.ts`, `response.test.ts`) mengunci kontrak fungsi murni. Perubahan perilaku sebaiknya diiringi pembaruan tes tersebut.

---

Sumber kebenaran tetap **implementasi** di `packages/static/src` dan `package.json` `exports`. Dokumen ini dapat menyimpang jika kode berubah tanpa pembaruan teks ini.
