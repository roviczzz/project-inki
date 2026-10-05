# Feature Specification: Migrate shadcn-svelte Components to daisyUI

**Feature Branch**: `002-migrate-shadcn-to-daisyui`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "migrate my shadcn-svelte components and replace with daisyUI. refer to this documentation for installation: https://daisyui.com/SKILL.md. match every component. remove all shadcn-svelte components from repo"

## Clarifications

### Session 2026-10-05

- Q: How should daisyUI themes and color tokens be integrated with Inki's existing light/dark mode system? → A: Use standard daisyUI light and dark themes controlled via the `data-theme` attribute (`data-theme="light"` / `data-theme="dark"`) on the `<html>` root element, adopting daisyUI semantic tokens (`bg-base-100`, `text-base-content`, `bg-base-200`, `bg-base-300`) while preserving `localStorage` persistence under `inki-dark-mode`.
- Q: Which modal interaction pattern should be standardized across Inki for dialogs like Delete Confirmation and Command Palette? → A: Svelte-controlled standard container using daisyUI modal with conditional modal-open class (`<div class="modal" class:modal-open={open}>`), backdrop click dismiss, and keyboard escape handling.
- Q: How should floating popup menus (sidebar right-click context menu and editor format popups) be structured with daisyUI? → A: Style floating popup containers with daisyUI menu component classes (`menu bg-base-200 rounded-box shadow-lg p-2`) while retaining exact coordinate-based positioning and dismiss handlers.
- Q: Should the cn() utility and its underlying packages (clsx, tailwind-merge) be retained for dynamic class composition with daisyUI? → A: Retain cn() utility (`clsx` + `tailwind-merge`) in `$lib/utils.ts` for dynamic class merging, removing only `bits-ui`, `class-variance-authority`, and `tailwind-variants`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Note Management & Navigation with daisyUI Components (Priority: P1)

A user opens Inki and interacts with the sidebar to view, select, reorder, and organize their notes using updated daisyUI-based components. The sidebar provides clear visual cues for active notes, smooth scrolling through note lists, and immediate feedback when creating, duplicating, or moving notes.

**Why this priority**: Sidebar navigation and note selection are fundamental to the application. If users cannot browse and manage notes with confidence, the application is non-functional.

**Independent Test**: Can be tested independently by launching the app, creating notes, clicking note cards in the sidebar, verifying active note highlights, and rearranging notes via drag-and-drop or context actions.

**Acceptance Scenarios**:

1. **Given** the user is viewing the note list in the sidebar, **When** they click the "New Note" action button, **Then** a new note is created and selected immediately with responsive button feedback.
2. **Given** multiple notes in the sidebar, **When** the user clicks on any note card, **Then** that card receives the active selection styling and the note editor loads the corresponding note.
3. **Given** a long list of notes, **When** the user scrolls up or down, **Then** the list scrolls smoothly without visual tearing or clipping.
4. **Given** a note in the sidebar, **When** the user reorders or duplicates a note via context controls, **Then** the note list updates seamlessly with matching daisyUI card styling.

---

### User Story 2 - Note Editing, Formatting & Toolbar Operations (Priority: P1)

A user creates and edits note contents in the main editor panel. The editor toolbar displays formatting buttons, zoom controls, and export actions that provide clear hover, active, and focus states. The note title input and rich-text content area allow effortless typing and manipulation.

**Why this priority**: Note authoring is the primary value proposition of Inki. The toolbar and editor controls must remain responsive and visually coherent.

**Independent Test**: Can be tested independently by typing into the note title and content areas, clicking formatting buttons (bold, italic, lists, headings), adjusting zoom levels, and verifying text formatting applies correctly.

**Acceptance Scenarios**:

1. **Given** an open note, **When** the user edits the title input field, **Then** changes are reflected immediately with clean input focus indicators.
2. **Given** selected text in the note editor, **When** the user clicks a formatting toolbar button (e.g., Bold, Italic, Heading), **Then** the styling command executes and the toolbar button reflects standard interactive states.
3. **Given** the note editor toolbar, **When** the user clicks zoom in/out or export actions, **Then** the associated actions fire without UI layout shifts.

