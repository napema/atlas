<!--
  Importo — una cifra in euro con i centesimi più piccoli, come i saldi di
  Wallet. I soldi sono sempre CENTESIMI interi (vedi `euro()` in ui.ts).
-->
<script lang="ts">
  import { euroParti } from "$lib/core/ui";

  let {
    centesimi,
    misura = 40,
    segno = false,
    senzaCentesimi = false,
    tono = "",
  }: { centesimi: number; misura?: number; segno?: boolean; senzaCentesimi?: boolean; tono?: "" | "male" | "avviso" | "ok" } = $props();

  const p = $derived(euroParti(centesimi, { segno }));
</script>

<span class="importo cifre" data-tono={tono} style:--m="{misura}px">
  {p.meno}{p.intero}{#if !senzaCentesimi}<span class="cts">,{p.decimali}</span>{/if}<span class="val">€</span>
</span>

<style>
  .importo {
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: var(--m); line-height: 1.1; letter-spacing: -0.02em; white-space: nowrap;
  }
  .cts { font-size: 0.55em; letter-spacing: 0; }
  .val { font-size: 0.55em; margin-left: 0.15em; letter-spacing: 0; }
  [data-tono="male"] { color: var(--color-red); }
  [data-tono="avviso"] { color: var(--color-orange); }
  [data-tono="ok"] { color: var(--color-green); }
</style>
