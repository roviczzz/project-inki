<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Plus from '@lucide/svelte/icons/plus';
  import Save from '@lucide/svelte/icons/save';
  import Download from '@lucide/svelte/icons/download';
  import { getSelectedNote, updateNote, addNote, selectNote, getNotes } from '$lib/stores/notes.svelte.ts';

  let editingTitle = $state('');
  let editingContent = $state('');
  let currentEditingId = $state<string | null>(null);

  $effect(() => {
    const note = getSelectedNote();
    if (note) {
      if (note.id !== currentEditingId) {
        editingTitle = note.title;
        editingContent = note.content;
        currentEditingId = note.id;
      }
    } else {
      editingTitle = '';
      editingContent = '';
      currentEditingId = null;
    }
  });

  function handleTitleInput(e: Event): void {
    const newTitle = (e.target as HTMLInputElement).value;
    editingTitle = newTitle;
    if (currentEditingId) {
      updateNote(currentEditingId, { title: newTitle });
    }
  }

  function handleContentInput(e: Event): void {
    const newContent = (e.target as HTMLTextAreaElement).value;
    editingContent = newContent;
    if (currentEditingId) {
      updateNote(currentEditingId, { content: newContent });
    }
  }

  function handleCreate(): void {
    const note = addNote();
    selectNote(note.id);
  }

  function handleSaveNote(): void {
    const note = getSelectedNote();
    if (!note) return;
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title || 'untitled'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportAll(): void {
    const allNotes = getNotes();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allNotes, null, 2));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "inki-notes-export.json");
    link.click();
  }
</script>

{#if getSelectedNote()}
  <div class="flex h-full w-full flex-col p-6">
    <div class="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
      <div class="flex-1">
        <Input
          value={editingTitle}
          oninput={handleTitleInput}
          placeholder="Note title"
          class="text-6xl font-bold border-none shadow-none focus-visible:ring-0 px-0 w-full !bg-transparent"
        />
      </div>
      <div class="flex items-center gap-2 pl-4">
        <Button variant="outline" size="sm" onclick={handleSaveNote} class="flex items-center gap-2">
          <Save class="size-4" />
          Save
        </Button>
        <Button variant="outline" size="sm" onclick={handleExportAll} class="flex items-center gap-2">
          <Download class="size-4" />
          Export All
        </Button>
      </div>
    </div>
    <Textarea
      value={editingContent}
      oninput={handleContentInput}
      placeholder="Start writing..."
      class="mt-2 border-none shadow-none focus-visible:ring-0 px-0 resize-none field-sizing-content min-h-0 flex-1 w-full !bg-transparent"
    />
  </div>
{:else}
  <div class="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
    <Plus class="size-12 text-muted-foreground/50" />
    <div class="text-center">
      <h3 class="text-lg font-semibold">No note selected</h3>
      <p class="text-sm text-muted-foreground">Create a new note or select one from the sidebar</p>
    </div>
    <Button variant="outline" onclick={handleCreate}>
      <Plus class="size-4" />
      Create New Note
    </Button>
  </div>
{/if}
