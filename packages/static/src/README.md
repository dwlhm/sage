# Layout sumber `packages/static/src`

Ringkasan modul untuk navigasi kode. Gambaran pipeline lengkap: [README paket](../README.md) dan [arsitektur internal](../../../docs/INTERNALS.md).

| Folder / file | Peran |
|---------------|--------|
| `index.ts`, `vite.ts`, `react.ts` | Entry publik: tipe, adapter Vite (`sageStaticPlugin`), ekspor React (`Root`, `useRoutes`). |
| `constants.ts` | Path `ssg.config`, id modul virtual, prefix `/@id/` Vite. |
| `plugin/` | Unplugin + Rollup: merge `input`, resolve/load modul virtual hydrate, transform `ssg.config.ts`. |
| `ssg/` | Pipeline SSG: load/validasi config, matcher/transform path, resolver pathname, handler dev, renderer prerender, builder tulis HTML. |
| `server/` | Respons HTTP dev (DOCTYPE, `Content-Type`, kirim HTML). |
| `react/` | Shell dokumen, provider rute, helper; dipublikasikan lewat `@sage/static/react`. |
| `utils/` | Sanitasi atribut HTML, log build. |

Urutan baca yang disarankan: `vite.ts` → `plugin/unplugin.ts` → `ssg/builder.ts` / `ssg/handler.ts` + `ssg/renderer.ts`.
