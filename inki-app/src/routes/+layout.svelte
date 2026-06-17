<script lang="ts">
  import "../app.css";
  let { children } = $props();

  $effect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function update(ev: MediaQueryListEvent | MediaQueryList) {
      document.documentElement.classList.toggle('dark', ev.matches);
    }
    update(mq);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });
</script>

{@render children()}
