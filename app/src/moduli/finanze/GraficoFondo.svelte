<!--
  Il saldo del fondo contro la linea dei versamenti programmati.

  È l'unico grafico che resta, e risponde alla sola domanda per cui
  l'obiettivo esiste: ci arrivo? La linea piena è quello che c'è, la
  tratteggiata quello che il piano prevedeva, la riga orizzontale il
  traguardo. Se la piena sta sotto la tratteggiata sei indietro, e non
  serve una legenda per capirlo.

  Il reale si ferma a oggi. Prolungarlo sul futuro vorrebbe dire disegnare
  la previsione due volte con due stili diversi, e a quel punto non si sa
  più quale delle due linee è un dato.
-->
<script lang="ts">
  let { punti, target, etichette = [] }:
    { punti: { quando: string; piano: number; reale: number | null }[]; target: number; etichette?: number[] } = $props();

  const L = 520, A = 160, B = 6;
  const idg = `f${Math.random().toString(36).slice(2, 8)}`;

  const g = $derived.by(() => {
    const n = Math.max(1, punti.length - 1);
    const massimo = Math.max(target, ...punti.map((p) => p.piano), 1) * 1.06;
    const x = (i: number) => B + (i / n) * (L - B * 2);
    const y = (v: number) => A - (v / massimo) * A;

    const reali = punti.map((p, i) => ({ ...p, i })).filter((p) => p.reale != null);
    const indietro = reali.length ? (reali.at(-1)!.reale as number) < reali.at(-1)!.piano : false;

    return {
      x, y, massimo,
      piano: punti.map((p, i) => `${x(i)},${y(p.piano)}`).join(" "),
      reale: reali.map((p) => `${x(p.i)},${y(p.reale as number)}`).join(" "),
      ultimo: reali.at(-1) ?? null,
      colore: indietro ? "var(--color-orange)" : "var(--color-green)",
    };
  });
</script>

<svg viewBox="0 0 {L} {A + 22}" role="img" aria-label="Il fondo contro i versamenti programmati">
  <defs>
    <linearGradient id="{idg}a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style:stop-color={g.colore} style:stop-opacity=".22" />
      <stop offset="100%" style:stop-color={g.colore} style:stop-opacity="0" />
    </linearGradient>
  </defs>

  {#each [0.25, 0.5, 0.75] as f (f)}
    <line x1={B} y1={A - f * A} x2={L - B} y2={A - f * A} class="griglia" />
  {/each}

  <!-- Il traguardo. -->
  <line x1={B} y1={g.y(target)} x2={L - B} y2={g.y(target)} class="target" />

  <!-- Il piano. -->
  <polyline points={g.piano} fill="none" class="piano" />

  <!-- Quello che c'è. -->
  {#if g.ultimo}
    <polygon points="{g.x(0)},{A} {g.reale} {g.x(g.ultimo.i)},{A}" fill="url(#{idg}a)" />
    <polyline points={g.reale} fill="none" style:stroke={g.colore} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx={g.x(g.ultimo.i)} cy={g.y(g.ultimo.reale as number)} r="4.5" style:fill={g.colore} />
  {/if}

  {#each etichette as i (i)}
    {#if punti[i]}
      <text x={g.x(i)} y={A + 16} text-anchor="middle">{punti[i].quando.slice(5, 7)}/{punti[i].quando.slice(2, 4)}</text>
    {/if}
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .griglia { stroke: var(--label-tertiary); stroke-width: 1; opacity: 0.22; }
  .target { stroke: var(--label-secondary); stroke-width: 1.5; }
  .piano { stroke: var(--label-tertiary); stroke-width: 1.5; stroke-dasharray: 5 5; }
  text { fill: var(--label-tertiary); font-size: 12px; font-weight: 600; font-family: var(--font-family); }
</style>
