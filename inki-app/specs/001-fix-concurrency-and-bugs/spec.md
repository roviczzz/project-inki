# Feature Specification: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Feature Branch**: `001-fix-concurrency-and-bugs`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "focus on fixing concurrent issues. incomplete tests, and bugs"

## Clarifications

### Session 2026-10-02

- Q: How should the application update the active note selection when the currently active note is deleted? (FR-004) → A: Automatically select the adjacent note (next note in sequence, or previous note if deleting the last note in the list), falling back to clearing selection (empty state) only when no notes remain.
- Q: What debounce delay duration should be used for auto-saving note content to persistent storage during active typing? (FR-001) → A: 300ms debounce during continuous typing, with immediate synchronous flush triggered on note selection switch, input blur, export, or window close/unload.
- Q: How should the automated test runner and test suite be structured to resolve diagnostic errors and establish a reproducible quality gate? (FR-008) → A: Standardize on Vitest with an npm test script and DOM simulation, resolving all type and import mismatches so that npm run check and npm test execute cleanly with 0 errors across both app and test files.
- Q: How should the application handle external storage updates when another window or tab modifies notes simultaneously? (FR-005) → A: Listen to window storage events, updating the collection and sidebar list dynamically while protecting the active editor session from being overwritten by remote changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe & Race-Free Rapid Note Editing and Switching (Priority: P1)

As a user taking notes rapidly, I want to type quickly and switch between notes without delay or fear of losing content or having changes from one note accidentally written into another, so that my notes remain accurate and uncorrupted.

**Why this priority**: Data integrity and responsiveness during active typing and switching are the core foundation of a note-taking application. Content corruption or data loss directly breaks user trust.

**Independent Test**: Can be fully tested by creating multiple notes, typing rapidly into one, immediately clicking or navigating to another note, and verifying that the first note's complete content was persisted properly and the second note loads its own original content without any bleed-through.

**Acceptance Scenarios**:

1. **Given** Note A is active and being edited, **When** the user rapidly inputs text and immediately selects Note B, **Then** all typed edits for Note A are saved to Note A before Note B is loaded, and Note B displays only its own content.
2. **Given** Note A has unsaved in-flight changes, **When** the user initiates an action that changes note selection (e.g., keyboard navigation, sidebar click, or creating a new note), **Then** pending updates for Note A are flushed synchronously to persistence before switching focus to the target note.
3. **Given** a user is typing continuously at high speed, **When** multiple keystrokes occur in rapid succession, **Then** disk/storage writes are debounced with a 300ms window so the user interface remains smooth and latency-free with zero dropped characters.

---

### User Story 2 - Consistent Note Ordering and Deletion Lifecycle (Priority: P2)

As a user organizing my notes, I want note positions to stay strictly ordered and contiguous when creating, reordering, duplicating, or deleting notes, so that note order is completely predictable and never duplicates or shifts unexpectedly.

**Why this priority**: Inconsistent positions cause visual glitches, incorrect reordering targets, duplicate position indexing, and unpredictable list behavior after deleting notes.

**Independent Test**: Can be fully tested by creating a sequence of 5 notes, deleting a note from the middle (e.g., note 3), creating a new note, and verifying that all remaining notes maintain sequential, contiguous ordering without index collisions or misplaced notes.

**Acceptance Scenarios**:

1. **Given** a list of $N$ notes ordered from position $0$ to $N-1$, **When** any note at position $k$ is deleted, **Then** all remaining notes are re-indexed to strictly contiguous positions $0$ to $N-2$.
2. **Given** a list of notes with non-contiguous legacy positions or corrupted order data, **When** notes are loaded or modified, **Then** positions are normalized to sequential integers starting at 0.
3. **Given** the currently selected note is deleted, **When** deletion is confirmed, **Then** note selection automatically transitions to the next adjacent note (or previous note if the deleted note was at the end of the list), or clears to empty state if no notes remain.

---

### User Story 3 - Robust Context Menu, Inline Rename, and Pointer Drag Lifecycle (Priority: P3)

As a user interacting with note items in the sidebar, I want context menus, inline renaming, and drag-and-drop operations to cancel cleanly when clicking elsewhere or pressing escape, without triggering accidental actions or leaving ghost UI elements.

**Why this priority**: Overlapping interaction states (such as active dragging while context menu is open or renaming while switching notes) can lead to unintentional renames, failed drop targets, or stuck modals.

**Independent Test**: Can be fully tested by opening a context menu or starting an inline rename, performing an outside action (e.g., clicking the background, pressing Escape, or selecting another note), and confirming that the previous interaction state cleanly resets without side effects.

**Acceptance Scenarios**:

1. **Given** an inline rename input is active for Note A, **When** the user presses Escape or clicks outside the rename input, **Then** the rename operation is cancelled and the original title is preserved.
2. **Given** an inline rename input is active for Note A, **When** the user presses Enter or submits a non-empty title, **Then** the title is updated and whitespace is trimmed cleanly.
3. **Given** a drag operation is initiated on Note A, **When** the pointer is released outside a valid drop target or cancelled, **Then** the drag state and any ghost element are immediately dismissed and note order remains unchanged.
4. **Given** a context menu is visible, **When** the user right-clicks another note or clicks anywhere outside the menu, **Then** the previous context menu closes before any new menu or action takes effect.

---

### User Story 4 - High-Confidence Automated Test Suite & Clean Diagnostic Baselines (Priority: P4)

As a developer and stakeholder, I want comprehensive, self-contained automated tests that validate real business logic, store operations, concurrency behaviors, and edge cases, so that regressions are caught automatically and code quality gates pass cleanly.

