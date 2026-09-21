<!--
  L'import dei pasti dalla chat di Claude. L'intelligenza sta FUORI: la chat
  popola il database ogni tanto, l'app pianifica la settimana da sola.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, plurale } from "$lib/core/ui";
  import { pastiDaJSON, importaPasti, PROMPT_CHAT } from "$condivisi/pasti/importa.js";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  let testo = $state("");
  let esito = $state<{ ok: boolean; testo: string } | null>(null);
  let mostraPrompt = $state(false);

  $effect(() => { if (aperto) { testo = ""; esito = null; mostraPrompt = false; } });

  async function copia() {
    try {
      await navigator.clipboard.writeText(PROMPT_CHAT);
      avviso("Prompt copiato.");
    } catch {
      // Safari lo blocca fuori da un gesto diretto: si mostra e basta.
      mostraPrompt = true;
    }
  }

  function importa() {
    const letto = pastiDaJSON(testo);
    if (!letto.voci.length) { esito = { ok: false, testo: letto.motivo }; return; }
    const r = importaPasti(testo);
    esito = { ok: true, testo: `${plurale(r.salvati, "pasto importato", "pasti importati")}${r.scartate ? `, ${r.scartate} scartati` : ""}.` };
    avviso(`${r.salvati} nel database.`);
  }
</script>

<Foglio bind:aperto titolo="Importa pasti">
  <p class="text-subheadline secondario">Incolla il JSON che ti dà la chat. Le staccionate ``` vanno bene: le tolgo io.</p>
  <Pulsante variante="grigio" larga icona="importa" onclick={copia}>Copia il prompt per la chat</Pulsante>
  {#if mostraPrompt}<pre class="prompt">{PROMPT_CHAT}</pre>{/if}
  <textarea bind:value={testo} rows="9" placeholder={'{ "pasti": [ … ] }'} aria-label="JSON dei pasti"></textarea>
  <Pulsante variante="pieno" larga disabled={!testo.trim()} onclick={importa}>Importa</Pulsante>
  {#if esito}<p class="text-subheadline" class:ok={esito.ok} class:male={!esito.ok}>{esito.testo}</p>{/if}
</Foglio>

<style>
  textarea {
    width: 100%; min-height: 180px; padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-xl); background: var(--bg-grouped-secondary);
    font-family: var(--font-mono); font-size: 17px; line-height: 1.4; resize: vertical; outline: none;
  }
  .prompt {
    white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-footnote);
    padding: var(--space-3); border-radius: var(--radius-lg); background: var(--bg-grouped-secondary);
    -webkit-user-select: text; user-select: text;
  }
</style>
