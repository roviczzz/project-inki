# Phase 0 Research: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Completed  
**Input**: Technical context from `spec.md` and Constitution

---

## 1. Debounced Persistence and Synchronous Flush Architecture

### Context & Problem
Currently, every keystroke in `NoteEditor.svelte` directly calls `updateNote()`, which immediately serializes the entire notes array into `localStorage` via `JSON.stringify()`. On long notes or under rapid typing (e.g. 60+ WPM), synchronous storage writes cause UI micro-stutters, frame drops below 60 FPS, and layout thrashing (violating Constitution Principle VI). Conversely, naive debouncing without synchronization causes race conditions when switching notes, closing windows, or creating new notes, leading to lost characters or cross-note content bleed.

### Decision
- Decouple **in-memory reactive state updates** from **disk serialization (`localStorage`)**.
- Update in-memory reactive state (`notes` in `notes.svelte.ts`) immediately on every `updateNote()` call so that UI bindings (such as sidebar titles and timestamps) update instantaneously.
- Debounce the `saveToLocalStorage()` serialization with a **300ms trailing timer**.
- Provide an explicit, synchronous **`flushSave()`** method exported by `notes.svelte.ts` that immediately executes any pending `localStorage` write, cancels the pending timer, and persists state.
- Trigger `flushSave()` synchronously during critical lifecycle events:
  1. Before changing `selectedNoteId` in `selectNote()`
  2. In `NoteEditor.svelte` on input `blur` and before handling a new note selection
  3. Before note deletion (`deleteNote`) or note duplication (`duplicateNote`)
  4. Before note export operations in `NoteEditor.svelte` and `CommandPalette.svelte`
  5. In window `beforeunload` and `unload` event handlers

### Rationale
- Instant in-memory updates guarantee 60+ FPS responsive typing without I/O thread blocking.
- Synchronous flushing on selection transition and teardown prevents any data loss or content bleed-through between notes.
- Simple, reliable, zero-dependency implementation using standard web platform timer primitives (`setTimeout`/`clearTimeout`).

### Alternatives Considered
- **Web Worker for LocalStorage**: LocalStorage is not accessible from Web Workers; moving to IndexedDB via worker adds significant architectural overhead and schema migration complexity for a local desktop SPA.
- **Immediate Synchronous Save**: Causes demonstrable performance regressions on larger notes and violates Constitution Principle VI.
- **Debounced In-Memory State**: Delays sidebar title and timestamp updates, causing visual latency and stale UI representations.

---

## 2. Note Ordering, Contiguous Indexing & Selection Transition on Deletion

### Context & Problem
Notes have a `position: number` property. In the current codebase:
- `deleteNote()` filters the note out but leaves gaps in positions.
- `addNote()` assigns `position: notes.length`, which can lead to index collisions if positions were not contiguous.
- `deleteNote()` sets `selectedNoteId = null`, leaving an empty editor even when remaining notes exist, violating FR-004.
- `loadFromLocalStorage()` does not sanitize or re-index corrupted or legacy payloads.

### Decision
- Enforce an invariant: **All $N$ notes must maintain strictly contiguous integer positions from $0$ to $N - 1$ at all times**.
- In `deleteNote(id)`:
  1. Determine the index $k$ of the deleted note within the sorted notes list.
  2. If the deleted note was currently selected, compute the target adjacent note ID:
     - If $k < N - 1$, select the note at index $k + 1$ (the next note in sequence).
     - If $k == N - 1$ and $k > 0$, select the note at index $k - 1$ (the previous note).
     - If $N == 1$, set `selectedNoteId = null` (empty state).
  3. Remove the note, re-index remaining notes to $0 \dots N - 2$, update `selectedNoteId` to the calculated target, and persist.
- In `loadFromLocalStorage()`:
  - Validate and sanitize every note entry (ensure valid UUID, title string, content string, valid numeric timestamps).
  - Sort notes by existing `position` (or creation timestamp as fallback) and normalize positions to strictly $0 \dots N - 1$.
  - Verify `selectedNoteId` exists in the loaded notes list; if not, reset to the first note or `null`.
