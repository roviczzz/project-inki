# Quickstart & Validation Guide: daisyUI Migration

**Feature**: `002-migrate-shadcn-to-daisyui`
**Date**: 2026-10-05
**Status**: Ready for Verification

## 1. Overview & Objectives

This guide documents the setup, execution, and validation procedures required to verify that all shadcn-svelte components have been successfully migrated to daisyUI 5 without regressions in application workflows, keyboard navigation, theme responsiveness, or build health.

---

## 2. Prerequisites & Setup

Ensure the current working directory is `inki-app`:

```bash
cd inki-app
npm install
```

Verify dependency cleanup:
- `daisyui` is installed in `devDependencies`.
- `bits-ui`, `class-variance-authority`, and `tailwind-variants` are uninstalled.
- No files remain under `src/lib/components/ui/`.

---

## 3. Automated Quality Gate Validation

### 3.1 Type Checking & Svelte Diagnostics

Run the standard project type-checking suite:

```bash
npm run check
```

**Expected Outcome**:
- Baseline check completes without new TypeScript or Svelte errors in application source files (`src/routes/*`, `src/lib/components/*`, `src/lib/stores/*`, `src/lib/utils/*`).

### 3.2 Production Build Verification

Verify that the frontend builds cleanly for Vite / Tauri static distribution:

```bash
npm run build
```

**Expected Outcome**:
- Build completes successfully with static assets emitted to `build/`.
- No missing module or unresolved import warnings for `$lib/components/ui/*`.

---

## 4. Manual End-to-End Validation Scenarios

### Scenario 1: Note Creation, Selection & Sidebar Drag Reorder (P1)
1. Launch development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:1420` in the browser.
2. Click **New Note** button (or press `Ctrl+N` / `Cmd+N`).
   - *Verification*: A new note appears in the sidebar list and becomes the selected active card with daisyUI styling.
3. Click between multiple existing notes in the sidebar.
   - *Verification*: Active card styling smoothly updates; editor instantly displays note content.
4. Drag a note card upwards or downwards to reorder.
   - *Verification*: Drag ghost appears, drop line indicators function, and the note is reordered correctly upon release.

### Scenario 2: Note Editing, Formatting Toolbar & Export (P1)
1. Focus the note title input and edit text.
   - *Verification*: Title updates without visual glitches or input lag.
2. Select text in the editor content area and click formatting buttons (Bold, Italic, Heading, Bullet List).
   - *Verification*: Text formatting applies instantly via `document.execCommand`; toolbar buttons show active/hover feedback.
3. Click the **More / Export** action and choose an export format (Markdown, HTML, Plain Text).
   - *Verification*: Context menu displays with daisyUI `menu` styling; file download triggers cleanly.

### Scenario 3: Delete Confirmation Modal & Backdrop Dismissal (P2)
1. In the sidebar, hover over a note card and click the Trash icon (or right-click and select "Delete Note").
   - *Verification*: The daisyUI modal overlay opens with backdrop blur and confirmation buttons.
2. Press the `Escape` key or click outside on the backdrop.
   - *Verification*: Modal dismisses cleanly; note is **not** deleted.
3. Open the delete modal again and click **Delete**.
   - *Verification*: Note is deleted; modal closes; adjacent note is selected.

### Scenario 4: Command Palette Navigation (P2)
1. Press `Ctrl+K` or `Cmd+K`.
   - *Verification*: The daisyUI command palette modal opens with search input auto-focused.
2. Type search text to filter commands and notes.
3. Use `Arrow Down` / `Arrow Up` keys to navigate results, then press `Enter`.
   - *Verification*: Highlighted command executes or note opens; palette closes.

### Scenario 5: Theme Switching & Responsive Layout (P2)
1. Toggle dark/light mode using the command palette ("Toggle Dark Mode") or OS preference.
   - *Verification*: All background, card, button, text, and modal colors transition instantly (<50ms) to the target theme tokens without unstyled flashes.
2. Resize window to compact width (<768px).
   - *Verification*: Desktop sidebar hides; hamburger button appears; clicking hamburger opens sidebar drawer cleanly.

---

## 5. Artifact & Reference Links

- [Specification](/specs/002-migrate-shadcn-to-daisyui/spec.md)
- [Implementation Plan](/specs/002-migrate-shadcn-to-daisyui/plan.md)
- [Technical Research](/specs/002-migrate-shadcn-to-daisyui/research.md)
- [Data Model & Component Architecture](/specs/002-migrate-shadcn-to-daisyui/data-model.md)
- [UI Component Contracts](/specs/002-migrate-shadcn-to-daisyui/contracts/ui-contracts.md)
- [Theme System Contract](/specs/002-migrate-shadcn-to-daisyui/contracts/theme-contract.md)
