<!--
  Pillole — scelte a pastiglia che vanno a capo: i giorni della settimana,
  «3×», le fasce. Una o più, a seconda di `multiplo`. Quella scelta prende il
  colore del modulo; le altre restano grigie.
-->
<script lang="ts" generics="T extends string | number">
  let {
    opzioni,
    scelte = $bindable([]),
    multiplo = false,
    etichetta,
    oncambio,
  }: {
    opzioni: { id: T; testo: string }[];
    scelte: T[];
    multiplo?: boolean;
    etichetta?: string;
    oncambio?: (v: T[]) => void;
  } = $props();

  function tocca(id: T) {
    if (multiplo) scelte = scelte.includes(id) ? scelte.filter((x) => x !== id) : [...scelte, id];
    else scelte = [id];
    oncambio?.(scelte);
  }
</script>

<div class="pillole" role="group" aria-label={etichetta}>
  {#each opzioni as o (o.id)}
    <button
      type="button"
      class:scelta={scelte.includes(o.id)}
      aria-pressed={scelte.includes(o.id)}
      onclick={() => tocca(o.id)}
    >{o.testo}</button>
  {/each}
</div>

<style>
  .pillole { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  button {
    min-width: 44px; height: 36px; padding: 0 var(--space-4);
    border-radius: var(--radius-full);
    background: var(--fill-tertiary);
    font-size: var(--text-subheadline); font-weight: var(--weight-medium);
    text-align: center;
    transition: background-color var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring);
  }
  button:active { transform: scale(0.94); }
  button.scelta { background: var(--accento); color: #fff; font-weight: var(--weight-semibold); }
</style>
