# Technical Research: Migrate shadcn-svelte Components to daisyUI

**Feature**: `002-migrate-shadcn-to-daisyui`
**Date**: 2026-10-05
**Status**: Completed

## 1. daisyUI 5 & Tailwind CSS v4 Integration

### Decision
Integrate `daisyui` as a development dependency using Tailwind CSS v4's modern CSS `@plugin "daisyui";` directive within `src/app.css`.

### Rationale
- Tailwind CSS v4 replaces JavaScript-based configuration files (`tailwind.config.js`) with CSS-native directives. In Tailwind v4, plugins are registered directly in CSS using `@plugin "daisyui";`.
- daisyUI 5 provides semantic CSS component classes (e.g., `btn`, `card`, `modal`, `input`, `menu`, `divider`) that operate as pure utility/component CSS classes without requiring runtime JavaScript bindings or complex wrapper component abstractions.
- This aligns with Constitution Principle II (Dependency Hygiene) and Principle IV (Tech Stack Best Practices), stripping heavy runtime wrapper libraries (`bits-ui`, `class-variance-authority`, `tailwind-variants`) while retaining clean utility styling.

### Alternatives Considered
- *daisyUI v4 (legacy Tailwind v3 plugin)*: Required `tailwind.config.js` and legacy PostCSS pipeline, which conflicts with Inki's existing Tailwind v4 (`@tailwindcss/vite`) architecture.
- *Vanilla Tailwind utility classes without daisyUI*: Writing custom CSS classes for every button, card, modal, and menu creates maintenance debt and style drift. daisyUI delivers standardized, accessible component tokens out of the box.

---

## 2. Svelte 5 Modal & Dialog Architecture

### Decision
Implement modals using Svelte 5 reactive state controlling daisyUI modal markup (`<div class="modal" class:modal-open={open} role="dialog" aria-modal="true">`) with `<div class="modal-box">` for content and `<div class="modal-backdrop" onclick={close}>` for backdrop dismissal. Handle `Escape` key events and focus trapping via standard Svelte event bindings.

### Rationale
- daisyUI modal components natively support toggle states through the `.modal-open` class on a standard container `div`.
- Avoids asynchronous sync bugs between native HTML `<dialog>` methods (`showModal()` / `close()`) and Svelte 5 reactive `$state` bindings.
- Backdrop click dismissal is handled cleanly by placing an interactive backdrop element or button within the container.
- Simplifies the Command Palette overlay (`CommandPalette.svelte`) and Delete Confirmation dialogs (`NoteSidebar.svelte`) into declarative, self-contained markup.

### Alternatives Considered
- *Native `<dialog>` with `HTMLDialogElement.showModal()`*: Suffers from synchronization latency and edge cases with Svelte 5 transitions and SSR/SPA hydration lifecycle.
- *Retaining `bits-ui` Dialog primitives*: Leaves heavy shadcn underlying dependencies in place, violating the user requirement to remove all shadcn components.

---

## 3. Floating Context Menu & Dropdown Menus

### Decision
Style contextual floating popup menus (sidebar right-click context menu, editor format context menu, and editor export/more menu) using daisyUI's `menu` component classes (`<ul class="menu bg-base-200 rounded-box shadow-lg p-2 text-sm z-50">`) positioned via coordinate-based inline styles (`style="position: fixed; left: {x}px; top: {y}px;"`).

### Rationale
- Inki relies on precise pointer-coordinate positioning (`e.clientX`, `e.clientY`) with boundary collision detection for both the sidebar note context menu and editor rich-text formatting menu.
- daisyUI's `.menu` class provides standardized padding, item hover states (`menu-title`, `active`, focus rings), and border-radius (`rounded-box`) while respecting coordinate-based fixed positioning.
- Eliminates custom CSS hacks and inconsistent menu item padding across themes.

### Alternatives Considered
- *daisyUI `<details class="dropdown">`*: daisyUI dropdowns are anchored to trigger buttons via CSS positioning and cannot easily follow arbitrary pointer coordinates on right-click events without complex DOM mutations.
- *Floating UI / Popper.js library*: Introduces unnecessary external dependencies for straightforward fixed-coordinate popups, violating Principle II.

