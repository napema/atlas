<!--
  La revisione: i cinquanta giorni tutti insieme.

  È l'altra faccia della schermata del giorno, e risponde a una domanda che
  lì non si può porre — «come sta andando», non «cosa mi manca adesso». La
  griglia è quella della lavagna fisica: dieci per cinque, numerata, una
  casella per giorno. Un elenco di date direbbe le stesse cose e non lo
  guarderebbe nessuno: quello che si vuole vedere è la FORMA — dove sono i
  buchi, quanto è lungo il pezzo verde di adesso.

  Sotto la griglia ci sono le due domande che vengono dopo: che cosa ti ha
  fatto ripartire, e quando. I colpevoli sono l'unica cosa qui che dice che
  fare domani — «sei ripartito quattro volte» è un numero, «tre volte su
  quattro era il journal» è una decisione — e lo storico è il posto dove
  quel numero si controlla, giorno per giorno.

  I tre numeri (record, tenuti, ripartenze) stanno nel riepilogo, accanto al
  contatore: vedi `NumeriSfida.svelte`.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { dataUmana, plurale } from "$lib/core/ui";
  import { griglia, colpevoli, chiusure, statistiche, TOTALE } from "$condivisi/abitudini/p50.js";

  const d = $derived.by(() => {
    dati.versione;
    return {
      celle: griglia() as { n: number; esito: string | null; data: string | null; oggi: boolean }[],
      colpe: colpevoli() as { id: string; nome: string; emoji: string; volte: number }[],
      // Dalla più recente: la domanda è «com'è andata ultimamente», e la
      // risposta comincia da ieri, non dal giorno uno.
      storico: ([...(chiusure() as any[])].reverse()).slice(0, 14),
      s: statistiche() as any,
    };
  });
</script>

<Sezione titolo="I cinquanta giorni">
  <div class="quadro">
    <ol class="griglia" aria-label="I {TOTALE} giorni della sfida">
      <!-- OGGI VINCE SULL'ESITO. Dopo una ripartenza stai rivivendo un
           numero già vissuto: la casella 3 porterebbe il rosso della volta
           scorsa proprio nel giorno in cui la stai rifacendo, e sarebbe la
           schermata che ti dà del perso mentre sei in piedi. -->
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

    <p class="text-footnote secondario">
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
{/if}

{#if d.storico.length}
  <Sezione titolo="Le chiusure" piede="Un giorno chiuso non si tocca più: questo è il registro, non una lista di cose da sistemare.">
    <ul class="storico">
      {#each d.storico as c (c.id)}
        <li class:persa={c.esito !== "ok"}>
          <span class="segno" aria-hidden="true">
            <Icona nome={c.esito === "ok" ? "spunta" : "chiudi"} misura={13} tratto={2.6} />
          </span>
          <span class="quando">
            <b>Giorno {c.giorno}</b>
            <span class="text-footnote secondario">{dataUmana(c.data)}</span>
          </span>
          <span class="text-footnote secondario esito">
            {#if c.esito === "ok"}
              {c.serate?.penalita ? `settimana non rispettata · −7` : "tenuto"}
            {:else}
              {(c.mancate || []).length === 1 ? "1 voce mancata" : `${(c.mancate || []).length} voci mancate`}
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </Sezione>
{:else}
  <Vuoto icona="abitudini" titolo="Niente da rivedere" testo="La griglia si riempie una chiusura alla volta: il primo giorno si chiude stasera." />
{/if}

<style>
  .quadro { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }

  /* Dieci colonne come la lavagna, e una larghezza massima: sul PC senza
     tetto le caselle diventavano quadrati da settanta punti, cioè un
     calendario gigante per cinquanta numeri piccoli. */
  .griglia { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; max-width: 460px; }
  .cella {
    display: grid; place-items: center;
    aspect-ratio: 1; border-radius: 8px;
    font-size: 11px; font-weight: var(--weight-semibold);
    color: var(--label-tertiary);
    background: var(--fill-quaternary);
  }
  .cella[data-esito="ok"] { background: var(--color-green); color: #fff; }
  .cella[data-esito="no"] { background: var(--color-red); color: #fff; }
  /* Oggi è l'unica casella su cui puoi ancora fare qualcosa: l'anello del
     modulo, come nella striscia della settimana. */
  .cella[data-esito="oggi"] { background: none; color: var(--label-primary); box-shadow: inset 0 0 0 2px var(--accento); }

  .colpe, .storico { display: flex; flex-direction: column; }
  .colpe li, .storico li {
    display: flex; align-items: center; gap: var(--space-3);
    min-height: 44px; padding: 0 var(--space-4);
  }
  .colpe li + li, .storico li + li { box-shadow: inset 0 0.5px 0 var(--separator); }

  .emoji { font-size: 20px; }
  .nome { flex: 1; min-width: 0; font-size: 15px; overflow-wrap: anywhere; }
  .volte {
    display: grid; place-items: center; min-width: 26px; height: 26px; padding: 0 8px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-red) 18%, transparent);
    color: var(--color-red); font-weight: var(--weight-semibold);
  }

  .segno {
    flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
    background: color-mix(in srgb, var(--color-green) 20%, transparent); color: var(--color-green);
  }
  .persa .segno { background: color-mix(in srgb, var(--color-red) 20%, transparent); color: var(--color-red); }
  .quando { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .quando b { font-size: 15px; font-weight: var(--weight-semibold); }
  .esito { text-align: right; }
</style>
