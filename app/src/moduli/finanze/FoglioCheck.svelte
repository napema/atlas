<!--
  Il check della giornata: il verdetto, le quattro voci, la conferma.

  La conferma non è «i conti tornano» — quello lo dice il calcolo da solo.
  È «ho segnato tutto», l'unica cosa che il calcolo non può sapere e
  l'unica che dipende da te.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { celebra, plurale, oggiISO } from "$lib/core/ui";
  import { segnaCheck } from "$condivisi/finanze/dati.js";
  import { esitoCheck } from "$condivisi/finanze/calcolo.js";
  import { apri } from "./fogli.svelte";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  const c = $derived.by(() => { dati.versione; return esitoCheck(oggiISO()); });

  function conferma() {
    const prima = c;
    segnaCheck(oggiISO());
    aperto = false;
    // La serie da festeggiare è quella DOPO: `c` è stato letto prima della
    // scrittura, e un numero vecchio sotto una spunta la fa sembrare rotta.
    const n = prima.serie + (prima.fatto ? 0 : 1);
    celebra(n > 1 ? `${plurale(n, "giorno", "giorni")} di fila` : "Giornata chiusa");
  }
</script>

<Foglio bind:aperto titolo="Check di oggi">
  <div class="verdetto" data-esito={c.esito}>
    <span class="text-title2">{c.titolo}</span>
    <p class="text-subheadline secondario">{c.sottotitolo}</p>
  </div>

  <Sezione>
    {#each c.voci as v, i (i)}
      <div class="voce" data-esito={v.esito}>
        <span class="segno"><Icona nome={v.esito === "ok" ? "fatto" : v.esito === "attenzione" ? "info" : "allarme"} misura={20} tratto={1.9} /></span>
        <span class="testo"><span>{v.titolo}</span><span class="text-footnote secondario">{v.testo}</span></span>
        {#if v.valore}<span class="cifre secondario">{v.valore}</span>{/if}
      </div>
    {/each}
  </Sezione>

  <p class="text-headline domanda">Hai segnato tutto quello che è uscito oggi?</p>
  <Pulsante variante="pieno" larga onclick={conferma}>{c.fatto ? "Sì, e l'ho già confermato" : "Sì, ho segnato tutto"}</Pulsante>
  <Pulsante variante="grigio" larga onclick={() => apri({ tipo: "movimento", tipoMov: "out" })}>Manca un movimento</Pulsante>
</Foglio>

<style>
  .verdetto { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4); border-radius: var(--radius-xxl); background: var(--bg-grouped-secondary); }
  .verdetto[data-esito="ok"] .text-title2 { color: var(--color-green); }
  .verdetto[data-esito="attenzione"] .text-title2 { color: var(--color-orange); }
  .verdetto[data-esito="male"] .text-title2 { color: var(--color-red); }
  .voce { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: 12px var(--space-4); }
  .voce + .voce::before { content: ""; position: absolute; top: 0; left: calc(var(--space-4) + 32px); right: 0; border-top: 0.5px solid var(--separator); }
  .segno { flex: none; display: grid; place-items: center; width: 20px; }
  [data-esito="ok"] .segno { color: var(--color-green); }
  [data-esito="attenzione"] .segno { color: var(--color-orange); }
  [data-esito="male"] .segno { color: var(--color-red); }
  .testo { flex: 1; display: flex; flex-direction: column; }
  .domanda { text-align: center; }
</style>
