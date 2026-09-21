<!--
  L'andamento cumulato del mese contro il ritmo ideale del budget. Stare
  sopra la retta tratteggiata è l'unica cosa che conta, e per questo la
  linea cambia colore: il colore fa il lavoro di una legenda.
-->
<script lang="ts">
  let { cum, budget, giornoOggi, giorniMese }: { cum: number[]; budget: number; giornoOggi: number | null; giorniMese: number } = $props();

  const L = 520, A = 150, B = 4;
  const idg = `g${Math.random().toString(36).slice(2, 8)}`;
  const g = $derived.by(() => {
    const massimo = Math.max(budget || 0, cum[cum.length - 1] || 0, 1) * 1.05;
    const x = (i: number) => B + (i / Math.max(1, giorniMese - 1)) * (L - B * 2);
    const y = (v: number) => A - (v / massimo) * A;
    const fino = giornoOggi != null ? Math.min(giornoOggi, giorniMese) : giorniMese;
    const sopra = budget > 0 && giornoOggi != null && cum[fino - 1] > (budget * fino) / giorniMese;
    const punti = Array.from({ length: fino }, (_, i) => `${x(i)},${y(cum[i] || 0)}`).join(" ");
    return { x, y, fino, punti, colore: sopra ? "var(--color-red)" : "var(--color-green)" };
  });
</script>

<svg viewBox="0 0 {L} {A + 22}" role="img" aria-label="Andamento della spesa nel mese">
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
    <polygon points="{g.x(0)},{A} {g.x(0)},{g.y(0)} {g.punti} {g.x(g.fino - 1)},{A}" fill="url(#{idg}a)" />
    <polyline points="{g.x(0)},{g.y(0)} {g.punti}" fill="none" stroke="url(#{idg}l)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx={g.x(g.fino - 1)} cy={g.y(cum[g.fino - 1] || 0)} r="4.5" style:fill={g.colore} />
  {/if}
  {#each [1, 10, 20, giorniMese] as n (n)}
    <text x={g.x(n - 1)} y={A + 15} text-anchor="middle">{n}</text>
  {/each}
</svg>

<style>
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .griglia { stroke: var(--label-tertiary); stroke-width: 1; opacity: 0.25; }
  .ritmo { stroke: var(--label-tertiary); stroke-width: 1.5; stroke-dasharray: 5 5; }
  text { fill: var(--label-tertiary); font-size: 13px; font-weight: 600; font-family: var(--font-family); }
</style>
