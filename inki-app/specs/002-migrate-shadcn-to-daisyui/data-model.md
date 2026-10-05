# Data Model & Component Architecture: daisyUI Migration

**Feature**: `002-migrate-shadcn-to-daisyui`
**Date**: 2026-10-05
**Status**: Completed

## 1. Component Mapping & Presentation Model

This specification models the transition from headless/wrapper shadcn-svelte components to semantic daisyUI 5 CSS elements.

### Component Transformation Matrix

| UI Element / Purpose | Legacy Component (`$lib/components/ui/`) | daisyUI 5 Target Structure | Semantic Classes & Tokens |
|---|---|---|---|
| **Action Button** | `Button` (`variant`, `size`) | `<button class="btn ...">` | `btn btn-ghost`, `btn-primary`, `btn-error`, `btn-sm`, `btn-xs`, `btn-square` |
| **Note Card** | `Card`, `CardContent` | `<div class="card note-card ...">` | `card bg-base-200 card-body p-3 cursor-pointer hover:bg-base-300`, `data-note-id` |
| **Confirmation Dialog** | `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter` | `<div class="modal" class:modal-open={open}>` | `modal`, `modal-box`, `modal-action`, `modal-backdrop`, `btn`, `btn-ghost` |
| **Command Palette Overlay**| `Dialog`, `DialogContent`, `ScrollArea` | `<div class="modal" class:modal-open={open}>` | `modal`, `modal-box max-w-lg p-0`, `menu`, `input input-ghost`, `slide-thin` |
| **Text Input** | `Input` | `<input class="input ...">` | `input input-bordered input-sm w-full`, `input-ghost` |
| **Text Area** | `Textarea` | `<textarea class="textarea ...">`| `textarea textarea-bordered w-full` |
| **Layout Divider** | `Separator` (`orientation`) | `<div class="divider ...">` or border | `divider divider-horizontal`, `divider-vertical`, `border-base-300` |
| **Scrollable Area** | `ScrollArea`, `Scrollbar` | `<div class="overflow-y-auto slide-thin">` | Native container with custom thin scrollbar utility |
| **Context / Popup Menu**| Custom positioned floating `div` | `<ul class="menu bg-base-200 rounded-box shadow-lg p-2">` | `menu`, `menu-title`, `rounded-box`, `bg-base-200`, `shadow-lg` |

---

## 2. Component State Models

### 2.1 Command Palette Component (`CommandPalette.svelte`)

Represents the global fuzzy command search and note navigation overlay.

- **Props**:
  - `open: boolean` (Controls visibility of modal container)
  - `onOpenChange: (open: boolean) => void` (Event callback to toggle parent palette state)
- **Local State (`$state`)**:
  - `search: string` (Current user search query string)
  - `selectedIndex: number` (0-based index of highlighted palette item)
  - `inputRef: HTMLInputElement | null` (Reference for auto-focusing on modal open)
- **Derived State (`$derived`)**:
  - `allItems: PaletteItem[]` (Consolidated list of commands and search-filtered notes)
  - `filteredItems: PaletteItem[]` (Fuzzy matched list of items)
- **DOM Structure**:
  ```svelte
  <div class="modal" class:modal-open={open} role="dialog" aria-modal="true">
    <div class="modal-box max-w-lg p-0 bg-base-200 shadow-2xl border border-base-300">
      <div class="p-3 border-b border-base-300 flex items-center gap-2">
        <Search class="h-4 w-4 text-base-content/60" />
        <input
          bind:this={inputRef}
          bind:value={search}
          class="input input-ghost w-full focus:outline-none focus:bg-transparent"
          placeholder="Type a command or search notes..."
        />
      </div>
      <div class="max-h-72 overflow-y-auto slide-thin p-2">
        <ul class="menu w-full p-0 gap-1">
          {#each filteredItems as item, index}
            <li>
              <button
                class="flex items-center justify-between rounded-lg p-2"
                class:active={index === selectedIndex}
                onclick={() => executeItem(item)}
              >
                <!-- Item content & shortcuts -->
              </button>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <div class="modal-backdrop bg-black/40" onclick={() => onOpenChange(false)}></div>
  </div>
  ```

---

### 2.2 Delete Confirmation Modal (`NoteSidebar.svelte`)

Represents the protective confirmation dialog triggered before permanently removing a note.

- **Local State (`$state`)**:
  - `deletingNoteId: string | null` (ID of the note pending deletion, or `null` if closed)
