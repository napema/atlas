<!--
  Analisi — dove vanno i soldi, e quali sono le leve.

  LA SCHERMATA DI PRIMA ERA BELLA E NON RISPONDEVA. Metteva tutto in un
  calderone: affitto, rata del prestito, Telepass pagato da ING, il monitor
  e il caffè finivano negli stessi totali, nelle stesse medie, nelle stesse
  proiezioni. «Ritmo +426 €», «media al giorno 98 €», «scontrino medio
  50 €», «giorno più caro 875 €»: numeri veri, tutti gonfiati dall'affitto,
  e nessuno dei quali dice niente su quello che si può cambiare.

  La regola nuova non ha eccezioni: nessuna media, proiezione, percentuale o
  confronto si calcola su un totale che contiene Fisse o spese da riserva.
  I cinque gruppi stanno in `gruppi.js`; qui si disegnano.

    A  DOVE SONO ANDATI     i cinque gruppi, e in fondo «decise da te».
    B  IL GRAFICO           solo le decise, per categoria, e si filtra.
    C  RITMO DEL QUOTIDIANO il confronto che ha senso: quotidiano contro
                            la quota che il piano gli dà.
    D  DOVE SI PERDE        le sottocategorie del quotidiano, col medio.
    E  ULTIMI CICLI         senza totale unico: quattro colonne separate.

  Via le tile «al giorno / scontrino medio / giorno più caro», via «per
  giorno della settimana», via le barre di budget per categoria: i budget
  vivono nella legenda del grafico, dove servono.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import GraficoCumulato from "./GraficoCumulato.svelte";
  import GraficoCiambella from "./GraficoCiambella.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale, oggiISO, daISO, piuGiorni, GIORNI, MESI_BREVI } from "$lib/core/ui";
  import { emojiCat } from "$condivisi/finanze/dati.js";
  import { cicloPerIndice, primoCiclo } from "$condivisi/finanze/analisi.js";
  import {
    GRUPPI, DECISE, ripartizione, fetteDi, sottoDi, ritmoQuotidiano,
    andamentoQuotidiano, doveSiPerde, storicoGruppi, intestazione,
  } from "$condivisi/finanze/gruppi.js";
  import { coloreCat } from "./comune";
  import { apri } from "./fogli.svelte";

  /** `lato`: la ripartizione e il grafico — la colonna sinistra sul PC. */
  let { indice, parte }: { indice: string; parte: "lato" | "resto" } = $props();

  /* I DUE FILTRI DEL GRAFICO, e sono di proposito due.

     I gruppi decidono QUALI soldi entrano nel conto, le categorie decidono
     come si vedono. Si parte dalle sole decise: Fisse, Da riserva e
     Pianificate ci sono come chip ma spente, perché la domanda di partenza
     è «dove sono andati i soldi che ho deciso io» e non «quanto costa
     vivere». Chi vuole il secondo numero accende una chip.

     Lo stato NON si salva: è un modo di guardare, non un dato. Salvarlo
     vorrebbe dire aprire l'Analisi su un filtro messo tre settimane fa. */
  let gruppiAttivi = $state<string[]>([...DECISE]);
  let catSpente = $state<string[]>([]);
  /** La categoria aperta sul dettaglio per sottocategoria. */
  let apertaSub = $state<string | null>(null);
  /** Il gruppo del blocco A aperto sui suoi movimenti. */
  let apertoGruppo = $state<string | null>(null);

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    const ciclo = cicloPerIndice(indice, iso);
    const r = ripartizione(ciclo);
    return {
      iso, ciclo,
      testa: intestazione(ciclo, iso),
      r,
      fette: fetteDi(ciclo, { gruppi: gruppiAttivi, catSpente }),
      ritmo: ritmoQuotidiano(ciclo, iso),
      andamento: andamentoQuotidiano(ciclo),
      perde: doveSiPerde(ciclo, 6),
      storico: storicoGruppi(ciclo, 6, primoCiclo()),
      vuoto: r.totale === 0 && iso > ciclo.a,
    };
  });

  const subAperte = $derived(apertaSub ? sottoDi(d.ciclo, apertaSub, { gruppi: gruppiAttivi }) : []);

  /** «23 ott». */
  const gm = (iso: string) => { const x = daISO(iso); return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`; };
  /** «ven 3 ott». */
  const glm = (iso: string) => { const x = daISO(iso); return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`; };

  const GRIGIO = "var(--label-quaternary)";
  /** Il colore di un gruppo nella barra impilata: i neutri sfumano di grigio. */
  function coloreGruppo(id: string, i: number) {
    const g = GRUPPI.find((x: any) => x.id === id);
    if (!g?.neutro) return id === "fuoriPiano" ? "var(--color-orange)" : "var(--accento)";
    // Tre grigi diversi, se no la barra ha un solo blocco lungo e muto.
    return `color-mix(in srgb, var(--label-primary) ${26 - i * 6}%, transparent)`;
  }

  function alternaGruppo(id: string) {
    gruppiAttivi = gruppiAttivi.includes(id)
      ? gruppiAttivi.filter((x: string) => x !== id)
      : [...gruppiAttivi, id];
    // Una categoria spenta che non esiste più nel visibile non va tenuta:
    // riaccendendo il gruppo ricomparirebbe spenta senza che tu l'abbia
    // toccata, e sembrerebbe un buco nel totale.
    apertaSub = null;
  }
  function alternaCat(id: string) {
    catSpente = catSpente.includes(id) ? catSpente.filter((x: string) => x !== id) : [...catSpente, id];
  }

  /* IL TOCCO LUNGO sul dettaglio per sottocategoria, e il chevron che fa la
     stessa cosa. Due vie per la stessa porta non è ridondanza: il tocco
     lungo non si vede, e una cosa che non si vede non la trova nessuno. */
  let premuto: { id: string; lungo: boolean } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function giu(id: string) {
    premuto = { id, lungo: false };
    timer = setTimeout(() => { if (premuto) { premuto.lungo = true; apriSub(id); } }, 450);
  }
  function su() { clearTimeout(timer); }
  function clicCat(id: string) {
    if (premuto?.id === id && premuto.lungo) { premuto = null; return; }
    premuto = null;
    alternaCat(id);
  }
  function apriSub(id: string) { apertaSub = apertaSub === id ? null : id; }