---

### User Story 3 - Interactive Dialogs, Confirmations & Command Palette (Priority: P2)

When performing destructive actions (like deleting a note) or navigating via shortcuts (`Ctrl+K`/`Cmd+K`), modal dialogs and the command palette overlay appear with backdrop blur, proper focus trapping, keyboard navigation, and dismissibility.

**Why this priority**: Dialogs and overlays safeguard user actions and enhance power-user navigation speed.

**Independent Test**: Can be tested independently by opening the command palette with keyboard shortcuts, filtering commands/notes, and attempting to delete a note to verify the confirmation modal.

**Acceptance Scenarios**:

1. **Given** the user requests to delete a note, **When** the delete confirmation modal opens, **Then** the modal presents clear confirmation and cancellation buttons, trapping keyboard focus.
2. **Given** an open confirmation modal or command palette, **When** the user presses the `Escape` key or clicks outside the modal area, **Then** the dialog closes cleanly and focus returns to the previous active element.
3. **Given** the command palette is open, **When** the user types search terms and uses arrow keys, **Then** results highlight smoothly and pressing `Enter` executes the selected command.

---

### User Story 4 - Theme Switching and Responsive UI Consistency (Priority: P2)

A user toggles between dark mode and light mode or resizes the application window between desktop and mobile viewport dimensions. All converted UI components (buttons, cards, inputs, dialogs, separators, scroll areas) adapt instantly to the active theme and layout without visual regressions.

**Why this priority**: Theme switching and responsive layouts ensure accessibility and consistent visual comfort across desktop and compact window sizes.

**Independent Test**: Can be tested independently by toggling dark mode on/off and resizing the desktop client to compact widths, inspecting all component contrast and borders.

**Acceptance Scenarios**:

1. **Given** the application in light mode, **When** the user toggles dark mode (via command palette or shortcut), **Then** all daisyUI components instantly adopt dark theme tokens with proper contrast and border definitions.
2. **Given** a narrow or mobile viewport, **When** the user opens the mobile menu, **Then** the sidebar slides in as an overlay drawer with clean backdrop and responsive menu toggle controls.

---

### Edge Cases

- **Rapid Dialog Toggle**: Quickly opening and closing modals or command palettes must not leave orphan backdrop elements or locked body scroll state.
- **Drag-and-Drop Coordinate Hit Testing**: Replacing card wrappers with daisyUI card classes must preserve exact DOM hit-testing selectors (`.note-card`, `data-note-id`) so pointer-based reordering never fails.
- **Empty State Rendering**: When no notes exist or search filters yield zero results, cards and empty list containers render cleanly without layout collapse.
- **Long Text Overflow**: Extremely long note titles in cards, inputs, and command palette results must truncate with ellipsis and not overflow horizontal boundaries.
- **Simultaneous Theme & Viewport Transitions**: Switching theme while dialogs or context menus are open must update all open overlay layers without color flashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST replace all shadcn-svelte button components with daisyUI button elements/classes (`btn`, `btn-ghost`, `btn-sm`, etc.) while preserving all click handlers, icons, tooltips, and accessibility attributes.
- **FR-002**: System MUST replace all shadcn-svelte card components in the sidebar with semantic daisyUI card/container classes (`card`, `card-body`, etc.) while preserving active selection indicators, hover effects, and drag-and-drop selectors.
- **FR-003**: System MUST replace all shadcn-svelte dialog and modal components with Svelte-controlled daisyUI modal containers (`modal`, `modal-open`, `modal-box`, `modal-action`, `modal-backdrop`) providing backdrop click dismissal, keyboard escape handling, and focus retention without native imperative dialog handle synchronization.
- **FR-004**: System MUST replace all shadcn-svelte text input and textarea components with daisyUI input classes (`input`, `textarea`, etc.) ensuring consistent padding, border styles, and focus rings across light and dark themes.
- **FR-005**: System MUST replace all shadcn-svelte separator components with daisyUI divider/separator elements (`divider`, border utilities) maintaining proper orientation in desktop and mobile layouts.
- **FR-006**: System MUST replace all shadcn-svelte scroll-area components with standard scrollable container structures styled with daisyUI / custom slim scrollbar utilities without layout shift.
- **FR-007**: System MUST replace the command palette overlay container with a Svelte-controlled daisyUI modal (`<div class="modal" class:modal-open={open}>`) containing `modal-box` and `menu` list structures, maintaining fuzzy search, arrow key navigation, and action execution.
- **FR-008**: System MUST integrate daisyUI 5 with Tailwind CSS v4 in the styling layer according to official configuration standards (`@plugin "daisyui";`).
- **FR-009**: System MUST support instant switching between light and dark themes using daisyUI's `data-theme` attribute (`data-theme="light"` / `data-theme="dark"`) on the `<html>` root element, updating `+layout.svelte` and `src/app.css` to use daisyUI semantic color tokens (`bg-base-100`, `text-base-content`, `bg-base-200`, `bg-base-300`) while preserving `localStorage` preference persistence under `inki-dark-mode`.
- **FR-010**: System MUST remove all legacy shadcn-svelte component implementation files (`src/lib/components/ui/*`) and uninstall obsolete shadcn dependencies (`bits-ui`, `class-variance-authority`, `tailwind-variants`), while retaining `$lib/utils.ts` (`cn`, `clsx`, `tailwind-merge`) for dynamic class composition.
- **FR-011**: System MUST style all contextual floating popup menus (sidebar right-click note context menu, editor format menu, and editor more options menu) using daisyUI menu classes (`menu bg-base-200 rounded-box shadow-lg p-2`) while preserving coordinate-based positioning, keyboard interaction, and blur dismissal.