- In `reorderNote()`, `duplicateNote()`, and `moveNote()`:
  - Perform positional mutations and immediately map with `sorted.map((n, i) => ({ ...n, position: i }))`.

### Rationale
- Eliminates ghost positions, duplicate index bugs, and drag-and-drop target offset errors.
- Provides intuitive, seamless UX where deleting a note immediately presents the next note for editing.
- Normalization on load ensures resilient recovery from corrupted or legacy data payloads.

### Alternatives Considered
- **Fractional Indexing (e.g. Lexorank / floating points)**: Adds complexity, floating-point precision degradation over time, and requires periodic re-indexing anyway.
- **Clearing Selection on Delete**: Causes jarring blank editor screens and requires unnecessary extra clicks from the user.

---

## 3. Multi-Window and Cross-Instance Storage Synchronization

### Context & Problem
In Tauri desktop applications (or browser environments), multiple windows or tabs may access the same `localStorage` storage domain. If notes are modified or deleted in one window, another open window should reflect changes without clobbering the user's active local editing draft.

### Decision
- Register a global `window.addEventListener('storage', handleStorageChange)` listener in `notes.svelte.ts`.
- When a `storage` event fires for key `'inki-notes'`:
  1. Parse and sanitize the incoming remote payload.
  2. Compare incoming notes with local in-memory notes.
  3. If the currently selected note in the local editor has uncommitted draft changes (dirty state), preserve the local note's content while updating other notes and the sidebar list.
  4. If the currently selected note was deleted remotely, transition selection to the next adjacent note or null.
  5. If the active editor is clean (no uncommitted edits), seamlessly refresh the active note from remote storage.

### Rationale
- Standard `storage` events provide native cross-window synchronization with zero runtime overhead and zero third-party dependencies.
- Protecting the active editor session ensures users never lose unsaved typing due to remote background syncs.

### Alternatives Considered
- **Tauri Custom IPC Events**: Requires writing custom Rust IPC plugins and handlers, adding footprint and breaking compatibility when running in browser dev mode or unit tests.
- **Periodic Polling (`setInterval`)**: Wastes CPU cycles and battery on desktop devices; standard DOM events are reactive and instant.

---

## 4. UI Interaction Lifecycle, Modals & Pointer Drag State Resets

### Context & Problem
Interactions in `NoteSidebar.svelte` (context menus, inline renaming, pointer-based drag-and-drop) and `NoteEditor.svelte` (format context menu) can leave dangling states, stuck ghost drag elements, or conflicting active interactions when the user presses Escape, clicks elsewhere, or switches notes.

### Decision
- **Context Menus**:
  - Close context menus on any click outside (`window.addEventListener('click', ...)` or backdrop click).
  - Close on `Escape` keypress.
  - Close automatically when a note selection, rename, or drag operation begins.
- **Inline Rename**:
  - Commit trimmed title on `Enter` keypress or input `blur`.
  - Cancel and restore original title on `Escape` keypress.
  - Automatically close on note selection change or context menu open.
- **Pointer Drag & Drop**:
  - Attach `pointercancel` and window `blur` listeners to release pointer capture and immediately reset `isDragging`, `dragNoteId`, `dragOverNoteId`, and ghost element positions.
  - Cancel drag on `Escape` keypress.
  - Apply CSS `touch-none` and pointer capture for reliable cross-browser and cross-platform gesture handling.

### Rationale
- Guaranteed cleanup of interaction states prevents stuck overlay elements, ghost drag cards, and accidental destructive actions.
- Complies directly with FR-006 and SC-006.

### Alternatives Considered
- **Native HTML5 Drag and Drop API**: Lacks fine-grained cursor ghost styling in WebViews, suffers from inconsistent drop target styling across platforms, and behaves poorly inside Tauri desktop shells compared to pointer events.

