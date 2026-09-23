<!--
  Pasti in Impostazioni: tu, l'obiettivo, il fabbisogno che ne esce, la
  settimana tipo (casa, fuori, salto), le stime dei pasti fuori, il
  database dei pasti.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import RigaNumero from "$lib/ui/RigaNumero.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Foglio from "$lib/ui/Foglio.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import FoglioImport from "./FoglioImport.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { vaiA } from "$lib/core/router.svelte";
  import { avviso, oggiISO, plurale, GIORNI, GIORNI_INIZIALI, numero } from "$lib/core/ui";
  import {
    REGIMI, ATTIVITA, OBIETTIVI, ID_FASCE, profilo, scriviProfilo, pesoAttuale, serieePesi, registraPeso,
    pastiPerFascia, pastiVivi, salvaPasti, eliminaPasto, alternaAttivo, nomeFascia,
  } from "$condivisi/pasti/dati.js";
  import { bersagli, mantenimento, metabolismoBasale, eta, daPromuovere, copertura } from "$condivisi/pasti/calcolo.js";
  import { FASCE_T, kcal } from "./comune";

  const d = $derived.by(() => {
    dati.versione;
    const p = profilo();
    return {
      p, b: bersagli(),
      mb: metabolismoBasale(), mant: mantenimento(),
      pesate: serieePesi().length,
      cop: copertura(),
      promuovere: daPromuovere(),
      fuori: (ID_FASCE as string[]).filter((f) => (p.settimanaTipo || []).some((g: any) => g?.[f] === "fuori")),
    };
  });

  const peso = $derived.by(() => { dati.versione; return pesoAttuale() || ""; });
  const num = (v: string) => Number(String(v).replace(",", ".")) || 0;

  function gira(i: number, fascia: string) {
    const ordine = ["casa", "fuori", "salto"];
    const tipo = (d.p.settimanaTipo || []).map((g: any, j: number) => {
      if (j !== i) return g;
      const attuale = g?.[fascia] || "salto";
      return { ...g, [fascia]: ordine[(ordine.indexOf(attuale) + 1) % 3] };
    });
    scriviProfilo({ settimanaTipo: tipo });
  }

  function stima(f: string, campo: string, v: string) {
    const s = d.p.stimeFuori?.[f] || { kcal: 0, p: 0, c: 0, g: 0 };
    scriviProfilo({ stimeFuori: { ...d.p.stimeFuori, [f]: { ...s, [campo]: num(v) } } });
  }

  let fImport = $state(false);
  let fDb = $state(false);
  let fasciaDb = $state("cena");
  const delDb = $derived.by(() => { dati.versione; return (pastiVivi() as any[]).filter((p) => (p.fasce || []).includes(fasciaDb)); });
</script>

<Sezione titolo="Te" piede="Il peso è una serie, non un numero: ne hai {plurale(d.pesate, 'pesata', 'pesate')}. Il fabbisogno cresce insieme a te.">
  <RigaNumero etichetta="Peso" valore={peso} decimali unita="kg" onsalva={(n) => { if (n > 0) { registraPeso(n); avviso("Pesata segnata."); } }} />
  <RigaNumero etichetta="Altezza" valore={d.p.altezzaCm || ""} unita="cm" onsalva={(n) => scriviProfilo({ altezzaCm: n })} />
  <RigaNumero etichetta="Età" valore={eta(d.p) || ""} unita="anni" onsalva={(n) => scriviProfilo({ etaDichiarata: n, etaDichiarataIl: oggiISO(), nascita: "" })} />
</Sezione>

<Sezione titolo="La settimana" piede="Di domenica dalle tre in poi ATLAS te la chiede da solo, per la settimana che arriva. Da qui parte subito, e solo sui giorni che restano.">
  <Riga
    titolo="Pianifica i giorni che restano"
    sottotitolo="Un giorno per schermata, tocchi quello che c'è nel piatto"
    freccia
    onclick={() => vaiA("pasti/pianifica")}
  />
  <Riga
    titolo="Pianifica la settimana prossima"
    sottotitolo="Da lunedì, tutti e sette"
    freccia
    onclick={() => vaiA("pasti/pianifica/prossima")}
  />
