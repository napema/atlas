<!--
  Da spostare — il piano dei travasi, disegnato.

  È la risposta alla domanda della domenica sera — «ho questi saldi, quanto
  butto dove?» — che prima si faceva a una chat. Il conto lo fa
  `pianoTravasi()`; qui si fa vedere, e la forma conta quanto il conto:

    UNA MOSSA È UNA FRECCIA. Due tasche e una freccia con sopra la cifra: si
    legge come il gesto che farai su Revolut, nello stesso verso. Sotto ogni
    tasca il saldo DOPO, grande, e quello di prima, piccolo — perché la
    domanda dopo «quanto sposto» è «e quanto mi resta lì».

    UNA RIGA SOLA DI RISULTATO: la razione che ne viene fuori, e che ING non
    si tocca. Niente spiegazioni del conto: chi le vuole apre l'Analisi.

    QUANDO NON C'È NIENTE DA FARE, UNA RIGA. La regola 7 di DESIGN.md: una
    carta con poco da dire si riduce a una riga.

  Usato in due posti — il Riepilogo e la chiusura della domenica — ed è il
  motivo per cui è un componente: due disegni dello stesso piano finirebbero
  per dire due cose.
-->
<script lang="ts">
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { euro, daISO, GIORNI, celebra, tocco } from "$lib/core/ui";
  import { eseguiTravasi } from "$condivisi/finanze/travasi.js";
  import { nomePocket } from "./comune";

  let { piano, onfatto }: { piano: any; onfatto?: () => void } = $props();

  /** «dom 12». */
  const gg = (iso: string) => { const x = daISO(iso); return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`; };

  /* LA FINESTRA, DETTA COME LA PENSI. La domenica si prepara la settimana
     dopo; gli altri giorni la domanda è se il Principale arriva a domenica;
     a ridosso dello stipendio, se arriva allo stipendio. */
  const quando = $derived(
    piano.f.tronca ? `fino allo stipendio`
      : piano.f.prepara ? `settimana ${gg(piano.f.da)} – ${gg(piano.f.a)}`
      : `fino a ${gg(piano.f.a)}`,
  );

  function fatto() {
    eseguiTravasi(piano);
    tocco(14);
    celebra("Travasi registrati");
    onfatto?.();
  }
</script>

{#if piano.esito !== "stipendio"}
  {#if !piano.mosse.length && piano.esito !== "non-basta"}
    <!-- Niente da fare: una riga, e dice perché è tranquilla. -->
    <!-- «Niente da spostare» non vuol dire «tutto bene»: con una razione
         sotto la soglia la riga lo dice, in arancione, invece di dare una
         spunta verde a una settimana stretta. -->
    <div class="piano quieto" class:stretto={piano.esito === "stretto"}>
      <span class="spunta" aria-hidden="true">
        <Icona nome={piano.esito === "stretto" ? "avviso" : "spunta"} misura={14} tratto={piano.esito === "stretto" ? 2.4 : 3} />
      </span>
      <span class="q-testo">
        <b>Niente da spostare</b>
        <span class="secondario">
          {piano.esito === "stretto"
            ? `ma fino allo stipendio sono ${euro(piano.razione)} al giorno`
            : `il Principale arriva ${piano.f.tronca ? "allo stipendio" : `a ${gg(piano.f.a)}`}`}
        </span>
      </span>
    </div>
  {:else}
    <div class="piano" data-esito={piano.esito}>
      <div class="testa">
        <span class="eti">DA SPOSTARE</span>
        <span class="eti-dx">{quando}</span>
      </div>

      {#each piano.mosse as m (m.a)}
        {@const daPrima = m.da === "cassa" ? piano.prima.cassa : piano.prima[m.da]}
        <div class="mossa">
          <div class="tasca">
            <span class="t-nome">{nomePocket(m.da)}</span>
            <b class="cifre">{euro(m.da === "cassa" ? piano.dopo.cassa : piano.dopo[m.da])}</b>
            <span class="t-prima cifre">era {euro(daPrima)}</span>
          </div>

          <div class="freccia" aria-label="{euro(m.imp, { tondo: true })} da {nomePocket(m.da)} a {nomePocket(m.a)}">
            <b class="cifre">{euro(m.imp, { tondo: true })}</b>
            <span class="linea"><i></i><Icona nome="freccia" misura={14} tratto={2.6} /></span>
          </div>

          <div class="tasca arrivo">
            <span class="t-nome">{nomePocket(m.a)}</span>
            <b class="cifre">{euro(piano.dopo[m.a])}</b>
            <span class="t-prima cifre">era {euro(piano.prima[m.a])}</span>
          </div>
        </div>
      {/each}

      <!-- IL RISULTATO, in una riga. Se non basta, dice la cifra che manca
           e le due uscite — ING o stringere — invece di attingere da sé. -->
      {#if piano.esito === "non-basta"}
        <div class="esito male">
          <Icona nome="allarme" misura={16} tratto={2.2} />
          <span>
            <b>Mancano {euro(piano.manca, { tondo: true })}</b> anche con tutta la Cassa.
            <span class="secondario">O li prendi da ING, o stringi a {euro(piano.razioneMinima)} al giorno.</span>
          </span>
        </div>
      {:else}
        <div class="esito" class:stretto={piano.esito === "stretto"}>
          <span><b class="cifre">{euro(piano.razione)}</b> al giorno fino allo stipendio</span>
          <span class="secondario">ING non si tocca</span>
        </div>
      {/if}

      {#if piano.mosse.length}
        <Pulsante variante="pieno" larga onclick={fatto}>Fatto su Revolut</Pulsante>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .piano { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
  .testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti { font-size: var(--text-caption1); font-weight: var(--weight-semibold); letter-spacing: 0.6px; color: var(--label-secondary); }
  .eti-dx { font-size: var(--text-footnote); color: var(--label-secondary); white-space: nowrap; }
  .secondario { color: var(--label-secondary); }

  /* --- la riga quieta --- */
  .quieto { flex-direction: row; align-items: center; gap: var(--space-3); padding-block: var(--space-3); }
  .spunta {
    display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; flex: none;
    color: var(--color-green); background: color-mix(in srgb, var(--color-green) 18%, transparent);
  }
  .q-testo { display: flex; flex-direction: column; min-width: 0; font-size: var(--text-subheadline); }
  .quieto.stretto .spunta { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 18%, transparent); }
  .q-testo b { font-weight: var(--weight-semibold); font-size: var(--text-body); }

  /* --- una mossa: tasca, freccia, tasca ---
     Tre colonne e la freccia in mezzo, nel verso del gesto. Le tasche hanno
     la stessa larghezza perché si confrontano fra loro: «prima» e «dopo»
     devono stare alla stessa altezza da tutte e due le parti. */
  .mossa {
    display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center; gap: var(--space-2);
  }
  .tasca {
    display: flex; flex-direction: column; gap: 1px; min-width: 0;
    padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary);
  }
  .tasca.arrivo { background: color-mix(in srgb, var(--accento) 14%, transparent); }
  .t-nome { font-size: var(--text-caption1); font-weight: var(--weight-semibold); color: var(--label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tasca b { font-size: var(--text-headline); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .t-prima { font-size: var(--text-caption1); color: var(--label-tertiary); font-variant-numeric: tabular-nums; white-space: nowrap; }

  .freccia { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--accento); }
  .freccia b { font-size: var(--text-headline); font-weight: var(--weight-bold); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .linea { display: flex; align-items: center; width: 100%; min-width: 44px; }
  .linea i { flex: 1; height: 2px; border-radius: 1px; background: currentColor; margin-right: -6px; }

  /* --- il risultato --- */
  .esito {
    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px var(--space-3);
    font-size: var(--text-subheadline);
  }
  .esito b { font-weight: var(--weight-semibold); }
  .esito.stretto b { color: var(--color-orange); }
  .esito.male { flex-wrap: nowrap; align-items: flex-start; justify-content: flex-start; gap: var(--space-2); color: var(--color-red); }
  .esito.male > span { color: var(--label-primary); }
  .esito.male b { color: var(--color-red); }
</style>
