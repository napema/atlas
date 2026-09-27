<!--
  La giornata: UNA lista, UNA lastra.

  Era divisa per momento — mattina, giornata, sera — e prima ancora per
  importanza. Tre lastre, tre contatori, tre titoli: aprendola non si
  capiva che cosa fosse la cosa da fare, si leggeva un indice. Una sfida
  che alle sette di mattina ti chiede di scegliere in quale blocco guardare
  ha già perso.

  Qui c'è un elenco solo, nell'ordine in cui la giornata si vive, e dentro
  una lastra sola. L'unica divisione che resta è quella che CAMBIA LE
  CONSEGUENZE: le otto non negoziabili in cima, il supporto dopo un filo di
  separazione. Non è un gusto grafico — se ne salti una delle otto il
  contatore riparta da uno, se ne salti una di supporto non succede niente,
  e questa è l'unica cosa che devi sapere guardando la lista.

  Niente X per saltare: in Project 50 una voce non si «salta». O la fai o
  non la fai, e la seconda ha un prezzo. Un pulsante che la toglie di mezzo
  senza conseguenze è la porta da cui esce tutta la sfida.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import RigaAbitudine from "./RigaAbitudine.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { fattaIl } from "$condivisi/abitudini/calcolo.js";

  let {
    otto,
    supporto,
    spente = [],
    giorno,
    bloccato = false,
    sfida = false,
    onapri,
  }: {
    otto: any[];
    supporto: any[];
    /** Quello che oggi non è previsto: in fondo, chiuso. */
    spente?: any[];
    giorno: string;
    /** Giorno chiuso: si legge e non si tocca. */
    bloccato?: boolean;
    sfida?: boolean;
    onapri: (id: string) => void;
  } = $props();

  let apriSpente = $state(false);

  const fatte = $derived.by(() => {
    dati.versione;
    return otto.filter((h) => fattaIl(h, giorno)).length;
  });
  const pieno = $derived(otto.length > 0 && fatte === otto.length);
</script>

<div class="lista intera" class:pieno>
  <Sezione titolo={sfida ? "Project 50" : "Oggi"}>
    {#snippet coda()}
      {#if otto.length}
        <span class="conto cifre" class:tutte={pieno}>{fatte}/{otto.length}</span>
      {/if}
    {/snippet}

    {#each otto as h (h.id)}
      <RigaAbitudine {h} {giorno} sfida={sfida} bloccata={bloccato} {onapri} />
    {/each}

    {#if supporto.length}
      <!-- Il confine, non un secondo titolo: una riga sottile che dice dove
           finisce quello che conta e comincia quello che aiuta. -->
      <div class="confine">
        <span class="text-caption1 semibold">Supporto</span>
        <span class="text-caption1 secondario">nessuna conseguenza</span>
      </div>
      {#each supporto as h (h.id)}
        <RigaAbitudine {h} {giorno} compatta bloccata={bloccato} {onapri} />
      {/each}
    {/if}

    {#if spente.length}
      <!-- Non previste oggi: una riga sola, apribile. Si possono spuntare
           lo stesso, ma non si prendono spazio per dire che non chiedono
           niente. -->
      <button type="button" class="spente-capo" onclick={() => (apriSpente = !apriSpente)}>
        <span class="text-subheadline secondario">
          {spente.length === 1 ? "Una non prevista oggi" : `${spente.length} non previste oggi`}
        </span>
        <span class="verso" class:giu={apriSpente}><Icona nome="freccia" misura={14} tratto={2.4} /></span>
      </button>
      {#if apriSpente}
        {#each spente as h (h.id)}
          <RigaAbitudine {h} {giorno} spenta compatta bloccata={bloccato} {onapri} />
        {/each}
      {/if}
    {/if}
  </Sezione>
</div>

<style>
  .conto { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .conto.tutte { color: var(--color-green); }

  /* La lastra si tinge di verde solo a giornata piena. Sette su otto non è
     «quasi»: è un giorno perso, e un bordo che si accende a metà lo
     racconterebbe come un successo a cui manca poco. */
  .lista :global(.sezione) { transition: box-shadow var(--duration-slow) var(--ease-default); }
  .lista.pieno :global(.sezione) { box-shadow: inset 0 0 0 1.5px var(--color-green); }

  .confine {
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-4) var(--space-4) var(--space-2);
    margin-top: var(--space-2);
    border-top: 0.5px solid var(--separator);
  }
  .confine span:first-child { letter-spacing: 0.7px; text-transform: uppercase; color: var(--label-secondary); }

  .spente-capo {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    width: 100%; padding: var(--space-3) var(--space-4); min-height: 44px;
    border-top: 0.5px solid var(--separator); margin-top: var(--space-2);
  }
  .spente-capo:active { opacity: 0.6; }
  .verso { color: var(--label-tertiary); transition: transform var(--duration-fast) var(--ease-default); }
  .verso.giu { transform: rotate(90deg); }
</style>
