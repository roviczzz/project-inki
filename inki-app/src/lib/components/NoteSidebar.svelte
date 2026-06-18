<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
  } from '$lib/components/ui/dialog/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import {
    addNote, deleteNote, getNotes, selectNote, getSelectedNote,
    reorderNote, duplicateNote, renameNote, moveNote
  } from '$lib/stores/notes.svelte.ts';
  import { cn } from '$lib/utils.js';
  import { fade } from 'svelte/transition';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Copy from '@lucide/svelte/icons/copy';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';

  let { onNoteSelect }: { onNoteSelect?: () => void } = $props();

  let fileInput: HTMLInputElement;

  let notesList = $derived(getNotes());
  let deletingNoteId = $state<string | null>(null);

  // Context menu state
  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxMenuVisible = $state(false);
  let ctxMenuTarget = $state<'card' | 'empty'>('card');
  let ctxNoteId = $state<string | null>(null);

  // Inline rename state
  let renamingNoteId = $state<string | null>(null);
  let renameValue = $state('');
  let renameInput: HTMLInputElement = $state() as unknown as HTMLInputElement;

  // Pointer drag state
  let dragNoteId = $state<string | null>(null);
  let dragOverNoteId = $state<string | null>(null);
  let isDragging = $state(false);
  let ghostX = $state(0);
  let ghostY = $state(0);
  let ghostNote = $derived(dragNoteId ? notesList.find((n) => n.id === dragNoteId) ?? null : null);

  function timeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function handleNewNote(): void {
    const note = addNote();
    selectNote(note.id);
  }

  function handleSelectNote(id: string): void {
    if (isDragging) return;
    selectNote(id);
    onNoteSelect?.();
  }

  function handleDeleteClick(e: Event, id: string): void {
    e.stopPropagation();
    deletingNoteId = id;
  }

  function handleConfirmDelete(): void {
    if (deletingNoteId) {
      deleteNote(deletingNoteId);
      deletingNoteId = null;
    }
  }

  function handleCancelDelete(): void {
    deletingNoteId = null;
  }

  function handleOpenFile(): void {
    fileInput.click();
  }

  function handleFileChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const title = file.name.replace(/\.[^/.]+$/, "");
      const note = addNote(title, content);
      selectNote(note.id);
      onNoteSelect?.();
    };
    reader.readAsText(file);
    target.value = '';
  }

  // --- Context menu handlers ---

  function openNoteCtxMenu(e: MouseEvent, noteId: string): void {
    e.preventDefault();
    e.stopPropagation();
    closeCtxMenu();
    closeRename();
    ctxNoteId = noteId;
    ctxMenuTarget = 'card';
    positionMenu(e);
    ctxMenuVisible = true;
  }

  function openEmptyCtxMenu(e: MouseEvent): void {
    e.preventDefault();
    closeCtxMenu();
    closeRename();
    ctxNoteId = null;
    ctxMenuTarget = 'empty';
    positionMenu(e);
    ctxMenuVisible = true;
  }

  function positionMenu(e: MouseEvent): void {
    const menuWidth = 200;
    const menuHeight = 300;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    ctxMenuX = x;
    ctxMenuY = y;
  }

  function closeCtxMenu(): void {
    ctxMenuVisible = false;
    ctxNoteId = null;
  }

  // --- Context menu actions ---

  function handleCtxDelete(): void {
    if (ctxNoteId) deletingNoteId = ctxNoteId;
    closeCtxMenu();
  }

  function handleCtxDuplicate(): void {
    if (ctxNoteId) duplicateNote(ctxNoteId);
    closeCtxMenu();
  }

  function handleCtxRename(): void {
    if (ctxNoteId) {
      const note = getNotes().find((n) => n.id === ctxNoteId);
      if (note) {
        renamingNoteId = ctxNoteId;
        renameValue = note.title;
        closeCtxMenu();
        requestAnimationFrame(() => renameInput?.focus());
      }
    }
  }

  function handleCtxMove(direction: 'up' | 'down' | 'top' | 'bottom'): void {
    if (ctxNoteId) moveNote(ctxNoteId, direction);
    closeCtxMenu();
  }

  // --- Inline rename ---

  function commitRename(): void {
    if (renamingNoteId) {
      const val = renameValue.trim();
      if (val) renameNote(renamingNoteId, val);
      renamingNoteId = null;
    }
  }

  function closeRename(): void {
    renamingNoteId = null;
  }

  function handleRenameKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeRename(); }
  }

  // --- Custom pointer events drag & drop reordering ---

  function handlePointerDown(e: PointerEvent, id: string): void {
    // Only drag with primary mouse button click or touch
    if (e.button !== 0) return;
    
    // Do not initiate drag if clicking delete button or input field
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    dragNoteId = id;
    isDragging = false;
    
    // Capture pointer to receive move/up events even if cursor goes outside the element
    target.closest('[role="button"]')?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent, id: string): void {
    if (dragNoteId !== id) return;
    
    // Require a minimum movement of 3px to start dragging (avoids accidental click-dragging)
    if (!isDragging) {
      isDragging = true;
    }
    
    ghostX = e.clientX;
    ghostY = e.clientY;
    
    // Find what element is currently under the cursor
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    const cardUnderCursor = elementUnderCursor?.closest('.note-card') as HTMLElement;
    if (cardUnderCursor) {
      const underId = cardUnderCursor.dataset.noteId;
      if (underId && underId !== dragNoteId) {
        dragOverNoteId = underId;
      } else {
        dragOverNoteId = null;
      }
    } else {
      dragOverNoteId = null;
    }
  }

  function handlePointerUp(e: PointerEvent, id: string): void {
    if (dragNoteId !== id) return;

    // Release pointer capture
    const cardEl = e.currentTarget as HTMLElement;
    try {
      cardEl.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isDragging && dragOverNoteId && dragOverNoteId !== dragNoteId) {
      const targetIdx = notesList.findIndex((n) => n.id === dragOverNoteId);
      if (targetIdx !== -1) {
        reorderNote(dragNoteId, targetIdx);
      }
    }

    // Reset states
    dragNoteId = null;
    dragOverNoteId = null;
    // Delay resetting isDragging slightly so click event handler knows not to select note
    setTimeout(() => {
      isDragging = false;
    }, 50);
  }
