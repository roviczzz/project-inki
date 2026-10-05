# UI Component Contracts: daisyUI 5 Migration

**Feature**: `002-migrate-shadcn-to-daisyui`
**Date**: 2026-10-05
**Status**: Ratified

## 1. Scope & Purpose

This contract specifies the concrete HTML markup structures, daisyUI CSS classes, event bindings, and accessibility requirements for all UI presentation elements across Inki, replacing legacy shadcn-svelte wrappers.

---

## 2. Component Specifications

### 2.1 Buttons (`<button class="btn ...">`)

- **Class Variations**:
  - Ghost Action: `btn btn-ghost btn-sm` (e.g., toolbar actions, close triggers)
  - Icon Only (Square): `btn btn-ghost btn-sm btn-square` (e.g., bold, italic, delete buttons)
  - Primary Action: `btn btn-primary btn-sm` (e.g., save, primary confirmations)
  - Destructive Action: `btn btn-error btn-sm` (e.g., delete note confirmation)
  - Dense / Inline: `btn btn-xs` (e.g., mini-badges or compact actions)
- **Required Attributes**:
  - `type="button"` for all non-submitting action buttons.
  - `aria-label` or `title` when button contains only an icon.
- **Contract Rules**:
  - MUST NOT import from `$lib/components/ui/button`.
  - MUST use native `<button>` element with daisyUI classes.

---

### 2.2 Note Cards (`<div class="card note-card ...">`)

- **Root Element Structure**:
  ```svelte
  <div
    class={cn(
      "card note-card transition-all duration-150 cursor-pointer border select-none",
      isSelected ? "bg-base-300 border-primary shadow-sm" : "bg-base-200 border-transparent hover:bg-base-300/60"
    )}
    data-note-id={note.id}
    onclick={() => handleSelectNote(note.id)}
    oncontextmenu={(e) => handleContextMenu(e, note.id)}
  >
    <div class="card-body p-3 flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-sm truncate text-base-content">{note.title || 'Untitled Note'}</h4>
        <span class="text-xs text-base-content/60">{timeAgo(note.updatedAt)}</span>
      </div>
      <p class="text-xs text-base-content/70 line-clamp-2">{getSnippet(note.content)}</p>
    </div>
  </div>
  ```
- **Invariants**:
  - Class `.note-card` MUST be present on the top element for hit-testing in drag-to-reorder.
  - `data-note-id` attribute MUST match `note.id`.
  - Content must not cause horizontal scroll or overflow.

---

### 2.3 Modals & Overlays (`<div class="modal ...">`)

- **Container Structure**:
  ```svelte
  <div
    class="modal"
    class:modal-open={isOpen}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
  >
    <div class="modal-box bg-base-200 border border-base-300 {customSizeClass}">
      <h3 id={titleId} class="font-bold text-lg text-base-content">{title}</h3>
      <div class="py-4">
        <!-- Modal content -->
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" onclick={onCancel}>Cancel</button>
        <button class="btn btn-primary btn-sm" onclick={onConfirm}>Confirm</button>
      </div>
    </div>
    <div class="modal-backdrop bg-black/40" onclick={onCancel}></div>
  </div>
  ```
- **Accessibility & Interaction**:
  - `Escape` key closes the active modal.
  - Backdrop click triggers dismissal.
  - Focus is trapped or immediately directed to the primary input/button upon opening.

---

### 2.4 Command Palette (`CommandPalette.svelte`)

- **Structure**:
  ```svelte
  <div class="modal" class:modal-open={open} role="dialog" aria-modal="true">
    <div class="modal-box max-w-lg p-0 bg-base-200 border border-base-300 shadow-2xl overflow-hidden">
      <div class="flex items-center px-3 py-2 border-b border-base-300">
        <Search class="h-4 w-4 text-base-content/60 shrink-0 mr-2" />
        <input
          bind:this={inputRef}
          bind:value={search}
          class="input input-ghost w-full text-sm focus:outline-none focus:bg-transparent"
          placeholder="Type a command or search notes..."
        />
      </div>
      <div class="max-h-72 overflow-y-auto slide-thin p-1">
        {#if filteredItems.length === 0}
          <div class="p-4 text-center text-sm text-base-content/60">No results found.</div>
        {:else}
          <ul class="menu w-full p-0">
            {#each filteredItems as item, idx}
              <li>
                <button
                  class={cn("flex items-center justify-between text-sm py-2 px-3 rounded-md", idx === selectedIndex && "active")}
                  onclick={() => execute(item)}
                >
                  <span class="flex items-center gap-2 truncate">
                    <svelte:component this={item.icon} class="h-4 w-4 shrink-0" />
                    <span class="truncate">{item.label}</span>
                  </span>
                  {#if item.shortcut}
                    <kbd class="kbd kbd-sm text-xs bg-base-300">{item.shortcut}</kbd>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
    <div class="modal-backdrop bg-black/50" onclick={() => onOpenChange(false)}></div>
  </div>
  ```

---

### 2.5 Text Inputs & Textareas (`<input class="input ...">`)

- **Title Input (Note Editor)**:
  - `<input class="input input-ghost w-full font-bold text-xl px-0 focus:outline-none focus:bg-transparent" placeholder="Untitled Note" />`
- **Rename Input (Sidebar)**:
  - `<input class="input input-bordered input-xs w-full bg-base-100" />`
- **Search Input (Sidebar/Palette)**:
  - `<input class="input input-bordered input-sm w-full bg-base-100" />`

---

### 2.6 Dividers & Separators

- **Vertical Splitter**:
  - `<div class="divider divider-horizontal m-0 p-0 before:bg-base-300 after:bg-base-300 hidden md:flex"></div>` or `<div class="w-[1px] bg-base-300 shrink-0 hidden md:block"></div>`
- **Horizontal Separator**:
  - `<div class="divider my-1 before:bg-base-300 after:bg-base-300"></div>` or `<hr class="border-base-300 my-1" />`

---

### 2.7 Contextual & Floating Menus (`<ul class="menu ...">`)

- **Markup**:
  ```svelte
  {#if showMenu}
    <div
      class="fixed inset-0 z-40"
      onclick={closeMenu}
      oncontextmenu={(e) => { e.preventDefault(); closeMenu(); }}
    ></div>
    <ul
      class="menu bg-base-200 rounded-box shadow-xl border border-base-300 p-1 text-sm fixed z-50 min-w-44"
      style="left: {menuX}px; top: {menuY}px;"
    >
      {#each items as item}
        <li>
          <button class="flex items-center gap-2 py-1.5 px-2" onclick={item.action}>
            <svelte:component this={item.icon} class="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  ```