- **Derived State (`$derived`)**:
  - `isOpen: boolean` (`deletingNoteId !== null`)
- **DOM Structure**:
  ```svelte
  <div class="modal" class:modal-open={deletingNoteId !== null} role="dialog" aria-modal="true">
    <div class="modal-box bg-base-200 border border-base-300 max-w-sm">
      <h3 class="font-bold text-lg text-base-content">Delete Note</h3>
      <p class="py-4 text-sm text-base-content/80">
        Are you sure you want to delete this note? This action cannot be undone.
      </p>
      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" onclick={handleCancelDelete}>Cancel</button>
        <button class="btn btn-error btn-sm" onclick={handleConfirmDelete}>Delete</button>
      </div>
    </div>
    <div class="modal-backdrop bg-black/40" onclick={handleCancelDelete}></div>
  </div>
  ```

---

### 2.3 Note Card Representation (`NoteSidebar.svelte`)

Represents the visual and interactive card item in the sidebar note list.

- **Entity Fields**:
  - `id: string` (Unique note identifier UUID)
  - `title: string` (Note title, fallback to "Untitled Note")
  - `content: string` (HTML content snippet)
  - `updatedAt: number` (Timestamp in milliseconds)
  - `position: number` (Ordering index)
- **DOM Hit-Testing Invariants (CRITICAL)**:
  - Class `note-card` MUST exist on the top-level card container for pointer hit-testing via `document.elementFromPoint(x, y).closest('.note-card')`.
  - Attribute `data-note-id={note.id}` MUST be present on the top-level card container.
- **DOM Structure**:
  ```svelte
  <div
    class={cn(
      "card note-card relative group transition-all duration-150 cursor-pointer border",
      isSelected
        ? "bg-base-300 border-primary text-base-content shadow-sm"
        : "bg-base-200 border-transparent hover:bg-base-300/60 hover:border-base-300 text-base-content/90"
    )}
    data-note-id={note.id}
    onclick={() => handleSelectNote(note.id)}
  >
    <div class="card-body p-3">
      <!-- Title, timestamp, grip handle, quick action buttons -->
    </div>
  </div>
  ```

---

### 2.4 Editor Toolbar & Format Controls (`NoteEditor.svelte`)

Represents the rich-text editing controls and top toolbar.

- **Action Controls**:
  - Format buttons: Bold, Italic, Strikethrough, Code, Headings (H1, H2, H3), Quote, Unordered List, Ordered List.
  - Zoom controls: Zoom In (`btn btn-ghost btn-sm`), Zoom Out, Zoom Reset.
  - Export trigger: More options dropdown / context menu.
- **DOM Structure**:
  ```svelte
  <button
    class="btn btn-ghost btn-sm btn-square hover:bg-base-300"
    title="Bold (Ctrl+B)"
    onclick={() => applyFormat('bold')}
  >
    <Bold class="h-4 w-4" />
  </button>
  ```

---

## 3. Theme Configuration Model

### 3.1 Theme State & Persistence

- **Storage Key**: `localStorage['inki-dark-mode']`
  - Values: `'true'` (Dark theme enabled) | `'false'` (Light theme enabled) | `null` (System default)
- **Root DOM Attributes**:
  - `document.documentElement.setAttribute('data-theme', themeName)` where `themeName` is `'dark'` or `'light'`.
  - `document.documentElement.classList.toggle('dark', isDark)` (Maintained for backward compatibility).
- **CSS Semantic Tokens**:
  - Base Surfaces: `--b1` (`bg-base-100`), `--b2` (`bg-base-200`), `--b3` (`bg-base-300`)
  - Content/Text: `--bc` (`text-base-content`)
  - Accent/Primary: `--p` (`bg-primary`), `--pc` (`text-primary-content`)
  - Error/Destructive: `--er` (`btn-error`, `text-error`), `--erc` (`text-error-content`)

---

## 4. Validation Rules & Invariants

1. **Zero Runtime Missing Element Exceptions**: Every component click, keydown, and scroll handler must handle potential null DOM references gracefully.
2. **Hit-Testing Preserved**: The drag-to-reorder function must find `.note-card` elements and read `data-note-id` at all times.
3. **No `{@html}` Injection**: Note content editing remains strictly in `contenteditable` innerHTML / execCommand bindings without rendering unsanitized Svelte HTML blocks.
4. **Theme Synchronization**: Changing themes updates `data-theme`, CSS variables, and child overlay components instantly without requiring a page reload.
