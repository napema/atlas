<!--
  Scegliere a mano il pasto di una fascia. Da quel momento la settimana è
  tua: il generatore non ci torna più sopra (`bloccato`).
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { avviso } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { pastiPerFascia, pianoSettimana, lunediDi, scegliPasto, nomeFascia } from "$condivisi/pasti/dati.js";
  import { kcal } from "./comune";

  let { aperto = $bindable(false), iso, fascia }: { aperto: boolean; iso: string; fascia: string | null } = $props();

  const lunedi = $derived(lunediDi(iso));
  const candidati = $derived.by(() => { dati.versione; return fascia ? pastiPerFascia(fascia) : []; });
  const attuale = $derived.by(() => { dati.versione; return fascia ? pianoSettimana(lunedi)?.giorni?.[iso]?.[fascia] ?? null : null; });

  function scegli(id: string) {
    if (!fascia) return;
    scegliPasto(lunedi, iso, fascia, id);
    aperto = false;
    avviso("Piano aggiornato.");
  }
</script>

<Foglio bind:aperto titolo={fascia ? nomeFascia(fascia) : ""}>
  {#if candidati.length}
    <Sezione piede="Cambiando un pasto a mano questa settimana diventa tua: il generatore non ci torna più sopra.">
      {#each candidati as p (p.id)}
        <Riga
          titolo={p.nome}
          sottotitolo="{kcal(p.kcal)} kcal · {p.p} P · {p.c} C · {p.g} G"
          onclick={() => scegli(p.id)}
        >
          {#snippet fine()}
            {#if p.id === attuale}<span class="scelto"><Icona nome="spunta" misura={18} tratto={2.6} /></span>{/if}
          {/snippet}
        </Riga>
      {/each}
    </Sezione>
  {:else}
    <Vuoto icona="piatto" titolo="Nessun pasto qui" testo="Aggiungine dall'import, in alto nella schermata Pasti." />
  {/if}
</Foglio>

<style>
  .scelto { color: var(--accento); }
</style>
