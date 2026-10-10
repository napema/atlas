<!--
  L'andamento cumulato del ciclo contro il ritmo ideale del budget. Stare
  sopra la retta tratteggiata è l'unica cosa che conta, e per questo la
  linea cambia colore: il colore fa il lavoro di una legenda.
-->
<script lang="ts">
  /* `etichetta` scrive la tacca sotto il giorno n (1-based): sul ciclo il
     giorno 1 è il 23, e «1» sotto il 23 non si legge. */
  /* `punti`: gli acquisti fuori piano. Non entrano nella linea — una
     decisione presa una volta non alza il ritmo di tutti i giorni dopo —
     ma devono vedersi, perché sono la cosa su cui si può agire. `y` è
     l'altezza che la linea avrebbe se li sommassi: dice quanto pesano
     senza raccontare una curva falsa. */
  let { cum, budget, giornoOggi, giorniMese, punti = [], etichetta = (n: number) => String(n) }: {
    cum: number[]; budget: number; giornoOggi: number | null; giorniMese: number;
    punti?: { giorno: number; valore: number; y: number; nota?: string }[];
    etichetta?: (n: number) => string;
  } = $props();

  const L = 520, A = 150, B = 4;
  const idg = `g${Math.random().toString(36).slice(2, 8)}`;
  const g = $derived.by(() => {
    const massimo = Math.max(budget || 0, cum[cum.length - 1] || 0,
      ...punti.map((p) => p.y), 1) * 1.05;
    const x = (i: number) => B + (i / Math.max(1, giorniMese - 1)) * (L - B * 2);
    const y = (v: number) => A - (v / massimo) * A;
    const fino = giornoOggi != null ? Math.min(giornoOggi, giorniMese) : giorniMese;
    const sopra = budget > 0 && giornoOggi != null && cum[fino - 1] > (budget * fino) / giorniMese;
    const linea = Array.from({ length: fino }, (_, i) => `${x(i)},${y(cum[i] || 0)}`).join(" ");
    return { x, y, fino, linea, colore: sopra ? "var(--color-red)" : "var(--color-green)" };
  });
</script>

<svg viewBox="0 0 {L} {A + 22}" role="img" aria-label="Andamento della spesa nel ciclo">
  <defs>
    <linearGradient id="{idg}l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" style:stop-color={g.colore} style:stop-opacity=".35" />
      <stop offset="100%" style:stop-color={g.colore} style:stop-opacity="1" />
    </linearGradient>
    <linearGradient id="{idg}a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style:stop-color={g.colore} style:stop-opacity=".22" />
      <stop offset="100%" style:stop-color={g.colore} style:stop-opacity="0" />
    </linearGradient>
  </defs>
  {#each [0.25, 0.5, 0.75, 1] as f (f)}
    <line x1={B} y1={A - f * A} x2={L - B} y2={A - f * A} class="griglia" />
  {/each}
  {#if budget > 0}
    <line x1={g.x(0)} y1={g.y(0)} x2={g.x(giorniMese - 1)} y2={g.y(budget)} class="ritmo" />
  {/if}
  {#if g.fino > 0}
    <polygon points="{g.x(0)},{A} {g.x(0)},{g.y(0)} {g.linea} {g.x(g.fino - 1)},{A}" fill="url(#{idg}a)" />
    <polyline points="{g.x(0)},{g.y(0)} {g.linea}" fill="none" stroke="url(#{idg}l)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx={g.x(g.fino - 1)} cy={g.y(cum[g.fino - 1] || 0)} r="4.5" style:fill={g.colore} />
  {/if}
  {#each punti as p (p.giorno + "-" + p.valore)}
    <line x1={g.x(p.giorno - 1)} y1={g.y(cum[p.giorno - 1] || 0)} x2={g.x(p.giorno - 1)} y2={g.y(p.y)} class="filo" />
    <circle cx={g.x(p.giorno - 1)} cy={g.y(p.y)} r="4" class="fuori" />
  {/each}
  {#each [...new Set([1, Math.round(giorniMese / 3), Math.round((2 * giorniMese) / 3), giorniMese])] as n, i (n)}
    <text x={g.x(n - 1)} y={A + 15} text-anchor={i === 0 ? "start" : n === giorniMese ? "end" : "middle"}>{etichetta(n)}</text>
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .griglia { stroke: var(--label-tertiary); stroke-width: 1; opacity: 0.25; }
  .ritmo { stroke: var(--label-tertiary); stroke-width: 1.5; stroke-dasharray: 5 5; }
  /* Il filo che li lega alla linea: senza, sono pallini che galleggiano e
     non si capisce di che giorno sono. */
  .filo { stroke: var(--color-orange); stroke-width: 1.5; opacity: 0.45; }
  .fuori { fill: var(--color-orange); stroke: var(--bg-grouped-secondary, var(--scena-fondo)); stroke-width: 1.5; }
  text { fill: var(--label-tertiary); font-size: 13px; font-weight: 600; font-family: var(--font-family); }
</style>
