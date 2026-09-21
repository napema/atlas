<!--
  La testata della giornata: l'anello delle calorie e le tre barre.

  L'ANELLO NON DÀ UN GIUDIZIO. Per un giro era colorato di stato — verde,
  ambra, rosso sopra il bersaglio — ma l'obiettivo di questo modulo è la
  MASSA: stare sopra le calorie è il piano che funziona. Un anello rosso a
  3510 su 2975 diceva «hai sbagliato» a una giornata andata bene. Quindi il
  colore del modulo, sempre; quanto sei sopra o sotto lo dice la cifra.

  L'anello non passa mai il giro: uno che si riavvolge farebbe sembrare che
  sei di nuovo all'inizio.
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
    <Anello valore={b.kcal ? t.kcal / b.kcal : 0} misura={124} spessore={11}>
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
      <div class="voce">
        <div class="riga text-subheadline">
          <span>{m.nome}</span>
          <span class="cifre secondario">{Math.round(t[m.k])} / {b[m.k]} g</span>
        </div>
        <Traccia valore={b[m.k] ? t[m.k] / b[m.k] : 0} colore={m.colore} altezza={6} etichetta={m.nome} />
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
  .kcal { font-family: var(--font-display); font-size: 28px; line-height: 32px; font-weight: var(--weight-bold); }
  .manca { display: flex; flex-direction: column; align-items: center; }
  .cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--accento); }
  .macro { display: flex; flex-direction: column; gap: var(--space-3); }
  .voce { display: flex; flex-direction: column; gap: 6px; }
  .riga { display: flex; justify-content: space-between; }
</style>
