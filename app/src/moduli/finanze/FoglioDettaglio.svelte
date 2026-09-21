<!--
  Il dettaglio di un movimento. Non solo quanto e quando: il CONTESTO.
  Sapere che quella cena costa il 40% più della media delle cene è
  l'informazione che cambia il comportamento; il numero da solo no.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import RigaMovimento from "./RigaMovimento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, euro, plurale, daISO, GIORNI, MESI } from "$lib/core/ui";
  import { movimentiVivi, categoriaPerId, eliminaMovimento, salvaMovimento } from "$condivisi/finanze/dati.js";
  import { importoEffettivo, contestoMovimento } from "$condivisi/finanze/calcolo.js";
  import { coloreCat, ETICHETTA_TIPO } from "./comune";
  import { apri } from "./fogli.svelte";

  let { aperto = $bindable(false), id }: { aperto: boolean; id: string } = $props();

  let sicuro = $state(false);
  $effect(() => { if (aperto) sicuro = false; });

  const d = $derived.by(() => {
    dati.versione;
    const m = (movimentiVivi() as any[]).find((x) => x.id === id);
    if (!m) return null;
    const c = categoriaPerId(m.cat);
    const eff = importoEffettivo(m);
    const g = daISO(m.data);
    return {
      m, c, eff,
      ctx: contestoMovimento(m),
      data: `${GIORNI[(g.getDay() + 6) % 7]} ${g.getDate()} ${MESI[g.getMonth()]} ${g.getFullYear()}`,
      natura: m.tipo === "out" ? (m.ecc ? "Straordinaria · fuori budget" : "Ordinaria · dentro il budget")
        : m.tipo === "extra" ? "Sforamento del sistema pocket"
        : m.tipo === "giro" ? "Giroconto · neutro sul budget"
        : ETICHETTA_TIPO[m.tipo],
      tono: m.tipo === "in" ? "ok" : m.tipo === "extra" ? "male" : m.ecc ? "avviso" : "",
      agganciato: m.rif ? (movimentiVivi() as any[]).find((x) => x.id === m.rif)?.nota || "spesa non trovata" : null,
    };
  });

  function elimina() {
    if (!d) return;
    if (!sicuro) { sicuro = true; setTimeout(() => (sicuro = false), 3000); return; }
    const copia = { ...d.m };
    eliminaMovimento(d.m.id);
    aperto = false;
    avviso("Eliminato.", { azione: { etichetta: "Annulla", fai: () => salvaMovimento(copia) } });
  }
</script>

<Foglio bind:aperto titolo={d ? (d.m.tipo === "out" ? "Uscita" : ETICHETTA_TIPO[d.m.tipo]) : ""}>
  {#snippet destra()}
    {#if d}<Pulsante variante="testo" misura="media" onclick={() => apri({ tipo: "movimento", movimento: d.m })}>Modifica</Pulsante>{/if}
  {/snippet}
  {#if d}
    <div class="testa">
      <Importo centesimi={d.m.tipo === "in" || d.m.tipo === "giro" ? d.eff : -d.eff} segno={d.m.tipo === "in"} misura={48} tono={d.tono as any} />
      {#if d.eff !== d.m.imp}<span class="text-footnote secondario">lordo {euro(d.m.imp)} · rimborsato {euro(d.m.imp - d.eff)}</span>{/if}
      <span class="text-title3">{d.m.nota || ETICHETTA_TIPO[d.m.tipo]}</span>
      {#if d.c}
        <span class="badge text-subheadline" style:--tinta={coloreCat(d.m.cat)}><i></i>{d.c.nome}{d.m.sub ? ` · ${d.m.sub}` : ""}</span>
      {/if}
    </div>

    <Sezione>
      <Riga titolo="Data" valore={d.data} />
      <Riga titolo="Natura" valore={d.natura} />
      {#if d.m.tipo === "out" && d.ctx.simili > 1}
        <Riga titolo="Media {d.m.sub || d.c?.nome || 'categoria'}">
          {#snippet fine()}
            <span class="cifre secondario">{euro(d.ctx.media)}{#if d.ctx.scostamento !== null && Math.abs(d.ctx.scostamento) >= 5}<b class:male={d.ctx.scostamento > 0} class:ok={d.ctx.scostamento < 0}> ({d.ctx.scostamento > 0 ? "+" : ""}{d.ctx.scostamento}%)</b>{/if}</span>
          {/snippet}
        </Riga>
      {/if}
      {#if d.m.tipo === "out" && d.ctx.quotaSulMese !== null}<Riga titolo="Peso sul mese" valore="{d.ctx.quotaSulMese}% della spesa ordinaria" />{/if}
      {#if d.m.tipo === "out" && d.ctx.simili > 0}<Riga titolo="Frequenza" valore="{plurale(d.ctx.simili, 'volta', 'volte')} in archivio" />{/if}
      {#if d.ctx.rimborsi.length}<Riga titolo="Rimborsi" valore="{d.ctx.rimborsi.length} · {euro(d.ctx.rimborsi.reduce((s: number, x: any) => s + x.imp, 0))}" />{/if}
      {#if d.agganciato}<Riga titolo="Agganciato a" valore={d.agganciato} />{/if}
    </Sezione>

    {#if d.ctx.rimborsi.length}
      <Sezione titolo="Rimborsi agganciati">
        {#each d.ctx.rimborsi as r (r.id)}<RigaMovimento m={r} />{/each}
      </Sezione>
    {/if}

    <Pulsante variante="tinto" distruttivo larga onclick={elimina}>{sicuro ? "Tocca di nuovo per eliminare" : "Elimina"}</Pulsante>
  {/if}
</Foglio>

<style>
  .testa { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: var(--space-2) 0; }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: var(--radius-full); background: color-mix(in srgb, var(--tinta) 16%, transparent); }
  .badge i { width: 8px; height: 8px; border-radius: 50%; background: var(--tinta); }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }
</style>
