# Quickstart Validation Guide: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Validation Guide

---

## 1. Prerequisites & Setup

### Environment Requirements
- Node.js (v18+)
- npm (v9+)
- Working directory: `inki-app/`

### Setup Commands
```bash
cd inki-app
npm install
```

---

## 2. Validation Scenarios

### Scenario 1: Quality Gate & Diagnostic Verification (FR-008, FR-009)

**Objective**: Verify that both type checking and unit/integration tests pass with 0 errors.

1. Run the project quality gate:
   ```bash
   npm run check
   ```
   **Expected Outcome**: SvelteKit sync succeeds, `svelte-check` reports **0 errors and 0 warnings** across all application source and test files.

2. Run the automated test suite:
   ```bash
   npm test
   ```
   **Expected Outcome**: Vitest executes all unit and integration test suites (`src/lib/stores/__tests__/notes.test.ts`, `src/lib/components/__tests__/*.test.ts`, `src/routes/__tests__/*.test.ts`) with **100% passing tests**.

---

### Scenario 2: Rapid Typing & Zero-Bleed Note Switching (FR-001, FR-002, FR-003, SC-001)

**Objective**: Ensure that active editor typing is flushed synchronously before switching notes, preventing data loss or content contamination.

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:1420` in a browser.
3. Click "New Note" to create **Note A**.
4. Type `"Content for Note A"` rapidly into the editor.
5. Without pausing or clicking away, immediately click "New Note" (or press `Ctrl+N` / click on another note in the sidebar) to create **Note B**.
6. Type `"Content for Note B"` into Note B.
7. Click back to **Note A** in the sidebar.
8. **Expected Outcome**:
   - Note A displays `"Content for Note A"`.
   - Note B displays `"Content for Note B"`.
   - No characters are dropped, and content from Note A never bleeds into Note B.
   - UI input responsiveness remains smooth and latency-free (60+ FPS).

---

### Scenario 3: Contiguous Note Ordering & Selection on Deletion (FR-004, SC-003)

**Objective**: Verify that deleting notes re-indexes positions to $0 \dots N-1$ and auto-selects the adjacent note.

1. Create 4 notes in sequence (Note 1, Note 2, Note 3, Note 4).
2. Select **Note 2** (index 1).
3. Click the delete icon on Note 2 and confirm deletion in the dialog.
4. **Expected Outcome**:
   - Note 2 is removed.
   - Selection automatically shifts to **Note 3** (the adjacent following note).
   - Notes 1, 3, 4 are assigned strictly contiguous positions `0`, `1`, `2`.
5. Select **Note 4** (the last note, now at index 2).
6. Delete Note 4.
7. **Expected Outcome**:
   - Selection automatically shifts to **Note 3** (the preceding note, since Note 4 was at the end of the list).
   - Remaining notes have positions `0`, `1`.
8. Delete all remaining notes until the list is empty.
9. **Expected Outcome**: Selection cleanly transitions to `null` (empty editor state).

---

### Scenario 4: UI Interaction Cancellation & Reset Lifecycle (FR-006, SC-006)

**Objective**: Verify that context menus, inline renames, and pointer dragging reset cleanly without ghost elements or stuck states.

1. **Context Menu Reset**:
   - Right-click on a note card in the sidebar to open the context menu.
   - Press `Escape` (or click on empty space outside).
   - **Expected Outcome**: Context menu immediately closes.
2. **Inline Rename Reset**:
   - Right-click a note and select "Rename" (or trigger inline rename).
   - Type some characters, then press `Escape`.
   - **Expected Outcome**: Rename input cancels immediately, restoring the original note title.
3. **Pointer Drag Cancellation**:
   - Pointer-down on a note card and drag cursor out of the sidebar window or press `Escape` / release pointer.
   - **Expected Outcome**: Drag ghost element disappears immediately, pointer capture is released, and note ordering remains unchanged.

---

### Scenario 5: Multi-Format Note Export Integrity (FR-007)

**Objective**: Validate that note exports properly escape HTML, JSON, Markdown, CSV, and plain text.

1. Create a note with title `Project "Omega" & Notes` and content `<p>Feature list: <b>Fast & safe</b></p>`.
2. Open Command Palette (`Ctrl+K` / `Cmd+K`) and trigger "Save Note" or "Export All Notes".
3. Save/export in HTML, Markdown, JSON, and CSV formats.
4. **Expected Outcome**:
   - HTML: Valid HTML5 document with properly escaped `&amp;` and `&quot;` in title and headers.
   - CSV: Conforms to RFC 4180 with doubled quotes (`""`) for titles and contents containing quotes or commas.
   - JSON: Clean valid JSON structure with all note metadata.
   - Plain Text: Clean text without dangling unrendered `<p>` or `<b>` tags.
