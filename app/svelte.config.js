import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  // TypeScript dentro i componenti `.svelte`.
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Svelte 5 in modalità «runes» ovunque: `$state`, `$derived`, `$props`.
    // Niente sintassi mista col vecchio `export let`.
    runes: true,
  },
};
