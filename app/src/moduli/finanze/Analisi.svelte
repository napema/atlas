<!--
  Analisi — nove domande che uno si fa davvero guardando un mese. Ognuna
  esiste perché una risposta sola non basta a capire se il mese va bene.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import GraficoCumulato from "./GraficoCumulato.svelte";
  import GraficoBarre from "./GraficoBarre.svelte";
  import GraficoCiambella from "./GraficoCiambella.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale, oggiISO, daISO, MESI } from "$lib/core/ui";
  import { stato, profiloDi } from "$condivisi/finanze/dati.js";
  import {
    statistiche, budgetTotale, giorniDelMese, movimentiDelMese, statisticheDelMese, ultimiSeiMesi,
    cumulata, stessoGiornoMesePrima, mediaPerGiornoSettimana, sottocategorieDelMese,
  } from "$condivisi/finanze/calcolo.js";
  import { coloreCat } from "./comune";
  import { apri } from "./fogli.svelte";

  let { mese }: { mese: string } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const st = statistiche(mese);
    const p = profiloDi(mese);
    const bt = budgetTotale(mese);
    const corrente = oggi.slice(0, 7) === mese;
    const giorni = giorniDelMese(mese);
    const giorno = corrente ? Number(oggi.slice(8, 10)) : giorni;
    const uscite = (movimentiDelMese(mese) as any[]).filter((m) => m.tipo === "out");
    const totale = st.usciteNette || 1;
    return {
      vuoto: !uscite.length && st.usciteNette === 0 && st.sforamentiN === 0,
      st, p, bt, corrente, giorni, giorno,
      sm: statisticheDelMese(mese),
      sei: ultimiSeiMesi(mese),
      cum: cumulata(mese),
      cfr: stessoGiornoMesePrima(mese),
      settimana: mediaPerGiornoSettimana(mese),
      oggiSett: corrente ? (daISO(oggi).getDay() + 6) % 7 : -1,
      top: sottocategorieDelMese(mese).slice(0, 5),
      passo: corrente && bt > 0 ? st.usciteNette - Math.round((bt * giorno) / giorni) : null,
      fette: (stato().cats as any[])
        .map((c) => ({ etichetta: c.nome, valore: st.perCat[c.id]?.tot || 0, colore: coloreCat(c.id) }))
        .filter((e) => e.valore > 0),
      righe: (stato().cats as any[])
        .map((c) => ({ c, speso: st.perCat[c.id]?.tot || 0, budget: Math.round((p.b[c.id] || 0) * 100), n: st.perCat[c.id]?.movs.length || 0 }))
        .filter((r) => r.speso > 0 || r.budget > 0)
        .sort((a, b) => b.speso - a.speso)
        .map((r) => ({ ...r, frazione: r.budget > 0 ? r.speso / r.budget : r.speso > 0 ? 1.01 : 0, quota: Math.round((r.speso / totale) * 100) })),
    };
  });
  const nomeM = (m: string) => MESI[Number(m.slice(5, 7)) - 1];
</script>

