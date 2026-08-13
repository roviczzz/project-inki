# project-inki

A lightweight, reactive notepad application built with Tauri + SvelteKit + shadcn-svelte.

Inki provides a clean two-panel interface for creating, editing, and managing text notes with real-time updates, keyboard shortcuts, and dark mode support.

<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/effe69e7-fbd8-480c-9cd6-c24d23e98b9d" />


## Features

- **Two-panel layout** — 280px sidebar with note list + flexible editor area, responsive overlay on mobile
- **Full CRUD** — Create, read, update, and delete notes with confirmation dialog
- **localStorage persistence** — Notes survive page reloads and app restarts
- **Real-time sync** — All edits update the store immediately via Svelte 5 runes
- **Keyboard shortcut** — Ctrl+N / Cmd+N creates a new note instantly
- **Delete confirmation** — Dialog with cancel/confirm before removing notes
- **Responsive design** — Hamburger menu with overlay sidebar on mobile, auto-closes on selection
- **Dark mode** — Auto-detects and follows system color scheme preference
- **Empty states** — Clear prompts when no notes exist or none are selected

<img width="1920" height="1020" alt="image" src="https://github.com/user-attachments/assets/39bd9a66-1fa7-494e-9e54-164170d689a5" />


## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 + Svelte 5 |
| Desktop Shell | Tauri v2 |
| Styling | Tailwind CSS v4 + shadcn-svelte |
| Icons | Lucide Svelte |
| State | Svelte 5 runes (`$state`, `$derived`, `$effect`) |

## Project Structure

```
inki-app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── NoteEditor.svelte    # Editor panel (title + body)
│   │   │   ├── NoteSidebar.svelte   # Note list + New Note button
│   │   │   └── ui/                  # shadcn-svelte components
│   │   ├── stores/
│   │   │   └── notes.svelte.ts      # Reactive notes store (CRUD)
│   │   └── utils.ts                 # cn() utility
│   ├── routes/
│   │   └── +page.svelte             # Single-page app layout
│   └── app.css                      # Global styles + CSS variables
└── package.json
```

## Getting Started

```bash
cd inki-app
npm install
npm run dev
```

For the desktop Tauri app:

```bash
npm run tauri dev
```
