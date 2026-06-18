<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import Plus from '@lucide/svelte/icons/plus';
  import Save from '@lucide/svelte/icons/save';
  import Bold from '@lucide/svelte/icons/bold';
  import Italic from '@lucide/svelte/icons/italic';
  import Code from '@lucide/svelte/icons/code';
  import Heading1 from '@lucide/svelte/icons/heading-1';
  import Heading2 from '@lucide/svelte/icons/heading-2';
  import Heading3 from '@lucide/svelte/icons/heading-3';
  import Quote from '@lucide/svelte/icons/quote';
  import List from '@lucide/svelte/icons/list';
  import ListOrdered from '@lucide/svelte/icons/list-ordered';
  import Strikethrough from '@lucide/svelte/icons/strikethrough';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { getSelectedNote, updateNote, addNote, selectNote, getNotes, type Note } from '$lib/stores/notes.svelte.ts';
  import { getZoomLevel, zoomIn, zoomOut, resetZoom } from '$lib/stores/zoom.svelte.ts';

  let editingTitle = $state('');
  let editingContent = $state('');
  let currentEditingId = $state<string | null>(null);

  let editorRef = $state<HTMLDivElement | null>(null);
  let menuX = $state(0);
  let menuY = $state(0);
  let showMenu = $state(false);
  let showMoreMenu = $state(false);
  let zoomLevel = $derived(getZoomLevel());
  let scrollContainerRef = $state<HTMLDivElement | null>(null);
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;

  function handleScroll() {
    if (!scrollContainerRef) return;
    scrollContainerRef.classList.add('scrolling');
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrollContainerRef?.classList.remove('scrolling');
    }, 1000);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const menuWidth = 180;
    const menuHeight = 320;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    menuX = x;
    menuY = y;
    showMenu = true;
  }

  function closeAllMenus() {
    showMenu = false;
    showMoreMenu = false;
  }

  function syncContent() {
    if (!editorRef) return;
    editingContent = editorRef.innerHTML;
    if (currentEditingId) {
      updateNote(currentEditingId, { content: editingContent });
    }
  }

  function applyFormat(formatType: string) {
    if (!editorRef) return;
    editorRef.focus();

    switch (formatType) {
      case 'bold':
        document.execCommand('bold');
        break;
      case 'italic':
        document.execCommand('italic');
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough');
        break;
      case 'codeblock': {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const text = sel.getRangeAt(0).toString();
          if (text) {
            const html = text.includes('\n')
              ? `<pre><code>${text}</code></pre>`
              : `<code>${text}</code>`;
            document.execCommand('insertHTML', false, html);
          }
        }
        break;
      }
      case 'h1':
        document.execCommand('formatBlock', false, '<h1>');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, '<h2>');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, '<h3>');
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, '<blockquote>');
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList');
        break;
      case 'number':
        document.execCommand('insertOrderedList');
        break;
      default:
        return;
    }

    syncContent();
  }

  $effect(() => {
    const note = getSelectedNote();
    if (note) {
      if (note.id !== currentEditingId) {
        editingTitle = note.title;
        editingContent = note.content;
        currentEditingId = note.id;
        if (editorRef) {
          editorRef.innerHTML = note.content;
        }
      }
    } else {
      editingTitle = '';
      editingContent = '';
      currentEditingId = null;
      if (editorRef) {
        editorRef.innerHTML = '';
      }
    }
  });

  function handleTitleInput(e: Event): void {
    const newTitle = (e.target as HTMLInputElement).value;
    editingTitle = newTitle;
    if (currentEditingId) {
      updateNote(currentEditingId, { title: newTitle });
    }
  }

  function handleContentInput(): void {
    if (!editorRef) return;
    editingContent = editorRef.innerHTML;
    if (currentEditingId) {
      updateNote(currentEditingId, { content: editingContent });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u', 's', 'z', 'y'].includes(e.key.toLowerCase())) {
      setTimeout(syncContent, 0);
    }
  }

  function handleCut() {
    setTimeout(syncContent, 0);
  }

  function handleCreate(): void {
    const note = addNote();
    selectNote(note.id);
  }

  function getSaveContent(content: string, note: Note, ext: string): string {
    switch (ext) {
      case 'json':
        return JSON.stringify(
          { id: note.id, title: note.title, content, createdAt: note.createdAt, updatedAt: Date.now() },
          null,
          2
        );
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escHtml(note.title)}</title></head>
<body>
<h1>${escHtml(note.title)}</h1>
${content}
</body>
</html>`;
      case 'csv':
        return `"title","content"\n"${escCsv(note.title)}","${escCsv(content)}"`;
      default:
        return content;
    }
  }

  function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escCsv(s: string): string {
    return s.replace(/"/g, '""');
  }

  async function handleSave(): Promise<void> {
    const note = getSelectedNote();
    if (!note) return;
    const content = editingContent || note.content;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${note.title || 'untitled'}.html`,
          types: [
            { description: 'HTML', accept: { 'text/html': ['.html'] } },
            { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
            { description: 'Plain Text', accept: { 'text/plain': ['.txt'] } },
            { description: 'JSON', accept: { 'application/json': ['.json'] } },
            { description: 'CSV', accept: { 'text/csv': ['.csv'] } },
          ],
        });
        const name = handle.name || '';
        const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() || 'html' : 'html';
        const fileContent = getSaveContent(content, note, ext);
        const writable = await handle.createWritable();
        await writable.write(fileContent);
        await writable.close();
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: download as HTML
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.title || 'untitled'}.html`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    }
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
          class="text-8xl font-bold border-none shadow-none focus-visible:ring-0 px-0 w-full !bg-transparent editor-input"
        />
      </div>
      <div class="flex items-center gap-2 pl-4">
        <Button variant="outline" size="sm" onclick={handleSave} class="flex items-center gap-2">
          <Save class="size-4" />
          Save
        </Button>
      </div>
    </div>
    <div class="flex items-center gap-1 pb-3 border-b border-border/40 mb-4">
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('h1')}>
        <Heading1 class="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('h2')}>
        <Heading2 class="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('h3')}>
        <Heading3 class="size-4" />
      </Button>
      <Separator orientation="vertical" class="mx-1 h-5" />
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('bold')}>
        <Bold class="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('italic')}>
        <Italic class="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" onclick={() => applyFormat('strikethrough')}>
        <Strikethrough class="size-4" />
      </Button>
      <Separator orientation="vertical" class="mx-1 h-5" />
      <div class="relative">
        <Button
          variant="ghost"
          size="icon-sm"
          onclick={(e) => { e.stopPropagation(); showMoreMenu = !showMoreMenu; }}
        >
          <ChevronDown class="size-4" />
        </Button>
        {#if showMoreMenu}
          <div
            role="menu"
            tabindex="0"
            class="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.key === 'Escape' && (showMoreMenu = false)}
          >
            <button
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onclick={() => { applyFormat('codeblock'); showMoreMenu = false; }}
            >
              <Code class="size-4" />
              <span>Code Block</span>
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onclick={() => { applyFormat('blockquote'); showMoreMenu = false; }}
            >
              <Quote class="size-4" />
              <span>Blockquote</span>
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onclick={() => { applyFormat('bullet'); showMoreMenu = false; }}
            >
              <List class="size-4" />
              <span>Bullet List</span>
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onclick={() => { applyFormat('number'); showMoreMenu = false; }}
            >
              <ListOrdered class="size-4" />
              <span>Numbered List</span>
            </button>
          </div>
        {/if}
      </div>
      <span class="ml-auto"></span>
      <Button variant="ghost" size="icon-sm" onclick={zoomOut}>
        <ZoomOut class="size-4" />
      </Button>
      <button
        onclick={resetZoom}
        class="w-10 text-center text-xs text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer py-0 px-0"
        title="Reset zoom"
      >
        {zoomLevel}%
      </button>
      <Button variant="ghost" size="icon-sm" onclick={zoomIn}>
        <ZoomIn class="size-4" />
      </Button>
    </div>
    <div
      bind:this={scrollContainerRef}
      class="flex flex-col flex-1 min-h-0 w-full overflow-y-auto slide-thin"
      oncontextmenu={handleContextMenu}
      onscroll={handleScroll}
      role="presentation"
    >
      <div
        bind:this={editorRef}
        contenteditable
        tabindex="0"
        oninput={handleContentInput}
        onkeydown={handleKeydown}
        oncut={handleCut}
        role="textbox"
        aria-label="Note content"
        style="zoom: {zoomLevel / 100}"
        class="mt-2 border-none shadow-none focus-visible:ring-0 px-0 min-h-0 flex-1 w-full !bg-transparent editor-input whitespace-pre-wrap outline-none
          [&_h1]:text-2xl [&_h1]:font-bold
          [&_h2]:text-xl [&_h2]:font-bold
          [&_h3]:text-lg [&_h3]:font-bold
          [&_strong]:font-bold
          [&_em]:italic
          [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-2
          [&_s]:line-through [&_strike]:line-through [&_del]:line-through
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1
          [&_li]:my-0.5
          [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:overflow-x-auto
          [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
          [&_pre_code]:bg-transparent [&_pre_code]:p-0
          empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text"
        data-placeholder="Start writing..."
      ></div>
    </div>
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

<svelte:window onclick={closeAllMenus} onkeydown={(e) => e.key === 'Escape' && closeAllMenus()} />

{#if showMenu}
  <div
    class="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    style="left: {menuX}px; top: {menuY}px;"
  >
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('bold')}
    >
      <Bold class="size-4" />
      <span>Bold</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('italic')}
    >
      <Italic class="size-4" />
      <span>Italic</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('codeblock')}
    >
      <Code class="size-4" />
      <span>Code Block</span>
    </button>
    <div class="my-1 h-px bg-border"></div>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('h1')}
    >
      <Heading1 class="size-4" />
      <span>Header 1</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('h2')}
    >
      <Heading2 class="size-4" />
      <span>Header 2</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('h3')}
    >
      <Heading3 class="size-4" />
      <span>Header 3</span>
    </button>
    <div class="my-1 h-px bg-border"></div>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('blockquote')}
    >
      <Quote class="size-4" />
      <span>Blockquote</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('bullet')}
    >
      <List class="size-4" />
      <span>Bullet List</span>
    </button>
    <button
      class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
      onclick={() => applyFormat('number')}
    >
      <ListOrdered class="size-4" />
      <span>Numbered List</span>
    </button>
  </div>
{/if}