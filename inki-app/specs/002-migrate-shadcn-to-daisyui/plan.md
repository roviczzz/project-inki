# Implementation Plan: Migrate shadcn-svelte Components to daisyUI

**Branch**: `002-migrate-shadcn-to-daisyui` | **Date**: 2026-10-05 | **Spec**: [Specification](/specs/002-migrate-shadcn-to-daisyui/spec.md)

**Input**: Feature specification from `/specs/002-migrate-shadcn-to-daisyui/spec.md`

## Summary

Migrate the Inki presentation layer from shadcn-svelte component wrappers to native daisyUI 5 semantic CSS classes integrated with Tailwind CSS v4 (`@plugin "daisyui";`). Replace all usages of `Button`, `Card`, `Dialog`, `Input`, `Separator`, `ScrollArea`, and `Textarea` across the application with standard HTML elements styled with daisyUI tokens, remove legacy component files in `src/lib/components/ui/`, uninstall obsolete dependencies (`bits-ui`, `class-variance-authority`, `tailwind-variants`), and standardize theme switching on `data-theme` on the root `<html>` element.

## Technical Context

**Language/Version**: TypeScript 5.6+, Svelte 5 (Runes), SvelteKit 2 (SPA Mode)

**Primary Dependencies**: Tailwind CSS v4, daisyUI 5, `@lucide/svelte`, `clsx`, `tailwind-merge`

**Storage**: `window.localStorage` (`inki-notes`, `inki-dark-mode`)

**Testing**: Svelte diagnostics & TypeScript type checking (`npm run check`), Vite build (`npm run build`), Vitest suite (`npm run test`)

**Target Platform**: Desktop (Tauri v2 cross-platform: macOS, Windows, Linux) / Web SPA

**Project Type**: Desktop Application / Frontend SPA

**Performance Goals**: Instant theme toggling (<50ms), 60+ FPS UI animations, sub-100ms dialog/modal transitions, zero layout shift during scrolling

**Constraints**: Strict port `1420` on Vite, SPA static distribution without Node.js backend server, preserve drag-and-drop hit testing selectors (`.note-card`, `data-note-id`), zero `{@html}` markup injection

**Scale/Scope**: 1 route (`+page.svelte`), 3 primary feature components (`NoteSidebar`, `NoteEditor`, `CommandPalette`), 1 root layout (`+layout.svelte`), 1 core stylesheet (`src/app.css`)

## Constitution Check

*GATE: Passed pre-research and re-verified post-design.*

- **Principle I (Clean Code & Idiomatic Architecture)**: PASSED. Standardizes on clean Svelte 5 runes and native semantic markup, eliminating multi-file UI wrapper abstractions and dead code.
- **Principle II (Dependency Hygiene & Minimal Footprint)**: PASSED. Removes 3 heavy third-party packages (`bits-ui`, `class-variance-authority`, `tailwind-variants`) and replaces them with pure CSS utility classes via `daisyui` devDependency.
- **Principle III (Test-First & Pre-Implementation Validation)**: PASSED. Comprehensive manual and automated verification scenarios defined in [quickstart.md](/specs/002-migrate-shadcn-to-daisyui/quickstart.md); quality gate baseline `npm run check` enforced.
- **Principle IV (Tech Stack Best Practices & Sound Idioms)**: PASSED. Integrates daisyUI 5 via Tailwind v4 CSS plugin (`@plugin "daisyui";`), preserving SvelteKit 2 SPA mode and module-level `$state` store contracts.
- **Principle V (UX Consistency & Accessibility)**: PASSED. Modals support Escape dismissal and backdrop click; keyboard shortcuts retained (`Ctrl+K`, `Ctrl+N`, `Ctrl+S`); instant light/dark theme switching via `data-theme`.
- **Principle VI (Performance & Desktop Responsiveness)**: PASSED. Zero runtime component wrapper overhead; pure CSS styling ensures 60+ FPS rendering and instant response.

## Project Structure

### Documentation (this feature)

```text
specs/002-migrate-shadcn-to-daisyui/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research and architecture decisions
├── data-model.md        # Presentation model and entity structures
├── quickstart.md        # Validation and run guide
├── contracts/           # Component and theme interface contracts
│   ├── ui-contracts.md
│   └── theme-contract.md
└── tasks.md             # Implementation tasks (generated via /speckit-tasks)
```

### Source Code (repository root)

```text
inki-app/
├── src/
│   ├── app.css                                   # daisyUI plugin & theme tokens
│   ├── app.html                                  # Root HTML template
│   ├── routes/
│   │   ├── +layout.svelte                        # Theme data-theme listener & CommandPalette
│   │   ├── +layout.ts                            # ssr = false configuration
│   │   └── +page.svelte                          # Main app layout with daisyUI divider & sidebar
│   ├── lib/
│   │   ├── components/
│   │   │   ├── CommandPalette.svelte             # daisyUI modal & menu palette
│   │   │   ├── NoteEditor.svelte                 # daisyUI toolbar buttons, inputs & popup menus
│   │   │   ├── NoteSidebar.svelte                # daisyUI cards, delete modal & action buttons
│   │   │   └── ui/                               # [TO BE REMOVED ENTIRELY]
│   │   ├── stores/
│   │   │   ├── notes.svelte.ts                   # Core note store
│   │   │   └── zoom.svelte.ts                    # Zoom state
│   │   └── utils.ts                              # Class merging (clsx + tailwind-merge)
│   └── utils/
│       └── export.ts                             # Markdown/HTML/Text export helpers
└── package.json                                  # Dependency manifest updates
```

**Structure Decision**: Inki operates as a single desktop SPA package within `inki-app/`. All UI component migrations occur directly inside `src/lib/components/` and `src/routes/`, removing the redundant wrapper directory `src/lib/components/ui/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | N/A (Full compliance with all constitutional principles) |

