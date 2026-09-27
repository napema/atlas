<!--
  La giornata: UNA lista, divisa per momento.

  Prima erano due liste divise per importanza — le otto della sfida e il
  supporto — e la giornata non si vive così. La mattina fai la morning
  routine e la skincare una dopo l'altra: con due liste saltavi fra due
  blocchi per fare tre cose nello stesso quarto d'ora. Ora il blocco è il
  momento, e l'importanza la porta la voce: le otto hanno il segno «50» e
  stanno in cima al loro momento.

  Solo i momenti che hanno qualcosa: un blocco «Sera» vuoto sarebbe una
  lastra che occupa spazio per dire che non c'è niente.

  Quello che oggi non è previsto (il workout in un giorno di riposo del
  piano, una settimanale non ancora obbligatoria) sta in fondo, chiuso in
  una riga sola: si può aprire e spuntare lo stesso, ma non si prende una
  lastra intera per una voce che oggi non chiede niente.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import RigaAbitudine from "./RigaAbitudine.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO } from "$lib/core/ui";
  import { partiDi, parteFatta, statoFascia } from "$condivisi/abitudini/dati.js";
  import { fattaIl } from "$condivisi/abitudini/calcolo.js";

  let {
    momenti,
    spente = [],
    giorno,
    bloccato = false,
    sfida = false,
    onapri,
  }: {
    momenti: { id: string; nome: string; voci: { h: any; fascia: string | null }[] }[];
    spente?: any[];
    giorno: string;
    bloccato?: boolean;
    /** Project 50 acceso: le otto portano il segno. */
    sfida?: boolean;
    onapri: (id: string) => void;
  } = $props();

  const fattaVoce = (v: { h: any; fascia: string | null }) => {
    if (!v.fascia) return fattaIl(v.h, giorno);
    const mie = partiDi(v.h).filter((p: any) => (p.fascia || "qualsiasi") === v.fascia);
    return mie.length > 0 && mie.every((p: any) => parteFatta(v.h.id, p.id, giorno));
  };

  /* Un momento passato con qualcosa ancora aperto lo dice nel titolo. Solo
     per oggi: di un giorno passato non serve sapere che la mattina è
     finita. «Giorno» lo misura il pomeriggio: finisce alle 18. */
  const FASCIA_DEL_MOMENTO: Record<string, string> = { mattina: "mattina", giorno: "pomeriggio", sera: "sera" };
  const POSTO_PC: Record<string, number> = { mattina: 0, sera: 1, giorno: 2 };

  const conti = $derived.by(() => {
    dati.versione;
    const oggi = giorno === oggiISO();
    return momenti.map((m) => {
      const fatte = m.voci.filter(fattaVoce).length;
      const tardi = oggi && fatte < m.voci.length && statoFascia(FASCIA_DEL_MOMENTO[m.id]) === "tardi";
      return { fatte, tardi };
    });
  });
</script>

<!-- L'ORDINE NEL DOCUMENTO NON È L'ORDINE SUL TELEFONO, di proposito.
     Sul PC le lastre scorrono in colonne dall'alto in basso (vedi Pagina),
     e in ordine cronologico «Mattina» finiva da sola nella prima colonna con
     mezzo schermo vuoto sotto, mentre la seconda portava giornata e sera.
     Scritte come mattina · sera · in giornata, le colonne diventano le
     ROUTINE e TUTTO IL GIORNO: alte quasi uguali, e un raggruppamento che
     ha un senso suo. Sul telefono le lastre stanno in una colonna flessibile
     e `order` le rimette in fila come si vive la giornata. -->
{#each [...momenti].sort((a, b) => POSTO_PC[a.id] - POSTO_PC[b.id]) as m (m.id)}
  {@const i = momenti.indexOf(m)}
  <div class="momento" style:order={i}>
  <Sezione titolo={m.nome}>
    {#snippet coda()}
      <span class="conto cifre" class:tardi={conti[i]?.tardi} class:tutte={conti[i]?.fatte === m.voci.length}>
        {conti[i]?.tardi ? "in ritardo · " : ""}{conti[i]?.fatte}/{m.voci.length}
      </span>
    {/snippet}
    {#each m.voci as v (v.h.id + (v.fascia || ""))}
      <RigaAbitudine
        h={v.h}
        {giorno}
        fascia={v.fascia}
        sfida={sfida && v.h.blocco === "p50"}
        bloccata={bloccato}
        {onapri}
      />
    {/each}
  </Sezione>
  </div>
{/each}

{#if spente.length}
  <details class="altre" style:order={momenti.length}>
    <summary class="text-subheadline secondario">
      <Icona nome="giu" misura={13} tratto={2.4} />
      <span>Non previste oggi · {spente.map((h) => h.name).join(", ")}</span>
    </summary>
    <div class="lastra">
      {#each spente as h (h.id)}
        <RigaAbitudine {h} {giorno} spenta compatta bloccata={bloccato} sfida={sfida && h.blocco === "p50"} {onapri} />
      {/each}
    </div>
  </details>
{/if}

<style>
  .conto { font-size: var(--text-subheadline); color: var(--label-secondary); }
  .conto.tutte { color: var(--color-green); font-weight: var(--weight-semibold); }
  .conto.tardi { color: var(--color-orange); }

  .altre summary {
    display: flex; align-items: center; gap: var(--space-2);
    min-height: 44px; padding: 0 var(--space-1);
    cursor: pointer; list-style: none;
  }
  .altre summary::-webkit-details-marker { display: none; }
  .altre summary span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .altre summary :global(svg) { flex: none; transition: transform var(--duration-fast) var(--ease-default); transform: rotate(-90deg); }
  .altre[open] summary :global(svg) { transform: none; }
  .lastra { background: var(--bg-grouped-secondary); border-radius: var(--radius-xxxl); overflow: hidden; }
</style>
