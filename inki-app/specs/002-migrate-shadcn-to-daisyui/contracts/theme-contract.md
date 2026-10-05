# Theme System Contract: daisyUI 5 Migration

**Feature**: `002-migrate-shadcn-to-daisyui`
**Date**: 2026-10-05
**Status**: Ratified

## 1. Scope & Purpose

This contract defines the integration standards, attribute selectors, color tokens, and persistence lifecycle for daisyUI theme switching across Inki.

---

## 2. Theme Attribute Contract

### 2.1 Root HTML Node
- Theme state is declared on `document.documentElement` (`<html lang="en">`).
- **Attributes**:
  - `data-theme`: Set to `"dark"` when dark mode is enabled; set to `"light"` when light mode is enabled.
  - `class="dark"`: Maintained conditionally alongside `data-theme` to preserve any Tailwind `@custom-variant dark` utility compatibility.

### 2.2 Storage Schema
- **Key**: `inki-dark-mode`
- **Location**: `window.localStorage`
- **Values**:
  - `"true"`: User explicitly selected dark mode.
  - `"false"`: User explicitly selected light mode.
  - `null`: Preference unset (falls back to system OS `prefers-color-scheme: dark`).

---

## 3. Semantic Token Mapping Matrix

All components and views must reference daisyUI semantic tokens rather than hardcoded colors:

| Token Category | daisyUI Token Name | Tailwind Class | Semantic Usage |
|---|---|---|---|
| **Base Surface** | `--b1` (Base 100) | `bg-base-100` | Application canvas, main editor backdrop |
| **Secondary Surface** | `--b2` (Base 200) | `bg-base-200` | Sidebar background, modal boxes, dropdowns |
| **Elevated / Hover** | `--b3` (Base 300) | `bg-base-300` | Active card state, button hover, border outlines |
| **Primary Text** | `--bc` (Base Content) | `text-base-content` | Headings, note titles, primary body copy |
| **Muted Text** | `--bc / 0.6` - `0.8` | `text-base-content/70` | Timestamps, secondary hints, icon accents |
| **Brand / Accent** | `--p` (Primary) | `bg-primary`, `border-primary` | Selected card border, primary action highlight |
| **Primary Text On Accent**| `--pc` (Primary Content) | `text-primary-content` | Text inside primary buttons |
| **Destructive / Error** | `--er` (Error) | `btn-error`, `text-error` | Delete confirmations, destructive actions |

---

## 4. Theme Lifecycle & Reaction Flow

```text
[App Mount / Event]
       │
       ├──► Check localStorage['inki-dark-mode']
       │         │
       │         ├── If "true"  ──► Set data-theme="dark" & class="dark"
       │         ├── If "false" ──► Set data-theme="light" & remove class="dark"
       │         └── If null    ──► Query window.matchMedia('(prefers-color-scheme: dark)')
       │                                 ├── If match  ──► Set data-theme="dark"
       │                                 └── Else      ──► Set data-theme="light"
       │
[User Action: Toggle Theme in Command Palette / Shortcut]
       │
       ├──► Flip boolean state
       ├──► Write localStorage.setItem('inki-dark-mode', String(isDark))
       ├──► Update document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
       └──► Update document.documentElement.classList.toggle('dark', isDark)
```

---

## 5. CSS Layer Contract (`src/app.css`)

1. `@import "tailwindcss";` MUST be present at top of file.
2. `@plugin "daisyui";` MUST be imported directly under Tailwind.
3. Legacy shadcn `:root` and `.dark` variable definition blocks (`--background: oklch(...)`, etc.) MUST be removed.
4. Custom thin scrollbar classes (`.slide-thin`, `.slide-thin::-webkit-scrollbar`, etc.) MUST be preserved to ensure desktop scrolling aesthetics.
