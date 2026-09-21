<!-- La ciambella della ripartizione, con la legenda accanto. -->
<script lang="ts">
  import { euro } from "$lib/core/ui";

  let { voci, totale }: { voci: { etichetta: string; valore: number; colore: string }[]; totale: number } = $props();

  const R = 56, SP = 24, C = R + SP / 2 + 2, S = C * 2;
  const archi = $derived.by(() => {
    let a0 = -Math.PI / 2;
    return voci.map((v) => {
      const a1 = a0 + (v.valore / (totale || 1)) * 2 * Math.PI;
      const b0 = a0 + 0.015, b1 = Math.max(b0 + 0.01, a1 - 0.015);
      a0 = a1;
      const grande = b1 - b0 > Math.PI ? 1 : 0;
      return { colore: v.colore, d: `M ${C + R * Math.cos(b0)} ${C + R * Math.sin(b0)} A ${R} ${R} 0 ${grande} 1 ${C + R * Math.cos(b1)} ${C + R * Math.sin(b1)}` };
    });
  });
</script>

<div class="ciambella">
  <svg width={S} height={S} viewBox="0 0 {S} {S}" aria-hidden="true">
    {#if voci.length === 1}
      <circle cx={C} cy={C} r={R} stroke-width={SP} fill="none" style:stroke={voci[0].colore} />
    {:else}
      {#each archi as a, i (i)}<path d={a.d} stroke-width={SP} fill="none" style:stroke={a.colore} />{/each}
    {/if}
    <text x={C} y={C - 2} text-anchor="middle" class="tot">{euro(totale, { tondo: true })}</text>
    <text x={C} y={C + 15} text-anchor="middle" class="eti">USCITE</text>
  </svg>
  <ul class="legenda">
    {#each voci as v (v.etichetta)}
      <li class="text-subheadline">
        <span class="punto" style:background={v.colore}></span>
        <span class="nome">{v.etichetta}</span>
        <span class="cifre secondario">{Math.round((v.valore / (totale || 1)) * 100)}%</span>
        <span class="cifre">{euro(v.valore, { tondo: true })}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .ciambella { display: flex; align-items: center; gap: var(--space-5); flex-wrap: wrap; }
  svg { flex: none; }
  .tot { fill: var(--label-primary); font-size: 15px; font-weight: 700; font-family: var(--font-family); }
  .eti { fill: var(--label-tertiary); font-size: 10px; font-weight: 700; letter-spacing: 0.5px; font-family: var(--font-family); }
  .legenda { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 6px; }
  .legenda li { display: grid; grid-template-columns: 10px 1fr auto auto; gap: var(--space-2); align-items: center; }
  .punto { width: 10px; height: 10px; border-radius: 3px; }
  .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