---

## 4. Note Card & Drag-to-Reorder Hit Testing

### Decision
Replace shadcn `Card` and `CardContent` components in `NoteSidebar.svelte` with standard semantic container elements styled with daisyUI card utility classes (`card bg-base-200 hover:bg-base-300 transition-colors ...`), while strictly preserving:
1. The `.note-card` CSS class selector on the root element of each card.
2. The `data-note-id={note.id}` HTML data attribute on the card root.
3. Pointer event listeners (`onpointerdown`, `onpointermove`, `onpointerup`) and selection handlers (`onclick`).

### Rationale
- Inki's drag-to-reorder algorithm uses `document.elementFromPoint(x, y)?.closest('.note-card')` to calculate drop targets and reads `target.dataset.noteId`.
- Preserving `.note-card` and `data-note-id` ensures 100% functional continuity without any regressions in note reordering, dragging ghosts, or context menu targeting.
- Using `card bg-base-200` with active highlights (`bg-base-300` or `border-primary`) matches daisyUI's design language seamlessly.

### Alternatives Considered
- *HTML5 Drag and Drop API (`draggable="true"`)*: Incompatible with Inki's custom pointer-event drag system, which supports smooth touch/pointer dragging with visual ghost coordinates and exact positioning.
- *Third-party svelte-dnd libraries*: Adds heavy external dependencies and potential Svelte 5 rune incompatibilities.

---

## 5. Theme Switching & Color Token Integration

### Decision
Migrate Inki's theme engine to daisyUI's `data-theme` attribute system on `document.documentElement`:
- Light mode: `data-theme="light"`
- Dark mode: `data-theme="dark"`
- Maintain `.dark` class toggle alongside `data-theme` for backward compatibility during transition.
- Use daisyUI semantic color utility tokens throughout the app:
  - Backgrounds: `bg-base-100` (main surface), `bg-base-200` (sidebar/cards/popups), `bg-base-300` (hover/active/borders)
  - Text: `text-base-content` (main text), `text-base-content/70` (muted text)
  - Primary accents: `bg-primary`, `text-primary-content`, `border-primary`
  - Error/Destructive: `btn-error`, `text-error`, `bg-error/10`
- Persist theme preference in `localStorage` under `inki-dark-mode` as `'true'` or `'false'`.

### Rationale
- daisyUI provides cohesive, pre-tuned color palettes for both light and dark themes with WCAG-compliant contrast ratios.
- Toggling `data-theme` instantly recalculates all daisyUI semantic variables without layout thrashing (<10ms switch time).
- Aligns with Constitution Principle V (Accessibility & UX Consistency).

### Alternatives Considered
- *Custom OKLCH variable overrides for all daisyUI tokens*: Over-complicates the stylesheet and increases the risk of color mismatch across themes. Using daisyUI's built-in standard `light` and `dark` themes ensures consistent token relationships.

---

## 6. Legacy Dependency Cleanup & Manifest Adjustments

### Decision
- **Uninstall / Remove from `package.json`**:
  - `bits-ui` (shadcn headless primitive library)
  - `class-variance-authority` (cva variant generator)
  - `tailwind-variants` (variant utility)
- **Delete from repository**:
  - All files under `src/lib/components/ui/` (button, card, dialog, input, scroll-area, separator, textarea).
- **Retain in `package.json`**:
  - `clsx` and `tailwind-merge` in `$lib/utils.ts` to power the `cn()` class composition utility.
  - `@internationalized/date` (satisfies existing workspace constraints).

### Rationale
- Completely eliminates unused shadcn runtime and build-time dependencies, reducing `node_modules` size and frontend bundle footprint.
- Retaining `cn()` in `$lib/utils.ts` ensures that existing conditional class composition in application components remains functional without requiring refactoring of standard utility methods.

### Alternatives Considered
- *Keeping legacy UI folder as deprecated wrappers*: Violates the explicit requirement to "remove all shadcn-svelte components from repo" and leaves dead code in the repository.
