<!--
  Un pasto della giornata, come SCHEDA e non come riga.

  Prima era una riga di elenco: tessera piccola, nome, calorie a destra. Si
  leggeva, ma non diceva niente che non fosse scritto — e i macro, che sono
  metà del motivo per cui esiste questo modulo, non c'erano proprio: per
  sapere quante proteine c'erano nel pranzo bisognava aprirlo.

  Qui il pasto ha la faccia che ha nel mondo: un'emoji grande (quelle di
  Apple, anche su Windows), il nome in chiaro, le calorie come cifra, e i
  tre macro sotto — barra e numero, gli stessi tre colori di tutto il
  modulo. Una fascia ancora da decidere non è un buco: è una scheda
  tratteggiata che chiede di essere riempita.
-->
<script lang="ts">
  import Traccia from "$lib/ui/Traccia.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { EMOJI_FASCIA, MACRO, kcal } from "./comune";

  let {
    id,
    fascia,
    ora,
    cosa,
    senza = false,
    conti = null,
    quote = null,
    onclick,
  }: {
    id: string;
    /** Il nome della FASCIA (Colazione), non del pasto. */
    fascia: string;
    ora: string;
    /** Che cosa si mangia, o «Da scegliere». */
    cosa: string;
    senza?: boolean;
    conti?: { kcal: number; p: number; c: number; g: number } | null;
    /** Quanto pesa ogni macro sul bersaglio del giorno: serve alle barre. */
    quote?: { p: number; c: number; g: number } | null;
    onclick?: () => void;
  } = $props();
</script>

<button type="button" class="pasto" class:senza {onclick}>
  <span class="tessera" class:spenta={senza}>{EMOJI_FASCIA[id] ?? "\u{1F37D}\u{FE0F}"}</span>

  <span class="testo">
    <span class="capo">
      <span class="text-footnote semibold nome-fascia">{fascia}</span>
      <span class="text-caption1 terziario cifre">{ora}</span>
    </span>
    <span class="cosa text-body" class:secondario={senza}>{cosa}</span>

    {#if conti && quote}
      <span class="macro">
        {#each MACRO as m (m.k)}
          <span class="voce">
            <Traccia valore={quote[m.k as "p" | "c" | "g"]} colore={m.colore} altezza={4} etichetta={m.nome} />
            <span class="text-caption2 secondario cifre">{Math.round(conti[m.k as "p" | "c" | "g"])}<i>g</i> {m.breve}</span>
          </span>
        {/each}
      </span>
    {/if}
  </span>

  <span class="destra">
    {#if conti}
      <span class="kcal cifre">{kcal(conti.kcal)}</span>
      <span class="text-caption2 terziario">kcal</span>
    {:else}
      <span class="scegli"><Icona nome="piu" misura={20} tratto={2.2} /></span>
    {/if}
  </span>
</button>

<style>
  .pasto {
    display: flex; align-items: flex-start; gap: var(--space-3); width: 100%; text-align: left;
    padding: var(--space-4); border-radius: var(--radius-xl);
    transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-fast) var(--ease-default);
  }
  .pasto + :global(.pasto) { box-shadow: inset 0 0.5px 0 var(--separator); }
  .pasto:active { transform: scale(0.985); background: var(--fill-quaternary); }

  /* Una fascia vuota si vede che è vuota: il tratteggio è la forma del
     «manca qualcosa» che non serve spiegare a parole. */
  .senza .tessera {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px var(--separator);
  }

  .tessera {
    flex: none; display: grid; place-items: center; width: 46px; height: 46px;
    border-radius: 14px; background: var(--fill-tertiary);
    font-family: var(--font-emoji); font-size: 26px; line-height: 1;
  }

  .testo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .capo { display: flex; align-items: baseline; gap: var(--space-2); }
  .nome-fascia { color: var(--label-secondary); letter-spacing: 0.2px; }
  .cosa { overflow-wrap: anywhere; font-weight: var(--weight-medium); }

  .macro { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-top: 6px; }
  .voce { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .voce i { font-style: normal; color: var(--label-tertiary); }

  .destra { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 0; padding-top: 2px; }
  .kcal { font-family: var(--font-display); font-size: 24px; line-height: 26px; font-weight: var(--weight-bold); }
  .scegli {
    display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
    background: color-mix(in srgb, var(--accento) 16%, transparent); color: var(--accento);
  }
</style>
