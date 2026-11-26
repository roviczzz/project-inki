<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
  } from '$lib/components/ui/dialog/index.js';
  import { FancyText } from '$lib/components/ui/fancy-text/index.js';
  import {
    LabelBadge,
    labels as allLabels,
    resolveLabels,
    type LabelId
  } from '$lib/components/ui/label-badges/index.ts';
  import {
    addNote, deleteNote, getNotes, selectNote, getSelectedNote,
    reorderNote, duplicateNote, renameNote, moveNote, toggleNoteLabel
  } from '$lib/stores/notes.svelte.ts';
  import { cn } from '$lib/utils.js';
  import { fade } from 'svelte/transition';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Upload from '@lucide/svelte/icons/upload';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Copy from '@lucide/svelte/icons/copy';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
  import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
  import Check from '@lucide/svelte/icons/check';

  let { onNoteSelect }: { onNoteSelect?: () => void } = $props();

  let fileInput: HTMLInputElement;

  let notesList = $derived(getNotes());
  let selectedNote = $derived(getSelectedNote());
  let deletingNoteId = $state<string | null>(null);

  let ctxMenuX = $state(0);
  let ctxMenuY = $state(0);
  let ctxMenuVisible = $state(false);
  let ctxMenuTarget = $state<'card' | 'empty'>('card');
  let ctxNoteId = $state<string | null>(null);

  let renamingNoteId = $state<string | null>(null);
  let renameValue = $state('');
  let renameInput: HTMLInputElement = $state() as unknown as HTMLInputElement;

  let dragNoteId = $state<string | null>(null);
  let dragOverNoteId = $state<string | null>(null);
  let isDragging = $state(false);
  let ghostX = $state(0);
  let ghostY = $state(0);
  let ghostNote = $derived(dragNoteId ? notesList.find((n) => n.id === dragNoteId) ?? null : null);
  let ctxNote = $derived(ctxNoteId ? notesList.find((n) => n.id === ctxNoteId) ?? null : null);

  function getNotePreview(content: string, maxLength = 80): string {
    if (!content) return '';
    return content
      .replace(/<br\s*\/?>|<\/?(?:div|p|h[1-6]|li|ul|ol|blockquote|pre|tr|td|th|hr)[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function handleCtxToggleLabel(labelId: LabelId): void {
    if (ctxNoteId) {
      toggleNoteLabel(ctxNoteId, labelId);
    }
  }

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
    closeCtxMenu();
    closeRename();
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

  function openNoteCtxMenu(e: MouseEvent, noteId: string): void {
    e.preventDefault();
    e.stopPropagation();
    closeCtxMenu();
    closeRename();
    cancelDrag();
    ctxNoteId = noteId;
    ctxMenuTarget = 'card';
    positionMenu(e);
    ctxMenuVisible = true;
  }

  function openEmptyCtxMenu(e: MouseEvent): void {
    e.preventDefault();
    closeCtxMenu();
    closeRename();
    cancelDrag();
    ctxNoteId = null;
    ctxMenuTarget = 'empty';
    positionMenu(e);
    ctxMenuVisible = true;
  }

  function positionMenu(e: MouseEvent): void {
    const menuWidth = 220;
    const menuHeight = 460;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = Math.max(10, window.innerWidth - menuWidth - 10);
    if (y + menuHeight > window.innerHeight) y = Math.max(10, window.innerHeight - menuHeight - 10);
    ctxMenuX = x;
    ctxMenuY = y;
  }

  function closeCtxMenu(): void {
    ctxMenuVisible = false;
    ctxNoteId = null;
  }

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

  function commitRename(): void {
    if (renamingNoteId) {
      const val = renameValue.trim();
      if (val) renameNote(renamingNoteId, val);
      renamingNoteId = null;
      renameValue = '';
    }
  }

  function closeRename(): void {
    renamingNoteId = null;
    renameValue = '';
  }

  function handleRenameKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeRename(); }
  }

  function cancelDrag(targetEl?: HTMLElement | null, pointerId?: number): void {
    if (targetEl && pointerId !== undefined) {
      try {
        targetEl.releasePointerCapture(pointerId);
      } catch {}
    }
    dragNoteId = null;
    dragOverNoteId = null;
    isDragging = false;
    ghostX = 0;
    ghostY = 0;
  }

  function handlePointerCancel(e: PointerEvent, id: string): void {
    if (dragNoteId !== id) return;
    cancelDrag(e.currentTarget as HTMLElement, e.pointerId);
  }

  function handlePointerDown(e: PointerEvent, id: string): void {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    closeCtxMenu();
    dragNoteId = id;
    isDragging = false;

    target.closest('[role="button"]')?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent, id: string): void {
    if (dragNoteId !== id) return;

    if (!isDragging) {
      isDragging = true;
    }

    ghostX = e.clientX;
    ghostY = e.clientY;

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

    const cardEl = e.currentTarget as HTMLElement;
    try {
      cardEl.releasePointerCapture(e.pointerId);
    } catch {}

    if (isDragging && dragOverNoteId && dragOverNoteId !== dragNoteId) {
      const targetIdx = notesList.findIndex((n) => n.id === dragOverNoteId);
      if (targetIdx !== -1) {
        reorderNote(dragNoteId, targetIdx);
      }
    }

    dragNoteId = null;
    dragOverNoteId = null;
    setTimeout(() => {
      isDragging = false;
    }, 50);
  }

  function handleWindowKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (ctxMenuVisible) closeCtxMenu();
      if (renamingNoteId) closeRename();
      if (dragNoteId || isDragging) cancelDrag();
    }
  }

  function handleWindowClick(): void {
    if (ctxMenuVisible) closeCtxMenu();
  }

  function handleWindowBlur(): void {
    if (ctxMenuVisible) closeCtxMenu();
    if (dragNoteId || isDragging) cancelDrag();
  }
