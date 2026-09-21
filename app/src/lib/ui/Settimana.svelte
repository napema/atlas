<!--
  Settimana — sette giorni in fila, come la striscia in cima ad Attività.

  Risponde a «quanti giorni ho tenuto», che è una domanda a STATI e non a
  percentuali: pieno, a metà, vuoto, niente in programma. Nella app di prima
  le caselle si riempivano in proporzione, e un giorno da 1 su 6 diventava
  una lineetta di tre pixel che si leggeva come un bordo sbagliato.

  Con `onscegli` i giorni si toccano (Abitudini: guardare ieri).
-->
<script lang="ts">
  import { daISO, GIORNI_INIZIALI } from "$lib/core/ui";

  export type StatoCasella = "pieno" | "parziale" | "vuoto" | "riposo" | "futuro";

  let {
    giorni,
    oggi,
    scelto,
    onscegli,
  }: {
    giorni: { iso: string; stato: StatoCasella; titolo?: string }[];
    oggi: string;
    scelto?: string;
    onscegli?: (iso: string) => void;
  } = $props();
</script>

<ol class="settimana">
  {#each giorni as g (g.iso)}
    {@const d = daISO(g.iso)}
    <li>
      <svelte:element
        this={onscegli ? "button" : "div"}
        type={onscegli ? "button" : undefined}
        class="giorno"
        class:oggi={g.iso === oggi}
        class:scelto={scelto === g.iso}
        data-stato={g.stato}
        title={g.titolo}
        aria-label={g.titolo}
        aria-pressed={onscegli ? scelto === g.iso : undefined}
        disabled={onscegli ? g.stato === "futuro" : undefined}
        onclick={onscegli ? () => onscegli(g.iso) : undefined}
        role={onscegli ? undefined : "img"}
      >
        <span class="lettera">{GIORNI_INIZIALI[(d.getDay() + 6) % 7]}</span>
        <span class="cerchio cifre">{d.getDate()}</span>
      </svelte:element>
    </li>
  {/each}
</ol>

<style>
  .settimana { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .giorno {
    width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 2px 0; border-radius: var(--radius-lg);
  }
  .lettera {
    font-size: var(--text-caption2); line-height: var(--lh-caption2); letter-spacing: var(--ls-caption2);
    font-weight: var(--weight-semibold); color: var(--label-secondary);
  }
  .oggi .lettera { color: var(--label-primary); }
  .cerchio {
    display: grid; place-items: center;
    width: 36px; height: 36px; border-radius: var(--radius-full);
    font-size: var(--text-subheadline); font-weight: var(--weight-semibold);
    color: var(--label-primary);
    background: var(--fill-quaternary);
    transition: background-color var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast) var(--ease-default);
  }
  [data-stato="pieno"] .cerchio { background: var(--color-green); color: #fff; }
  [data-stato="parziale"] .cerchio { background: color-mix(in srgb, var(--color-green) 22%, transparent); box-shadow: inset 0 0 0 2px var(--color-green); }
  [data-stato="riposo"] .cerchio { background: none; color: var(--label-tertiary); box-shadow: inset 0 0 0 1px var(--separator); }
  [data-stato="futuro"] .cerchio { background: none; color: var(--label-tertiary); }
  .oggi .cerchio { font-weight: var(--weight-bold); }
  /* Il giorno scelto si riconosce da un anello nel colore del modulo, fuori
     dal cerchio: dentro c'è già lo stato, e i due non devono confondersi. */
  .scelto .cerchio { outline: 2px solid var(--accento); outline-offset: 2px; }
  button.giorno:active .cerchio { transform: scale(0.92); }
</style>