**Why this priority**: Reliable testing ensures long-term maintainability, prevents regressions during future features, and satisfies the project constitution's non-negotiable Test-First principle.

**Independent Test**: Can be fully tested by running the automated test suite and type checker, verifying that all tests pass against real store/component logic and that zero diagnostic errors or type mismatches are reported.

**Acceptance Scenarios**:

1. **Given** the test suite is executed, **When** running unit and integration tests for note storage, ordering, editing, and concurrency, **Then** all tests execute against real implementations without brittle mock duplications.
2. **Given** the type checker and project quality checks are run, **When** analyzing all source and test files, **Then** the check passes with zero diagnostic errors.
3. **Given** edge cases such as corrupted storage data, empty titles, rapid consecutive inputs, and drag cancellations occur, **When** tested by automated suites, **Then** all cases are validated with expected graceful fallbacks.

---

### Edge Cases

- **Rapid Note Switching under Heavy Typing**: What happens if a user selects another note while a background save timer is active? The pending changes must be immediately flushed to the current note before the new note is loaded into the editor.
- **Corrupted or Empty Storage Payload**: What happens if stored data in persistent storage is invalid JSON, missing required fields, or has negative positions? The system must gracefully recover by parsing valid items, assigning valid defaults, normalizing positions, and persisting the corrected state.
- **Concurrent Drag and Delete**: What happens if a note is deleted or reordered via shortcut while a drag interaction is in progress? Drag state must be aborted cleanly and positions recalculated.
- **Multi-Window / Multi-Tab Synchronization**: What happens if notes are modified in another window/tab? The active session listens for `storage` events, updating non-active notes and sidebar list/ordering in real time while protecting the active editor's in-flight draft from being overwritten.
- **Special Characters in Export**: What happens when exporting notes containing markdown, HTML tags, quotes, commas, or emojis to various formats (HTML, Markdown, Plain Text, JSON, CSV)? All outputs must be properly escaped and structured according to their target format specification.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST debounce persistent storage writes with a 300ms delay during continuous typing to prevent UI thread blocking, while guaranteeing an immediate synchronous flush upon input blur, manual export triggers, or window unload.
- **FR-002**: System MUST atomically flush pending in-memory editor changes to persistent storage for the current note prior to loading any new note into the active editing session, preventing cross-note content bleed.
- **FR-003**: System MUST isolate the editor's active editing state so that switching between notes never bleeds or overwrites content between different note entities.
- **FR-004**: System MUST maintain strictly contiguous, zero-indexed `position` attributes across all notes, re-indexing remaining notes upon note deletion, creation, duplication, or reordering; upon deleting the active note, selection MUST automatically transition to the next adjacent note (or previous note if deleting the trailing note) or null if the list is empty.
- **FR-005**: System MUST sanitize and normalize storage payloads during load, repairing missing positions, assigning fallback timestamps, handling corrupted storage gracefully, and synchronizing external window `storage` events without destroying active local drafts.
- **FR-006**: System MUST cleanly reset context menus, inline rename inputs, and drag-and-drop pointer states upon outside clicks, window blur, Escape key press, or note selection changes.
- **FR-007**: System MUST validate and format note exports (HTML, Markdown, Plain Text, JSON, CSV) ensuring accurate metadata, properly escaped fields, and consistent structure.
- **FR-008**: System MUST provide comprehensive automated unit and integration tests covering note lifecycle, reordering, debounced persistence, concurrent edit safety, and error handling, executed via standard `npm test` script with environment-compatible DOM simulation.
- **FR-009**: The codebase and test suite MUST pass all project type-checking and diagnostic quality gates (`npm run check`) with zero errors across both application source and test files.

### Key Entities

- **Note**: Represents an individual note document with attributes: unique identifier (`id`), display name (`title`), rich/formatted body (`content`), creation timestamp (`createdAt`), modification timestamp (`updatedAt`), and integer sort order (`position`).
- **NoteCollection**: An ordered collection of notes maintained in sequential position order, providing atomic operations for addition, deletion, update, reordering, duplication, and re-indexing.
- **EditorSession**: Represents the active editing context, tracking the currently selected note ID, draft title, draft content, dirty state, and in-flight debounce timer.
- **StorageAdapter**: Encapsulates persistence operations, debounced serialization, error recovery, and cross-instance change synchronization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero data loss or cross-note content contamination during rapid note switching (100% data fidelity across 50 consecutive rapid switches during active typing).
- **SC-002**: UI responsiveness remains at 60+ FPS without input lag or stutter during continuous fast typing (keystroke processing latency under 16ms, auto-save persisted within 300ms of typing cessation or instantly on flush).
- **SC-003**: 100% of note lists maintain strictly contiguous sequential positions ($0$ to $N-1$) after any sequence of add, delete, duplicate, and reorder operations.
- **SC-004**: Automated test suite executes with 100% pass rate and covers all core state mutations, ordering algorithms, persistence logic, and edge cases.
- **SC-005**: Project quality gate (`npm run check` / type diagnostics) completes with 0 errors across both application code and test files.
- **SC-006**: 100% of cancellation triggers (Escape key, outside click, drag abort) cleanly return UI to neutral state without stuck menus or dangling listeners.

## Assumptions

- Notes are stored locally within the user's environment using browser storage primitives and loaded at application start.
- The single-user desktop application operates primarily within one active workspace window, with graceful handling if storage changes occur across instances.
- Standard modern browser and web platform APIs (e.g., standard DOM events, pointer events, standard timers) are available in the runtime environment.
- The test runner environment supports standard JavaScript/TypeScript testing capabilities and DOM simulation.
