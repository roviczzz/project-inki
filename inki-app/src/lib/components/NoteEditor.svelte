<script lang="ts">
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { FancyText, AnimatedNumber } from '$lib/components/ui/fancy-text/index.js';
  import {
    INLINE_TOOLBAR_GROUPS,
    OVERFLOW_TOOLBAR_ACTIONS,
    CONTEXT_MENU_GROUPS,
    runFormatCommand,
    type FormatCommandId
  } from '$lib/components/editor-actions.ts';
  import Plus from '@lucide/svelte/icons/plus';
  import Save from '@lucide/svelte/icons/save';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import ZoomOut from '@lucide/svelte/icons/zoom-out';
  import Tag from '@lucide/svelte/icons/tag';
  import Check from '@lucide/svelte/icons/check';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import {
    LabelBadge,
    labels as allLabels,
    resolveLabels,
    type LabelId
  } from '$lib/components/ui/label-badges/index.ts';
  import {
    getSelectedNote,
    updateNote,
    toggleNoteLabel,
    addNote,
    selectNote,
    flushSave,
    type Note
  } from '$lib/stores/notes.svelte.ts';
  import { getZoomLevel, zoomIn, zoomOut, resetZoom } from '$lib/stores/zoom.svelte.ts';
  import {
    formatHtmlExport,
    formatMarkdownExport,
    formatPlainTextExport,
    formatJsonExport,
    formatCsvExport
  } from '$lib/utils/export.ts';

  let editingTitle = $state('');
  let editingContent = $state('');
  let currentEditingId = $state<string | null>(null);

  let editorRef = $state<HTMLDivElement | null>(null);
  let menuX = $state(0);
  let menuY = $state(0);
  let showMenu = $state(false);
  let showMoreMenu = $state(false);
  let showTagMenu = $state(false);
  let activeNote = $derived(getSelectedNote());
  let activeNoteLabels = $derived(resolveLabels(activeNote?.labels));
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
    closeAllMenus();
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
    showTagMenu = false;
  }

  function syncContent() {
    if (!editorRef) return;
    editingContent = editorRef.innerHTML;
    if (currentEditingId) {
      updateNote(currentEditingId, { content: editingContent });
    }
  }

  function applyFormat(formatType: FormatCommandId) {
    closeAllMenus();
    if (!editorRef) return;
    flushSave();
    editorRef.focus();

    runFormatCommand(formatType, window.getSelection());
    syncContent();
  }

    $effect(() => {
      const note = getSelectedNote();
      if (note) {
        if (note.id !== currentEditingId) {
          closeAllMenus();
          editingTitle = note.title;
          editingContent = note.content;
          currentEditingId = note.id;
          if (editorRef) {
            editorRef.innerHTML = note.content;
          }
        }
      } else {
        closeAllMenus();
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u', 'z', 'y'].includes(e.key.toLowerCase())) {
      setTimeout(syncContent, 0);
    }
  }

  function handleCut() {
    setTimeout(syncContent, 0);
  }

  function handleEditorBlur(): void {
    syncContent();
    flushSave();
  }

  function handleCreate(): void {
    const note = addNote();
    selectNote(note.id);
  }

  function downloadFile(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getExportPayload(note: Note, content: string, ext: string): { data: string; mime: string } {
    const targetNote: Note = { ...note, content, title: editingTitle || note.title };
    switch (ext) {
      case 'md':
      case 'markdown':
        return {
          data: formatMarkdownExport(targetNote, content),
          mime: 'text/markdown;charset=utf-8'
        };
      case 'txt':
      case 'text':
        return {
          data: formatPlainTextExport(targetNote, content),
          mime: 'text/plain;charset=utf-8'
        };
      case 'json':
        return {
          data: formatJsonExport(targetNote),
          mime: 'application/json;charset=utf-8'
        };
      case 'csv':
        return {
          data: formatCsvExport(targetNote),
          mime: 'text/csv;charset=utf-8'
        };
      case 'html':
      case 'htm':
      default:
        return {
          data: formatHtmlExport(targetNote, content),
          mime: 'text/html;charset=utf-8'
        };
    }
  }

  async function handleSave(preferredExt: string = 'md'): Promise<void> {
    syncContent();
    flushSave();
    const note = getSelectedNote();
    if (!note) return;
    const content = editorRef ? editorRef.innerHTML : (editingContent || note.content || '');
    const title = editingTitle || note.title || 'untitled';
    const currentNote: Note = { ...note, content, title };

    const extChoice = preferredExt.toLowerCase();
    const { data: defaultData, mime: defaultMime } = getExportPayload(currentNote, content, extChoice);
    const defaultFilename = `${title}.${extChoice === 'markdown' ? 'md' : extChoice}`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [
            { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
            { description: 'HTML', accept: { 'text/html': ['.html'] } },
            { description: 'Plain Text', accept: { 'text/plain': ['.txt'] } },
            { description: 'JSON', accept: { 'application/json': ['.json'] } },
            { description: 'CSV', accept: { 'text/csv': ['.csv'] } },
          ],
        });
        const name = handle.name || defaultFilename;
        const chosenExt = name.includes('.') ? name.split('.').pop()?.toLowerCase() || extChoice : extChoice;
        const targetPayload = getExportPayload(currentNote, content, chosenExt);
        try {
          const writable = await handle.createWritable();
          await writable.write(targetPayload.data);
          await writable.close();
        } catch {
          downloadFile(name, targetPayload.data, targetPayload.mime);
        }
      } catch (pickerErr: any) {
        if (pickerErr?.name === 'AbortError') {
          return;
        }
        downloadFile(defaultFilename, defaultData, defaultMime);
      }
    } else {
      downloadFile(defaultFilename, defaultData, defaultMime);
    }
  }
