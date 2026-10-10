<!--
  L'obiettivo: il traguardo, la data, il versamento per stipendio, gli
  extra previsti.

  Uno solo per volta, ed è voluto. Due obiettivi vogliono dire due
  versamenti che si fanno la guerra per lo stesso avanzo, e il risultato è
  che non si alimenta nessuno dei due — la stessa ragione per cui il
  vecchio budget «Risparmio» non ha mai prodotto un risparmio.

  `targetProvvisorio` esiste perché 3.500 € è una stima: se la cifra vera
  arriva diversa, il gap cambia e va cambiato senza che sembri un
  fallimento. Una stima dichiarata si corregge; un numero scritto come
  definitivo e poi mancato è una sconfitta.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import RigaNumero from "$lib/ui/RigaNumero.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, euro, nuovoId, oggiISO, plurale, dataBreve } from "$lib/core/ui";
  import { scriviMeta, statoConfig } from "$condivisi/finanze/dati.js";
  import { ultimoStipendio } from "$condivisi/finanze/calcolo.js";
  import { tiroObiettivo, obiettivo, serieFondo, passoObiettivo } from "$condivisi/finanze/piano.js";
  import { stato } from "$condivisi/finanze/dati.js";
  import GraficoFondo from "./GraficoFondo.svelte";
  import { apri } from "./fogli.svelte";
  import { daISO, MESI_BREVI } from "$lib/core/ui";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    return {
      iso,
      o: obiettivo(),
      s: tiroObiettivo(iso),
      cfg: statoConfig(ultimoStipendio(iso)),
      fondo: serieFondo(iso),
      passo: passoObiettivo(iso),
      nomeFondo: ((stato().pockets || []) as any[]).find((p) => p.id === (obiettivo()?.pocket || "fondo"))?.nome || "Fondo",
    };
  });

  /* LE MODIFICHE PASSANO DAL BLOCCO. Un obiettivo che si può abbassare nel
     momento in cui sei indietro non è un obiettivo: è un campo di testo che
     registra quello che è successo. Fuori dalle 48 ore dopo lo stipendio
     serve uno sblocco con un motivo scritto. */
  const scrivi = (fn: (o: any) => void) => {
    if (d.cfg.bloccata) { avviso("Configurazione bloccata.", { tipo: "errore" }); return; }
    scriviMeta((s: any) => {
      s.config.obiettivo = { ...(s.config.obiettivo || {}) };
      fn(s.config.obiettivo);
    });
  };

  /** «23 ott 2026». */
  const gma = (iso: string) => { const x = daISO(iso); return `${x.getDate()} ${MESI_BREVI[x.getMonth()]} ${x.getFullYear()}`; };
  /** Quattro tacche sotto il grafico: una per stipendio si sovrapporrebbero. */
  const tacche = $derived.by(() => {
    const n = d.fondo?.punti.length ?? 0;
    return [...new Set([0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1])].filter((i) => i >= 0 && i < n);
  });

  /** Un versamento fuori dal giorno di paga: un giroconto già compilato. */
  function versaExtra() {
    // `apri` chiude questo foglio e apre l'altro quando l'animazione è finita.
    apri({ tipo: "movimento", tipoMov: "giro",
      preset: { tipo: "giro", pocket: "principale", pocketTo: obiettivo()?.pocket || "fondo", nota: "Versamento al fondo" } });
  }

  let nomeExtra = $state("");
  let impExtra = $state(0);
  let quandoExtra = $state("");
</script>

