<!--
  Finanze in Impostazioni. Tutto quello che si configura una volta e poi si
  lascia stare: il budget del profilo, la cassa settimanale, il ciclo dello
  stipendio, la ricarica, i pocket, i ricorrenti, i pagamenti previsti, le
  soglie. Più l'import dell'estratto conto e l'esportazione per l'analisi.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import RigaNumero from "$lib/ui/RigaNumero.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import FoglioRicorrente from "./FoglioRicorrente.svelte";
  import FoglioPocket from "./FoglioPocket.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, dataBreve, euro, centesimi, oggiISO } from "$lib/core/ui";
  import {
    stato, profiloDi, chiaveProfilo, scriviProfili, scriviMeta, SOGLIE_PREDEFINITE, TIPI_POCKET,
    ricorrentiVivi, previsti, statoConfig, sbloccaConfig, ORE_LIBERE,
  } from "$condivisi/finanze/dati.js";
  import {
    quadratura, meseDi, cicloDi, nomeCiclo, pocketConSaldi, coperturaDi,
    ultimoStipendio, prossimoStipendio,
  } from "$condivisi/finanze/calcolo.js";
  import { statoObiettivo, budgetVita, ingPrevisto } from "$condivisi/finanze/piano.js";
  import { MAPPA_PRODOTTI, MAPPA_CARTE } from "$condivisi/finanze/revolut.js";
  import { preparaImport, eseguiImport } from "$condivisi/finanze/importa.js";
  import { scaricaAnalisi, copiaAnalisi } from "$condivisi/finanze/esporta.js";
  import { coloreCat, nomePocket, etichettaCadenza } from "./comune";
  import { apri } from "./fogli.svelte";

  const mese = meseDi();
  const d = $derived.by(() => {
    dati.versione;
    const s = stato();
    const iso = oggiISO();
    const c = cicloDi(iso);
    return {
      s, iso, p: profiloDi(mese), chiave: chiaveProfilo(mese),
      q: quadratura(mese),
      soglie: { ...SOGLIE_PREDEFINITE, ...(s.soglie || {}) },
      giorno: Number(s.config?.giornoStipendio) || 23,
      ric: s.config?.ricarica || { giorno: 1, ora: "08:00" },
      pk: pocketConSaldi(),
      ricorrenti: ricorrentiVivi(),
      previsti: (previsti() as any[]).slice().sort((a, b) => a.quando.localeCompare(b.quando)),
      regole: Object.keys(s.rules || {}).length,
      ciclo: nomeCiclo(c), cicloIndice: c.indice,
      ultimo: ultimoStipendio(iso), prossimo: prossimoStipendio(iso),
      cfg: statoConfig(ultimoStipendio(iso)),
      obi: statoObiettivo(iso),
      vita: budgetVita(),
      quotaPiano: Math.round(budgetVita() / Math.max(1, c.giorni)),
      chiaveDicembre: `${Number(iso.slice(0, 4))}-12`,
      ing: ingPrevisto(iso),
      manuali: (s.config?.stipendiManuali || {}) as Record<string, string>,
      prodotti: { ...MAPPA_PRODOTTI, ...(s.config?.mappaProdotti || {}) },
      carte: { ...MAPPA_CARTE, ...(s.config?.mappaCarte || {}) },
      sblocchi: (s.config?.sblocchi || []).filter((x: any) => x.ciclo === c.indice).length,
    };
  });

  /* IL BLOCCO. Ogni scrittura di configurazione passa da qui: un budget che
     si puo' alzare nel momento in cui lo stai sforando non e' un budget, e'
     un campo di testo che registra quello che hai speso. */
  function protetto(fn: () => void) {
    if (d.cfg.bloccata) { avviso("Configurazione bloccata. Sbloccala con un motivo.", { tipo: "errore" }); return; }
    fn();
  }
  const scriviSoglia = (k: string, v: unknown) => protetto(() => scriviMeta((s: any) => { s.soglie = { ...(s.soglie || {}), [k]: v }; }));

  let motivo = $state("");

  /* ------------------------------------------------------- l'import -- */
  let righe = $state<any[]>([]);
  let testoImport = $state("");
  const daImportare = $derived(righe.filter((r) => r.inc && !r.doppione).length);
  const BADGE: Record<string, string> = { out: "uscita", in: "entrata", extra: "sforamento", reso: "reso", giro: "giroconto", rimb: "rimborso" };
  async function file(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    righe = preparaImport(await f.text());
    (e.currentTarget as HTMLInputElement).value = "";
  }
  function importa() {
    const { quante } = eseguiImport($state.snapshot(righe));
    righe = [];
    testoImport = "";
    avviso(quante ? `${quante} movimenti importati.` : "Niente da importare.");
  }

  /* -------------------------------------------------------- i fogli -- */
  let fRic = $state(false);
  let genere = $state<"ricorrente" | "previsto">("ricorrente");
  let scelto = $state<any>(null);
  const apriRic = (g: "ricorrente" | "previsto", x: any = null) => { genere = g; scelto = x; fRic = true; };
  let fPocket = $state(false);

  let dimentica = $state(false);
  const GIORNI_SETT = [["1", "Lun"], ["2", "Mar"], ["3", "Mer"], ["4", "Gio"], ["5", "Ven"], ["6", "Sab"], ["0", "Dom"]].map(([id, testo]) => ({ id, testo }));