</Sezione>

<Sezione titolo="Obiettivo">
  <div class="blocco">
    <Segmenti opzioni={Object.entries(OBIETTIVI as Record<string, { nome: string }>).map(([k, v]) => ({ id: k, testo: v.nome }))} valore={d.p.obiettivo} onscelta={(v) => scriviProfilo({ obiettivo: v })} />
    <span class="text-footnote secondario">Attività</span>
    <Segmenti opzioni={Object.entries(ATTIVITA as Record<string, { nome: string }>).map(([k, v]) => ({ id: k, testo: v.nome }))} valore={d.p.attivita} onscelta={(v) => scriviProfilo({ attivita: v })} />
  </div>
  <RigaNumero etichetta="Surplus" valore={d.p.surplusKcal} unita="kcal" onsalva={(n) => scriviProfilo({ surplusKcal: n })} />
  <RigaNumero etichetta="Proteine" valore={d.p.proteineGkg} decimali unita="g/kg" onsalva={(n) => scriviProfilo({ proteineGkg: n })} />
  <RigaNumero etichetta="Grassi" valore={d.p.grassiGkg} decimali unita="g/kg" onsalva={(n) => scriviProfilo({ grassiGkg: n })} />
</Sezione>

<Sezione titolo="Il tuo fabbisogno" piede="Proteine e grassi si fissano sul peso perché sono fabbisogni; i carboidrati prendono quello che resta, perché sono il carburante.">
  <Riga titolo="Metabolismo basale" valore="{kcal(d.mb)} kcal" />
  <Riga titolo="Mantenimento" valore="{kcal(d.mant)} kcal" />
  <Riga titolo="Bersaglio" valore="{kcal(d.b.kcal)} kcal" accento />
  <Riga titolo="Proteine" valore="{Math.round(d.b.p)} g" />
  <Riga titolo="Carboidrati" valore="{Math.round(d.b.c)} g" />
  <Riga titolo="Grassi" valore="{Math.round(d.b.g)} g" />
</Sezione>