### Key Entities

- **UI Component System**: The design and presentation layer providing atomic styles for buttons, cards, modals, inputs, dividers, and scroll containers via daisyUI semantic classes.
- **Note Card Element**: Visual presentation of a single note in the sidebar containing title, timestamp preview, selection state, and action handles.
- **Modal Surface**: Overlay container used for confirmations, alerts, and command palette navigation.
- **Editor Toolbar Control**: Interactive action buttons facilitating text formatting, zoom adjustments, export triggers, and menu toggles.
- **Theme Definition**: Semantic color and style token configurations supporting seamless light/dark mode presentation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing user-facing UI controls (buttons, inputs, cards, dialogs, separators, scroll areas) operate with zero functional regressions across all note authoring and management workflows.
- **SC-002**: 100% of legacy shadcn-svelte component files under `src/lib/components/ui/` are removed from the repository.
- **SC-003**: Theme toggle between light and dark modes updates 100% of visible UI elements in under 50 milliseconds with zero unstyled color flashes.
- **SC-004**: Modal dialogs and command palette open and dismiss in under 100 milliseconds with full keyboard accessibility (Escape to close, Tab navigation, Enter to submit).
- **SC-005**: Project type-checking (`npm run check`) succeeds with zero new errors introduced outside the baseline reference suite.
- **SC-006**: Production application build (`npm run build`) completes successfully with a reduced or optimized bundle footprint.

## Assumptions

- Tailwind CSS v4 is already configured in the project and daisyUI 5 will be integrated via `@plugin "daisyui";` in `src/app.css`.
- Existing icon library (`@lucide/svelte`) remains unchanged and is compatible with daisyUI buttons and elements.
- Existing Svelte 5 state management (`$lib/stores/*.svelte.ts`) and business logic remain untouched; only presentation markup and styling classes are migrated.
- Sidebar drag-to-reorder functionality continues to use DOM hit-testing classes (`.note-card`) and dataset attributes (`data-note-id`).
- Deprecated/unused dependency packages associated strictly with shadcn-svelte primitives (`bits-ui`, `class-variance-authority`, `tailwind-variants`) will be uninstalled, while `$lib/utils.ts` and its underlying `clsx`/`tailwind-merge` packages remain to support `cn()` utility class merging.
