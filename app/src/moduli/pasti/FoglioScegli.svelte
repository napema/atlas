<!--
  Comporre a mano il pasto di una fascia. Da quel momento la settimana è
  tua: il generatore non ci torna più sopra (`bloccato`).

  Prima era un elenco di combinazioni da scegliere una. Ora si costruisce:
  piadina, pollo, insalata — e se stasera l'insalata non c'è, si toglie un
  pezzo invece di cercare la combinazione senza insalata, che nel database
  non esisteva e andava creata a mano.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import SceltaComponenti from "./SceltaComponenti.svelte";
  import { avviso } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { pianoSettimana, lunediDi, scegliVoci, vociPiano, nomeFascia } from "$condivisi/pasti/dati.js";
  import { bersagli } from "$condivisi/pasti/calcolo.js";

  let { aperto = $bindable(false), iso, fascia }: { aperto: boolean; iso: string; fascia: string | null } = $props();

  const lunedi = $derived(lunediDi(iso));
  const b = $derived.by(() => { dati.versione; return bersagli(); });

  let scelti = $state<string[]>([]);

  // All'apertura si parte da quello che c'è già nel piano: cambiare un
  // pasto vuol dire quasi sempre togliere o aggiungere UN pezzo, non
  // ricominciare da zero.
  let preparato = false;
  $effect(() => {
    if (!aperto || !fascia) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    scelti = vociPiano(pianoSettimana(lunedi), iso, fascia);
  });

  function salva() {
    if (!fascia) return;
    scegliVoci(lunedi, iso, fascia, $state.snapshot(scelti));
    avviso(scelti.length ? "Piano aggiornato." : "Fascia svuotata.");
  }
</script>

<Foglio bind:aperto titolo={fascia ? nomeFascia(fascia) : ""} conferma={{ fai: salva, etichetta: "Salva" }}>
  {#if fascia}
    <SceltaComponenti bind:scelti {fascia} bersaglio={b} />
    <p class="text-footnote secondario nota">
      Cambiando un pasto a mano questa settimana diventa tua: il generatore non ci torna più sopra.
    </p>
  {/if}
</Foglio>

<style>
  .nota { padding: 0 var(--space-2); }
</style>
