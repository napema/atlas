<!--
  Barre. `evidenzia` è l'indice della barra accesa — di solito il mese in
  corso: le altre fanno da contesto, e accese tutte non si capirebbe dove sei.
-->
<script lang="ts">
  let {
    valori, etichette, evidenzia = -1, retta = null, colore = "var(--accento)",
  }: { valori: number[]; etichette: string[]; evidenzia?: number; retta?: number | null; colore?: string } = $props();

  const L = 520, A = 130, B = 4;
  const g = $derived.by(() => {
    const massimo = Math.max(retta || 0, ...valori, 1);
    return { massimo, larga: (L - B * 2) / Math.max(1, valori.length) };
  });
</script>

<svg viewBox="0 0 {L} {A + 22}" role="img" aria-label="Confronto">
  {#if retta}
    <line x1={B} y1={A - (retta / g.massimo) * A} x2={L - B} y2={A - (retta / g.massimo) * A} class="retta" />
  {/if}
  {#each valori as v, i (i)}
    {@const h = Math.max(2, (v / g.massimo) * A)}
    <rect x={B + i * g.larga + g.larga * 0.15} y={A - h} width={g.larga * 0.7} height={h} rx="7"
      style:fill={i === evidenzia ? colore : "var(--label-tertiary)"} opacity={i === evidenzia ? 1 : 0.35} />
    <text x={B + i * g.larga + g.larga / 2} y={A + 15} text-anchor="middle">{String(etichette[i]).toUpperCase()}</text>
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; }
  .retta { stroke: var(--label-secondary); stroke-width: 1.5; stroke-dasharray: 5 5; }
  text { fill: var(--label-tertiary); font-size: 12px; font-weight: 600; font-family: var(--font-family); }
</style>