</script>

{#if activeNote}
  <div class="flex h-full w-full flex-col p-6">
    <div class="flex flex-col gap-2.5 border-b border-border/40 pb-4 mb-4">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <Input
            value={editingTitle}
            oninput={handleTitleInput}
            onblur={handleEditorBlur}
            placeholder="Note title"
            class="text-3xl md:text-4xl font-bold tracking-tight h-auto py-1 border-none shadow-none focus-visible:ring-0 px-0 w-full !bg-transparent editor-input"
          />
        </div>
        <div class="flex items-center gap-2 pl-4">
          <Button variant="outline" size="sm" onclick={() => handleSave()} class="flex items-center gap-2">
            <Save class="size-4" />
            <FancyText config={{ mode: 'letter-swap', text: 'Save' }} />
          </Button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <Button
            variant="ghost"
            size="xs"
            aria-label="Manage tags"
            aria-expanded={showTagMenu}
            class="text-muted-foreground hover:text-foreground"
            onclick={(e) => {
              e.stopPropagation();
              showMoreMenu = false;
              showMenu = false;
              showTagMenu = !showTagMenu;
            }}
          >
            <Tag class="size-3.5" />
            <span>Tags</span>
          </Button>
          {#if showTagMenu}
            <div
              role="menu"
              tabindex="0"
              class="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
              onclick={(e) => e.stopPropagation()}
              onkeydown={(e) => e.key === 'Escape' && (showTagMenu = false)}
            >
              {#each allLabels as lbl (lbl.id)}
                {@const isTagged = Boolean(activeNote.labels?.includes(lbl.id as LabelId))}
                <button
                  role="menuitemcheckbox"
                  aria-checked={isTagged}
                  class="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  onclick={() => toggleNoteLabel(activeNote.id, lbl.id as LabelId)}
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
          {/if}
        </div>
        {#if activeNoteLabels.length > 0}
          <LabelBadge labels={activeNoteLabels} />
        {/if}
      </div>
    </div>
    <div role="toolbar" aria-label="Text formatting" class="flex items-center gap-1 pb-3 border-b border-border/40 mb-4">
      {#each INLINE_TOOLBAR_GROUPS as group, groupIdx (groupIdx)}
        {#if groupIdx > 0}
          <Separator orientation="vertical" class="mx-1 h-5" />
        {/if}
        {#each group as action (action.id)}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={action.label}
            title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
            onclick={() => applyFormat(action.id)}
          >
            <action.icon class="size-4" />
          </Button>
        {/each}
      {/each}
      <Separator orientation="vertical" class="mx-1 h-5" />
      <div class="relative">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="More formatting options"
          aria-expanded={showMoreMenu}
          title="More formatting options"
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
            {#each OVERFLOW_TOOLBAR_ACTIONS as action (action.id)}
              <button
                role="menuitem"
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onclick={() => { applyFormat(action.id); showMoreMenu = false; }}
              >
                <action.icon class="size-4" />
                <span>{action.menuLabel}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <span class="ml-auto"></span>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom out" title="Zoom out (Ctrl+-)" onclick={zoomOut}>
        <ZoomOut class="size-4" />
      </Button>
      <button
        onclick={resetZoom}
        class="w-11 text-center text-xs font-mono tabular-nums text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer py-0 px-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Reset zoom"
        title="Reset zoom (Ctrl+0)"
      >
        <AnimatedNumber value={zoomLevel} suffix="%" />
      </button>
      <Button variant="ghost" size="icon-sm" aria-label="Zoom in" title="Zoom in (Ctrl+=)" onclick={zoomIn}>
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
        onblur={handleEditorBlur}
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
          [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:font-mono
          [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
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
      <h3 class="text-lg font-semibold">
        <FancyText config={{ mode: 'breathing', text: 'No note selected' }} />
      </h3>
      <p class="text-sm text-muted-foreground mt-1">
        <FancyText
          config={{
            mode: 'rotate',
            words: [
              'Create a new note or select one from the sidebar',
              'Press Ctrl+N to start a fresh note',
              'Press Ctrl+K to open the command palette'
            ]
          }}
        />
      </p>
    </div>
    <Button variant="outline" onclick={handleCreate}>
      <Plus class="size-4" />
      <FancyText config={{ mode: 'letter-swap', text: 'Create New Note' }} />
    </Button>
  </div>
{/if}

<svelte:window onclick={closeAllMenus} onkeydown={(e) => e.key === 'Escape' && closeAllMenus()} onblur={closeAllMenus} />

{#if showMenu}
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    style="left: {menuX}px; top: {menuY}px;"
  >
    {#each CONTEXT_MENU_GROUPS as group, groupIdx (groupIdx)}
      {#if groupIdx > 0}
        <div class="my-1 h-px bg-border"></div>
      {/if}
      {#each group as action (action.id)}
        <button
          role="menuitem"
          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
          onclick={() => applyFormat(action.id)}
        >
          <action.icon class="size-4" />
          <span>{action.menuLabel}</span>
        </button>
      {/each}
    {/each}
  </div>
{/if}