{#if d.vuoto}
  <Vuoto icona="grafico" titolo="Niente da analizzare" testo="Registra le uscite e qui trovi grafici, statistiche e il dettaglio voce per voce." />
{:else}
    <Sezione titolo="Andamento del mese" piede={d.passo === null ? `Mese chiuso a ${euro(d.st.usciteNette)}.` : d.passo > 0 ? `La retta tratteggiata è il ritmo ideale. Sei ${euro(d.passo, { tondo: true })} sopra.` : `La retta tratteggiata è il ritmo ideale. Sei ${euro(-d.passo, { tondo: true })} sotto.`}>
      {#snippet coda()}<span class="text-footnote secondario cifre">budget {euro(d.bt, { tondo: true })}</span>{/snippet}
      <div class="grafico"><GraficoCumulato cum={d.cum} budget={d.bt} giornoOggi={d.corrente ? d.giorno : null} giorniMese={d.giorni} /></div>
    </Sezione>

    {#if d.fette.length}
      <Sezione titolo="Ripartizione uscite">
        <div class="grafico"><GraficoCiambella voci={d.fette} totale={d.st.usciteNette} /></div>
      </Sezione>
    {/if}

    {#if d.cfr.alloraSpeso > 0 || d.st.ordinaria > 0}
      <!-- Lo stesso giorno del mese scorso: l'unico paragone onesto a metà mese. -->
      <Sezione titolo="Oggi, un mese fa" piede={d.cfr.alloraSpeso === 0 ? "Nessun termine di paragone: il mese scorso a questo punto non avevi speso nulla."
        : d.cfr.scarto === 0 ? "Stesso identico ritmo del mese scorso."
        : d.cfr.scarto < 0 ? `Stai spendendo ${euro(-d.cfr.scarto, { tondo: true })} in meno del mese scorso.`
        : `Stai spendendo ${euro(d.cfr.scarto, { tondo: true })} in più del mese scorso.`}>
        <div class="due">
          <div><span class="text-footnote secondario">{nomeM(d.cfr.mesePrima)} al giorno {d.cfr.taglio}</span><b class="cifre">{euro(d.cfr.alloraSpeso)}</b></div>
          <div class="adesso"><span class="text-footnote secondario">{nomeM(mese)} al giorno {d.cfr.giorno}</span><b class="cifre">{euro(d.cfr.adesso)}</b></div>
        </div>
      </Sezione>
    {/if}

    <Sezione titolo="Statistiche del mese">
      <div class="stat">
        <div><span class="text-footnote secondario">Media al giorno</span><b class="cifre">{euro(d.sm.mediaGiorno)}</b></div>
        <div><span class="text-footnote secondario">Scontrino medio</span><b class="cifre">{d.sm.nUscite ? euro(d.sm.scontrinoMedio) : "—"}</b></div>
        <div><span class="text-footnote secondario">Giorno più caro</span><b class="cifre">{d.sm.piuCaro ? euro(d.sm.piuCaro.valore) : "—"}</b>{#if d.sm.piuCaro}<small class="secondario">il {d.sm.piuCaro.giorno}</small>{/if}</div>
        <div><span class="text-footnote secondario">Vs mese scorso</span><b class="cifre" class:male={d.sm.delta > 0} class:ok={d.sm.delta !== null && d.sm.delta <= 0}>{d.sm.delta === null ? "—" : `${d.sm.delta > 0 ? "+" : ""}${d.sm.delta}%`}</b></div>
        <div><span class="text-footnote secondario">Movimenti</span><b class="cifre">{d.sm.nUscite}</b><small class="secondario">uscite</small></div>
        <div><span class="text-footnote secondario">Rimborsi recuperati</span><b class="cifre">{euro(d.sm.recuperato)}</b></div>
      </div>
    </Sezione>

    <Sezione titolo="Uscite nette · 6 mesi" piede="Linea tratteggiata: budget del profilo {d.p.nome} ({euro(d.bt, { tondo: true })}).">
      <div class="grafico"><GraficoBarre valori={d.sei.usciteNette} etichette={d.sei.etichette} evidenzia={5} retta={d.bt || null} /></div>
    </Sezione>

    <Sezione titolo="Sforamenti · 6 mesi" piede={d.st.sforamentiTot > 0 ? `Questo mese: ${d.st.sforamentiN} ricariche per ${euro(d.st.sforamentiTot)}.` : "Questo mese: zero. Così deve restare."}>
      <div class="grafico"><GraficoBarre valori={d.sei.sforamenti} etichette={d.sei.etichette} evidenzia={5} colore="var(--color-red)" /></div>
    </Sezione>

    <Sezione titolo="Per giorno della settimana">
      <div class="grafico"><GraficoBarre valori={d.settimana} etichette={["lun", "mar", "mer", "gio", "ven", "sab", "dom"]} evidenzia={d.oggiSett} /></div>
    </Sezione>

    {#if d.top.length}
      <Sezione titolo="Top sottocategorie">
        {#each d.top as x (x.catId + x.sub)}
          <Riga titolo={x.sub} sottotitolo="{x.categoria} · {plurale(x.volte, 'volta', 'volte')}" valore={euro(x.totale)} freccia onclick={() => apri({ tipo: "sub", catId: x.catId, sub: x.sub, mese })} />
        {/each}
      </Sezione>
    {/if}

    <Sezione titolo="Categorie contro pocket" piede="Tocca una categoria per il dettaglio.">
      {#each d.righe as r (r.c.id)}
        <button type="button" class="cat" onclick={() => apri({ tipo: "categoria", catId: r.c.id, mese })}>
          <span class="cat-alto"><span class="punto" style:background={coloreCat(r.c.id)}></span><span class="nome">{r.c.nome}</span><span class="cifre semibold">{euro(r.speso)}</span></span>
          <Traccia valore={Math.min(1, r.frazione)} colore={r.frazione >= 1 ? "var(--color-red)" : r.frazione >= 0.9 ? "var(--color-orange)" : coloreCat(r.c.id)} altezza={5} />
          <span class="text-footnote secondario">{r.budget > 0 ? `${Math.round(r.frazione * 100)}% di ${euro(r.budget, { tondo: true })}` : "senza budget nel profilo"} · {r.quota}% delle uscite · {r.n} mov.</span>
        </button>
      {/each}
    </Sezione>

    {#if d.st.orfani > 0}
      <p class="orfani text-subheadline">Rimborsi non agganciati: <b class="cifre">{euro(d.st.orfani)}</b>. Riducono il totale ma non sai da quale spesa vengono: aprili e collegali.</p>
    {/if}
{/if}

<style>
  .grafico { padding: var(--space-4); }
  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding: var(--space-4); }
  .due div, .stat div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary); }
  .due b, .stat b { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .adesso { box-shadow: inset 0 0 0 1.5px var(--accento); }
  .stat { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); padding: var(--space-4); }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }
  .cat { position: relative; width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 12px var(--space-4); text-align: left; }
  .cat + .cat::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .cat:active { background: var(--fill-quaternary); }
  .cat-alto { display: flex; align-items: center; gap: var(--space-2); }
  .punto { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  .nome { flex: 1; }
  .orfani { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 12%, transparent); }
</style>
