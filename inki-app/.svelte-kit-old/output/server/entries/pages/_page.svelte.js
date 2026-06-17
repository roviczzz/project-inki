import { q as attr, e as escape_html } from "../../chunks/attributes.js";
import "@tauri-apps/api/core";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let name = "";
    let greetMsg = "";
    $$renderer2.push(`<main class="container svelte-1uha8ag"><h1 class="svelte-1uha8ag">Welcome to Tauri + Svelte</h1> <div class="row svelte-1uha8ag"><a href="https://vite.dev" target="_blank" class="svelte-1uha8ag"><img src="/vite.svg" class="logo vite svelte-1uha8ag" alt="Vite Logo"/></a> <a href="https://tauri.app" target="_blank" class="svelte-1uha8ag"><img src="/tauri.svg" class="logo tauri svelte-1uha8ag" alt="Tauri Logo"/></a> <a href="https://svelte.dev" target="_blank" class="svelte-1uha8ag"><img src="/svelte.svg" class="logo svelte-kit svelte-1uha8ag" alt="SvelteKit Logo"/></a></div> <p>Click on the Tauri, Vite, and SvelteKit logos to learn more.</p> <form class="row svelte-1uha8ag"><input id="greet-input" placeholder="Enter a name..."${attr("value", name)} class="svelte-1uha8ag"/> <button type="submit" class="svelte-1uha8ag">Greet</button></form> <p>${escape_html(greetMsg)}</p></main>`);
  });
}
export {
  _page as default
};
