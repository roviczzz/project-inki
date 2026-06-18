<script lang="ts">
  import "../app.css";
  import CommandPalette from "$lib/components/CommandPalette.svelte";
  import { zoomIn, zoomOut, resetZoom } from "$lib/stores/zoom.svelte.ts";
  let { children } = $props();

  let paletteOpen = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      paletteOpen = !paletteOpen;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    }
  }

  $effect(() => {
    try {
      const stored = localStorage.getItem('inki-dark-mode');
      if (stored !== null) {
        document.documentElement.classList.toggle('dark', stored === 'true');
        return;
      }
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.classList.toggle('dark', mq.matches);
  });
</script>

<CommandPalette open={paletteOpen} onOpenChange={(o: boolean) => paletteOpen = o} />
<svelte:window onkeydown={handleKeydown} />

{@render children()}
