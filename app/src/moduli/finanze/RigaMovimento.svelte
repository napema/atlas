<!--
  Un movimento in una lista. A sinistra il simbolo della categoria in una
  tessera colorata: in un elenco di trenta righe il simbolo si riconosce
  prima della nota, e dà alla lista un ritmo che una colonna di testo non ha.
-->
<script lang="ts">
  import Riga from "$lib/ui/Riga.svelte";
  import { euro } from "$lib/core/ui";
  import { categoriaPerId, emojiCat, movimentiVivi } from "$condivisi/finanze/dati.js";
  import { importoEffettivo } from "$condivisi/finanze/calcolo.js";
  import { coloreCat, descriviMovimento, ETICHETTA_TIPO } from "./comune";
  import { apri } from "./fogli.svelte";

  let { m }: { m: any } = $props();

  const d = $derived.by(() => {
    const cat = categoriaPerId(m.cat);
    const effettivo = importoEffettivo(m);
    const origine = m.rif ? movimentiVivi().find((x: any) => x.id === m.rif) : null;
    const segno = ({ in: "+", out: "−", extra: "+", giro: "", rimb: "−", reso: "−" } as Record<string, string>)[m.tipo] ?? "−";
    return {
      descrizione: descriviMovimento(m, cat, origine),
      tinta: m.tipo === "out" ? coloreCat(m.cat) : m.tipo === "in" ? "var(--color-green)" : m.tipo === "extra" ? "var(--color-red)" : "var(--color-gray)",
      simbolo: m.tipo === "out" ? emojiCat(m.cat) : m.tipo === "in" ? "↓" : m.tipo === "extra" ? "!" : m.tipo === "giro" ? "⇄" : "↩",
      cifra: segno + euro(m.tipo === "out" ? effettivo : m.imp),
      ridotto: m.tipo === "out" && effettivo !== m.imp,
      straordinario: m.tipo === "out" && m.ecc,
    };
  });
</script>

<Riga onclick={() => apri({ tipo: "dettaglio", id: m.id })}>
  {#snippet inizio()}
    <span class="tessera" style:--tinta={d.tinta}><span class={m.tipo === "out" ? "emoji" : "segno"}>{d.simbolo}</span></span>
  {/snippet}
  <span class="nota-riga">
    <span class="nome">{m.nota || ETICHETTA_TIPO[m.tipo] || "—"}</span>
    {#if d.straordinario}<span class="tag ambra text-caption2">straordinaria</span>{/if}
    {#if m.tipo === "extra"}<span class="tag rosso text-caption2">sforamento</span>{/if}
  </span>
  <span class="text-subheadline secondario">{d.descrizione}</span>
  {#snippet fine()}
    <span class="cifra">
      <span class="cifre" class:entrata={m.tipo === "in"}>{d.cifra}</span>
      {#if d.ridotto}<span class="text-caption1 secondario cifre">lordo {euro(m.imp)}</span>{/if}
    </span>
  {/snippet}
</Riga>

<style>
  .tessera {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; font-size: 16px;
    background: color-mix(in srgb, var(--tinta) 24%, transparent);
  }
  .segno { color: var(--tinta); font-weight: var(--weight-bold); font-size: 16px; }
  .nota-riga { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tag { flex: none; padding: 1px 7px; border-radius: var(--radius-full); font-weight: var(--weight-semibold); }
  .tag.ambra { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent); }
  .tag.rosso { color: var(--color-red); background: color-mix(in srgb, var(--color-red) 16%, transparent); }
  .cifra { display: flex; flex-direction: column; align-items: flex-end; font-weight: var(--weight-medium); }
  .entrata { color: var(--color-green); }
</style>
