---
description: "Task list for migrating shadcn-svelte components to daisyUI"
---

# Tasks: Migrate shadcn-svelte Components to daisyUI

**Input**: Design documents from `/specs/002-migrate-shadcn-to-daisyui/`
**Prerequisites**: [plan.md](/specs/002-migrate-shadcn-to-daisyui/plan.md), [spec.md](/specs/002-migrate-shadcn-to-daisyui/spec.md), [research.md](/specs/002-migrate-shadcn-to-daisyui/research.md), [data-model.md](/specs/002-migrate-shadcn-to-daisyui/data-model.md), [contracts/](/specs/002-migrate-shadcn-to-daisyui/contracts/)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are specified in every task description

## Path Conventions

- Frontend / Desktop App Root: `inki-app/`
- Source files: `inki-app/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, styling plugin registration, and dependency baseline

- [ ] T001 Install `daisyui` devDependency in `inki-app/package.json`
- [ ] T002 [P] Verify `clsx` and `tailwind-merge` utility retention in `inki-app/src/lib/utils.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CSS and theme foundation that MUST be complete before user stories can be migrated

**⚠️ CRITICAL**: No user story migration can begin until this phase is complete

- [ ] T003 Configure `@plugin "daisyui";` and remove legacy shadcn `:root`/`.dark` OKLCH variable overrides while preserving `.slide-thin` scrollbars in `inki-app/src/app.css`
- [ ] T004 [P] Configure root HTML template with default `data-theme="dark"` attribute in `inki-app/src/app.html`

**Checkpoint**: daisyUI 5 plugin and theme foundation ready — component migrations can now proceed

---

## Phase 3: User Story 1 - Core Note Management & Navigation with daisyUI Components (Priority: P1) 🎯 MVP

**Goal**: Migrate sidebar note cards, selection indicators, action buttons, scroll containers, and context menus in `NoteSidebar.svelte` to native daisyUI classes while preserving `.note-card` and `data-note-id` hit-testing invariants for pointer drag-to-reorder.

**Independent Test**: Launch app (`npm run dev`), create notes via daisyUI button, select note cards in the sidebar, verify active selection styling (`bg-base-300 border-primary`), drag cards to reorder via pointer gestures, and open the floating right-click context menu.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Replace shadcn `Button` imports with native daisyUI button elements (`btn btn-outline btn-sm`, `btn btn-ghost btn-sm btn-square`) in `inki-app/src/lib/components/NoteSidebar.svelte`
- [ ] T006 [US1] Replace shadcn `Card` and `CardContent` with daisyUI card container preserving `.note-card` class and `data-note-id` attribute for drag reordering in `inki-app/src/lib/components/NoteSidebar.svelte`
- [ ] T007 [US1] Replace shadcn `ScrollArea` with native overflow container using `.slide-thin` scrollbar utility in `inki-app/src/lib/components/NoteSidebar.svelte`
- [ ] T008 [US1] Refactor sidebar right-click floating context menu and empty-state context menu to use daisyUI `menu` component classes (`menu bg-base-200 rounded-box shadow-lg p-2`) in `inki-app/src/lib/components/NoteSidebar.svelte`

**Checkpoint**: User Story 1 is fully functional and independently testable (note browsing, selection, and drag-and-drop reordering work cleanly).

---

## Phase 4: User Story 2 - Note Editing, Formatting & Toolbar Operations (Priority: P1)

**Goal**: Migrate editor toolbar buttons, zoom controls, title input, dividers, and floating formatting menus in `NoteEditor.svelte` to daisyUI components.

**Independent Test**: Select a note, edit title in daisyUI input, click formatting toolbar buttons (`btn btn-ghost btn-square btn-sm`), adjust zoom controls, toggle formatting dropdown menu, and verify rich text formatting applies without layout shift.

### Implementation for User Story 2

- [ ] T009 [P] [US2] Replace shadcn `Input` with daisyUI title input styling (`input input-ghost` / transparent editor input) in `inki-app/src/lib/components/NoteEditor.svelte`
- [ ] T010 [US2] Replace shadcn `Button` formatting controls and zoom actions with daisyUI icon buttons (`btn btn-ghost btn-sm btn-square`) in `inki-app/src/lib/components/NoteEditor.svelte`
- [ ] T011 [US2] Replace shadcn `Separator` elements with daisyUI dividers (`divider divider-horizontal`) or border utilities in `inki-app/src/lib/components/NoteEditor.svelte`
- [ ] T012 [US2] Refactor floating formatting "More" dropdown menu to use daisyUI `menu` component classes (`menu bg-base-200 rounded-box shadow-lg p-1`) in `inki-app/src/lib/components/NoteEditor.svelte`

**Checkpoint**: User Stories 1 AND 2 are both independently functional (full note management and editing workflow).

---

## Phase 5: User Story 3 - Interactive Dialogs, Confirmations & Command Palette (Priority: P2)

**Goal**: Replace shadcn `Dialog`, `DialogContent`, and `ScrollArea` in `CommandPalette.svelte` and `NoteSidebar.svelte` with Svelte-controlled daisyUI modal containers (`modal`, `modal-open`, `modal-box`, `modal-action`, `modal-backdrop`) supporting keyboard escape and backdrop dismissal.

**Independent Test**: Open Command Palette with `Ctrl+K`/`Cmd+K`, search commands/notes with auto-focused input, navigate via Arrow keys/Enter, dismiss via Escape/backdrop; trigger note deletion in sidebar to verify delete confirmation modal.

### Implementation for User Story 3

