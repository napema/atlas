<!--
  La chiusura settimanale: quattro passi, due minuti.

  È il rito che tiene in piedi tutto il resto. Senza una riconciliazione
  periodica i saldi vanno in deriva — è successo, trecento euro in due mesi
  — e un saldo sbagliato rende sbagliato tutto quello che ne discende: la
  quota del giorno, la copertura delle fisse, il minimo previsto di ING.

  Il passo 1 è l'unico che conta. Gli altri tre esistono perché un rito che
  non restituisce niente non lo si fa due volte: la pagella dice com'è
  andata, il report serve a qualcuno, la ricarica è il gesto che si doveva
  fare comunque. Il contatore in fondo è l'unica cosa che l'ha fatto
  sopravvivere: un numero che cresce lo si difende.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, euro, oggiISO, plurale, daISO, MESI_BREVI, GIORNI } from "$lib/core/ui";
  import { stato, serieChiusure } from "$condivisi/finanze/dati.js";
  import { importoEffettivo } from "$condivisi/finanze/calcolo.js";
  import { leggiEstratto, riconcilia } from "$condivisi/finanze/revolut.js";
  import {
    applicaEstratto, pagella, report, settimanaDi, eseguiRicarica, chiudi, ricaricaLunedi,
  } from "$condivisi/finanze/chiusura.js";
  import { pulisciImporto, nomePocket } from "./comune";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  let passo = $state(1);
  let ric = $state<any>(null);
  let errore = $state("");
  let testoIng = $state("");
  let fatto = $state(false);
  let ricaricato = $state(false);

  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    passo = 1; ric = null; errore = ""; testoIng = ""; fatto = false; ricaricato = false;
  });

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    return { iso, sett: settimanaDi(iso), p: pagella(iso), r: ricaricaLunedi(iso) };
  });

  const gm = (iso: string) => {
    const x = daISO(iso);
    return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };
  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`;
  };

  async function carica(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    errore = "";
    try {
      const estratto = leggiEstratto(await f.text());
      if (!estratto.righe.length) {
        errore = "Nessuna riga riconosciuta. È il CSV dell'estratto conto?";
        return;
      }
      ric = riconcilia(estratto);
    } catch (x: any) {
      errore = String(x?.message || x);
    }
  }

  function applica() {
    const centesimiIng = testoIng.trim()
      ? Math.round(Number(testoIng.replace(/\./g, "").replace(",", ".")) * 100)
      : null;
    const esito = applicaEstratto($state.snapshot(ric), {
      saldoIng: Number.isFinite(centesimiIng as number) ? centesimiIng : null,
      iso: d.iso,
    });
    avviso(`${esito.aggiunti} aggiunti, ${esito.corretti} corretti. Saldi riancorati.`);
    passo = 2;
  }

  function finisci() {
    const centesimiIng = testoIng.trim()
      ? Math.round(Number(testoIng.replace(/\./g, "").replace(",", ".")) * 100)
      : null;
    chiudi(d.iso, Number.isFinite(centesimiIng as number) ? centesimiIng : null);
    fatto = true;
    avviso("Settimana chiusa.");
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(report(d.iso));
      avviso("Report copiato.");
    } catch {
      avviso("Gli appunti non sono disponibili qui.", { tipo: "errore" });
    }
  }

  const PASSI = ["Estratto", "Pagella", "Report", "Ricarica"];
</script>

<Foglio bind:aperto titolo="Chiudi la settimana">
  <div class="passi">
    {#each PASSI as nome, i (nome)}
      <button type="button" class="p" class:ora={passo === i + 1} class:prima={passo > i + 1}
        onclick={() => (passo = i + 1)}>
        <span class="n cifre">{i + 1}</span><span class="text-caption1">{nome}</span>
      </button>
    {/each}
  </div>

  <p class="finestra text-footnote secondario cifre">
    {gm(d.sett.da)} → {gm(d.sett.a)}
  </p>

  <!-- ===================================================== 1. ESTRATTO -->
  {#if passo === 1}
    {#if !ric}
      <Sezione titolo="Carica il CSV"
        piede="Dall'app Revolut: Conto → estratto conto → Excel. L'app mostra solo le differenze; i saldi dei pocket li riancora da sé.">
        <label class="file">
          <Icona nome="importa" misura={18} tratto={1.9} /><span>Scegli il file</span>
          <input type="file" accept=".csv,text/csv,text/plain" onchange={carica} />
        </label>
      </Sezione>
      {#if errore}<p class="errore text-subheadline">{errore}</p>{/if}

    {:else if ric.zero}
      <Sezione>
        <div class="zero">
          <span class="zero-cifra"><Icona nome="spunta" misura={28} tratto={3} /></span>
          <span class="text-title3">Zero differenze</span>
          <span class="text-subheadline secondario cifre">
            {ric.abbinati.length} movimenti abbinati · {gm(ric.periodo.da)} → {gm(ric.periodo.a)}
          </span>
        </div>
      </Sezione>
    {/if}

    {#if ric}
      {#if ric.nuovi.length}
        <Sezione titolo="Nell'estratto e non nell'app" piede="Categoria assegnata dalle note. Toglila dalla spunta se non la vuoi.">
          {#each ric.nuovi as r, i (r.chiave)}
            <div class="nuovo">
              <Interruttore acceso={r.inc} oncambio={(v) => (ric.nuovi[i].inc = v)} etichetta="Includi" />
              <div class="n-testo">
                <span>{r.nota}</span>
                <span class="text-footnote secondario cifre">
                  {gm(r.data)} · {nomePocket(r.pocket)}{r.pocketTo ? ` → ${nomePocket(r.pocketTo)}` : ""}
                  {#if r.pending}· in sospeso{/if}
                  {#if r.auto}· auto{r.sub ? `: ${r.sub}` : ""}{/if}
                </span>
                {#if r.tipo === "out"}
                  <select value={r.cat || ""} onchange={(e) => { ric.nuovi[i].cat = e.currentTarget.value || null; ric.nuovi[i].sub = null; }}>
                    <option value="">— categoria —</option>
                    {#each stato().cats as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
                  </select>
                {/if}
              </div>
              <span class="cifre">{r.tipo === "out" || r.tipo === "extra" ? "−" : r.tipo === "giro" ? "" : "+"}{euro(r.imp)}</span>
            </div>
          {/each}
        </Sezione>
      {/if}

      {#if ric.correzioni.length}
        <!-- VINCE L'ESTRATTO, e non è una scelta di comodo: se vincesse
             quello che hai scritto a mano, riconciliare non servirebbe. -->
        <Sezione titolo="Importi da correggere" piede="Vince l'estratto conto.">
          {#each ric.correzioni as c (c.mov.id)}
            <Riga titolo={c.mov.nota || "—"} sottotitolo={gm(c.mov.data)}
              valore="{euro(c.mov.imp)} → {euro(c.riga.imp)}" />
          {/each}
        </Sezione>
      {/if}

      {#if ric.mancanti.length}
        <Sezione titolo="Nell'app e non nell'estratto"
          piede="Registrato due volte, o mai avvenuto, o con la data sbagliata. Restano come sono: aprili da Movimenti.">
          {#each ric.mancanti as m (m.id)}
            <Riga titolo={m.nota || "—"} sottotitolo="{gm(m.data)} · {nomePocket(m.pocket)}" valore={euro(m.imp)} />
          {/each}
        </Sezione>
      {/if}

      <Sezione titolo="Saldi dall'estratto" piede="Il disponibile è il saldo completato meno i movimenti in sospeso: è quello che si può spendere, e il numero su cui si riancora.">
        {#each Object.entries(ric.disponibili) as [id, v] (id)}
          <Riga titolo={nomePocket(id)} sottotitolo={ric.saldi[id] !== v ? `completato ${euro(ric.saldi[id] as number)}` : null} valore={euro(v as number)} />
        {/each}
        <label class="ing">
          <span>Saldo ING oggi</span>
          <input type="text" inputmode="decimal" placeholder="0,00" aria-label="Saldo ING oggi"
            value={testoIng}
            oninput={(e) => { const v = pulisciImporto(e.currentTarget.value); testoIng = v; e.currentTarget.value = v; }} />
          <span class="eu">€</span>
        </label>
      </Sezione>

      <Pulsante variante="pieno" larga onclick={applica}>
        {ric.zero ? "Riancora e continua" : `Applica ${ric.nuovi.filter((r: any) => r.inc).length + ric.correzioni.length} modifiche`}
      </Pulsante>
    {/if}

    <Pulsante variante="testo" larga onclick={() => (passo = 2)}>Salta, l'estratto lo carico dopo</Pulsante>
  {/if}

  <!-- ====================================================== 2. PAGELLA -->
  {#if passo === 2}
    <Sezione titolo="Come è andata">
      <div class="pagella">
        <span class="p-eti">Vita</span>
        <span class="cifre p-val" class:male={d.p.vita.speso > d.p.vita.budget}>
          {euro(d.p.vita.speso)} <span class="secondario">/ {euro(d.p.vita.budget)}</span>
        </span>

        <span class="p-eti">Fuori piano</span>
        <span class="cifre p-val" class:male={d.p.fuoriPiano.n > 0} class:ok={d.p.fuoriPiano.n === 0}>
          {d.p.fuoriPiano.n}{d.p.fuoriPiano.n ? ` · ${euro(d.p.fuoriPiano.totale)}` : ""}
        </span>

        <span class="p-eti">Ricariche ING</span>
        <span class="cifre p-val" class:male={d.p.ricariche.n > 0} class:ok={d.p.ricariche.n === 0}>
          {d.p.ricariche.n}{d.p.ricariche.n ? ` · ${euro(d.p.ricariche.totale)}` : ""}
        </span>

        {#if d.p.fondo}
          <span class="p-eti">Fondo</span>
          <span class="cifre p-val" class:ok={d.p.fondo.inLinea} class:male={!d.p.fondo.inLinea}>
            {d.p.fondo.inLinea ? "in linea" : `indietro di ${euro(-d.p.fondo.scarto)}`}
          </span>
        {/if}
      </div>
    </Sezione>

    {#if d.p.fuoriPiano.voci.length}
      <Sezione titolo="Le uscite fuori piano di questa settimana">
        {#each d.p.fuoriPiano.voci as m (m.id)}
          <Riga titolo={m.nota || "—"} sottotitolo={gm(m.data)} valore={euro(importoEffettivo(m))} />
        {/each}
      </Sezione>
    {/if}

    <Pulsante variante="pieno" larga onclick={() => (passo = 3)}>Avanti</Pulsante>
  {/if}

  <!-- ======================================================= 3. REPORT -->
  {#if passo === 3}
    <Sezione titolo="Report" piede="Una dozzina di righe da incollare. Contiene anche le modifiche alla configurazione: un report che non le contiene si può fabbricare.">
      <pre class="report">{report(d.iso)}</pre>
    </Sezione>
    <Pulsante variante="tinto" larga onclick={copia}>Copia report</Pulsante>
    <Pulsante variante="pieno" larga onclick={() => (passo = 4)}>Avanti</Pulsante>
  {/if}

  <!-- ===================================================== 4. RICARICA -->
  {#if passo === 4}
    <Sezione titolo="La ricarica di lunedì"
      piede="Non è un importo fisso: si porta il Principale a quota × giorni fino a {gg(d.r.fino)}. Con l'importo fisso l'ultima settimana del mese era sempre quella povera.">
      <div class="ricarica">
        <span class="cifre r-imp">{euro(d.r.importo)}</span>
        <span class="text-subheadline secondario cifre">
          dalla Cassa ({euro(d.r.cassa)}) al Principale
        </span>
        <span class="text-footnote secondario cifre">
          quota {euro(d.r.quota)} × {plurale(d.r.giorni, "giorno", "giorni")} = {euro(d.r.bersaglio)}
          · in tasca {euro(d.r.saldo)}
        </span>
      </div>
    </Sezione>

    {#if !ricaricato}
      <Pulsante variante="tinto" larga disabled={d.r.importo <= 0} onclick={() => {
        const r = eseguiRicarica(d.iso);
        ricaricato = true;
        avviso(r ? `Travasati ${euro(r.importo)}.` : "Niente da travasare.");
      }}>{d.r.importo > 0 ? `Travasa ${euro(d.r.importo)}` : "Niente da travasare"}</Pulsante>
    {/if}

    {#if fatto}
      <div class="serie">
        <span class="s-cifra cifre">{serieChiusure(d.sett.domenica)}</span>
        <span class="text-subheadline secondario">settimane chiuse di fila</span>
      </div>
      <Pulsante variante="pieno" larga onclick={() => (aperto = false)}>Chiudi</Pulsante>
    {:else}
      <Pulsante variante="pieno" larga onclick={finisci}>Chiudi la settimana</Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .passi { display: flex; gap: var(--space-2); margin-bottom: var(--space-3); }
  .p { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 2px; border-radius: var(--radius-lg); color: var(--label-tertiary); }
  .n { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--fill-tertiary); font-size: var(--text-caption1); font-weight: var(--weight-semibold); }
  .p.ora { color: var(--accento); }
  .p.ora .n { background: var(--accento); color: #fff; }
  .p.prima { color: var(--label-secondary); }
  .p.prima .n { background: color-mix(in srgb, var(--color-green) 24%, transparent); color: var(--color-green); }
  .finestra { text-align: center; margin-bottom: var(--space-3); }

  .file { position: relative; display: flex; align-items: center; gap: var(--space-2); min-height: var(--list-row-height); padding: 0 var(--space-4); color: var(--accento); cursor: pointer; }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .errore { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--color-red); background: color-mix(in srgb, var(--color-red) 12%, transparent); }

  .zero { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--space-5) var(--space-4); }
  .zero-cifra { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--color-green); color: #fff; margin-bottom: 4px; }

  .nuovo { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: 10px var(--space-4); }
  .nuovo + .nuovo::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .n-testo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .n-testo select { margin-top: 4px; font-size: 15px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); color: var(--label-primary); border: 0; }
  .nuovo .cifre { font-variant-numeric: tabular-nums; }

  .ing { display: flex; align-items: baseline; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  .ing span:first-child { flex: none; }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .ing input { flex: 1; min-width: 0; text-align: right; font-size: 17px; outline: none; background: none; color: var(--accento); font-variant-numeric: tabular-nums; }
  .eu { flex: none; color: var(--label-secondary); }

  /* La pagella è una griglia a due colonne: le cifre incolonnate a destra si
     confrontano con l'occhio, quattro flex no. */
  .pagella { display: grid; grid-template-columns: auto 1fr; gap: 6px var(--space-4); padding: var(--space-4); }
  .p-eti { color: var(--label-secondary); }
  .p-val { justify-self: end; font-variant-numeric: tabular-nums; font-weight: var(--weight-semibold); }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }
  .secondario { color: var(--label-secondary); }

  .report {
    margin: 0; padding: var(--space-4); font-family: var(--font-mono); font-size: 12px;
    line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--label-secondary);
  }

  .ricarica { display: flex; flex-direction: column; gap: 2px; padding: var(--space-4); }
  .r-imp { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--color-green); }

  .serie { display: flex; align-items: center; gap: var(--space-3); justify-content: center; padding: var(--space-3) 0; }
  .s-cifra { font-family: var(--font-display); font-size: 36px; line-height: 40px; font-weight: var(--weight-bold); color: var(--accento); }
</style>
