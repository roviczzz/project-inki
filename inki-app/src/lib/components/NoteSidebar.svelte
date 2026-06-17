<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Card, CardContent } from '$lib/components/ui/card/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
  } from '$lib/components/ui/dialog/index.js';
  import { addNote, deleteNote, getNotes, selectNote, getSelectedNote } from '$lib/stores/notes.svelte.ts';
  import { cn } from '$lib/utils.js';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import FolderOpen from '@lucide/svelte/icons/folder-open';

  let { onNoteSelect }: { onNoteSelect?: () => void } = $props();

  let fileInput: HTMLInputElement;

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

  let notesList = $derived(getNotes());
  let deletingNoteId = $state<string | null>(null);

  function handleNewNote(): void {
    const note = addNote();
    selectNote(note.id);
  }

  function handleSelectNote(id: string): void {
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
</script>

<div class="flex h-full w-full flex-col">
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
              'relative cursor-pointer transition-colors w-full',
              getSelectedNote()?.id === note.id && 'bg-accent text-accent-foreground'
            )}
            onclick={() => handleSelectNote(note.id)}
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
              <button
                onclick={(e) => handleDeleteClick(e, note.id)}
                onkeydown={(e) => e.stopPropagation()}
                tabindex={-1}
                class="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Delete note"
              >
                <Trash2 class="size-4" />
              </button>
              <p class="truncate text-sm font-medium">{note.title}</p>
              <p class="truncate text-xs text-muted-foreground">
                {note.content ? note.content.slice(0, 80) : ''}
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
