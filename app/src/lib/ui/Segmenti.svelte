<!--
  Segmenti — il controllo a segmenti. Il cursore SCIVOLA dal vecchio al
  nuovo, non salta: è il movimento che dice «hai cambiato vista di questa
  stessa cosa», che è diverso da «sei andato altrove».
-->
<script lang="ts" generics="T extends string">
  let {
    opzioni,
    valore = $bindable(),
    etichetta,
    onscelta,
  }: {
    opzioni: { id: T; testo: string }[];
    valore: T;
    etichetta?: string;
    onscelta?: (id: T) => void;
  } = $props();

  const indice = $derived(Math.max(0, opzioni.findIndex((o) => o.id === valore)));

  function scegli(id: T) {
    if (id === valore) return;
    valore = id;
    onscelta?.(id);
  }
</script>

<div
  class="segmenti"
  role="tablist"
  aria-label={etichetta}
  style:--n={opzioni.length}
  style:--i={indice}
>
  <span class="cursore" aria-hidden="true"></span>
  {#each opzioni as o (o.id)}
    <button
      type="button"
      role="tab"
      aria-selected={o.id === valore}
      class:scelto={o.id === valore}
      onclick={() => scegli(o.id)}
    >{o.testo}</button>
  {/each}
</div>

<style>
  .segmenti {
    position: relative;
    display: grid; grid-template-columns: repeat(var(--n), 1fr);
    height: 36px; padding: 2px;
    background: var(--fill-tertiary);
    border-radius: var(--radius-full);
    isolation: isolate;
  }
  .cursore {
    position: absolute; z-index: -1;
    top: 2px; bottom: 2px; left: 2px;
    width: calc((100% - 4px) / var(--n));
    transform: translateX(calc(100% * var(--i)));
    background: var(--thumb);
    border-radius: var(--radius-full);
    box-shadow: var(--thumb-shadow);
    transition: transform var(--duration-normal) var(--ease-spring);
  }
  button {
    text-align: center;
    font-size: var(--text-subheadline); letter-spacing: var(--ls-subheadline);
    font-weight: var(--weight-medium);
    color: var(--label-primary);
    border-radius: var(--radius-full);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 var(--space-2);
  }
  button.scelto { font-weight: var(--weight-semibold); }
</style>
