<!--
  La revisione: i cinquanta giorni tutti insieme.

  È l'altra faccia della schermata del giorno, e risponde a una domanda che
  lì non si può porre — «come sta andando la sfida», non «cosa mi manca
  adesso». La griglia è quella della lavagna fisica: dieci per cinque,
  numerata, una casella per giorno. Un elenco di date in ordine inverso
  direbbe le stesse cose e non si guarderebbe mai, perché la cosa che si
  vuole vedere è la FORMA — dove sono i buchi, quanto è lungo il pezzo
  verde di adesso.

  Il RECORD è l'unico numero che sopravvive a un reset, e per questo c'è:
  dopo la terza ripartenza il contatore dice 2, e senza il record la
  schermata racconterebbe soltanto quello.

  I colpevoli sono in fondo perché sono l'unica cosa qui che dice che fare
  domani. «Sei ripartito quattro volte» è un numero; «tre volte su quattro
  era il journal» è una decisione.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { dataUmana, plurale } from "$lib/core/ui";
  import { griglia, colpevoli, ripartenze, statistiche, TOTALE } from "$condivisi/abitudini/p50.js";

  const d = $derived.by(() => {
    dati.versione;
    return {
      celle: griglia() as { n: number; esito: string | null; data: string | null; oggi: boolean }[],
      colpe: colpevoli() as { id: string; nome: string; emoji: string; volte: number }[],
      ripartito: ripartenze() as number,
      s: statistiche(),
    };
  });
</script>

<Sezione titolo="I cinquanta giorni">
  <div class="quadro">
    <div class="numeri">
      <div class="voce">
        <span class="text-footnote secondario">Record</span>
        <span class="cifra cifre">{d.s.record}</span>
      </div>
      <div class="voce">
        <span class="text-footnote secondario">Tenuti</span>
        <span class="cifra cifre">{d.s.bene}</span>
      </div>
      <div class="voce">
        <span class="text-footnote secondario">Ripartenze</span>
        <span class="cifra cifre" class:male={d.ripartito > 0}>{d.ripartito}</span>
      </div>
    </div>

    <ol class="griglia" aria-label="I {TOTALE} giorni della sfida">
      <!-- OGGI VINCE SULL'ESITO, e non è un dettaglio. Dopo una ripartenza
           stai rivivendo un numero già vissuto: la casella 3 porterebbe il
           rosso della volta scorsa proprio nel giorno in cui la stai
           rifacendo, e sarebbe la schermata che ti dà del perso mentre sei
           in piedi. La storia di quel numero l'ha già sostituita la corsa
           di adesso. -->
      {#each d.celle as c (c.n)}
        <li
          class="cella"
          data-esito={c.oggi ? "oggi" : (c.esito ?? "vuota")}
          title={c.data ? `${dataUmana(c.data)} · ${c.esito === "ok" ? "chiuso" : "perso"}` : `Giorno ${c.n}`}
        >
          <span class="cifre">{c.n}</span>
        </li>
      {/each}
    </ol>

    <p class="text-footnote secondario legenda">
      {d.s.corrente >= TOTALE && d.s.bene > 0
        ? "Ultimo giorno."
        : `${plurale(d.s.restanti, "giorno", "giorni")} alla fine.`}
    </p>
  </div>
</Sezione>

{#if d.colpe.length}
  <Sezione titolo="Che cosa ti ha fatto ripartire">
    <ul class="colpe">
      {#each d.colpe as c (c.id)}
        <li>
          <span class="emoji" aria-hidden="true">{c.emoji || "⭐️"}</span>
          <span class="nome">{c.nome}</span>
          <span class="volte cifre">{c.volte}</span>
        </li>
      {/each}
    </ul>
  </Sezione>
{:else if !d.s.chiusi}
  <Vuoto icona="abitudini" titolo="Niente da rivedere" testo="La griglia si riempie una chiusura alla volta: il primo giorno si chiude stasera." />
{/if}

<style>
  .quadro { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); }

  .numeri { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
  .voce { display: flex; flex-direction: column; gap: 2px; }
  .cifra { font-family: var(--font-display); font-size: 34px; line-height: 1; font-weight: var(--weight-bold); }
  .cifra.male { color: var(--color-red); }

  /* Dieci colonne come la lavagna. `aspect-ratio` invece di un'altezza
     fissa: a 320px di schermo le caselle si stringono tutte insieme e
     restano quadrate, invece di andare a capo e fare righe da undici. */
  .griglia { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }
  .cella {
    display: grid; place-items: center;
    aspect-ratio: 1; border-radius: 7px;
    font-size: 11px; font-weight: var(--weight-semibold);
    color: var(--label-tertiary);
    background: var(--fill-quaternary);
  }
  .cella[data-esito="ok"] { background: var(--color-green); color: #fff; }
  .cella[data-esito="no"] { background: var(--color-red); color: #fff; }
  /* Oggi è l'unica casella su cui puoi ancora fare qualcosa: l'anello del
     modulo, come nella striscia della settimana. */
  .cella[data-esito="oggi"] { background: none; color: var(--label-primary); box-shadow: inset 0 0 0 2px var(--accento); }

  .colpe { display: flex; flex-direction: column; }
  .colpe li {
    display: flex; align-items: center; gap: var(--space-3);
    min-height: 44px; padding: 0 var(--space-4);
  }
  .colpe li + li { box-shadow: inset 0 0.5px 0 var(--separator); }
  .emoji { font-size: 20px; }
  .nome { flex: 1; min-width: 0; font-size: 15px; overflow-wrap: anywhere; }
  .volte {
    display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 8px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-red) 18%, transparent);
    color: var(--color-red); font-weight: var(--weight-semibold);
  }
</style>
