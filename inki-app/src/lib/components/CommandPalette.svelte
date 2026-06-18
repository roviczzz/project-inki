<script lang="ts">
  import { Dialog, DialogContent } from '$lib/components/ui/dialog/index.js';
  import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
  import Search from '@lucide/svelte/icons/search';
  import Plus from '@lucide/svelte/icons/plus';
  import Save from '@lucide/svelte/icons/save';
  import Download from '@lucide/svelte/icons/download';
  import FolderOpen from '@lucide/svelte/icons/folder-open';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import FileText from '@lucide/svelte/icons/file-text';
  import { addNote, deleteNote, getNotes, selectNote, getSelectedNote } from '$lib/stores/notes.svelte.ts';
  import { cn } from '$lib/utils.js';

  interface PaletteItem {
    id: string;
    label: string;
    shortcut?: string;
    keywords: string[];
    icon: any;
    action: () => void;
    type: 'command' | 'note';
  }

  let { open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void } = $props();

  let search = $state('');
  let selectedIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (open) {
      search = '';
      selectedIndex = 0;
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  let isDark = $state(document.documentElement.classList.contains('dark'));

  let allItems = $derived.by<PaletteItem[]>(() => {
    const cmds: PaletteItem[] = [
      {
        id: 'new-note',
        label: 'New Note',
        shortcut: 'Ctrl+N',
        keywords: ['new', 'note', 'create', 'add'],
        icon: Plus,
        type: 'command',
        action: () => {
          const note = addNote();
          selectNote(note.id);
        }
      },
      {
        id: 'save-note',
        label: 'Save Note',
        shortcut: 'Ctrl+S',
        keywords: ['save', 'download', 'export', 'md', 'markdown'],
        icon: Save,
        type: 'command',
        action: () => {
          const note = getSelectedNote();
          if (!note) return;
          const blob = new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${note.title || 'untitled'}.md`;
          link.click();
          setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 100);
        }
      },
      {
        id: 'export-all',
        label: 'Export All Notes',
        keywords: ['export', 'all', 'download', 'json', 'backup'],
        icon: Download,
        type: 'command',
        action: () => {
          const allNotes = getNotes();
          const blob = new Blob([JSON.stringify(allNotes, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'inki-notes-export.json';
          link.click();
          setTimeout(() => { link.remove(); URL.revokeObjectURL(url); }, 100);
        }
      },
      {
        id: 'import-file',
        label: 'Import File',
        keywords: ['import', 'file', 'open', 'load', 'txt', 'md', 'json'],
        icon: FolderOpen,
        type: 'command',
        action: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.txt,.md,.json';
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              const content = event.target?.result as string;
              const title = file.name.replace(/\.[^/.]+$/, '');
              const note = addNote(title, content);
              selectNote(note.id);
            };
            reader.readAsText(file);
          };
          input.click();
        }
      },
      {
        id: 'delete-note',
        label: 'Delete Current Note',
        shortcut: 'Del',
        keywords: ['delete', 'remove', 'trash', 'current'],
        icon: Trash2,
        type: 'command',
        action: () => {
          const note = getSelectedNote();
          if (note) deleteNote(note.id);
        }
      },
      {
        id: 'toggle-dark',
        label: isDark ? 'Light Mode' : 'Dark Mode',
        keywords: ['dark', 'light', 'mode', 'theme', 'toggle'],
        icon: isDark ? Sun : Moon,
        type: 'command',
        action: () => {
          isDark = !isDark;
          document.documentElement.classList.toggle('dark', isDark);
          try { localStorage.setItem('inki-dark-mode', String(isDark)); } catch {}
        }
      }
    ];

    const notes: PaletteItem[] = getNotes().map((n) => ({
      id: `note-${n.id}`,
      label: n.title,
      keywords: [n.title, n.content || ''],
      icon: FileText,
      type: 'note' as const,
      action: () => selectNote(n.id)
    }));

    return [...cmds, ...notes];
  });

  let filteredItems = $derived.by<PaletteItem[]>(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  let filteredSelectedIndex = $derived(
    filteredItems.length > 0 ? Math.min(selectedIndex, filteredItems.length - 1) : 0
  );

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[filteredSelectedIndex];
      if (item) {
        item.action();
        onOpenChange(false);
      }
    }
  }
</script>

<Dialog {open} {onOpenChange}>
  <DialogContent class="sm:max-w-[500px] p-0 gap-0 overflow-visible" showCloseButton={false}>
    <div class="flex items-center border-b border-border px-4 h-12">
      <Search class="size-4 shrink-0 text-muted-foreground" />
      <input
        bind:this={inputRef}
        bind:value={search}
        onkeydown={handleKeyDown}
        placeholder="Search commands and notes..."
        class="flex h-full w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <kbd class="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        Esc
      </kbd>
    </div>

    {#if filteredItems.length > 0}
      <ScrollArea class="max-h-[360px]">
        <div class="p-1">
          {#each filteredItems as item, i (item.id)}
            <button
              class={cn(
                'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm outline-none cursor-pointer transition-colors',
                i === filteredSelectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/50'
              )}
              onmouseenter={() => (selectedIndex = i)}
              onclick={() => {
                item.action();
                onOpenChange(false);
              }}
            >
              <item.icon class="size-4 shrink-0 text-muted-foreground" />
              <span class="flex-1 text-left truncate">{item.label}</span>
              {#if item.shortcut}
                <kbd class="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.shortcut}
                </kbd>
              {/if}
            </button>
          {/each}
        </div>
      </ScrollArea>
    {:else}
      <div class="flex items-center justify-center h-24 text-sm text-muted-foreground">
        No results found
      </div>
    {/if}
  </DialogContent>
</Dialog>
