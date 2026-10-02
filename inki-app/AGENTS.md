# AGENTS.md

Notepad desktop app: Tauri v2 shell + SvelteKit 2 / Svelte 5 (runes) + Tailwind v4 + shadcn-svelte.

## Layout

- **There is no package.json at the repo root.** Every command runs from `inki-app/`.
- `.opencode/skills/*` and `opencode-swarm.json` are agent workflow definitions, not app code. Don't edit them when changing the app.
- `inki-app/.specify/` and `inki-app/.github/` are untracked local scaffolding — ignore them.

## Commands

```bash
cd inki-app
npm install
npm run dev            # http://localhost:1420 (NOT 5173; README is wrong)
npm run check          # the only quality gate
npm run build          # -> inki-app/build/ (gitignored), consumed by Tauri as frontendDist
npm run tauri dev      # desktop shell; needs a Rust toolchain
```

- Vite pins **port 1420 with `strictPort: true`** because `src-tauri/tauri.conf.json` hardcodes `devUrl: http://localhost:1420`. Changing the port in `vite.config.js` alone silently breaks `tauri dev`.
- `tauri.conf.json` runs `npm run dev` / `npm run build` itself as `before*Command`. Don't start a second dev server before `tauri dev`.
- No lint or formatter is configured. Don't add/assume one; `npm run check` is the gate.

## Verification

- `npm run check` (`svelte-check`) is **already red on `main`: 12 errors, all inside `src/**/__tests__/*.test.ts`** (unresolved `bun:test`, happy-dom vs DOM type conflicts). App source is clean. Treat that count as the baseline — only investigate errors outside `__tests__`.
- Tests use `bun:test` but there is **no `test` script and no runner installed**. Run with `bun test` only if bun is available; otherwise the tests are reference material, not a gate.
- The tests **copy-paste component logic instead of importing the `.svelte` files**, so they do not catch regressions in the real components. Don't treat green tests as proof a component works.

## Architecture notes

- One route only (`src/routes/+page.svelte`). `+layout.ts` sets `ssr = false` and `svelte.config.js` uses `adapter-static` with `fallback: "index.html"` (SPA mode, required for Tauri's lack of a Node server).
- State lives in `src/lib/stores/*.svelte.ts` as **module-level `$state` + exported plain functions**, not as store objects. Import them as functions: `getSelectedNote()`, `addNote()`, etc. There is no reactive `selectedNote` export.
- `notes.svelte.ts` is the single source of truth. Persisted to `localStorage` under `inki-notes`; dark mode under `inki-dark-mode`. `loadFromLocalStorage()` runs at module init, `saveToLocalStorage()` after every mutation.
- `Note` has a `position` field; `getNotes()` sorts by `position` ascending, **not** by `updatedAt`. `reorderNote` / `moveNote` / `duplicateNote` renumber every position.
- The editor is a `contenteditable` div whose HTML is read back via `.innerHTML`; formatting uses `document.execCommand` (deprecated but intentional). There is no `{@html}` anywhere — content is never rendered as Svelte markup.
- Theming is OKLCH CSS variables in `src/app.css`, toggled by a `dark` class on `document.documentElement`. `public/themes/kanagawa.css` is **not imported by anything** — it's dead.

## Conventions that differ from the SvelteKit default

- Store imports include the literal `.ts` extension: `'$lib/stores/notes.svelte.ts'`. shadcn `ui/` imports end in `index.js`: `'$lib/components/ui/button/index.js'`. Match whichever module you're importing from.
- The `@/*` alias in `svelte.config.js` is defined but unused; all imports use `$lib`.
- `@internationalized/date` is in devDependencies but imported nowhere in `src/` — it satisfies bits-ui's *optional* peer dep. Leave it as-is; don't move or remove it as drive-by cleanup.

## Gotchas

- Drag-to-reorder in `NoteSidebar.svelte` hit-tests via `document.elementFromPoint(...).closest('.note-card')` and reads `dataset.noteId`. Removing the `note-card` class or the `data-note-id` attribute breaks reordering with no error.
- `inki-app/.svelte-kit-old/` is **committed stale SvelteKit build output**. It contains bundled copies of app code — exclude it from greps and don't treat it as source.
- `inki-app/src-tauri/tauri.conf.json` is listed in the root `.gitignore` (twice) but is already tracked, so edits still commit. Signing certs and keys (`inki.key`, `*.pfx`) are gitignored — never unignore them.
- `bun.lock` and `package-lock.json` are both committed with no `packageManager` pin. Use **npm**; don't regenerate or delete lockfiles as a side effect of unrelated work.
- `.github/workflows/main.yml` only runs on the `release` branch, and its `yarn && yarn build` step has no `working-directory` while the manifest lives in `inki-app/`. As written it fails at the repo root — don't assume CI validated your change.

## Release

Push to the `release` branch to trigger the Tauri publish matrix (macOS/Ubuntu/Windows → draft GitHub release tagged `app-v<version>`, version read from `src-tauri/tauri.conf.json`). Bump the version there; keep `package.json` in sync.