<Foglio bind:aperto titolo="Obiettivo">
  {#if d.s}
    <div class="testa">
      <span class="cifre grande">{euro(d.s.saldo, { tondo: true })}</span>
      <span class="text-subheadline secondario cifre">
        di {euro(d.s.target, { tondo: true })} entro il {dataBreve(d.s.data)}
      </span>
      <!-- IL VERDETTO È UNO E GUARDA LA DATA. Qui c'era «in linea ·
           previsto a oggi 0 €»: vero, inutile, e verde sopra un
           salvadanaio vuoto. Se la domanda è «ci arrivo», la risposta non
           può essere un conto sui versamenti già fatti. -->
      <span class="text-footnote cifre" class:ok={d.s.cela} class:avviso={!d.s.cela}>
        {d.s.cela
          ? `ci arrivi · ${euro(d.s.proiezione, { tondo: true })} alla data`
          : `mancano ${euro(d.s.gap, { tondo: true })} · a questo ritmo arrivi a ${euro(d.s.proiezione, { tondo: true })}`}
      </span>
      {#if !d.s.cominciato}
        <span class="text-footnote secondario">Il primo versamento è al prossimo stipendio: finora non ce n'erano da fare.</span>
      {:else if d.s.scarto < 0}
        <span class="text-footnote avviso cifre">Nel frattempo sei indietro di {euro(-d.s.scarto, { tondo: true })} sui versamenti già dovuti.</span>
      {/if}
    </div>

    <!-- COME FUNZIONA. La domanda che è tornata indietro appena il fondo è
         comparso: «ci butto io i soldi?». Sì, e queste tre righe dicono
         quando e come — l'app non tocca la banca, registra quello che fai. -->
    <Sezione titolo="Come funziona">
      <ol class="come text-subheadline">
        <li><b>È un salvadanaio a parte.</b> Il pocket «{d.nomeFondo}» (su Revolut, un salvadanaio dedicato) tiene i soldi per «{d.s.nome}». Non è spendibile e non entra nella quota del giorno.</li>
        <li><b>Ci versi tu, a ogni stipendio.</b> Il giorno di paga sposti {euro(d.s.versamento, { tondo: true })} dal Principale al fondo su Revolut, e nel foglio «Giorno di paga» spunti la prima riga: è quella che lo registra qui.</li>
        <li><b>Il resto lo calcola l'app.</b> Se sei in linea, quanto avrai alla data, quanto manca. Un versamento saltato si vede il giorno dopo, qui e in Analisi.</li>
      </ol>
      {#if d.passo?.tipo === "da-fare"}
        <Riga titolo="Il versamento di questo ciclo manca" sottotitolo="{euro(d.passo.imp, { tondo: true })} · apri il giorno di paga e spunta il fondo" accento freccia
          onclick={() => apri({ tipo: "paga", dataStip: d.passo!.dataStip })} />
      {/if}
      <Riga titolo="Versa un extra adesso" sottotitolo="Un giroconto dal Principale al fondo, fuori dal giorno di paga" accento freccia onclick={versaExtra} />
    </Sezione>

    {#if d.fondo}
      <Sezione titolo="La strada" piede="Linea piena: quello che c'è. Tratteggio: i versamenti programmati. In alto, il traguardo.">
        <div class="grafico">
          <GraficoFondo punti={d.fondo.punti} target={d.fondo.target} etichette={tacche} />
        </div>
      </Sezione>
    {/if}

    <Sezione titolo="Dove arriva" piede="Proiezione: quello che c'è più i versamenti programmati fino alla data, più gli extra previsti.">
      <Riga titolo="Versamenti rimasti" sottotitolo="{plurale(d.s.versamenti, 'stipendio', 'stipendi')} × {euro(d.s.versamento, { tondo: true })}" valore={euro(d.s.daiVersamenti, { tondo: true })} />
      <Riga titolo="Extra previsti" valore={euro(d.s.daiExtra, { tondo: true })} />
      <Riga titolo="Proiezione" valore={euro(d.s.proiezione, { tondo: true })} />
      <Riga titolo={d.s.gap > 0 ? "Mancano" : "Avanza"} valore={euro(Math.abs(d.s.target - d.s.proiezione), { tondo: true })} />
    </Sezione>

    <!-- COSA SERVE PER ARRIVARCI.

         «Mancano 640 €» era l'ultima riga della schermata, e lasciava la
         domanda in mano a te. Le vie sono tre e sono tutte legittime: dare
         di più, prenderci più tempo, volere meno. Dirne una sola — versa
         di più — suggerisce che l'unica uscita sia stringere, e di solito
         è il momento in cui si smette di aprire il riquadro. -->
    {#if d.s.gap > 0 && d.s.inPiu}
      <Sezione titolo="Cosa serve" piede="Tre vie per lo stesso buco. L'app non ne sceglie una: le mette in fila con il loro prezzo.">
        <Riga titolo="Versare di più"
          sottotitolo="{euro(d.s.inPiu, { tondo: true })} in più a stipendio, per {plurale(d.s.versamenti, 'volta', 'volte')}"
          valore="+{euro(d.s.inPiu, { tondo: true })}" />
        <Riga titolo="Prenderci più tempo"
          sottotitolo="{plurale(d.s.stipendiInPiu, 'stipendio', 'stipendi')} oltre la data, allo stesso versamento"
          valore="+{d.s.stipendiInPiu}" />
        <Riga titolo="Abbassare il traguardo"
          sottotitolo="Se la cifra vera fosse {euro(d.s.proiezione, { tondo: true })} ci saresti già"
          valore={euro(d.s.proiezione, { tondo: true })} />
      </Sezione>
    {/if}

    {#if d.fondo}
      <Sezione titolo="I prossimi versamenti" piede="Quanto dovrebbe esserci nel fondo dopo ogni stipendio, se versi ogni volta.">
        {#each d.fondo.punti.slice(1).filter((p: any) => p.quando > d.iso).slice(0, 6) as p (p.quando)}
          <Riga titolo={gma(p.quando)} valore={euro(p.piano, { tondo: true })} />
        {/each}
      </Sezione>
    {/if}
  {/if}

  {#if d.cfg.bloccata}
    <!-- Non si sblocca da qui: il motivo si scrive una volta, in
         Impostazioni, e vale per tutta la configurazione. -->
    <Riga titolo="Configurazione bloccata" sottotitolo="Si modifica nelle 48 ore dopo lo stipendio, oppure con uno sblocco motivato."
      accento freccia onclick={() => { aperto = false; location.hash = "#/impostazioni/finanze"; }} />
  {/if}

  <Sezione titolo="Il traguardo">
    <Riga titolo="Nome">
      {#snippet fine()}
        <input class="dentro" type="text" value={d.o?.nome ?? ""} aria-label="Nome dell'obiettivo"
          onchange={(e) => scrivi((o) => { o.nome = e.currentTarget.value.trim() || "Obiettivo"; })} />
      {/snippet}
    </Riga>
    <RigaNumero etichetta="Target" valore={(d.o?.target ?? 0) / 100} decimali unita="€"
      onsalva={(n) => scrivi((o) => { o.target = Math.max(0, Math.round(n * 100)); })} />
    <Riga titolo="Il target è una stima" sottotitolo="Dichiararla stima è ciò che permette di correggerla senza che sembri un fallimento.">
      {#snippet fine()}
        <Interruttore acceso={Boolean(d.o?.provvisorio)} oncambio={(v) => scrivi((o) => { o.provvisorio = v; })} etichetta="Stima" />
      {/snippet}
    </Riga>
    <Riga titolo="Entro il">
      {#snippet fine()}
        <input class="dentro" type="date" value={d.o?.data ?? ""} aria-label="Data obiettivo"
          onchange={(e) => { const v = e.currentTarget.value; if (v) scrivi((o) => { o.data = v; }); }} />
      {/snippet}
    </Riga>
    <RigaNumero etichetta="Versamento per stipendio" valore={(d.o?.versamento ?? 0) / 100} decimali unita="€"
      onsalva={(n) => scrivi((o) => { o.versamento = Math.max(0, Math.round(n * 100)); })} />
  </Sezione>

  <Sezione titolo="Extra previsti" piede="Entrate una tantum che finiscono nel fondo: la tredicesima, un rimborso. Entrano nella proiezione, non nel «previsto a oggi».">
    {#each (d.o?.extra ?? []) as x (x.id)}
      <Riga titolo={x.nome} sottotitolo="{x.quando}{x.stimato ? ' · stima' : ''}" valore={euro(x.imp, { tondo: true })}>
        {#snippet fine()}
          <button type="button" class="via" aria-label="Togli" onclick={() => scrivi((o) => { o.extra = (o.extra || []).filter((y: any) => y.id !== x.id); })}>×</button>
        {/snippet}
      </Riga>
    {/each}

    <div class="aggiungi">
      <input type="text" bind:value={nomeExtra} placeholder="Nome" aria-label="Nome dell'extra" />
      <input type="number" bind:value={impExtra} placeholder="€" aria-label="Importo in euro" />
      <input type="month" bind:value={quandoExtra} aria-label="Mese" />
      <Pulsante variante="tinto" misura="piccola" disabled={!nomeExtra.trim() || !impExtra || !quandoExtra}
        onclick={() => {
          scrivi((o) => {
            o.extra = [...(o.extra || []), {
              id: nuovoId("x"), nome: nomeExtra.trim(),
              imp: Math.round(Number(impExtra) * 100), quando: quandoExtra, stimato: true,
            }];
          });
          nomeExtra = ""; impExtra = 0; quandoExtra = "";
        }}>Aggiungi</Pulsante>
    </div>
  </Sezione>
</Foglio>

<style>
  .grafico { padding: var(--space-4); }
  .come { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); list-style: none; counter-reset: passo; }
  .come li { position: relative; padding-left: 30px; color: var(--label-secondary); counter-increment: passo; }
  .come li::before { content: counter(passo); position: absolute; left: 0; top: 0; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: var(--weight-bold); color: var(--accento); background: var(--fill-tertiary); }
  .come b { color: var(--label-primary); font-weight: var(--weight-semibold); }
  .testa { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) 0 var(--space-4); text-align: center; }
  .grande { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); }
  .ok { color: var(--color-green); }
  .avviso { color: var(--color-orange); }
  .via { width: 28px; height: 28px; border-radius: 50%; color: var(--label-tertiary); background: var(--fill-quaternary); font-size: 17px; line-height: 1; }
  .aggiungi { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .aggiungi input { font-size: 17px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--label-primary); min-width: 0; }
  .aggiungi input[type="number"] { grid-column: 1; width: 100%; }
  /* 17px anche qui, per la stessa ragione. */
  .dentro { font-size: 17px; padding: 4px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--accento); text-align: right; max-width: 190px; }
</style>