---

## 5. Export Formats & String Escaping Specifications

### Context & Problem
Exporting notes to HTML, Markdown, Plain Text, JSON, and CSV must handle rich text tags, emojis, quotes, commas, and multiline text safely without output corruption.

### Decision
- Create a dedicated utility module `$lib/utils/export.ts` with pure formatter functions:
  - **HTML (`formatHtmlExport`)**: Full HTML5 document boilerplate (`<!DOCTYPE html><html lang="en">...`), meta charset utf-8, properly escaped `<title>` and `<h1>`, sanitized body content.
  - **Markdown (`formatMarkdownExport`)**: Converts HTML editor content to clean markdown or includes structured YAML frontmatter (`title`, `createdAt`, `updatedAt`).
  - **Plain Text (`formatPlainTextExport`)**: Strips HTML tags (`<br>`, `<div>`, `<p>` converted to proper newlines), decodes HTML entities (`&amp;` → `&`, `&lt;` → `<`, `&gt;` → `>`).
  - **JSON (`formatJsonExport`)**: Formats standard note object or array with 2-space indentation and full metadata.
  - **CSV (`formatCsvExport`)**: Conforms strictly to RFC 4180 (wraps fields in quotes, escapes internal quotes by doubling `""`, standard CRLF/LF row termination).
- Flush pending editor saves prior to generating export blobs.

### Rationale
- Pure, modular export functions are easily unit-tested with 100% test coverage.
- Guarantees strict compliance with international formats and export integrity.

---

## 6. Test Suite Architecture & Vitest Standardization

### Context & Problem
`npm run check` currently fails on `main` with 12 errors because test files in `src/**/__tests__/*.test.ts` import from `"bun:test"`, lack runner configuration, and have DOM type mismatches against `happy-dom`. There is no `test` script in `package.json`, violating the Constitution's non-negotiable Test-First principle (Principle III) and Quality Gates.

### Decision
- Standardize on **Vitest** as the project's official automated test runner.
- Add `vitest` to `devDependencies` in `package.json`.
- Configure `vitest.config.ts` (or integrate into `vite.config.js`) with `environment: 'happy-dom'` and path aliases (`$lib` mapped to `./src/lib`).
- Add npm scripts:
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
- Fix `vite.config.js` unused `@ts-expect-error` directive.
- Refactor test files to import `{ describe, it, test, expect, beforeEach, afterEach, vi }` from `'vitest'`.
- Use real store implementations in store tests (`src/lib/stores/__tests__/notes.test.ts`) to validate actual state mutations, debounced persistence, ordering, adjacent selection transitions, and error handling.
- Verify that both `npm run check` and `npm test` execute with **0 errors and 0 warnings**.

### Rationale
- Vitest integrates seamlessly with Vite, SvelteKit, TypeScript, and Happy-DOM.
- Restores a green baseline for `npm run check` and provides a fast, robust test runner for CI and local verification.

---

## Summary of Architectural Decisions

| Area | Decision | Primary Benefit |
|------|----------|-----------------|
| **Persistence** | Instant in-memory state + 300ms debounced `localStorage` save + synchronous `flushSave()` | Zero UI lag during typing + zero data loss on switch/export |
| **Ordering** | Invariant contiguous positions $0 \dots N-1$, normalized on load | Predictable reordering, no position collisions |
| **Deletion** | Auto-select adjacent note (next, or previous if at end, null if empty) | Fluid user workflow without jarring blank screens |
| **Sync** | Standard `window.addEventListener('storage')` with active draft protection | Safe multi-window data consistency |
| **Interactions** | Centralized Escape, outside-click, and blur handlers | No ghost drag cards or stuck context menus |
| **Export** | Dedicated pure formatters with RFC 4180 CSV & escaped HTML/MD/TXT/JSON | Robust data portability |
| **Testing** | Standardize on Vitest + Happy-DOM + real store integration tests | 100% clean `npm run check` and reliable quality gate |
