# Implementation Plan: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Branch**: `001-fix-concurrency-and-bugs` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fix-concurrency-and-bugs/spec.md`

## Summary

Resolve race conditions, editor bleed-through, and data integrity bugs across rapid typing and note switching by introducing 300ms debounced storage persistence with synchronous flushing on selection transitions and lifecycle teardowns. Enforce strictly contiguous zero-indexed positions across all mutations, implement smooth adjacent selection transitions on deletion, and sanitize storage payloads on load. Cleanly cancel and reset context menus, inline renames, and pointer dragging. Standardize the test runner on Vitest with Happy-DOM, resolve all 12 type/module diagnostic errors, and establish a green baseline for `npm run check` and `npm test`.

## Technical Context

**Language/Version**: TypeScript ~5.6.2, Node.js 18+  
**Primary Dependencies**: Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`), SvelteKit 2 (`@sveltejs/kit` ^2.9.0), Tailwind CSS v4, shadcn-svelte / bits-ui, Tauri v2  
**Storage**: Browser `localStorage` under keys `inki-notes` and `inki-dark-mode`  
**Testing**: Vitest + Happy-DOM, standard DOM event simulation  
**Target Platform**: Desktop client via Tauri v2 (macOS, Windows, Linux) / Web SPA fallback  
**Project Type**: Desktop application (SvelteKit SPA embedded in Tauri v2 shell)  
**Performance Goals**: 60+ FPS UI responsiveness, keystroke latency <16ms, zero dropped characters during 60+ WPM typing, debounced storage writes within 300ms  
**Constraints**: Offline-capable, zero server requirement, strictly typed without `eval` or `{@html}` markup rendering  
**Scale/Scope**: Local note library supporting hundreds of notes with instant search, reordering, and multi-format exports  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **Principle I (Clean Code & Idiomatic Architecture)**: **PASS**. Adheres strictly to Svelte 5 runes (`$state`, `$derived`, `$props`), strict TypeScript typing, and single-responsibility modules. No anti-patterns or hacky workarounds.
- **Principle II (Dependency Hygiene & Minimal Footprint)**: **PASS**. Standardizes on Vitest and existing dev dependencies without adding redundant third-party libraries; uses native DOM APIs and storage events.
- **Principle III (Test-First & Pre-Implementation Validation)**: **PASS**. Automated unit and integration test suites validate store logic, persistence debouncing, contiguous positions, adjacent selection, and error handling before production code changes.
- **Principle IV (Tech Stack Best Practices & Sound Idioms)**: **PASS**. Conforms to Tauri v2 SPA configuration, SvelteKit 2 SPA adapter, module-level `$state` with exported accessor functions in `$lib/stores/*.svelte.ts`, and OKLCH Tailwind design tokens.
- **Principle V (User Experience Consistency & Accessibility)**: **PASS**. Provides instant visual feedback, seamless adjacent selection on note deletion, keyboard shortcuts (`Ctrl+N`, `Ctrl+K`), and accessible ARIA attributes with clean cancellation lifecycles.
- **Principle VI (Performance & Desktop Responsiveness)**: **PASS**. Debounces `localStorage` serialization (300ms) to eliminate main thread blocking while keeping in-memory updates immediate at 60+ FPS.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-concurrency-and-bugs/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 architectural decisions and research
├── data-model.md        # Phase 1 entities, schemas, and state transitions
├── quickstart.md        # Phase 1 developer validation scenarios
├── contracts/           # Phase 1 API & persistence contracts
│   ├── store-contract.md
│   ├── storage-contract.md
│   └── export-contract.md
└── checklists/
    └── requirements.md  # Requirements completeness checklist
```

### Source Code (repository root / inki-app)

```text
inki-app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── NoteEditor.svelte           # Contenteditable editor, formatting, export & flush triggers
│   │   │   ├── NoteSidebar.svelte          # Note cards list, pointer drag, context menus, rename
│   │   │   ├── CommandPalette.svelte       # Global shortcut palette & export handlers
│   │   │   ├── ui/                         # shadcn-svelte UI primitives (button, card, dialog, etc.)
│   │   │   └── __tests__/
│   │   │       ├── NoteEditor.test.ts      # Unit tests for editor formatting and export serialization
│   │   │       └── NoteSidebar.test.ts     # Unit tests for sidebar ordering, timeAgo, and callbacks
│   │   ├── stores/
│   │   │   ├── notes.svelte.ts             # Single source of truth, debouncing, flushSave, ordering, storage sync
│   │   │   ├── zoom.svelte.ts              # Zoom level store
│   │   │   └── __tests__/
│   │   │       ├── test-helpers.ts         # Shared test timer advancing and storage mock resets
│   │   │       ├── notes-concurrency.test.ts # Concurrency, 300ms debouncing, and rapid switch tests
│   │   │       └── notes-ordering.test.ts  # Contiguous indexing and adjacent selection tests
│   │   ├── utils/
│   │   │   └── export.ts                   # Pure export formatting (HTML, MD, TXT, JSON, CSV)
│   │   └── utils.ts                        # Styling and type utilities
│   ├── routes/
│   │   ├── +layout.svelte                  # Root layout, dark mode, global shortcut listeners
│   │   ├── +page.svelte                    # Main split-panel view, responsive sidebar overlay
│   │   └── __tests__/
│   │       ├── layout.test.ts              # Layout and dark mode detection tests
│   │       └── page.test.ts                # Page shortcut and responsive sidebar tests
│   ├── app.css                             # OKLCH theme variables and base styling
│   └── app.html                            # HTML shell
├── package.json                            # Scripts (dev, build, check, test) & dependencies
├── vite.config.js                          # Vite configuration with Vitest setup
└── tsconfig.json                           # TypeScript compiler options
```

**Structure Decision**: Single desktop application structure under `inki-app/` with modular SvelteKit components, Svelte 5 reactive stores, and co-located Vitest test suites.

## Complexity Tracking

> **No Constitution Violations**: The design adheres to all constitutional principles without unnecessary layers or complex abstractions.

| Area | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| In-Memory Immediate + 300ms Debounced Persistence | Prevents UI stutter during typing while ensuring data persistence | Synchronous save on every keystroke blocks UI thread; pure debouncing without synchronous flush loses data on note switch |
| Contiguous Integer Re-indexing | Guarantees deterministic position ordering | Fractional / floating indexing degrades over time and still requires normalization |
| Adjacent Selection Transition on Delete | Provides seamless UX when deleting active note | Clearing selection to blank screen forces unnecessary user clicks |
| Vitest Standardization | Restores green quality gates for `npm run check` and `npm test` | Unconfigured `bun:test` mocks produce 12 type errors and do not execute |

