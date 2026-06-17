<script lang="ts">
  import NoteSidebar from "$lib/components/NoteSidebar.svelte";
  import NoteEditor from "$lib/components/NoteEditor.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { addNote, selectNote } from "$lib/stores/notes.svelte.ts";
  import Menu from "@lucide/svelte/icons/menu";

  let sidebarOpen = $state(false);

  $effect(() => {
    function handler(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        const note = addNote();
        selectNote(note.id);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
</script>

<!-- Mobile menu button -->
<div class="fixed top-3 left-3 z-50 md:hidden">
  <Button variant="ghost" size="icon" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label="Toggle sidebar">
    <Menu class="h-5 w-5" />
  </Button>
</div>

<div class="flex h-screen w-screen overflow-hidden">
  <!-- Desktop sidebar -->
  <div class="hidden md:flex w-[280px] shrink-0">
    <NoteSidebar />
  </div>

  <!-- Mobile sidebar overlay -->
  {#if sidebarOpen}
    <!-- backdrop -->
    <div
      class="fixed inset-0 z-40 bg-black/50 md:hidden"
      onclick={() => (sidebarOpen = false)}
      role="presentation"
    ></div>
    <!-- sidebar panel -->
    <div class="fixed left-0 top-0 z-50 h-full w-[280px] bg-background md:hidden">
      <NoteSidebar onNoteSelect={() => (sidebarOpen = false)} />
    </div>
  {/if}

  <Separator orientation="vertical" class="hidden md:block" />

  <div class="flex flex-1 min-w-0">
    <NoteEditor />
  </div>
</div>
