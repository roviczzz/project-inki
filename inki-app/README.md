# inki-app

A lightweight notepad application with a clean two-panel interface. Built with SvelteKit 2, Tauri v2, Tailwind CSS v4, and shadcn-svelte.

## Development

```bash
npm install
npm run dev
```

The web app runs at `http://localhost:5173` by default.

### Desktop (Tauri)

```bash
npm run tauri dev
```

### Code Quality

```bash
npm run check         # Svelte type-checking
npm run build         # Production build
```

## Architecture

### State Management

All note state lives in `src/lib/stores/notes.svelte.ts` using Svelte 5 runes:

- **`$state`** — reactive `notes` array and `selectedNoteId`
- **`$derived`** — computed `selectedNote` from ID lookup
- **`$effect`** — editor component syncs local editing state when selection changes

#### Persistence

Notes are persisted to `localStorage` under the key `inki-notes`:

- **`loadFromLocalStorage()`** — called once on module init to hydrate state from storage
- **`saveToLocalStorage()`** — called after every mutation (`addNote`, `deleteNote`, `updateNote`)
- Captures both `notes` array and `selectedNoteId` so selection state is restored across sessions
- Silently ignores errors when `localStorage` is unavailable or corrupted

### Note Data Model

```typescript
interface Note {
  id: string;         // crypto.randomUUID()
  title: string;      // editable title, defaults to "Note - MMM DD, YYYY"
  content: string;    // editable body text
  createdAt: number;  // Date.now() on creation
  updatedAt: number;  // Date.now() on creation and every update
}
```

### Store API

| Export | Type | Description |
|--------|------|-------------|
| `Note` | Type | Note data model interface |
| `selectedNote` | Readable | The currently selected Note or `null` |
| `addNote()` | Function | Creates a new note with default title, returns it |
| `deleteNote(id)` | Function | Removes a note by ID |
| `updateNote(id, updates)` | Function | Merges `{ title?, content? }` into a note, bumps `updatedAt` |
| `selectNote(id \| null)` | Function | Sets the active selection |
| `getNotes()` | Function | Returns all notes sorted by `updatedAt` descending |
| `loadFromLocalStorage()` | Function | Hydrates state from localStorage (called automatically on init) |

### Layout

The entire app is a single route (`/`) with a two-panel layout. On desktop (`md+`), the sidebar is always visible at 280px. On mobile, the sidebar becomes an overlay triggered by a hamburger menu button.

```
┌─────────────────────────────────────────┐        ┌──────────────────────┐
│  ┌──────────┐  │                        │        │  ☰                  │
│  │ Sidebar  │  │   Editor               │        │ ┌──────────┐       │
│  │ 280px    │  │   (flex-1)             │        │ │ Sidebar  │       │
│  │          │  │                        │        │ │ (overlay) │       │
│  │ [New Note]│  │   ┌─ Title ─────────┐ │        │ │          │       │
│  │ ──────── │  │   │                  │ │        │ │ [New Note]│       │
│  │ Note 1   │  │   └──────────────────┘ │        │ │ ──────── │       │
│  │ Note 2   │  │   ┌─ Body ───────────┐ │        │ │ Note 1   │       │
│  │ Note 3   │  │   │                  │ │        │ │ Note 2   │       │
│  │ ...      │  │   │                  │ │        │ │ Note 3   │       │
│  └──────────┘  │   └──────────────────┘ │        │ │ ...      │       │
└─────────────────────────────────────────┘        │ └──────────┘       │
     Desktop (>=768px)                              └──────────────────────┘
                                                         Mobile (<768px)
```

On mobile:
- A **hamburger icon** (Menu) is fixed at the top-left corner
- Tapping it slides in the sidebar as an overlay panel with a **semi-transparent backdrop** (`bg-black/50`)
- Selecting a note **automatically closes** the sidebar via the `onNoteSelect` callback
- Tapping the backdrop also dismisses the sidebar

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N / Cmd+N | Create a new note, select it, and focus the editor |

### Dark Mode

Dark mode is handled in `src/routes/+layout.svelte`:

- On mount, reads `prefers-color-scheme: dark` via `window.matchMedia`
- Toggles the `dark` class on `document.documentElement` to match the system preference
- Listens for live changes — switching system theme while the app is open updates immediately

## UI Components (shadcn-svelte)

The following shadcn-svelte components are installed and used:

- **Button** — New Note, Create New Note actions
- **Input** — Note title editor
- **Textarea** — Note body editor
- **Card** — Note list items in the sidebar
- **Dialog** — Delete confirmation with cancel/confirm actions
- **Separator** — Vertical divider between sidebar and editor
- **ScrollArea** — Scrollable note list in sidebar
