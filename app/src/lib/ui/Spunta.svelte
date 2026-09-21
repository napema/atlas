<!--
  Spunta — il cerchio che si riempie. Il verde qui è giusto: vuol dire
  «fatto», ed è l'unica cosa che il verde vuol dire in ATLAS.

  Al tocco il cerchio fa un piccolo rimbalzo e il segno si disegna: la
  conferma deve arrivare dal dito, non da un numero che cambia altrove.
-->
<script lang="ts">
  let {
    fatta = false,
    misura = 28,
    parziale = 0,
    etichetta,
    onclick,
  }: {
    fatta?: boolean;
    misura?: number;
    /** Da 0 a 1: le abitudini a parti mostrano quanto manca. */
    parziale?: number;
    etichetta?: string;
    onclick?: () => void;
  } = $props();

  const r = $derived(misura / 2 - 1.5);
  const giro = $derived(2 * Math.PI * r);
</script>

<button
  type="button"
  class="spunta"
  class:fatta
  style:width="{misura}px"
  style:height="{misura}px"
  aria-pressed={fatta}
  aria-label={etichetta}
  onclick={(e) => { e.stopPropagation(); e.preventDefault(); onclick?.(); }}
>
  <svg viewBox="0 0 {misura} {misura}" aria-hidden="true">
    <circle class="bordo" cx={misura / 2} cy={misura / 2} r={r} />
    {#if !fatta && parziale > 0}
      <circle
        class="arco"
        cx={misura / 2} cy={misura / 2} r={r}
        stroke-dasharray={giro}
        stroke-dashoffset={giro * (1 - Math.min(1, parziale))}
      />
    {/if}
    <circle class="pieno" cx={misura / 2} cy={misura / 2} r={misura / 2} />
    <path
      class="segno"
      d="M{misura * 0.29} {misura * 0.52} L{misura * 0.44} {misura * 0.66} L{misura * 0.72} {misura * 0.36}"
    />
  </svg>
</button>

<style>
  .spunta { flex: none; display: grid; place-items: center; border-radius: var(--radius-full); position: relative; }
  .spunta::after { content: ""; position: absolute; inset: -8px; } /* 44px di bersaglio */
  svg { width: 100%; height: 100%; overflow: visible; }
  circle { fill: none; }
  .bordo { stroke: var(--label-tertiary); stroke-width: 1.8; }
  .arco { stroke: var(--color-green); stroke-width: 2.4; stroke-linecap: round; transform: rotate(-90deg); transform-origin: center; transition: stroke-dashoffset var(--duration-normal) var(--ease-default); }
  .pieno { fill: var(--color-green); transform: scale(0); transform-origin: center; transition: transform var(--duration-normal) var(--ease-spring); }
  .segno {
    fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round;
    stroke-dasharray: 30; stroke-dashoffset: 30;
    transition: stroke-dashoffset var(--duration-fast) var(--ease-out) 0.08s;
  }
  .fatta .pieno { transform: scale(1); }
  .fatta .segno { stroke-dashoffset: 0; }
  .fatta .bordo { stroke: transparent; }
  .spunta:active { transform: scale(0.9); transition: transform var(--duration-micro); }
</style>