<Sezione titolo="La settimana tipo" piede="Tocca una casella per girare fra casa, fuori e saltato.">
  <div class="tipo">
    <span></span>
    {#each GIORNI_INIZIALI as g, i (i)}<span class="text-caption1 secondario centro">{g}</span>{/each}
    {#each FASCE_T as f (f.id)}
      <span class="text-footnote nome">{f.nome}</span>
      {#each Array.from({ length: 7 }) as _, i (i)}
        {@const r = d.p.settimanaTipo?.[i]?.[f.id] || "salto"}
        <button type="button" class="cella" data-regime={r} title="{GIORNI[i]} · {f.nome}: {(REGIMI as any)[r]}" aria-label="{GIORNI[i]} {f.nome}: {(REGIMI as any)[r]}" onclick={() => gira(i, f.id)}></button>
      {/each}
    {/each}
  </div>
  <div class="legenda text-caption1 secondario"><span><i data-regime="casa"></i>A casa</span><span><i data-regime="fuori"></i>Fuori</span><span><i data-regime="salto"></i>Non lo faccio</span></div>
</Sezione>

{#if d.fuori.length}
  <Sezione titolo="Quando mangi fuori" piede="Una stima, non una misura. Ma uno zero al posto del pranzo renderebbe bugiardo il bilancio di quattro giorni su sette.">
    {#each d.fuori as f (f)}
      {@const s = d.p.stimeFuori?.[f] || { kcal: 0, p: 0, c: 0, g: 0 }}
      <div class="stima">
        <span class="text-footnote semibold secondario">{nomeFascia(f)}</span>
        <div class="quattro">
          {#each [["kcal", "kcal"], ["p", "Prot."], ["c", "Carb."], ["g", "Grassi"]] as [k, et] (k)}
            <label><span class="text-caption1 secondario">{et}</span><input type="number" inputmode="numeric" value={s[k]} onchange={(e) => stima(f, k, e.currentTarget.value)} /></label>
          {/each}
        </div>
      </div>
    {/each}
  </Sezione>
{/if}

<Sezione titolo="Il database">
  {#each d.cop.avvisi as a, i (i)}<Riga><span class="text-subheadline avviso">{a.testo}</span></Riga>{/each}
  {#each FASCE_T as f (f.id)}
    <Riga titolo={f.nome} valore={plurale(pastiPerFascia(f.id).length, "pasto", "pasti")} freccia onclick={() => { fasciaDb = f.id; fDb = true; }} />
  {/each}
  <Riga titolo="Importa dalla chat" accento onclick={() => (fImport = true)} />
</Sezione>

{#if d.promuovere.length}
  <Sezione titolo="Lo mangi spesso" piede="Queste cose tornano da sole. Aggiungile al database e il generatore potrà usarle.">
    {#each d.promuovere as t (t.nome)}
      <Riga titolo={t.nome} sottotitolo="{plurale(t.volte, 'volta', 'volte')}{t.ora ? ` · verso le ${t.ora}` : ''}" valore="aggiungi" onclick={() => { salvaPasti([{ nome: t.nome, fasce: [t.fascia].filter(Boolean), ...t.macro, fonte: "appreso" }]); avviso("Nel database."); }} />
    {/each}
  </Sezione>
{/if}

<Foglio bind:aperto={fDb} titolo={nomeFascia(fasciaDb)}>
  {#if delDb.length}
    <Sezione piede="«Fuori rotazione» lo lascia nello storico ma il generatore non lo usa più. «Elimina» lo toglie e basta.">
      {#each delDb as p (p.id)}
        <Riga titolo={p.nome} sottotitolo="{kcal(p.kcal)} kcal · {p.p} P · {p.c} C · {p.g} G" valore={p.attivo === false ? "spento" : ""}>
          {#snippet fine()}
            <span class="azioni">
              <Pulsante variante="grigio" misura="piccola" onclick={() => alternaAttivo(p.id)}>{p.attivo === false ? "Riattiva" : "Spegni"}</Pulsante>
              <Pulsante variante="tinto" distruttivo misura="piccola" onclick={() => { eliminaPasto(p.id); avviso("Eliminato."); }}>Elimina</Pulsante>
            </span>
          {/snippet}
        </Riga>
      {/each}
    </Sezione>
  {:else}
    <p class="text-subheadline secondario">Niente qui dentro. Importane dalla chat.</p>
  {/if}
</Foglio>
<FoglioImport bind:aperto={fImport} />

<style>
  .blocco { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .tipo { display: grid; grid-template-columns: auto repeat(7, 1fr); gap: 6px; align-items: center; padding: var(--space-4); }
  .centro { text-align: center; }
  .nome { padding-right: var(--space-2); }
  .cella { aspect-ratio: 1; border-radius: 8px; background: var(--fill-tertiary); transition: background-color var(--duration-fast); }
  [data-regime="casa"] { background: var(--accento); }
  [data-regime="fuori"] { background: color-mix(in srgb, var(--accento) 35%, transparent); }
  .legenda { display: flex; gap: var(--space-4); padding: 0 var(--space-4) var(--space-4); }
  .legenda span { display: inline-flex; align-items: center; gap: 5px; }
  .legenda i { width: 12px; height: 12px; border-radius: 3px; background: var(--fill-tertiary); }
  .stima { padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .quattro { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
  .quattro label { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: var(--radius-lg); background: var(--fill-quaternary); }
  .quattro input { width: 100%; font-size: 17px; background: none; outline: none; }
  .avviso { color: var(--color-orange); }
  .azioni { display: flex; gap: 6px; }
</style>
