<!--
  La testata della giornata: l'anello delle calorie e i tre macro.

  L'ANELLO NON DÀ UN GIUDIZIO. Per un giro era colorato di stato — verde,
  ambra, rosso sopra il bersaglio — ma l'obiettivo di questo modulo è la
  MASSA: stare sopra le calorie è il piano che funziona. Un anello rosso a
  3510 su 2975 diceva «hai sbagliato» a una giornata andata bene. Quindi il
  colore del modulo, sempre; quanto sei sopra o sotto lo dice la cifra.

  L'anello non passa mai il giro: uno che si riavvolge farebbe sembrare che
  sei di nuovo all'inizio.

  I macro sono TESSERE e non tre righe di testo con una barretta. Erano
  leggibili e basta: «Proteine 172 / 138 g» è una frase, e una frase la devi
  leggere. Una tessera con l'emoji, la cifra grossa e la barra sotto si
  guarda — e sono tre, quindi si confrontano a colpo d'occhio, che è
  esattamente la domanda («sono indietro su qualcosa?»).
-->
<script lang="ts">
  import Anello from "$lib/ui/Anello.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import { plurale } from "$lib/core/ui";
  import { MACRO, kcal } from "./comune";

  let { b, t, incerte = 0 }: { b: any; t: any; incerte?: number } = $props();
  const manca = $derived(b.kcal - t.kcal);
</script>

<div class="testata">
  <div class="alto">
    <Anello valore={b.kcal ? t.kcal / b.kcal : 0} misura={132} spessore={12}>
      <span class="kcal cifre">{kcal(t.kcal)}</span>
      <span class="text-caption1 secondario">su {kcal(b.kcal)}</span>
    </Anello>
    <div class="manca">
      <span class="text-footnote secondario">{manca >= 0 ? "Mancano" : "Oltre di"}</span>
      <span class="cifra cifre">{kcal(Math.abs(manca))}</span>
      <span class="text-footnote secondario">kcal</span>
    </div>
  </div>

  <div class="macro">
    {#each MACRO as m (m.k)}
      {@const fatto = Math.round(t[m.k])}
      {@const bersaglio = b[m.k]}
      <div class="tessera" style:--tinta={m.colore}>
        <span class="faccia">
          <span class="emo">{m.emoji}</span>
          <span class="text-caption1 secondario">{m.breve}</span>
        </span>
        <span class="valore cifre">{fatto}<i>/{bersaglio} g</i></span>
        <Traccia valore={bersaglio ? fatto / bersaglio : 0} colore={m.colore} altezza={5} etichetta={m.nome} />
      </div>
    {/each}
  </div>

  {#if incerte}
    <p class="text-footnote secondario">{plurale(incerte, "fascia ancora da decidere", "fasce ancora da decidere")}: il totale è parziale.</p>
  {/if}
</div>

<style>
  .testata { padding: var(--space-5) var(--space-4) var(--space-4); display: flex; flex-direction: column; gap: var(--space-5); }
  .alto { display: flex; align-items: center; justify-content: space-around; gap: var(--space-4); }
  .kcal { font-family: var(--font-display); font-size: 30px; line-height: 34px; font-weight: var(--weight-bold); }
  .manca { display: flex; flex-direction: column; align-items: center; }
  .cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--accento); }

  .macro { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
  .tessera {
    display: flex; flex-direction: column; gap: 5px;
    padding: var(--space-3); border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--tinta) 10%, transparent);
  }
  .faccia { display: flex; align-items: center; gap: 5px; min-width: 0; }
  .emo { font-family: var(--font-emoji); font-size: 15px; line-height: 1; flex: none; }
  .valore { font-size: 19px; font-weight: var(--weight-bold); white-space: nowrap; }
  .valore i { font-style: normal; font-size: var(--text-caption1); font-weight: var(--weight-regular); color: var(--label-tertiary); }
</style>
