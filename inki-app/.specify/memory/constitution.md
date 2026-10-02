<!--
# Sync Impact Report
- Version change: 0.0.0 → 1.0.0 (Initial Ratification)
- Modified principles: Initial population from template placeholders:
  - PRINCIPLE_1_NAME → I. Clean Code & Idiomatic Architecture
  - PRINCIPLE_2_NAME → II. Dependency Hygiene & Minimal Footprint
  - PRINCIPLE_3_NAME → III. Test-First & Pre-Implementation Validation (NON-NEGOTIABLE)
  - PRINCIPLE_4_NAME → IV. Tech Stack Best Practices & Sound Idioms
  - PRINCIPLE_5_NAME → V. User Experience Consistency & Accessibility
  - Added: VI. Performance & Desktop Responsiveness
- Added sections:
  - Technical Constraints & Quality Standards
  - Development Workflow & Quality Gates
- Removed sections: None
- Follow-up TODOs: None
-->

# Inki Constitution

## Core Principles

### I. Clean Code & Idiomatic Architecture
All code written for Inki MUST be optimal, readable, and maintainable. Code MUST adhere to single-responsibility principles, strict TypeScript typing, and Svelte 5 runes (`$state`, `$derived`, `$props`). Anti-patterns, legacy debt, hacky workarounds, and dead code are strictly prohibited. Code MUST be self-documenting; comments are reserved exclusively for complex algorithmic decisions or non-obvious edge cases.

### II. Dependency Hygiene & Minimal Footprint
Dependencies MUST remain minimal, audited, and strictly justified. Developers MUST prefer standard Web/DOM APIs, browser primitives, and native framework features over pulling in redundant third-party libraries. Any addition or upgrade of dependencies MUST undergo a footprint evaluation to ensure bundle size and memory usage remain lean.

### III. Test-First & Pre-Implementation Validation (NON-NEGOTIABLE)
Standardized automated tests (unit, integration, and component tests) MUST be designed and written before implementing business logic, state mutations, or architectural changes. The Red-Green-Refactor development cycle MUST be strictly enforced: specify requirements → write failing tests → implement minimal code to pass → refactor cleanly. No pull request or feature branch shall be merged without passing all standard quality gates and verifying regression-free behavior.

### IV. Tech Stack Best Practices & Sound Idioms
All contributions MUST strictly follow best practices tailored to Inki's core tech stack:
- **Tauri v2**: Maintain desktop IPC safety, strict port configuration (`1420`), static SPA output distribution, and minimal native bridge overhead.
- **SvelteKit 2 + Svelte 5**: Use SPA mode (`adapter-static` with fallback, `ssr = false`). State MUST be managed using module-level `$state` with exported accessor functions in `$lib/stores/*.svelte.ts` as the single source of truth.
- **Tailwind CSS v4 + shadcn-svelte**: Leverage OKLCH design tokens, accessible UI primitives (`bits-ui`), and utility-first styling without style pollution.

### V. User Experience Consistency & Accessibility
The user experience MUST remain cohesive, fluid, intuitive, and accessible across the entire application:
- Layout and interactions MUST provide instant feedback (e.g., responsive two-panel split, keyboard shortcuts like `Ctrl+N`/`Cmd+N`, and safe confirmation dialogs).
- The theme engine MUST honor system preferences and user choices (dark/light mode toggling via OKLCH CSS variables) consistently without flicker.
- Interactive elements MUST comply with accessibility standards (proper ARIA attributes, semantic markup, and reliable keyboard focus management).

### VI. Performance & Desktop Responsiveness
Inki MUST maintain near-instant startup times, minimal memory consumption, and a consistent 60+ FPS UI responsiveness:
- Note editing and text manipulation MUST be latency-free.
- Persistence operations (e.g., `localStorage` synchronization) MUST be debounced/throttled to avoid blocking the main UI thread during rapid user input.
- Render trees MUST avoid unnecessary DOM re-renders and excessive layout thrashing.

## Technical Constraints & Quality Standards

- **Runtime & Deployment**: The application is packaged as a lightweight desktop client using Tauri v2 wrapping a SvelteKit SPA. The client MUST run without requiring an active Node.js server at runtime.
- **Storage & State Isolation**: All persistent note data MUST be serialized cleanly under namespaced storage keys (`inki-notes`, `inki-dark-mode`) with backwards-compatible schema handling.
- **Security & Sandboxing**: Desktop capabilities MUST respect Tauri permission scopes. Arbitrary dynamic code execution (`eval`), unsanitized markup rendering via `{@html}`, or unsafe IPC invocations are strictly forbidden.

## Development Workflow & Quality Gates

- **Quality Gate Enforcement**: `npm run check` (type-checking and Svelte diagnostics) is a mandatory gate and MUST pass with zero new errors outside known reference baselines.
- **Testing Verification**: Features and bugfixes MUST be accompanied by automated test suites validating behavior before merging.
- **Surgical Changes**: All modifications MUST be precise, minimal, and verified against regressions. Unrelated refactoring or drive-by formatting changes outside the scope of the task are prohibited.

## Governance

This Constitution supersedes all ad-hoc conventions and unwritten practices. Any deviation from these principles MUST be explicitly documented, justified, and approved through a formal amendment process.

- **Amendment Procedure**: Amendments require submitting a proposal detailing the motivation, impact assessment, and migration strategy for affected code.
- **Versioning Policy**: The Constitution follows Semantic Versioning (`MAJOR.MINOR.PATCH`):
  - **MAJOR**: Incompatible principle removals or foundational governance restructuring.
  - **MINOR**: Addition of new principles, sections, or materially expanded guidelines.
  - **PATCH**: Non-semantic wording refinements, formatting improvements, or clarifications.
- **Compliance Auditing**: Every specification, plan, task list, and pull request MUST be verified against these constitutional principles prior to execution and merging.

**Version**: 1.0.0 | **Ratified**: 2026-10-02 | **Last Amended**: 2026-10-02
