# AGENTS.md

Inki: Tauri v2 desktop notepad. Frontend is SvelteKit 2 + Svelte 5 runes + Tailwind v4 + shadcn-svelte. All app code and commands live in `inki-app/`; there is no root `package.json`.

## Commands (run from `inki-app/`)

```bash
npm install
npm run dev          # http://localhost:1420 — inki-app/README.md says 5173, it is wrong
npm run check        # svelte-check; currently 0 errors, the type gate
npm test             # vitest run: 8 files / 167 tests, ~2s
npx vitest run src/lib/utils/__tests__/export.test.ts   # one test file
npm run build        # -> build/ (gitignored), Tauri's frontendDist
npm run tauri dev    # desktop shell; requires a Rust toolchain
```

- No lint or formatter. Don't add one; `npm run check` is the gate.
- Vite pins port 1420 with `strictPort: true` because `src-tauri/tauri.conf.json` hardcodes `devUrl`. Don't change one without the other.
- `tauri.conf.json` already runs `npm run dev` / `npm run build` as `before*Command`; don't start a second dev server before `tauri dev`.
- Use npm. `bun.lock` and `package-lock.json` are both committed; don't regenerate or delete either as drive-by cleanup.

## Architecture

- SPA only: `+layout.ts` sets `ssr = false`, `svelte.config.js` uses `adapter-static` with `fallback: "index.html"` (Tauri has no Node server).
- One route: `src/routes/+page.svelte` (two-panel UI). `+layout.svelte` owns global shortcuts, dark mode, and `CommandPalette`.
- Global shortcuts: Ctrl/Cmd+N new note (`+page.svelte`); Ctrl/Cmd+K palette, Ctrl/Cmd+S `flushSave()`, Ctrl/Cmd +/-/0 zoom (`+layout.svelte`).
- State is **module-level `$state` + exported plain functions**, not store objects. Import `getSelectedNote()`, `addNote()`, etc. from `src/lib/stores/*.svelte.ts`.
- `notes.svelte.ts` is the single source of truth: localStorage `inki-notes` (also stores `selectedNoteId`), sanitizes/repairs corrupt payloads on load, and listens to `storage` for multi-window sync.
- Saves are debounced 300 ms. Call `flushSave()` before export, note switch, delete, reorder, or any synchronous write. Tests must advance timers (see `stores/__tests__/test-helpers.ts`).
- `Note.position` is authoritative; `getNotes()` sorts by position, not `updatedAt`. `reorderNote` / `moveNote` / `duplicateNote` renumber all positions.
- Editor is a `contenteditable` div read back via `.innerHTML`; formatting uses `document.execCommand` (deprecated but intentional). There is no `{@html}` in the app.
- `zoom.svelte.ts` is session-only (50–200%, step 10), not persisted. Theming is OKLCH variables in `src/app.css`, toggled by a `dark` class on `document.documentElement`; preference is localStorage `inki-dark-mode`.
- `public/themes/kanagawa.css` is imported by nothing — dead.

## Import conventions

- Stores: `'$lib/stores/notes.svelte.ts'` (literal `.ts`).
- shadcn UI: `'$lib/components/ui/button/index.js'`; utils: `'$lib/utils.js'`.
- All imports use `$lib`. The `@/*` alias in `svelte.config.js` is defined but unused.

## Testing quirks

- Vitest + happy-dom, configured in `vite.config.js` under `test` (there is no separate vitest config).
- Component and store tests **re-implement the logic** instead of importing `.svelte` files or the real store. Green tests do not prove a component or store works; verify UI changes manually.
- `@internationalized/date` is unused in `src/`; it satisfies bits-ui's optional peer dep. Leave it.

## Gotchas

- Drag-to-reorder hit-tests with `document.elementFromPoint(...).closest('.note-card')` and reads `data-note-id`. Removing either breaks reordering silently.
- `src-tauri/tauri.conf.json` is in `.gitignore` but already tracked, so edits still commit. Never unignore signing material (`inki.key`, `*.pfx`, `*.cer`).
- `.github/workflows/main.yml` only runs on `release`, uses Node 12 + `yarn`, and has no `working-directory` despite the manifest being in `inki-app/`. It fails at the repo root; don't assume CI validated a change.
- `.opencode/skills/*` and `.opencode/opencode-swarm.json` are agent workflow files, not app code. `specs/`, `.specify/`, and `.github/skills` are planning/scaffolding artifacts.
- `.svelte-kit/` and `build/` are generated; never edit or grep them as source.

## Release

Push to `release` to trigger the Tauri matrix (macOS/Ubuntu/Windows → draft GitHub release `app-v<version>`). Version comes from `src-tauri/tauri.conf.json`; keep `package.json` in sync.
