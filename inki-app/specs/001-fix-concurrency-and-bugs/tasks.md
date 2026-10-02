---
description: "Task list for Fix Concurrency Issues, Incomplete Tests, and Bugs"
---

# Tasks: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Input**: Design documents from `specs/001-fix-concurrency-and-bugs/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`)

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/store-contract.md`, `contracts/storage-contract.md`, `contracts/export-contract.md`

**Tests**: Automated tests are REQUIRED per Constitution Principle III (Test-First & Pre-Implementation Validation) and FR-008/FR-009 to restore green quality gates.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story increment.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., `[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are specified in each description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project test runner standardization, export utilities, and shared test infrastructure

- [X] T001 Configure Vitest test runner, Happy-DOM environment, path aliases (`$lib` -> `./src/lib`), and npm scripts (`"test": "vitest run"`, `"test:watch": "vitest"`) in `inki-app/package.json` and `inki-app/vite.config.js`
- [X] T002 [P] Create pure export formatting utility module with HTML entity escaping, RFC 4180 CSV quoting, Markdown frontmatter, JSON formatting, and Plain Text conversions in `inki-app/src/lib/utils/export.ts`
- [X] T003 [P] Create shared test helpers for timer advancing and `localStorage` mock state resets in `inki-app/src/lib/stores/__tests__/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core store types, validation schemas, debounced persistence foundation, contiguous indexing algorithms, and storage deserialization normalization that MUST be completed before user stories.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [X] T004 Update `Note` interface and collection state types in `inki-app/src/lib/stores/notes.svelte.ts` enforcing field constraints: `id` ("Must be a non-empty string. If missing or invalid during storage load, generate a new crypto.randomUUID()"), `title` ("Must be a string. When modified via rename, trimmed of leading/trailing whitespace. If empty, fall back to defaultTitle()"), `content` ("Must be a string. Null or undefined values default to ''"), `createdAt` ("Must be a positive integer timestamp (> 0). If missing/invalid, defaults to Date.now()"), `updatedAt` ("Must be a positive integer timestamp (>= createdAt). Updated automatically whenever title or content changes"), `position` ("Must be a non-negative integer (>= 0). Must be normalized during all collection mutations"), and `MoveDirection = 'up' | 'down' | 'top' | 'bottom'`
- [X] T005 Implement debounced persistence infrastructure with 300ms trailing timer for `saveToLocalStorage()` and synchronous `flushSave()` export in `inki-app/src/lib/stores/notes.svelte.ts`
- [X] T006 Implement robust `loadFromLocalStorage()` deserializer and sanitizer in `inki-app/src/lib/stores/notes.svelte.ts` recovering from invalid JSON/types and normalizing positions to strictly contiguous `{0, 1, ..., N - 1}` integers
- [X] T007 [P] Implement multi-window `window.addEventListener('storage')` synchronization handler for key `'inki-notes'` in `inki-app/src/lib/stores/notes.svelte.ts` protecting in-flight local editor drafts

**Checkpoint**: Foundation ready — store state, persistence architecture, and normalization algorithms established.

---

## Phase 3: User Story 1 - Safe & Race-Free Rapid Note Editing and Switching (Priority: P1) 🎯 MVP

**Goal**: Deliver seamless, 60+ FPS responsive editing with zero dropped keystrokes, zero content bleed between notes during rapid switching, 300ms debounced persistence, and synchronous flush triggers on note selection switch, input blur, and window unload.

**Independent Test**: Create Note A and Note B, type rapidly into Note A, switch to Note B immediately without pause, verify Note A's content was saved to persistent storage, and confirm Note B displays its own content with zero content bleed.

### Tests for User Story 1 ⚠️
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T008 [P] [US1] Write store concurrency tests in `inki-app/src/lib/stores/__tests__/notes-concurrency.test.ts` validating 300ms debounced saving, `flushSave()` on `selectNote()`, simulated multi-window `StorageEvent` synchronization without draft corruption, and zero content loss across 50 rapid consecutive note switches
- [ ] T009 [P] [US1] Write editor interaction tests in `inki-app/src/lib/components/__tests__/NoteEditor.test.ts` validating content synchronization, input blur flush triggers, and clean editor reset on note change

### Implementation for User Story 1

- [ ] T010 [US1] Implement immediate in-memory state update, 300ms trailing debounced persistence timer, and synchronous `flushSave()` inside `selectNote()`, `updateNote()`, and `addNote()` in `inki-app/src/lib/stores/notes.svelte.ts`
- [ ] T011 [US1] Update `NoteEditor.svelte` in `inki-app/src/lib/components/NoteEditor.svelte` to isolate `currentEditingId`, flush pending saves on input `blur` / `change`, and trigger `flushSave()` prior to format executions
- [ ] T012 [US1] Add `beforeunload` and `unload` lifecycle listeners in `inki-app/src/routes/+layout.svelte` invoking `flushSave()` to ensure uncommitted drafts persist before application window exit

**Checkpoint**: User Story 1 is fully functional and testable independently with zero data loss or content contamination during rapid typing and switching.

---

## Phase 4: User Story 2 - Consistent Note Ordering and Deletion Lifecycle (Priority: P2)

**Goal**: Guarantee strictly contiguous zero-indexed positions (`0` to `N - 1`) across note creation, deletion, reordering, and duplication, while automatically transitioning active selection to the adjacent note (next note, or previous if deleting trailing note, or null if list empty) upon deletion.

**Independent Test**: Create a sequence of 5 notes, delete the note at index 2 (Note 3) and verify remaining positions are strictly `0, 1, 2, 3` and selection shifts to Note 4; delete the last note and verify selection shifts to the previous note; delete the last remaining note and verify selection shifts to `null`.

### Tests for User Story 2 ⚠️
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US2] Write store ordering and deletion tests in `inki-app/src/lib/stores/__tests__/notes-ordering.test.ts` validating contiguous positions (`0` to `N - 1`) for `addNote`, `deleteNote`, `reorderNote`, `duplicateNote`, `moveNote`, and adjacent selection transitions on delete
- [ ] T014 [P] [US2] Write sidebar ordering and deletion dialog tests in `inki-app/src/lib/components/__tests__/NoteSidebar.test.ts` validating note card rendering order, delete confirmation flow, and adjacent selection updates

### Implementation for User Story 2

- [ ] T015 [US2] Refactor `deleteNote(id)` in `inki-app/src/lib/stores/notes.svelte.ts` to compute adjacent target selection (next note at index `k + 1`, or previous note at `k - 1` if `k === N - 1`, or `null` if `N === 1`), re-index remaining notes to `0` to `N - 2`, update `selectedNoteId`, and persist immediately
- [ ] T016 [US2] Refactor `addNote()`, `reorderNote()`, `duplicateNote()`, and `moveNote()` in `inki-app/src/lib/stores/notes.svelte.ts` to ensure positions are re-indexed strictly to `0` to `N - 1` with `sorted.map((n, i) => ({ ...n, position: i }))`
- [ ] T017 [US2] Update `NoteSidebar.svelte` in `inki-app/src/lib/components/NoteSidebar.svelte` to bind deletion confirmation dialog actions directly to the updated store deletion and selection transition lifecycle

**Checkpoint**: User Stories 1 AND 2 are fully functional and testable independently.

---

## Phase 5: User Story 3 - Robust Context Menu, Inline Rename, and Pointer Drag Lifecycle (Priority: P3)

**Goal**: Ensure context menus, inline rename inputs, and pointer-based drag-and-drop operations cancel cleanly on outside clicks, window blur, or Escape key press without leaving ghost UI artifacts, stuck modals, or unintended mutations.

**Independent Test**: Open context menu, start inline rename, and initiate pointer drag; press Escape or click outside for each interaction and confirm that the UI immediately and cleanly returns to neutral state without side effects.

### Tests for User Story 3 ⚠️
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T018 [P] [US3] Write sidebar interaction tests in `inki-app/src/lib/components/__tests__/NoteSidebar-interactions.test.ts` validating Escape key cancellation, outside click dismissal, inline rename trimming/restoration, and pointer cancel drag resets

### Implementation for User Story 3

- [ ] T019 [US3] Implement Escape key, window click, and selection change listeners in `inki-app/src/lib/components/NoteSidebar.svelte` to automatically close context menus and cancel/commit inline renames with whitespace trimming
- [ ] T020 [US3] Implement pointer drag cancellation lifecycle in `inki-app/src/lib/components/NoteSidebar.svelte` with `pointercancel`, window `blur`, and Escape key listeners, immediately resetting `isDragging`, `dragNoteId`, `dragOverNoteId`, and ghost element positions
- [ ] T021 [US3] Add Escape key and outside-click dismissal listeners for formatting and context menus in `inki-app/src/lib/components/NoteEditor.svelte`

**Checkpoint**: User Stories 1, 2, and 3 operate seamlessly with complete cancellation lifecycle guarantees.

---

## Phase 6: User Story 4 - High-Confidence Automated Test Suite & Clean Diagnostic Baselines (Priority: P4)

**Goal**: Restore 100% green diagnostic baselines across all project files, resolving all 12 type/runner diagnostic errors, migrating all existing tests to Vitest + Happy-DOM, and establishing a passing `npm run check` and `npm test` quality gate.

**Independent Test**: Run `npm run check` and `npm test` from `inki-app/` and verify 0 errors, 0 warnings, and 100% passing tests across all test suites without any diagnostic errors.

### Tests for User Story 4 ⚠️
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US4] Write layout and page routing integration tests in `inki-app/src/routes/__tests__/layout.test.ts` and `inki-app/src/routes/__tests__/page.test.ts` validating dark mode detection, responsive sidebar toggling, and global keyboard shortcut handlers using Vitest
- [ ] T023 [P] [US4] Write export formatting unit tests in `inki-app/src/lib/utils/__tests__/export.test.ts` validating HTML escaping, RFC 4180 CSV quoting, Markdown YAML frontmatter, JSON serialization, and Plain Text tag conversion

### Implementation for User Story 4

- [ ] T024 [US4] Refactor all existing test suites in `inki-app/src/lib/components/__tests__/*.test.ts` and `inki-app/src/routes/__tests__/*.test.ts` from `"bun:test"` to `'vitest'`, resolving Happy-DOM vs DOM type conflicts and mock definitions
- [ ] T025 [US4] Fix TypeScript type declarations, remove stale `@ts-expect-error` directives in `inki-app/vite.config.js`, and adjust `inki-app/tsconfig.json` so that `npm run check` passes with 0 errors and 0 warnings

**Checkpoint**: All user stories and full quality gates pass cleanly (`npm run check` and `npm test`).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Wire multi-format export utilities into UI components, validate developer quickstart workflows, and verify complete system stability.

- [ ] T026 [P] Wire `formatHtmlExport`, `formatMarkdownExport`, `formatPlainTextExport`, `formatJsonExport`, and `formatCsvExport` from `inki-app/src/lib/utils/export.ts` into `NoteEditor.svelte` and `CommandPalette.svelte` in `inki-app/src/lib/components/` ensuring `flushSave()` is called prior to file downloads
- [ ] T027 Execute developer quickstart scenarios from `inki-app/specs/001-fix-concurrency-and-bugs/quickstart.md` validating rapid typing, deletion transitions, drag resets, and multi-format exports
- [ ] T028 [P] Run full quality gate verification (`npm run check`, `npm test`, and `npm run build` in `inki-app/`) ensuring zero errors, clean builds, and regression-free operation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories proceed in priority order: P1 (US1) → P2 (US2) → P3 (US3) → P4 (US4).
- **Polish (Phase 7)**: Depends on all user stories (Phases 3–6) being completed.

### User Story Dependencies

- **User Story 1 (P1 - Concurrency & Persistence)**: Can start after Phase 2 (Foundational). Blocks nothing; core MVP deliverable.
- **User Story 2 (P2 - Ordering & Deletion)**: Can start after Phase 2 (Foundational). Integrates with store persistence from US1.
- **User Story 3 (P3 - UI Interaction Resets)**: Can start after Phase 2 (Foundational). Builds upon sidebar/editor components from US1/US2.
- **User Story 4 (P4 - Test Suite & Diagnostics)**: Can start after Phase 2 (Foundational). Validates all store, editor, sidebar, and export capabilities.

### Within Each User Story

1. Write tests first (marked [P]) and verify they fail on current codebase.
2. Implement model/store changes before component bindings.
3. Implement component UI handlers before global lifecycle bindings.
4. Verify story acceptance scenarios independently before moving to next priority story.

### Parallel Opportunities

- In **Phase 1 (Setup)**: `T002` (Export utils) and `T003` (Test helpers) can run in parallel after `T001`.
- In **Phase 2 (Foundational)**: `T007` (Storage event sync) can run in parallel with `T006`.
- In **Phase 3 (US1)**: Test tasks `T008` and `T009` can run in parallel.
- In **Phase 4 (US2)**: Test tasks `T013` and `T014` can run in parallel.
- In **Phase 5 (US3)**: Test task `T018` can be written while `T019` is scoped.
- In **Phase 6 (US4)**: Test tasks `T022` and `T023` can run in parallel.
- In **Phase 7 (Polish)**: `T026` and `T028` can run in parallel.

---

## Parallel Execution Examples

### Parallel Example: User Story 1 (Concurrency Tests & Mocks)

```bash
# Launch test creation for User Story 1 in parallel:
Task T008: "Write store concurrency tests in inki-app/src/lib/stores/__tests__/notes-concurrency.test.ts"
Task T009: "Write editor interaction tests in inki-app/src/lib/components/__tests__/NoteEditor.test.ts"
```

### Parallel Example: User Story 2 (Ordering & Sidebar Tests)

```bash
# Launch test creation for User Story 2 in parallel:
Task T013: "Write store ordering and deletion tests in inki-app/src/lib/stores/__tests__/notes-ordering.test.ts"
Task T014: "Write sidebar ordering and deletion dialog tests in inki-app/src/lib/components/__tests__/NoteSidebar.test.ts"
```

### Parallel Example: User Story 4 (Routing & Export Tests)

```bash
# Launch test creation for User Story 4 in parallel:
Task T022: "Write layout and page routing integration tests in inki-app/src/routes/__tests__/layout.test.ts and inki-app/src/routes/__tests__/page.test.ts"
Task T023: "Write export formatting unit tests in inki-app/src/lib/utils/__tests__/export.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (Vitest test runner and helpers).
2. Complete **Phase 2: Foundational** (Types, debounced persistence, and `flushSave`).
3. Complete **Phase 3: User Story 1** (Rapid editing, selection switch flush, and bleed prevention).
4. **STOP and VALIDATE**: Run `npm test src/lib/stores/__tests__/notes-concurrency.test.ts` to confirm 100% data fidelity during rapid typing and switching.
5. Deployable as an immediate high-value concurrency fix.

### Incremental Delivery

1. **Increment 1 (Foundation + US1)**: Fixes all race conditions, typing stutter, and content bleed bugs.
2. **Increment 2 (US2)**: Adds strictly contiguous note positioning and seamless adjacent selection on delete.
3. **Increment 3 (US3)**: Adds clean cancellation lifecycles for context menus, inline renames, and pointer dragging.
4. **Increment 4 (US4)**: Restores 100% green test suite and clean type diagnostics across all files.
5. **Increment 5 (Polish)**: Wires pure export formatters and validates end-to-end quickstart scenarios.

---

## Notes

- All tasks follow the mandatory checklist format `- [ ] [TaskID] [P?] [Story?] Description with file path`.
- Every user story is designed to be independently functional and testable.
- Vitest is the standardized test runner, eliminating all `"bun:test"` diagnostic errors.
- `localStorage` key `'inki-notes'` is the single source of truth for persistence.