- [ ] T013 [P] [US3] Replace shadcn `Dialog` and `DialogContent` in delete confirmation dialog with Svelte-controlled daisyUI modal container (`modal`, `modal-open`, `modal-box`, `modal-action`, `modal-backdrop`, `btn-error`) in `inki-app/src/lib/components/NoteSidebar.svelte`
- [ ] T014 [US3] Migrate `CommandPalette.svelte` modal container, search input (`input input-ghost`), scroll list, and menu items to daisyUI `modal`, `modal-box`, and `menu` classes in `inki-app/src/lib/components/CommandPalette.svelte`
- [ ] T015 [US3] Implement keyboard navigation (`Escape` dismissal, `ArrowUp`/`ArrowDown` selection, `Enter` execution) and backdrop click dismissal on daisyUI modals in `inki-app/src/lib/components/CommandPalette.svelte`

**Checkpoint**: Modals, confirmation dialogs, and command palette navigation operate cleanly without shadcn dependencies.

---

## Phase 6: User Story 4 - Theme Switching and Responsive UI Consistency (Priority: P2)

**Goal**: Integrate daisyUI `data-theme` attribute toggling (`light` vs `dark`) in `+layout.svelte`, replace shadcn components in `+page.svelte` (mobile menu button, divider), and ensure responsive drawer behavior across light and dark themes.

**Independent Test**: Toggle theme via Command Palette and verify instant transition of all daisyUI semantic tokens (`bg-base-100`, `bg-base-200`, `bg-base-300`, `text-base-content`); resize window to mobile width (<768px) and verify responsive sidebar toggle.

### Implementation for User Story 4

- [ ] T016 [P] [US4] Update theme initialization and toggle logic in `inki-app/src/routes/+layout.svelte` to set `data-theme="dark"` / `data-theme="light"` on `document.documentElement` alongside `.dark` class
- [ ] T017 [US4] Update theme toggle command in `inki-app/src/lib/components/CommandPalette.svelte` to sync `data-theme` attribute and `localStorage` persistence under `inki-dark-mode`
- [ ] T018 [US4] Replace shadcn `Button` and `Separator` in `inki-app/src/routes/+page.svelte` with daisyUI mobile menu toggle button (`btn btn-ghost btn-square`) and vertical divider styling

**Checkpoint**: All user stories (US1–US4) are fully migrated, responsive, and theme-adaptive.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Remove obsolete shadcn wrappers, uninstall unused packages, and run quality gates

- [ ] T019 [P] Remove all legacy shadcn component directories and files in `inki-app/src/lib/components/ui/`
- [ ] T020 Uninstall obsolete dependencies (`bits-ui`, `class-variance-authority`, `tailwind-variants`) from `inki-app/package.json`
- [ ] T021 [P] Verify type safety and Svelte diagnostics pass baseline via `npm run check` in `inki-app/`
- [ ] T022 [P] Verify production bundle build succeeds via `npm run build` in `inki-app/`
- [ ] T023 Execute manual validation scenarios per `specs/002-migrate-shadcn-to-daisyui/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user story migrations.
- **User Story 1 (Phase 3, P1)**: Depends on Foundational (Phase 2) — Core MVP increment.
- **User Story 2 (Phase 4, P1)**: Depends on Foundational (Phase 2) — Can run in parallel with US1 or sequentially.
- **User Story 3 (Phase 5, P2)**: Depends on Foundational (Phase 2) — Uses modals in `NoteSidebar` and `CommandPalette`.
- **User Story 4 (Phase 6, P2)**: Depends on Foundational (Phase 2) — Wires `data-theme` switching across layout and page.
- **Polish (Phase 7)**: Depends on all user stories (US1–US4) completing successfully before deleting legacy UI components and uninstalling dependencies.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of other user stories once Phase 2 completes.
- **User Story 2 (P1)**: Independent of other user stories once Phase 2 completes.
- **User Story 3 (P2)**: Integrates with `NoteSidebar` delete action (US1) and standalone `CommandPalette`.
- **User Story 4 (P2)**: Integrates with root layout and palette theme toggle (US3).

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel.
- **Phase 2**: T003 and T004 can run in parallel.
- **User Stories**: Once Phase 2 is complete, US1 (`NoteSidebar.svelte`) and US2 (`NoteEditor.svelte`) can be developed in parallel as they touch completely separate component files.
- **Phase 7**: T019 (file cleanup), T021 (`npm run check`), and T022 (`npm run build`) can run once all component references are migrated.

---

## Parallel Example: User Story 1 & User Story 2

```bash
# Developer / Agent A: Migrate Sidebar (US1)
Edit inki-app/src/lib/components/NoteSidebar.svelte (T005, T006, T007, T008)

# Developer / Agent B: Migrate Editor (US2)
Edit inki-app/src/lib/components/NoteEditor.svelte (T009, T010, T011, T012)
```

---

## Implementation Strategy & MVP Scope

1. **Phase 1 & 2 (Foundation)**: Install `daisyui`, register `@plugin "daisyui";` in `src/app.css`, and set `data-theme` default in `src/app.html`.
2. **Phase 3 (MVP)**: Migrate `NoteSidebar.svelte` with daisyUI card, button, and context menu styling. Verify note selection and drag reorder.
3. **Phase 4 (Editor)**: Migrate `NoteEditor.svelte` toolbar, buttons, and format dropdown.
4. **Phase 5 (Modals)**: Migrate `CommandPalette.svelte` and delete confirmation dialog to daisyUI modals.
5. **Phase 6 (Theme & Page)**: Wire `data-theme` toggle and migrate `+page.svelte` layout elements.
6. **Phase 7 (Cleanup & Verification)**: Delete `src/lib/components/ui/`, remove unused packages from `package.json`, run `npm run check`, and verify `npm run build`.