</script>

<div class="flex h-full w-full flex-col select-none" oncontextmenu={openEmptyCtxMenu} role="presentation">
  <div class="p-3 flex gap-2">
    <Button variant="outline" class="flex-1" onclick={handleNewNote}>
      <Plus class="size-4 mr-1" />
      New Note
    </Button>
    <Button variant="outline" class="px-3" onclick={handleOpenFile} aria-label="Open File">
      <FolderOpen class="size-4" />
    </Button>
    <input
      type="file"
      accept=".txt,.md,.json"
      bind:this={fileInput}
      onchange={handleFileChange}
      class="hidden"
    />
  </div>

  {#if notesList.length > 0}
    <ScrollArea class="flex-1 min-h-0">
      <div class="flex flex-col gap-1 px-3 pb-3">
        {#each notesList as note (note.id)}
          <Card
            class={cn(
              'relative cursor-pointer transition-all duration-150 w-full note-card touch-none',
              dragOverNoteId === note.id && 'ring-2 ring-primary bg-accent/50'
            )}
            data-note-id={note.id}
            onpointerdown={(e) => handlePointerDown(e, note.id)}
            onpointermove={(e) => handlePointerMove(e, note.id)}
            onpointerup={(e) => handlePointerUp(e, note.id)}
            onclick={() => handleSelectNote(note.id)}
            oncontextmenu={(e) => openNoteCtxMenu(e, note.id)}
            role="button"
            tabindex={0}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectNote(note.id);
              }
            }}
          >
            <CardContent>
              <div class="absolute top-2 right-2 flex items-center gap-1">
                <div class="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                  <GripVertical class="size-4" />
                </div>
                <button
                  onclick={(e) => handleDeleteClick(e, note.id)}
                  onkeydown={(e) => e.stopPropagation()}
                  tabindex={-1}
                  class="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete note"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>
              {#if renamingNoteId === note.id}
                <input
                  bind:this={renameInput}
                  type="text"
                  bind:value={renameValue}
                  onblur={commitRename}
                  onkeydown={handleRenameKeydown}
                  onclick={(e) => e.stopPropagation()}
                  oncontextmenu={(e) => { e.stopPropagation(); openNoteCtxMenu(e, note.id); }}
                  class="w-full text-sm font-medium bg-transparent border-b border-primary outline-none px-0 py-0 mb-0"
                />
              {:else}
                <p class="truncate text-sm font-medium">{note.title}</p>
              {/if}
              <p class="truncate text-xs text-muted-foreground">
                {note.content ? note.content.replace(/<[^>]*>/g, '').slice(0, 80) : ''}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">{timeAgo(note.updatedAt)}</p>
            </CardContent>
          </Card>
        {/each}
      </div>
    </ScrollArea>
  {:else}
    <div class="flex flex-1 items-center justify-center px-3 min-h-0">
      <p class="text-sm text-muted-foreground">No notes yet</p>
    </div>
  {/if}

  <!-- Delete confirmation dialog -->
  <Dialog open={deletingNoteId !== null} onOpenChange={(open) => { if (!open) deletingNoteId = null; }}>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Delete Note</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this note? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onclick={handleCancelDelete}>Cancel</Button>
        <Button variant="destructive" onclick={handleConfirmDelete}>Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>

<!-- Context menu -->
<svelte:window onclick={closeCtxMenu} onkeydown={(e) => e.key === 'Escape' && closeCtxMenu()} />

{#if ctxMenuVisible}
  <div
    class="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    style="left: {ctxMenuX}px; top: {ctxMenuY}px;"
    oncontextmenu={(e) => e.preventDefault()} role="presentation"
  >
    {#if ctxMenuTarget === 'card'}
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={handleCtxRename}
      >
        <Pencil class="size-4" />
        <span>Rename</span>
      </button>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={handleCtxDuplicate}
      >
        <Copy class="size-4" />
        <span>Duplicate</span>
      </button>
      <div class="my-1 h-px bg-border"></div>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('up')}
      >
        <ArrowUp class="size-4" />
        <span>Move Up</span>
      </button>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('down')}
      >
        <ArrowDown class="size-4" />
        <span>Move Down</span>
      </button>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('top')}
      >
        <ArrowUpToLine class="size-4" />
        <span>Move to Top</span>
      </button>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('bottom')}
      >
        <ArrowDownToLine class="size-4" />
        <span>Move to Bottom</span>
      </button>
      <div class="my-1 h-px bg-border"></div>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer text-destructive"
        onclick={handleCtxDelete}
      >
        <Trash2 class="size-4" />
        <span>Delete</span>
      </button>
    {:else}
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => { closeCtxMenu(); handleNewNote(); }}
      >
        <Plus class="size-4" />
        <span>New Note</span>
      </button>
      <button
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => { closeCtxMenu(); handleOpenFile(); }}
      >
        <FolderOpen class="size-4" />
        <span>Import File</span>
      </button>
    {/if}
  </div>
{/if}

{#if isDragging && dragNoteId && ghostNote}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed z-[100] pointer-events-none w-[260px] rounded-xl border border-border bg-card p-4 shadow-xl rotate-2 opacity-90"
    style="left: {ghostX + 16}px; top: {ghostY - 48}px;"
  >
    <p class="truncate text-sm font-medium">{ghostNote.title}</p>
    <p class="truncate text-xs text-muted-foreground mt-1">
      {ghostNote.content ? ghostNote.content.replace(/<[^>]*>/g, '').slice(0, 60) : ''}
    </p>
  </div>
{/if}
