<!--
  Analisi — un ciclo per volta, da stipendio a stipendio.

  Torna al posto di «Cicli» (v3), che aveva tolto le domande della vecchia
  Analisi e lasciato una pila di carte, una per ciclo, con quattro numeri e
  uno zero verde anche sui cicli in cui l'app non esisteva ancora.

  La vecchia Analisi andava: il guaio era che NON SI GUARDAVA. Nove sezioni
  della stessa taglia, in fila, non dicono quale delle nove conta oggi —
  e la sera non ti metti a cercarla. Quindi la gerarchia è la cosa nuova:

    DA TENERE D'OCCHIO   le cinque domande, già ordinate dalla peggiore.
                         Quello che va storto sale da solo; quello che va
                         bene scende e si fa piccolo.
    ANDAMENTO            la curva della Vita contro la retta del budget.
    CATEGORIE            contro il loro budget, le sforate in cima.
    FUORI PIANO          le voci, perché sono decisioni e si ricordano.
    IL RESTO             confronto, numeri, storico, ripartizione, giorni.

  Si sfoglia per ciclo con le frecce in alto: il ciclo è la finestra di
  tutta l'app, e il mese solare spezzava a metà il giro delle bollette.
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
  import { euro, plurale, oggiISO, daISO, piuGiorni, GIORNI, MESI_BREVI } from "$lib/core/ui";
  import { emojiCat } from "$condivisi/finanze/dati.js";
  import { analisiCiclo, segnaliCiclo, storicoCicli, cicloPerIndice } from "$condivisi/finanze/analisi.js";
  import { coloreCat } from "./comune";
  import { apri } from "./fogli.svelte";

  /** `lato`: segnali e andamento — la colonna sinistra sul PC. */
  let { indice, parte }: { indice: string; parte: "lato" | "resto" } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    const a = analisiCiclo(cicloPerIndice(indice, iso), iso);
    const storico = storicoCicli(a.ciclo, 6);
    return {
      a, iso,
      segnali: segnaliCiclo(a),
      storico,
      // Il ciclo in corso non è mai «vuoto»: il giorno dello stipendio non
      // ha ancora movimenti, ma i segnali (il versamento al fondo da fare,
      // il ritmo a zero) sono proprio quello che serve guardare.
      vuoto: a.st.nMovimenti === 0 && !a.corrente,
      fette: a.categorie
        .filter((c: any) => c.speso > 0)
        .sort((x: any, y: any) => y.speso - x.speso)
        .map((c: any) => ({ etichetta: c.nome, valore: c.speso, colore: coloreCat(c.id) })),
    };
  });

  const male = $derived(d.segnali.filter((s: any) => s.esito !== "ok").length);

  /** «23 ott»: le tacche del grafico e le date brevi. */
  const gm = (iso: string) => { const x = daISO(iso); return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`; };
  /** «ven 3 ott». */
  const glm = (iso: string) => { const x = daISO(iso); return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`; };

  /** Dove porta il tocco su un segnale. */
  function vai(id: string) {
    if (id === "fondo") apri({ tipo: "obiettivo" });
    else if (id === "categorie") {
      const c = d.a.categorie.find((x: any) => x.esito === "male" || x.esito === "attenzione");
      if (c) apri({ tipo: "categoria", catId: c.id, mese: d.a.ciclo.indice });
    } else if (id === "fuoriPiano" || id === "ricariche") {
      document.getElementById("analisi-fuori-piano")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  const TONO: Record<string, string> = { male: "var(--color-red)", attenzione: "var(--color-orange)", ok: "var(--color-green)" };
</script>

{#if d.vuoto}
  {#if parte === "lato"}
    <Vuoto icona="grafico" titolo="Niente da analizzare" testo="In questo ciclo non ci sono movimenti. Registra le uscite e qui trovi cosa tenere d'occhio, i grafici e il dettaglio." />
  {/if}
{:else if parte === "lato"}

<!-- 1. DA TENERE D'OCCHIO ------------------------------------------------- -->
<Sezione titolo="Da tenere d'occhio">
  {#snippet coda()}
    <span class="text-footnote cifre" style:color={male ? TONO[d.segnali[0].esito] : TONO.ok}>
      {male ? plurale(male, "cosa da guardare", "cose da guardare") : "tutto in ordine"}
    </span>
  {/snippet}
  {#each d.segnali as s, i (s.id)}
    <button type="button" class="segnale" class:primo={i === 0 && s.esito !== "ok"} class:quieto={s.esito === "ok"}
      style:--tono={TONO[s.esito]} onclick={() => vai(s.id)}>
      <span class="spia" aria-hidden="true"></span>
      <span class="s-testo">
        <span class="s-titolo">{s.titolo}</span>
        <span class="s-dett text-footnote secondario">{s.dettaglio}</span>
      </span>
      <span class="s-valore cifre">{s.valore}</span>
    </button>
  {/each}
</Sezione>

<!-- 2. L'ANDAMENTO -------------------------------------------------------- -->
{#if d.a.budget > 0}
  <Sezione titolo="Andamento della Vita"
    piede={d.a.corrente
      ? `Tratteggio: il ritmo del budget. Al giorno ${d.a.giorno} di ${d.a.ciclo.giorni} il ritmo è ${euro(d.a.ideale, { tondo: true })}, sei a ${euro(d.a.vita, { tondo: true })}.`
      : `Tratteggio: il ritmo del budget. Ciclo chiuso a ${euro(d.a.vita, { tondo: true })} su ${euro(d.a.budget, { tondo: true })}.`}>
    {#snippet coda()}<span class="text-footnote secondario cifre">budget {euro(d.a.budget, { tondo: true })}</span>{/snippet}
    <div class="grafico">
      <GraficoCumulato cum={d.a.cumulata} budget={d.a.budget} giornoOggi={d.a.corrente ? d.a.giorno : null}
        giorniMese={d.a.ciclo.giorni} etichetta={(n) => gm(piuGiorni(d.a.ciclo.da, n - 1))} />
    </div>
  </Sezione>
{/if}

{:else}

<!-- 3. LE CATEGORIE ------------------------------------------------------- -->
<Sezione titolo="Categorie" piede="Contro il loro budget. In cima quelle sforate o che a questo ritmo sforano. Tocca per il dettaglio.">
  {#each d.a.categorie as c (c.id)}
    {@const f = Number.isFinite(c.frazione) ? c.frazione : 1}
    <button type="button" class="cat" onclick={() => apri({ tipo: "categoria", catId: c.id, mese: d.a.ciclo.indice })}>
      <span class="cat-alto">
        <span class="cat-nome"><span class="emoji">{emojiCat(c.id)}</span>{c.nome}</span>
        <span class="cifre text-subheadline" class:male={c.esito === "male"} class:attenzione={c.esito === "attenzione"}>
          {euro(c.speso, { tondo: true })}{#if c.budget > 0}<span class="secondario"> / {euro(c.budget, { tondo: true })}</span>{/if}
        </span>
      </span>
      <Traccia valore={Math.min(1, f)} altezza={5}
        colore={c.esito === "male" ? "var(--color-red)" : c.esito === "attenzione" ? "var(--color-orange)" : coloreCat(c.id)} />
      <span class="text-footnote secondario">
        {c.budget > 0
          ? (c.speso > c.budget ? `sforato di ${euro(c.speso - c.budget, { tondo: true })}` : `${Math.round(f * 100)}% · restano ${euro(c.budget - c.speso, { tondo: true })}`)
          : "senza budget"} · {Math.round(c.quota * 100)}% delle uscite
      </span>
    </button>
  {/each}
</Sezione>

<!-- 4. FUORI PIANO -------------------------------------------------------- -->
<div id="analisi-fuori-piano">
  <Sezione titolo="Fuori piano"
    piede={d.a.fp.n ? "Le spese sopra soglia decise sul momento: non legate a un ricorrente, non alimentari, non uscite dalla lista d'attesa." : "Nessuna spesa decisa sul momento sopra soglia."}>
    {#snippet coda()}
      <span class="text-footnote cifre" class:male={d.a.fp.n > 0}>{d.a.fp.n ? euro(d.a.fp.totale, { tondo: true }) : ""}</span>
    {/snippet}
    {#each d.a.fp.voci as m (m.id)}
      <Riga titolo={m.nota || "Senza nota"} sottotitolo="{glm(m.data)}{m.daRiserva ? ' · pagata da ING' : ''}"
        valore={euro(m.imp)} freccia onclick={() => apri({ tipo: "dettaglio", id: m.id })} />
    {/each}
    {#each d.a.fp.ricariche.voci as m (m.id)}
      <Riga titolo="Prelievo da ING" sottotitolo="{glm(m.data)}{m.nota ? ` · ${m.nota}` : ''}" valore={euro(m.imp)}
        freccia onclick={() => apri({ tipo: "dettaglio", id: m.id })} />
    {/each}
    {#if !d.a.fp.n && !d.a.fp.ricariche.n}
      <p class="vuota text-subheadline secondario">{d.a.corrente ? `${plurale(d.a.fp.giorniSenza, "giorno", "giorni")} senza.` : "Ciclo pulito."}</p>
    {/if}
  </Sezione>
</div>

<!-- 5. IL CONFRONTO E I NUMERI -------------------------------------------- -->
<Sezione titolo={d.a.corrente ? "Al giorno " + d.a.giorno + ", rispetto al ciclo prima" : "Rispetto al ciclo prima"}
  piede={d.a.confronto.allora == null ? "Il ciclo prima non ha dati: niente paragone."
    : d.a.confronto.adesso === d.a.confronto.allora ? "Stesso ritmo."
    : d.a.confronto.adesso < d.a.confronto.allora ? `${euro(d.a.confronto.allora - d.a.confronto.adesso, { tondo: true })} in meno allo stesso punto.`
    : `${euro(d.a.confronto.adesso - d.a.confronto.allora, { tondo: true })} in più allo stesso punto.`}>
  <div class="due">
    <div><span class="text-footnote secondario">{d.a.confronto.nomePrima}</span><b class="cifre">{d.a.confronto.allora == null ? "—" : euro(d.a.confronto.allora, { tondo: true })}</b></div>
    <div class="adesso"><span class="text-footnote secondario">{d.a.nome}</span><b class="cifre">{euro(d.a.confronto.adesso, { tondo: true })}</b></div>
  </div>
  <div class="stat">
    <div><span class="text-footnote secondario">Media al giorno</span><b class="cifre">{euro(d.a.numeri.mediaGiorno)}</b></div>
    <div><span class="text-footnote secondario">Scontrino medio</span><b class="cifre">{d.a.numeri.nUscite ? euro(d.a.numeri.scontrinoMedio) : "—"}</b></div>
    <div><span class="text-footnote secondario">Giorno più caro</span><b class="cifre">{d.a.numeri.piuCaro ? euro(d.a.numeri.piuCaro.valore) : "—"}</b>{#if d.a.numeri.piuCaro}<small class="secondario">{glm(d.a.numeri.piuCaro.data)}</small>{/if}</div>
    <div><span class="text-footnote secondario">Uscite</span><b class="cifre">{d.a.numeri.nUscite}</b><small class="secondario">movimenti</small></div>
    <div><span class="text-footnote secondario">Rimborsi recuperati</span><b class="cifre">{euro(d.a.numeri.recuperato)}</b></div>
    <div><span class="text-footnote secondario">Eccezionali</span><b class="cifre">{euro(d.a.st.eccezionale)}</b><small class="secondario">fuori dalla Vita</small></div>
  </div>
</Sezione>

<!-- 6. GLI ULTIMI CICLI --------------------------------------------------- -->
{#if d.storico.length > 1}
  <Sezione titolo="Ultimi cicli" piede="La Vita di ogni ciclo contro il budget (linea). Sotto, ciclo per ciclo: fuori piano e versato al fondo.">
    <div class="grafico">
      <GraficoBarre valori={d.storico.map((s: any) => s.vita)} etichette={d.storico.map((s: any) => s.etichetta)}
        evidenzia={d.storico.length - 1} retta={d.a.budget || null} />
    </div>
    <div class="storico intest text-caption1">
      <span>ciclo</span><span>vita</span><span>fuori piano</span><span>al fondo</span>
    </div>
    {#each [...d.storico].reverse() as s (s.ciclo.indice)}
      <div class="storico" class:corrente={s.ciclo.indice === d.a.ciclo.indice}>
        <span class="st-nome">{s.nome}</span>
        <span class="cifre" class:male={d.a.budget > 0 && s.vita > d.a.budget}>{euro(s.vita, { tondo: true })}</span>
        <span class="cifre" class:male={s.nFuoriPiano > 0} class:secondario={!s.nFuoriPiano}>{s.nFuoriPiano ? `${s.nFuoriPiano} · ${euro(s.fuoriPiano, { tondo: true })}` : "—"}</span>
        <span class="cifre" class:secondario={!s.alFondo}>{s.alFondo ? euro(s.alFondo, { tondo: true }) : "—"}</span>
      </div>
    {/each}
  </Sezione>
{/if}

<!-- 7. DOVE SONO ANDATI --------------------------------------------------- -->
{#if d.fette.length}
  <Sezione titolo="Dove sono andati">
    <div class="grafico"><GraficoCiambella voci={d.fette} totale={d.a.st.usciteNette} /></div>
  </Sezione>
{/if}

{#if d.a.sottocategorie.length}
  <Sezione titolo="Le voci più care">
    {#each d.a.sottocategorie.slice(0, 5) as x (x.catId + x.sub)}
      <Riga titolo={x.sub} sottotitolo="{x.categoria} · {plurale(x.volte, 'volta', 'volte')}" valore={euro(x.totale)} freccia
        onclick={() => apri({ tipo: "sub", catId: x.catId, sub: x.sub, mese: d.a.ciclo.indice })} />
    {/each}
  </Sezione>
{/if}

<Sezione titolo="Per giorno della settimana" piede="Media spesa nei giorni di questo ciclo.">
  <div class="grafico">
    <GraficoBarre valori={d.a.settimana} etichette={["lun", "mar", "mer", "gio", "ven", "sab", "dom"]}
      evidenzia={d.a.corrente ? (daISO(d.iso).getDay() + 6) % 7 : -1} />
  </div>
</Sezione>

{#if d.a.st.orfani > 0}
  <p class="orfani text-subheadline">Rimborsi non agganciati: <b class="cifre">{euro(d.a.st.orfani)}</b>. Riducono il totale ma non sai da quale spesa vengono: aprili e collegali.</p>
{/if}

{/if}

<style>
  .grafico { padding: var(--space-4); }
  .male { color: var(--color-red); }
  .attenzione { color: var(--color-orange); }
  .secondario { color: var(--label-secondary); font-weight: var(--weight-regular); }

  /* I SEGNALI. La spia colorata dice l'esito prima del testo; il primo,
     se non è a posto, prende più peso; quelli a posto si fanno quieti. */
  .segnale { position: relative; display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: var(--space-3); width: 100%; padding: 12px var(--space-4); text-align: left; }
  .segnale + .segnale::before { content: ""; position: absolute; top: 0; left: calc(var(--space-4) + 10px + var(--space-3)); right: 0; border-top: 0.5px solid var(--separator); }
  .segnale:active { background: var(--fill-quaternary); }
  .spia { width: 10px; height: 10px; border-radius: 50%; background: var(--tono); }
  .s-testo { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .s-titolo { font-weight: var(--weight-semibold); }
  .s-dett { overflow-wrap: anywhere; }
  .s-valore { font-weight: var(--weight-semibold); color: var(--tono); text-align: right; font-variant-numeric: tabular-nums; }
  .primo { padding-block: 16px; background: color-mix(in srgb, var(--tono) 10%, transparent); }
  .primo .s-titolo { font-size: var(--text-headline); }
  .primo .s-valore { font-size: var(--text-title3); }
  .quieto .s-titolo { font-weight: var(--weight-regular); }
  .quieto .s-valore { color: var(--label-secondary); font-weight: var(--weight-regular); }

  .cat { position: relative; width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 11px var(--space-4) 12px; text-align: left; }
  .cat + .cat::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .cat:active { background: var(--fill-quaternary); }
  .cat-alto { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); }
  .cat-nome { display: inline-flex; align-items: center; gap: 8px; min-width: 0; font-weight: var(--weight-medium, 500); }

  .vuota { padding: var(--space-3) var(--space-4); }

  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); padding: var(--space-4) var(--space-4) 0; }
  .due div, .stat div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary); min-width: 0; }
  .due b, .stat b { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .adesso { box-shadow: inset 0 0 0 1.5px var(--accento); }
  .stat { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); padding: var(--space-2) var(--space-4) var(--space-4); }
  @media (min-width: 560px) { .stat { grid-template-columns: repeat(3, 1fr); } }

  /* Lo storico: quattro colonne strette, i numeri allineati a destra. */
  .storico { position: relative; display: grid; grid-template-columns: 1.5fr 1fr 1.2fr 0.9fr; gap: var(--space-2); align-items: baseline; padding: 9px var(--space-4); font-size: var(--text-subheadline); }
  .storico > :not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
  .storico + .storico::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .storico.corrente .st-nome { color: var(--accento); font-weight: var(--weight-semibold); }
  .st-nome { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .intest { color: var(--label-tertiary); padding-top: 0; padding-bottom: 4px; }

  .orfani { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 12%, transparent); }
</style>