</script>

<div class="flex h-full w-full flex-col select-none" oncontextmenu={openEmptyCtxMenu} role="presentation">
  <div class="px-3 pt-3 pb-1 flex items-center gap-2">
    <img src="/favicon.png" alt="Inki logo" class="size-5 shrink-0 dark:invert" />
    <span class="text-sm font-semibold tracking-tight">Inki</span>
  </div>
  <div class="px-3 pt-3 pb-2 flex gap-2">
    <Button variant="outline" class="flex-1" onclick={handleNewNote}>
      <Plus class="size-4 mr-1" />
      <FancyText config={{ mode: 'letter-swap', text: 'New Note' }} />
    </Button>
    <Button variant="outline" class="px-3" onclick={handleOpenFile} aria-label="Open File" title="Open File">
      <Upload class="size-4" />
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
      <div class="flex flex-col gap-2 px-3 pt-1 pb-3">
        {#each notesList as note (note.id)}
          {@const isSelected = selectedNote?.id === note.id}
          {@const preview = getNotePreview(note.content)}
          {@const resolvedNoteLabels = resolveLabels(note.labels)}
          <Card
            class={cn(
              'relative cursor-pointer transition-all duration-150 w-full note-card touch-none py-3 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              isSelected && 'bg-accent/80 ring-1 ring-primary/30 shadow-sm',
              dragOverNoteId === note.id && 'ring-2 ring-primary bg-accent/50'
            )}
            data-note-id={note.id}
            aria-current={isSelected ? 'true' : undefined}
            onpointerdown={(e) => handlePointerDown(e, note.id)}
            onpointermove={(e) => handlePointerMove(e, note.id)}
            onpointerup={(e) => handlePointerUp(e, note.id)}
            onpointercancel={(e) => handlePointerCancel(e, note.id)}
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
            <CardContent class="flex flex-col gap-2 px-3.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
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
                    <p class="truncate text-sm font-medium leading-snug text-card-foreground">{note.title}</p>
                  {/if}
                </div>
                <div class="flex items-center gap-1 shrink-0 -mr-1 -mt-0.5">
                  <div class="cursor-grab active:cursor-grabbing rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <GripVertical class="size-4" />
                  </div>
                  <button
                    onclick={(e) => handleDeleteClick(e, note.id)}
                    onkeydown={(e) => e.stopPropagation()}
                    tabindex={-1}
                    class="cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    aria-label="Delete note"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
              </div>
              {#if preview}
                <p class="truncate text-xs text-muted-foreground">{preview}</p>
              {/if}
              {#if resolvedNoteLabels.length > 0}
                <LabelBadge labels={resolvedNoteLabels} />
              {/if}
              <p class="text-[11px] font-mono tabular-nums text-muted-foreground/80">{timeAgo(note.updatedAt)}</p>
            </CardContent>
          </Card>
        {/each}
      </div>
    </ScrollArea>
  {:else}
    <div class="flex flex-1 items-center justify-center px-3 min-h-0">
      <p class="text-sm text-muted-foreground">
        <FancyText config={{ mode: 'breathing', text: 'No notes yet' }} />
      </p>
    </div>
  {/if}

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

<svelte:window onclick={handleWindowClick} onkeydown={handleWindowKeydown} onblur={handleWindowBlur} />

{#if ctxMenuVisible}
  <div
    class="fixed z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    style="left: {ctxMenuX}px; top: {ctxMenuY}px;"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === 'Escape' && closeCtxMenu()}
    oncontextmenu={(e) => e.preventDefault()}
    role="menu"
    tabindex="-1"
  >
    {#if ctxMenuTarget === 'card'}
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={handleCtxRename}
      >
        <Pencil class="size-4" />
        <span>Rename</span>
      </button>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={handleCtxDuplicate}
      >
        <Copy class="size-4" />
        <span>Duplicate</span>
      </button>
      <div class="my-1 h-px bg-border"></div>
      <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Tags
      </div>
      <div class="max-h-44 overflow-y-auto">
        {#each allLabels as lbl (lbl.id)}
          {@const isTagged = Boolean(ctxNote?.labels?.includes(lbl.id as LabelId))}
          <button
            role="menuitemcheckbox"
            aria-checked={isTagged}
            class="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1 text-xs outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onclick={() => handleCtxToggleLabel(lbl.id as LabelId)}
          >
            <span class="flex items-center gap-2 truncate">
              <span
                class="size-2 shrink-0 rounded-full"
                style="background-color: {lbl.color};"
                aria-hidden="true"
              ></span>
              <span class="truncate">{lbl.name}</span>
            </span>
            {#if isTagged}
              <Check class="size-3.5 shrink-0 text-primary" />
            {/if}
          </button>
        {/each}
      </div>
      <div class="my-1 h-px bg-border"></div>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('up')}
      >
        <ArrowUp class="size-4" />
        <span>Move Up</span>
      </button>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('down')}
      >
        <ArrowDown class="size-4" />
        <span>Move Down</span>
      </button>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('top')}
      >
        <ArrowUpToLine class="size-4" />
        <span>Move to Top</span>
      </button>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => handleCtxMove('bottom')}
      >
        <ArrowDownToLine class="size-4" />
        <span>Move to Bottom</span>
      </button>
      <div class="my-1 h-px bg-border"></div>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer text-destructive"
        onclick={handleCtxDelete}
      >
        <Trash2 class="size-4" />
        <span>Delete</span>
      </button>
    {:else}
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => { closeCtxMenu(); handleNewNote(); }}
      >
        <Plus class="size-4" />
        <span>New Note</span>
      </button>
      <button
        role="menuitem"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
        onclick={() => { closeCtxMenu(); handleOpenFile(); }}
      >
        <Upload class="size-4" />
        <span>Import File</span>
      </button>
    {/if}
  </div>
{/if}

{#if isDragging && dragNoteId && ghostNote}
  {@const ghostPreview = getNotePreview(ghostNote.content, 60)}
  {@const ghostLabels = resolveLabels(ghostNote.labels)}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed z-[100] pointer-events-none w-[260px] rounded-xl border border-border bg-card p-3.5 shadow-xl rotate-2 opacity-90"
    style="left: {ghostX + 16}px; top: {ghostY - 48}px;"
  >
    <p class="truncate text-sm font-medium">{ghostNote.title}</p>
    {#if ghostPreview}
      <p class="truncate text-xs text-muted-foreground mt-1">
        {ghostPreview}
      </p>
    {/if}
    {#if ghostLabels.length > 0}
      <LabelBadge labels={ghostLabels} class="mt-2" />
    {/if}
  </div>
{/if}