</script>

<!-- IL BLOCCO DELLA CONFIGURAZIONE, in cima: se i campi sotto non si
     possono toccare, il motivo si legge prima di provarci. -->
<Sezione titolo="Configurazione"
  piede="Budget, soglie, obiettivo e categorie si cambiano liberamente nelle {ORE_LIBERE} ore dopo lo stipendio — a freddo, coi numeri del ciclo appena chiuso davanti. Fuori da quella finestra serve un motivo, e il motivo finisce nel report settimanale.">
  {#snippet coda()}
    <span class="text-footnote" class:ok={!d.cfg.bloccata} class:male={d.cfg.bloccata}>
      {d.cfg.bloccata ? "bloccata" : d.cfg.perche === "finestra" ? "libera" : "sbloccata"}
    </span>
  {/snippet}
  <Riga titolo="Ultimo stipendio" sottotitolo="il prossimo il {dataBreve(d.prossimo)}" valore={dataBreve(d.ultimo)} />
  {#if d.cfg.bloccata}
    <div class="sblocca">
      <input type="text" bind:value={motivo} placeholder="Perche la stai cambiando?" aria-label="Motivo dello sblocco" />
      <Pulsante variante="tinto" misura="piccola" disabled={!motivo.trim()} onclick={() => {
        if (sbloccaConfig(motivo, d.cicloIndice)) { motivo = ""; avviso("Sbloccata per un'ora."); }
      }}>Sblocca</Pulsante>
    </div>
  {:else if d.cfg.perche === "sblocco"}
    <Riga titolo="Sbloccata" sottotitolo="Si richiude da se: uno sblocco permanente al primo strappo diventa la condizione normale." />
  {/if}
  {#if d.sblocchi}
    <Riga titolo="Sblocchi in questo ciclo" valore={String(d.sblocchi)} />
  {/if}
</Sezione>

<!-- L'OBIETTIVO, prima dei budget: e quello che rende costosa una spesa.
     105 euro non sono 105 euro, sono due terzi di un versamento al fondo. -->
<Sezione titolo="Obiettivo">
  {#if d.obi}
    <Riga titolo={d.obi.nome} sottotitolo="{euro(d.obi.saldo, { tondo: true })} di {euro(d.obi.target, { tondo: true })} entro il {dataBreve(d.obi.data)}"
      valore={d.obi.inLinea ? "in linea" : `-${euro(-d.obi.scarto, { tondo: true })}`} freccia onclick={() => apri({ tipo: "obiettivo" })} />
    <Riga titolo="Versamento per stipendio" valore={euro(d.obi.versamento, { tondo: true })} />
    <Riga titolo="Proiezione alla data" sottotitolo={d.obi.gap > 0 ? `mancano ${euro(d.obi.gap, { tondo: true })}` : "arriva"} valore={euro(d.obi.proiezione, { tondo: true })} />
  {:else}
    <Riga titolo="Nessun obiettivo" accento freccia onclick={() => apri({ tipo: "obiettivo" })} />
  {/if}
</Sezione>

<Sezione titolo="Budget · profilo {d.p.nome}" piede="«Cassa» segna le categorie che dipendono da una decisione giornaliera: le fisse dentro un tetto settimanale lo farebbero sforare da sole il giorno dell'affitto.">
  {#each d.s.cats as c (c.id)}
    <div class="budget">
      <span class="punto" style:background={coloreCat(c.id)}></span>
      <span class="nome">{c.nome}</span>
      <button type="button" class="cassa" class:attiva={d.p.cassaCats.includes(c.id)} aria-pressed={d.p.cassaCats.includes(c.id)} onclick={() => protetto(() => scriviProfili((st: any) => {
        const cc = new Set(st.profili[d.chiave].cassaCats);
        if (cc.has(c.id)) cc.delete(c.id); else cc.add(c.id);
        st.profili[d.chiave].cassaCats = [...cc];
      }))}>vita</button>
      <input type="text" inputmode="numeric" value={d.p.b[c.id] ?? 0} aria-label="Budget {c.nome}" onchange={(e) => protetto(() => scriviProfili((st: any) => { st.profili[d.chiave].b[c.id] = Math.max(0, Number(e.currentTarget.value) || 0); }))} />
      <span class="secondario">€</span>
    </div>
  {/each}
  <RigaNumero etichetta="Entrate mensili attese" valore={d.s.config.entrate} unita="€" onsalva={(n) => protetto(() => scriviMeta((st: any) => { st.config.entrate = Math.max(0, n); }))} />
  <!-- «Vita» e la somma delle categorie marcate, ed e lo stesso numero che
       in home diventa la quota di piano: budget diviso i giorni del ciclo.
       Se una categoria entra nella cassa senza entrare in Vita, la quota di
       piano smette di essere il piano. -->
  <Riga titolo="Vita" sottotitolo="le categorie marcate · quota di piano {euro(d.quotaPiano)}/g" valore={euro(d.vita, { tondo: true })} />
  <div class="quadra" class:male={d.q.differenza < 0}>
    <span>{d.q.differenza < 0 ? "Sfori le entrate di" : "Ti resta"} <b class="cifre">{Math.abs(d.q.differenza).toLocaleString("it-IT")} €</b></span>
    <span class="text-footnote secondario">{d.q.differenza < 0 ? "Il budget non quadra: taglia qualche voce finché non rientri." : d.q.differenza === 0 ? "Budget allocato al centesimo." : "Margine non allocato: puoi destinarlo a risparmio o accantonamenti."}</span>
  </div>
</Sezione>

<!-- IL TETTO SETTIMANALE A MANO NON C'E PIU. Era un numero in questa
     pagina, e un numero scritto a mano va in deriva: i budget cambiano e lui
     resta dov'era, finche non c'entra piu niente con quello che hai deciso
     di spendere. Adesso e Vita diviso i giorni del ciclo, per sette. -->

<Sezione titolo="Il ciclo dello stipendio"
  piede="Il mese finanziario non parte il primo. Se il giorno cade di sabato o domenica lo stipendio arriva il venerdi prima; se arriva un giorno diverso, il ciclo parte dalla data dell'entrata marcata «stipendio». Ciclo in corso: {d.ciclo}.">
  <RigaNumero etichetta="Giorno dello stipendio" valore={d.giorno} onsalva={(n) => protetto(() => scriviMeta((st: any) => { st.config.giornoStipendio = Math.min(28, Math.max(1, n || 1)); }))} />
  <Riga titolo="Prossimo stipendio" valore={dataBreve(d.prossimo)} />
  <!-- Dicembre: la tredicesima non arriva il 23, e la data la sa solo lui. -->
  <Riga titolo="Dicembre a mano" sottotitolo="La tredicesima non arriva il giorno di sempre.">
    {#snippet fine()}
      <input class="dentro" type="date" value={d.manuali[d.chiaveDicembre] || ""} aria-label="Data dello stipendio di dicembre"
        onchange={(e) => { const v = e.currentTarget.value; protetto(() => scriviMeta((st: any) => {
          st.config.stipendiManuali = { ...(st.config.stipendiManuali || {}) };
          if (v) st.config.stipendiManuali[d.chiaveDicembre] = v;
          else delete st.config.stipendiManuali[d.chiaveDicembre];
        })); }} />
    {/snippet}
  </Riga>
</Sezione>

<Sezione titolo="La ricarica settimanale" piede="Il promemoria che chiede di travasare dalla Cassa al Principale. Se non rispondi te lo ricorda una volta il giorno dopo, poi basta.">
  <div class="blocco"><Pillole opzioni={GIORNI_SETT} scelte={[String(d.ric.giorno ?? 1)]} oncambio={(v) => scriviMeta((st: any) => { st.config.ricarica = { ...d.ric, giorno: Number(v[0]) }; })} /></div>
  <Riga titolo="A che ora">
    {#snippet fine()}<input class="ora" type="time" value={d.ric.ora || "08:00"} onchange={(e) => { const v = e.currentTarget.value; if (v) scriviMeta((st: any) => { st.config.ricarica = { ...d.ric, ora: v }; }); }} />{/snippet}
  </Riga>
</Sezione>

<Sezione titolo="I pocket" piede="Non sono numeri fermi: ogni pocket parte dalla sua ancora e ci somma i movimenti da quella data. «Correggi i saldi» non scrive un saldo — sposta l'ancora a oggi.">
  {#each d.pk as p (p.id)}
    <Riga titolo={p.nome} sottotitolo={(TIPI_POCKET as any)[p.tipo]?.nome + (p.external ? " · saldo a mano" : "")} valore={euro(p.saldoVero)} />
  {/each}
  <Riga titolo="Correggi i saldi" accento onclick={() => (fPocket = true)} />
</Sezione>

<Sezione titolo="Uscite ricorrenti" piede="Alimentano «In arrivo» e l'allarme sulle Fisse scoperte. Le variabili si dichiarano con un intervallo, e nelle proiezioni vale il massimo.">
  {#each d.ricorrenti as r (r.id)}
    <Riga
      titolo={r.nome}
      sottotitolo="{etichettaCadenza(r)} · {nomePocket(r.pocket)}{r.attivo ? '' : ' · sospeso'}"
      valore={r.tipo === "variabile" ? `${euro(r.stimaMin, { tondo: true })}–${euro(r.stimaMax, { tondo: true })}` : euro(r.imp, { tondo: true })}
      freccia
      onclick={() => apriRic("ricorrente", r)}
    />
  {/each}
  <Riga titolo="Aggiungi un ricorrente" accento onclick={() => apriRic("ricorrente")} />
</Sezione>

<Sezione titolo="Pagamenti previsti" piede="Una tantum con una data: la maxi rata, una caparra, un acquisto già deciso. Entrano in «In arrivo» insieme ai ricorrenti.">
  {#each d.previsti as x (x.id)}
    {@const cop = coperturaDi(x)}
    <Riga titolo={x.nome} sottotitolo="{dataBreve(x.quando)} · {nomePocket(x.pocket)}{cop.coperto ? '' : ` · mancano ${euro(cop.manca, { tondo: true })}`}" valore={euro(x.imp, { tondo: true })} freccia onclick={() => apriRic("previsto", x)} />
  {/each}
  <Riga titolo="Aggiungi un pagamento previsto" accento onclick={() => apriRic("previsto")} />
</Sezione>

<Sezione titolo="Soglie"
  piede="«Fuori piano» e la soglia sopra cui un'uscita non alimentare e non prevista conta come strappo: e anche la soglia sopra cui il modulo di inserimento chiede «era in lista?».">
  <RigaNumero etichetta="Fuori piano, sopra" valore={(d.soglie.fuoriPiano || 0) / 100} decimali unita="€" onsalva={(n) => scriviSoglia("fuoriPiano", Math.round(n * 100))} />
  <RigaNumero etichetta="Quota minima accettabile" valore={(d.soglie.quotaMinima || 0) / 100} decimali unita="€" onsalva={(n) => scriviSoglia("quotaMinima", Math.round(n * 100))} />
  <!-- Il pavimento del minimo PREVISTO, non del saldo. Il saldo di ING non
       dice niente da solo: sopra ci sono il bollo e l'assicurazione, e sono
       gia impegnati anche se non sono ancora usciti. -->
  <RigaNumero etichetta="ING, minimo previsto sotto cui avvisare" valore={(d.soglie.ingPrevistoMin || 0) / 100} decimali unita="€" onsalva={(n) => scriviSoglia("ingPrevistoMin", Math.round(n * 100))} />
  <Riga titolo="Minimo previsto adesso" sottotitolo={d.ing.quando} valore={euro(d.ing.minimo, { tondo: true })} />
  <div class="blocco">
    <span class="text-footnote secondario">Avviso di categoria, a che punto del budget</span>
    <Segmenti opzioni={[{ id: "0.75", testo: "75%" }, { id: "0.85", testo: "85%" }, { id: "0.95", testo: "95%" }]} valore={String(d.soglie.catAvviso)} onscelta={(v) => scriviSoglia("catAvviso", Number(v))} />
  </div>
</Sezione>

<!-- LA CHIUSURA SETTIMANALE. Non e un'impostazione: e il posto da cui si
     apre quando la notifica della domenica non e arrivata. -->
<Sezione titolo="Chiusura settimanale"
  piede="Carica il CSV di Revolut, l'app mostra solo le differenze e riancora i saldi. Senza questo i saldi vanno in deriva: trecento euro in due mesi, un movimento dimenticato alla volta.">
  <Riga titolo="Chiudi la settimana" accento freccia onclick={() => apri({ tipo: "chiusura" })} />
</Sezione>

<Sezione titolo="Estratto conto Revolut"
  piede="Quale prodotto Revolut corrisponde a quale pocket, e da quale pocket arrivano le ricariche di una carta. Si cambia solo se cambi i nomi su Revolut.">
  {#each Object.entries(d.prodotti) as [prodotto, pocket] (prodotto)}
    <Riga titolo={prodotto} sottotitolo="prodotto Revolut">
      {#snippet fine()}
        <select class="dentro" value={pocket} aria-label="Pocket per {prodotto}"
          onchange={(e) => { const v = e.currentTarget.value; protetto(() => scriviMeta((st: any) => {
            st.config.mappaProdotti = { ...(st.config.mappaProdotti || {}), [prodotto]: v };
          })); }}>
          {#each d.pk as x (x.id)}<option value={x.id}>{x.nome}</option>{/each}
        </select>
      {/snippet}
    </Riga>
  {/each}
  {#each Object.entries(d.carte) as [carta, pocket] (carta)}
    <Riga titolo="Carta *{carta}" sottotitolo="le ricariche arrivano da qui" valore={nomePocket(pocket as string)} />
  {/each}
</Sezione>

<Sezione titolo="Import dell'estratto conto" piede="CSV Revolut (TOPUP → sforamento, refund → reso, pocket → giroconto; DECLINED e valute estere scartati), CSV italiani col punto e virgola, oppure righe incollate tipo «27/07 Barbiere 15,00». I doppioni si riconoscono e si scartano; la categoria si assegna dalle note.">
  <label class="file">
    <Icona nome="importa" misura={18} tratto={1.9} /><span>Carica un CSV</span>
    <input type="file" accept=".csv,text/csv,text/plain" onchange={file} />
  </label>
  <textarea bind:value={testoImport} rows="4" placeholder="…oppure incolla qui le righe" aria-label="Righe da importare"></textarea>
  <Riga titolo="Analizza il testo" accento disabilitata={!testoImport.trim()} onclick={() => (righe = preparaImport(testoImport))} />
</Sezione>

{#if righe.length}
  <Sezione titolo="{righe.length} righe" piede="{righe.filter((r) => r.doppione).length} doppioni scartati. Quelle senza categoria: sceglila tu.">
    {#each righe as r, i (i)}
      <div class="imp" class:doppione={r.doppione}>
        <Interruttore acceso={r.inc && !r.doppione} disabled={r.doppione} oncambio={(v) => (righe[i].inc = v)} etichetta="Includi" />
        <div class="imp-testo">
          <span>{r.nota}</span>
          <span class="text-footnote secondario">{r.data} · {BADGE[r.tipo]}{r.doppione ? " · già presente" : r.auto ? ` · auto${r.sub ? `: ${r.sub}` : ""}` : ""}</span>
          {#if r.tipo === "out" && !r.doppione}
            <select value={r.cat || ""} onchange={(e) => { righe[i].cat = e.currentTarget.value || null; righe[i].sub = null; }}>
              <option value="">— categoria —</option>
              {#each d.s.cats as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
            </select>
          {/if}
        </div>
        <span class="cifre">{(r.tipo === "in" ? "+" : r.tipo === "giro" ? "" : "−") + euro(r.imp)}</span>
      </div>
    {/each}
  </Sezione>
  <Pulsante variante="pieno" larga disabled={!daImportare} onclick={importa}>{daImportare ? `Importa ${daImportare} movimenti` : "Nessuna riga selezionata"}</Pulsante>
{/if}

<Sezione titolo="Autocategorizzazione" piede="{d.regole} corrispondenze apprese dalle tue correzioni. Hanno sempre la precedenza sul dizionario di partenza.">
  <Riga titolo={dimentica ? "Tocca di nuovo per dimenticare" : "Dimentica tutto"} distruttiva onclick={() => {
    if (!dimentica) { dimentica = true; setTimeout(() => (dimentica = false), 3000); return; }
    scriviMeta((st: any) => { st.rules = {}; });
    avviso("Regole dimenticate.");
  }} />
</Sezione>

<Sezione titolo="Esporta per l'analisi" piede="Tutto in un JSON: movimenti, categorie, ricorrenti, saldi, budget e i totali per mese, in euro e con i nomi risolti. Contiene tutte le tue spese: dallo a un modello solo se ti sta bene che le legga.">
  <Riga titolo="Scarica il file" accento onclick={() => { try { avviso(`File pronto · ${Math.round(scaricaAnalisi() / 1024)} KB`); } catch (e: any) { avviso("Non è riuscito: " + (e.message || e), { tipo: "errore" }); } }} />
  <Riga titolo="Copia negli appunti" accento onclick={async () => { try { avviso(`Copiato · ${Math.round((await copiaAnalisi()) / 1024)} KB`); } catch { avviso("Gli appunti non sono disponibili qui. Usa «Scarica il file».", { tipo: "errore" }); } }} />
</Sezione>

<FoglioRicorrente bind:aperto={fRic} {genere} esistente={scelto} />
<FoglioPocket bind:aperto={fPocket} />

<style>
  .budget { position: relative; display: flex; align-items: center; gap: var(--space-2); min-height: var(--list-row-height); padding: 0 var(--space-4); }
  .budget + .budget::before { content: ""; position: absolute; top: 0; left: calc(var(--space-4) + 18px); right: 0; border-top: 0.5px solid var(--separator); }
  .punto { flex: none; width: 10px; height: 10px; border-radius: 3px; }
  .nome { flex: 1; min-width: 0; }
  .cassa { flex: none; padding: 3px 9px; border-radius: var(--radius-full); font-size: var(--text-caption1); font-weight: var(--weight-semibold); color: var(--label-tertiary); background: var(--fill-quaternary); }
  .cassa.attiva { color: #fff; background: var(--accento); }
  .budget input { width: 64px; text-align: right; font-size: 17px; background: none; outline: none; color: var(--accento); font-variant-numeric: tabular-nums; }
  .quadra { display: flex; flex-direction: column; gap: 2px; padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); color: var(--color-green); }
  .quadra.male { color: var(--color-red); }
  .blocco { padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .ora { font-size: 17px; background: var(--fill-tertiary); border-radius: var(--radius-sm); padding: 4px 8px; color: var(--accento); }
  .file { position: relative; display: flex; align-items: center; gap: var(--space-2); min-height: var(--list-row-height); padding: 0 var(--space-4); color: var(--accento); cursor: pointer; }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  textarea { display: block; width: 100%; padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); font-size: 17px; font-family: var(--font-mono); background: none; outline: none; resize: vertical; }
  .imp { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: 10px var(--space-4); }
  .imp + .imp::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .imp.doppione { opacity: 0.45; }
  .imp-testo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .imp select { margin-top: 4px; font-size: 15px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); color: var(--label-primary); border: 0; }
  .sblocca { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .sblocca input { font-size: 17px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--label-primary); min-width: 0; }
  .dentro { font-size: 17px; padding: 4px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--accento); border: 0; text-align: right; }
  .ok { color: var(--color-green); }
  .male { color: var(--color-red); }
</style>