</script>

{#if d.vuoto}
  {#if parte === "lato"}
    <Vuoto icona="grafico" titolo="Niente da analizzare" testo="In questo ciclo non ci sono uscite. Registrale e qui trovi dove sono andati i soldi, il ritmo del quotidiano e dove si perde." />
  {/if}
{:else if parte === "lato"}

<!-- A. DOVE SONO ANDATI ---------------------------------------------------
     La barra prima delle righe: la proporzione si legge in un colpo, i
     numeri servono dopo. Tre grigi per i gruppi che non sono leve, due
     colori per quelli che lo sono. -->
<Sezione>
  <div class="blocco">
    <div class="testa">
      <!-- Il nome del ciclo NON si ripete: sta gia' nel selettore in cima,
           e qui mandava a capo l'etichetta spezzando in due il totale. -->
      <span class="eti">{d.testa.corrente
        ? `GIORNO ${d.testa.giorno} DI ${d.testa.giorni}`
        : "CICLO CHIUSO"}</span>
      <span class="eti-dx cifre">{euro(d.r.totale, { tondo: true })}</span>
    </div>

    <div class="barra" role="img" aria-label="Ripartizione delle uscite del ciclo">
      {#each d.r.gruppi.filter((g: any) => g.totale > 0) as g, i (g.id)}
        <i style:flex="{g.totale}" style:background={coloreGruppo(g.id, i)}></i>
      {/each}
    </div>

    <ul class="gruppi">
      {#each d.r.gruppi as g, i (g.id)}
        <li class:spento={!g.totale}>
          <button type="button" class="g-riga" disabled={!g.n}
            onclick={() => (apertoGruppo = apertoGruppo === g.id ? null : g.id)}>
            <span class="pallino" style:background={coloreGruppo(g.id, i)}></span>
            <span class="g-nome" class:leva={!g.neutro}>{g.nome}</span>
            <span class="g-cifra cifre">{g.n ? euro(g.totale) : "—"}</span>
            <span class="g-nota text-footnote secondario">
              {#if !g.n}in questo ciclo niente
              {:else if g.id === "fuoriPiano"}{plurale(g.n, "acquisto", "acquisti")}
              {:else if g.id === "quotidiano"}{plurale(g.n, "movimento", "movimenti")}
              {:else}{g.esempi}{/if}
            </span>
            {#if g.n}
              <span class="g-chev" class:aperto={apertoGruppo === g.id} aria-hidden="true">
                <Icona nome="freccia" misura={13} tratto={2.4} />
              </span>
            {/if}
          </button>
        </li>
        {#if apertoGruppo === g.id}
          <li class="dentro">
            {#each g.voci.slice(0, 12) as m (m.id)}
              <Riga titolo={m.nota || "Senza nota"} sottotitolo={glm(m.data)} valore={euro(m.imp)}
                freccia onclick={() => apri({ tipo: "dettaglio", id: m.id })} />
            {/each}
            {#if g.voci.length > 12}
              <p class="piu text-footnote secondario">+{g.voci.length - 12} · le trovi in Movimenti</p>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>

    <!-- L'UNICA RIGA CHE CONTA. Sta in fondo e con la linea sopra perché è
         un risultato, non una voce: è la somma delle due leve. -->
    <div class="decise">
      <span>Decise da te</span>
      <b class="cifre">{euro(d.r.decise)}</b>
    </div>
  </div>
</Sezione>

<!-- B. IL GRAFICO ---------------------------------------------------------
     Le chip sono il grafico, non la sua didascalia: si spegne quello che
     non interessa e il totale al centro si rifà sul visibile. -->
<Sezione titolo="Dove sono andati"
  piede="Le chip accendono e spengono i gruppi; una voce della legenda si toglie dal grafico toccandola. Il totale al centro è sempre la somma di quello che si vede. Per il dettaglio per sottocategoria: il chevron, o il dito tenuto premuto.">
  <div class="blocco">
    <div class="chip-riga">
      {#each GRUPPI as g, i (g.id)}
        {@const attivo = gruppiAttivi.includes(g.id)}
        <button type="button" class="chip" class:off={!attivo} disabled={!d.r.perId[g.id].n}
          onclick={() => alternaGruppo(g.id)} aria-pressed={attivo}>
          <span class="pallino" style:background={attivo ? coloreGruppo(g.id, i) : "transparent"}></span>
          {g.nome}
        </button>
      {/each}
    </div>

    {#if d.fette.visibili.length}
      <div class="grafico">
        <GraficoCiambella voci={d.fette.visibili.map((c: any) => ({ etichetta: c.nome, valore: c.totale, colore: coloreCat(c.id) }))}
          totale={d.fette.totale} legenda={false} etichettaCentro="VISIBILE" />
      </div>
    {:else}
      <p class="vuota text-subheadline secondario">Niente da mostrare: hai spento tutto.</p>
    {/if}

    <ul class="legenda">
      {#each d.fette.tutte as c (c.id)}
        <li>
          <button type="button" class="l-riga" class:off={c.spenta}
            onpointerdown={() => giu(c.id)} onpointerup={su} onpointercancel={su} onpointerleave={su}
            onclick={() => clicCat(c.id)} aria-pressed={!c.spenta}>
            <span class="pallino" style:background={c.spenta ? "transparent" : coloreCat(c.id)}
              style:box-shadow={c.spenta ? `inset 0 0 0 1.5px ${coloreCat(c.id)}` : "none"}></span>
            <span class="l-nome"><span class="emoji">{emojiCat(c.id)}</span>{c.nome}</span>
            <span class="l-cifra cifre">{euro(c.totale)}</span>
            <span class="l-nota text-footnote secondario cifre">{[
              c.spenta ? "spenta" : `${Math.round(c.quota * 100)}%`,
              plurale(c.n, "volta", "volte"),
              c.fuoriPiano ? `${c.fuoriPiano} fuori piano` : null,
              c.budget > 0 ? `budget ${euro(c.budget, { tondo: true })}` : null,
            ].filter(Boolean).join(" · ")}</span>
          </button>
          <button type="button" class="l-piu" aria-label="Dettaglio di {c.nome}" onclick={() => apriSub(c.id)}>
            <span class:aperto={apertaSub === c.id}><Icona nome="freccia" misura={13} tratto={2.4} /></span>
          </button>
        </li>
        {#if apertaSub === c.id}
          <li class="sub">
            {#each subAperte as x (x.sub)}
              <button type="button" class="s-riga" onclick={() => apri({ tipo: "sub", catId: c.id, sub: x.sub, mese: d.ciclo.indice })}>
                <span class="s-nome">{x.sub}</span>
                <span class="cifre">{euro(x.totale)}</span>
                <span class="text-footnote secondario cifre">{plurale(x.n, "volta", "volte")} · {euro(x.medio)} in media</span>
              </button>
            {/each}
          </li>
        {/if}
      {/each}
    </ul>
  </div>
</Sezione>

{:else}

<!-- C. IL RITMO DEL QUOTIDIANO -------------------------------------------- -->
<Sezione>
  <div class="blocco ritmo" data-tono={d.ritmo.proiezione > 0 ? "male" : "ok"}>
    <div class="testa"><span class="eti">QUOTIDIANO</span></div>
    <div class="r-cifre">
      <b class="cifre">{euro(d.ritmo.alGiorno)}<span class="al">/giorno</span></b>
      <span class="secondario cifre">piano {euro(d.ritmo.piano)}</span>
    </div>
    <span class="text-subheadline cifre" class:male={d.ritmo.proiezione > 0} class:ok={d.ritmo.proiezione <= 0}>
      {#if !d.ritmo.attendibile}
        troppo presto per una proiezione
      {:else if d.ritmo.corrente}
        se continui: {d.ritmo.proiezione > 0 ? "+" : "−"}{euro(Math.abs(d.ritmo.proiezione), { tondo: true })} sul ciclo
      {:else}
        chiuso a {euro(d.ritmo.quotidiano, { tondo: true })} su {euro(d.ritmo.budget, { tondo: true })}
      {/if}
    </span>
  </div>
</Sezione>

{#if d.ritmo.budget > 0}
  <Sezione titolo="Andamento del quotidiano"
    piede="Tratteggio: il ritmo del piano. I pallini sono gli acquisti fuori piano, messi all'altezza che avrebbero se li sommassi — ma non sono sommati: una decisione presa una volta non alza il ritmo di tutti i giorni dopo.">
    {#snippet coda()}<span class="text-footnote secondario cifre">piano {euro(d.ritmo.budget, { tondo: true })}</span>{/snippet}
    <div class="grafico">
      <GraficoCumulato cum={d.andamento.cum} budget={d.ritmo.budget}
        giornoOggi={d.testa.corrente ? d.testa.giorno : null} giorniMese={d.ciclo.giorni}
        punti={d.andamento.punti}
        etichetta={(n) => gm(piuGiorni(d.ciclo.da, n - 1))} />
    </div>
  </Sezione>
{/if}

<!-- D. DOVE SI PERDE ------------------------------------------------------
     Solo il quotidiano. «Le voci più care» di prima apriva con Affitto,
     Prestito e Abbonamenti: tre righe vere su cui non c'è niente da fare.
     E il numero che interessa non è il totale ma il medio accanto al
     conteggio — 55,90 € di bar in 13 volte è una cosa, in una volta è
     un'altra. -->
{#if d.perde.length}
  <Sezione titolo="Dove si perde" piede="Le sottocategorie del quotidiano, dalla più cara. Fisse, riserva e già deciso non ci sono: non sono leve.">
    {#each d.perde as x (x.sub)}
      <Riga titolo={x.sub} sottotitolo="{plurale(x.n, 'volta', 'volte')} · {euro(x.medio)} in media"
        valore={euro(x.totale)} freccia
        onclick={() => apri({ tipo: "sub", catId: x.catId, sub: x.sub, mese: d.ciclo.indice })} />
    {/each}
  </Sezione>
{/if}

<!-- E. GLI ULTIMI CICLI --------------------------------------------------- -->
{#if d.storico.length > 1}
  <Sezione titolo="Ultimi cicli" piede="Quattro colonne separate e nessun totale unico: sommarle rimetterebbe l'affitto dentro la media del caffè.">
    <div class="storico intest text-caption1">
      <span>ciclo</span><span>quotid. €/g</span><span>fuori piano</span><span>riserva</span><span>fisse</span>
    </div>
    {#each [...d.storico].reverse() as s (s.ciclo.indice)}
      <div class="storico" class:corrente={s.ciclo.indice === d.ciclo.indice}>
        <span class="st-nome">{s.nome}</span>
        <span class="cifre" class:male={d.ritmo.piano > 0 && s.alGiorno > d.ritmo.piano}>{euro(s.alGiorno)}</span>
        <span class="cifre" class:male={s.nFuoriPiano > 0} class:secondario={!s.nFuoriPiano}>{s.nFuoriPiano ? `${s.nFuoriPiano} · ${euro(s.fuoriPiano, { tondo: true })}` : "—"}</span>
        <span class="cifre" class:secondario={!s.riserva}>{s.riserva ? euro(s.riserva, { tondo: true }) : "—"}</span>
        <span class="cifre secondario">{s.fisse ? euro(s.fisse, { tondo: true }) : "—"}</span>
      </div>
    {/each}
  </Sezione>
{/if}

{/if}

<style>
  .blocco { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); }
  .testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti { font-size: var(--text-caption1); font-weight: var(--weight-semibold); letter-spacing: 0.6px; color: var(--label-secondary); }
  .eti-dx { color: var(--label-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .testa .eti { min-width: 0; }
  .grafico { padding: var(--space-3) 0; }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }
  .secondario { color: var(--label-secondary); font-weight: var(--weight-regular); }
  .emoji { margin-right: 6px; }
  .vuota { padding: var(--space-4) 0; text-align: center; }
  .pallino { width: 10px; height: 10px; border-radius: 3px; flex: none; }

  /* --- A. la barra impilata --- */
  .barra { display: flex; gap: 2px; height: 12px; margin: 6px 0 var(--space-2); }
  .barra i { border-radius: 3px; min-width: 3px; }

  .gruppi { display: grid; grid-template-columns: 10px 1fr auto auto; gap: 2px var(--space-3); align-items: baseline; }
  .gruppi > li { display: contents; }
  /* `subgrid`: il bottone è una scatola vera — serve al tocco — ma le sue
     celle restano sulle colonne di sopra, se no ogni riga incolonna per
     conto suo e le cifre non si confrontano. Padding solo verticale: uno
     orizzontale sposterebbe le colonne della subgriglia. */
  .g-riga {
    grid-column: 1 / -1; display: grid; grid-template-columns: subgrid;
    align-items: baseline; gap: 2px var(--space-3);
    padding: 5px 0; margin: -5px 0; width: 100%; text-align: left; color: inherit;
  }
  .g-riga:active { opacity: 0.45; }
  .g-riga:disabled { opacity: 0.45; }
  .g-riga .pallino { align-self: center; }
  .g-nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .g-nome.leva { font-weight: var(--weight-semibold); }
  .g-cifra { justify-self: end; font-variant-numeric: tabular-nums; font-weight: var(--weight-semibold); }
  .g-nota { grid-column: 2 / 3; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .g-chev { grid-column: 4; align-self: center; color: var(--label-quaternary); display: inline-flex; transition: rotate var(--duration-fast) var(--ease-default); }
  .g-chev.aperto { rotate: 90deg; }
  .gruppi > li.spento { opacity: 0.45; }
  .gruppi > li.dentro { display: block; grid-column: 1 / -1; margin: 4px 0 var(--space-2); border-radius: var(--radius-xl); background: var(--fill-quaternary); overflow: hidden; }
  .piu { padding: var(--space-2) var(--space-4); }

  .decise {
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    margin-top: var(--space-2); padding-top: var(--space-3); border-top: 0.5px solid var(--separator);
    font-weight: var(--weight-semibold);
  }
  .decise b { font-size: var(--text-title3); font-variant-numeric: tabular-nums; }

  /* --- B. le chip e la legenda --- */
  .chip-riga { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 var(--space-2); }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px;
    border-radius: var(--radius-full); background: var(--fill-tertiary);
    font-size: var(--text-footnote); font-weight: var(--weight-semibold); color: var(--label-primary);
  }
  /* Spenta vuol dire SPENTA: grigia e barrata, non solo un po' più pallida.
     Un filtro che non si vede è un numero che non torna. */
  .chip.off { background: var(--fill-quaternary); color: var(--label-tertiary); text-decoration: line-through; text-decoration-thickness: 1px; }
  .chip.off .pallino { box-shadow: inset 0 0 0 1.5px var(--label-quaternary); }
  .chip:disabled { opacity: 0.4; text-decoration: none; }
  .chip:active { opacity: 0.6; }

  .legenda { display: grid; grid-template-columns: 10px 1fr auto 24px; gap: 2px var(--space-3); align-items: baseline; }
  .legenda > li { display: contents; }
  .l-riga {
    grid-column: 1 / 4; display: grid; grid-template-columns: subgrid;
    align-items: baseline; gap: 2px var(--space-3);
    padding: 6px 0; margin: -2px 0; width: 100%; text-align: left; color: inherit;
    -webkit-touch-callout: none; user-select: none; touch-action: manipulation;
  }
  .l-riga:active { opacity: 0.45; }
  .l-riga .pallino { align-self: center; }
  .l-nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .l-cifra { justify-self: end; font-variant-numeric: tabular-nums; font-weight: var(--weight-semibold); }
  .l-nota { grid-column: 2 / 4; }
  .l-riga.off .l-nome, .l-riga.off .l-cifra { color: var(--label-tertiary); text-decoration: line-through; text-decoration-color: var(--label-quaternary); }
  .l-piu { grid-column: 4; align-self: center; display: inline-flex; justify-content: flex-end; color: var(--label-quaternary); padding: 6px 0; }
  .l-piu span { display: inline-flex; transition: rotate var(--duration-fast) var(--ease-default); }
  .l-piu span.aperto { rotate: 90deg; }

  .legenda > li.sub { display: flex; flex-direction: column; grid-column: 1 / -1; margin: 2px 0 var(--space-2); padding: 4px 0; border-radius: var(--radius-xl); background: var(--fill-quaternary); }
  .s-riga { display: grid; grid-template-columns: 1fr auto; gap: 0 var(--space-3); padding: 7px var(--space-4); text-align: left; color: inherit; }
  .s-riga:active { opacity: 0.45; }
  .s-riga > :last-child { grid-column: 1 / -1; }
  .s-riga .cifre { justify-self: end; font-variant-numeric: tabular-nums; }

  /* --- C. il ritmo --- */
  .r-cifre { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .r-cifre b { font-family: var(--font-display); font-size: 34px; line-height: 1.1; font-weight: var(--weight-bold); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .al { font-family: var(--font-family); font-size: var(--text-subheadline); font-weight: var(--weight-regular); color: var(--label-secondary); letter-spacing: 0; }
  .ritmo[data-tono="male"] .r-cifre b { color: var(--color-red); }

  /* --- E. lo storico: cinque colonne strette, i numeri a destra --- */
  .storico { position: relative; display: grid; grid-template-columns: 1.4fr 0.9fr 1.1fr 0.9fr 0.9fr; gap: var(--space-2); align-items: baseline; padding: 9px var(--space-4); font-size: var(--text-subheadline); }
  .storico > :not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
  .storico + .storico::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .storico.corrente .st-nome { color: var(--accento); font-weight: var(--weight-semibold); }
  .st-nome { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .intest { color: var(--label-tertiary); padding-top: 0; padding-bottom: 4px; }
</style>
