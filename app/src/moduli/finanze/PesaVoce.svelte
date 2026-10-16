<!--
  Una voce della lista d'attesa, pesata fino in fondo.

  La carta nella lista dice cosa cambia; qui si decide. L'ordine è quello in
  cui si ragiona davanti a una cosa che si vuole:

    1. IL VERDETTO, in una frase e un colore. Ha senso adesso, conviene
       aspettare, si può solo stringendo, non ora. Prima la risposta, poi
       il perché: chi apre questa pagina ha già una domanda.
    2. QUANTO VALE, in tre misure che si sentono: ore di lavoro, giorni di
       razione, giorni di Naso. «95 €» non pesa niente; «7 ore di lavoro»
       sì.
    3. DA DOVE ESCONO: le quattro fonti, ognuna col suo «da X a Y» e i
       travasi da fare su Revolut. Tutte e quattro sempre, anche quelle che
       non reggono: vedere perché ING non va è parte della risposta.
    4. I CONTI, scritti come un'addizione in colonna. Nessun numero della
       pagina deve essere un atto di fede.
    5. IL CONTESTO: questa cosa non è sola. Il resto della lista, il fuori
       piano del ciclo, quello che hai già lasciato perdere.

  I numeri li fa `pesaVoce()` in moduli/finanze/pesa.js; qui si disegnano.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { euro as euroBase, daISO, GIORNI, MESI_BREVI, plurale } from "$lib/core/ui";
  import { nomePocket } from "./comune";

  let { voce, p, oncompra, onscarta }: {
    voce: any; p: any;
    oncompra: () => void; onscarta: () => void;
  } = $props();

  /* Lo spazio prima di «€» non si spezza: in una frase lunga «8,18» a fine
     riga e «€» all'inizio della dopo si leggono come due cose. */
  const euro = (c: number, o?: { segno?: boolean; tondo?: boolean }) => euroBase(c, o).replace(" €", " €");
  /** «−12,00 €», ma «0,00 €» quando non c'è niente da togliere. */
  const meno = (c: number) => (c > 0 ? `−${euro(c)}` : euro(0));

  /** «ven 23 ott». */
  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };
  const uno = (n: number) => (Math.round(n * 10) / 10).toLocaleString("it-IT", { maximumFractionDigits: 1 });
  const giorni = (n: number) => plurale(n, "giorno", "giorni");

  const sett = $derived(p.per.settimana);
  const stip = $derived(p.per.stipendio);
  const ing = $derived(p.per.ing);
  const fondo = $derived(p.per.fondo);

  /* IL VERDETTO. Il tono segue il consiglio, non il prezzo: 400 € che
     reggono sono verdi d'accento, 30 € che svuotano la settimana no. */
  const verdetto = $derived.by(() => {
    const c = p.consiglio;
    if (c.tipo === "adesso") return {
      tono: "bene", titolo: "Ha senso adesso",
      testo: `Dalla settimana: la razione scende da ${euro(sett.da)} a ${euro(sett.a)} al giorno, per ${giorni(sett.giorni)}.`,
    };
    if (c.tipo === "aspetta") return {
      tono: "attesa", titolo: "Aspetta lo stipendio",
      testo: sett.verdetto === "no"
        ? `Adesso non ci sta: la settimana resterebbe a ${euro(sett.a)} al giorno. Il ${gg(stip.paga)}, fra ${giorni(p.attesa)}, la razione del ciclo scende solo da ${euro(stip.da)} a ${euro(stip.a)}.`
        : `Adesso la razione scenderebbe a ${euro(sett.a)} al giorno. Aspettando ${giorni(p.attesa)}, il ciclo dopo scende solo da ${euro(stip.da)} a ${euro(stip.a)}.`,
    };
    if (c.tipo === "stringi") return {
      tono: "stretto", titolo: "Si può, ma stringi",
      testo: `Ti restano ${euro(sett.a)} al giorno per ${giorni(sett.giorni)}: sotto la soglia di ${euro(p.minima, { tondo: true })}.`,
    };
    if (c.tipo === "riserva") return {
      tono: "stretto", titolo: "Solo dalla riserva",
      testo: `Né la settimana né il prossimo ciclo reggono. Da ING il minimo previsto scende a ${euro(ing.a, { tondo: true })}.`,
    };
    return {
      tono: "no", titolo: "Non ora",
      testo: "Nessuna fonte regge senza svuotare la settimana, la riserva o il Naso.",
    };
  });

  const NOMI: Record<string, string> = {
    settimana: "Dalla settimana", stipendio: "Dopo lo stipendio", ing: "Da ING", fondo: "Dal Fondo",
  };
  const TAG: Record<string, string> = { regge: "regge", stretto: "stretto", no: "non regge" };
</script>

<!-- 1. LA COSA E IL VERDETTO ------------------------------------------- -->
<div class="testa-voce">
  <span class="prezzo cifre">{euro(voce.imp)}</span>
  <span class="stato" data-stato={voce.vista}>
    {voce.vista === "attesa" ? `ancora ${plurale(voce.ore, "ora", "ore")}` : "sbloccata"}
  </span>
</div>

<div class="verdetto" data-tono={verdetto.tono}>
  <span class="v-icona">
    <Icona nome={verdetto.tono === "bene" ? "spunta" : verdetto.tono === "attesa" ? "orologio" : "avviso"} misura={18} tratto={2.4} />
  </span>
  <div class="v-testo">
    <b class="text-headline">{verdetto.titolo}</b>
    <span class="text-subheadline">{verdetto.testo}</span>
  </div>
</div>

<!-- 2. QUANTO VALE ------------------------------------------------------ -->
<div class="vale">
  {#if p.vale.ore != null}
    <div class="misura">
      <b class="cifre">{uno(p.vale.ore)} <small>h</small></b>
      <span>di lavoro</span>
    </div>
  {/if}
  {#if p.vale.giorni != null}
    <div class="misura">
      <b class="cifre">{uno(p.vale.giorni)} <small>gg</small></b>
      <span>di razione</span>
    </div>
  {/if}
  {#if p.vale.giorniFondo != null}
    <div class="misura">
      <b class="cifre">{Math.round(p.vale.giorniFondo)} <small>gg</small></b>
      <span>di {p.vale.nomeFondo ?? "Fondo"}</span>
    </div>
  {/if}
</div>
<p class="nota-vale text-footnote">
  A {euro(p.vale.allOra)} l'ora netti, con la razione del piano di {euro(p.vale.razionePiano)} al giorno.
</p>

<!-- 3. DA DOVE ESCONO --------------------------------------------------- -->
<Sezione titolo="Da dove possono uscire">
  {#each p.fonti as f (f.id)}
    {@const scelta = p.consiglio.fonte === f.id}
    <div class="fonte" class:scelta>
      <div class="f-testa">
        <span class="f-nome">
          {NOMI[f.id]}
        </span>
        {#if scelta}<span class="tag consigliata">consigliata</span>
        {:else}<span class="tag" data-v={f.verdetto}>{TAG[f.verdetto]}</span>{/if}
      </div>

      <div class="f-numeri text-subheadline secondario cifre">
        {#if f.id === "settimana"}
          razione da {euro(f.da)} a <b class:male={f.a < p.minima}>{euro(f.a)}</b> al giorno, per {giorni(f.giorni)}
        {:else if f.id === "stipendio"}
          {gg(f.paga)}, fra {giorni(f.attesa)} · razione del ciclo da {euro(f.da)} a <b class:male={f.a < p.minima}>{euro(f.a)}</b>
        {:else if f.id === "ing"}
          minimo previsto da {euro(f.da, { tondo: true })} a <b class:male={f.a < f.pavimento}>{euro(f.a, { tondo: true })}</b>, {gg(f.quando)}
        {:else if f.id === "fondo"}
          gap da {euro(f.da, { tondo: true })} a <b class:male={f.a > f.da}>{euro(f.a, { tondo: true })}</b>
          {#if f.ritardo}· {f.nome} circa {giorni(Math.round(f.ritardo))} più tardi{/if}
        {/if}
      </div>

      <!-- I travasi. Come in «Da spostare»: due tasche e una freccia, nello
           stesso verso del gesto su Revolut. -->
      {#if f.mosse?.length}
        <div class="mosse">
          {#each f.mosse as m (m.da + m.a)}
            <div class="mossa">
              <span class="m-tasca">{nomePocket(m.da)}</span>
              <span class="m-freccia"><Icona nome="freccia" misura={13} tratto={2.6} /></span>
              <span class="m-tasca">{nomePocket(m.a)}</span>
              <b class="m-imp cifre">{euro(m.imp, { tondo: true })}</b>
            </div>
          {/each}
        </div>
      {/if}

      {#if f.id === "settimana"}
        {#if f.manca > 0}
          <p class="f-nota male text-footnote">Mancano {euro(f.manca, { tondo: true })} anche con tutta la Cassa.</p>
        {:else if !f.mosse.length && f.verdetto !== "no"}
          <p class="f-nota text-footnote secondario">Nessun travaso: il Principale basta già.</p>
        {/if}
      {:else if f.id === "stipendio"}
        <p class="f-nota text-footnote secondario">Nessun travaso adesso: lo paghi dal Principale dopo quelli dello stipendio.</p>
      {:else if f.id === "ing" && f.giaSotto}
        <p class="f-nota text-footnote secondario">Il minimo è già sotto i {euro(f.pavimento, { tondo: true })} che servono a bollo e assicurazione.</p>
      {:else if f.id === "fondo" && f.verdetto === "no"}
        <p class="f-nota text-footnote secondario">Il Fondo non è un salvadanaio di scorta: ogni euro tolto sposta il traguardo.</p>
      {/if}
    </div>
  {/each}
</Sezione>

<!-- 4. I CONTI ----------------------------------------------------------- -->
<Sezione titolo="I conti · dalla settimana"
  piede="Lo stesso conto della carta Oggi: si parte dal saldo di stamattina, così la razione non scende a ogni spesa della giornata.">
  <Riga titolo="Principale, Contanti, Cassa" sottotitolo="stamattina" valore={euro(sett.conti.inizio)} />
  <Riga titolo="Già impegnati" sottotitolo={`uscite fino al ${gg(sett.conti.fine)}`} valore={meno(sett.conti.impegni)} />
  <Riga titolo="Liberi" valore={euro(sett.conti.spendibile)} />
  <Riga titolo={voce.nome} valore={meno(p.prezzo)} />
  <Riga titolo="Liberi dopo" valore={euro(sett.conti.dopo)} />
  <Riga titolo={`÷ ${giorni(sett.conti.giorni)}`} valore={`${euro(sett.a)} al giorno`} />
</Sezione>

<Sezione titolo="I conti · dopo lo stipendio">
  <Riga titolo="Vita del ciclo" sottotitolo={`dal ${gg(stip.paga)}`} valore={euro(stip.conti.vita)} />
  <Riga titolo={voce.nome} valore={meno(p.prezzo)} />
  <Riga titolo={`÷ ${giorni(stip.conti.giorni)}`} valore={`${euro(stip.a)} al giorno`} />
</Sezione>

<!-- 5. IL CONTESTO ------------------------------------------------------- -->
<Sezione titolo="Non è sola">
  {#if p.contesto.altre > 0}
    <Riga titolo="Con il resto della lista"
      sottotitolo={`${plurale(p.contesto.altre, "altra voce", "altre voci")} · tutte oggi: ${euro(p.contesto.tutteRazione)} al giorno`}
      valore={euro(p.contesto.tutte)} />
  {/if}
  <Riga titolo="Fuori piano in questo ciclo"
    sottotitolo={p.contesto.fuoriPianoN ? plurale(p.contesto.fuoriPianoN, "spesa", "spese") : "nessuna, finora"}
    valore={euro(p.contesto.fuoriPiano)} />
  {#if p.contesto.scartate > 0}
    <Riga titolo="Lasciate perdere"
      sottotitolo={`${plurale(p.contesto.scartate, "voce", "voci")} dalla lista`}
      valore={euro(p.contesto.risparmiato)} />
  {/if}
</Sezione>

<div class="azioni">
  <Pulsante variante="grigio" larga onclick={onscarta}>Scarta</Pulsante>
  <Pulsante variante="pieno" larga disabled={voce.vista !== "sbloccata"} onclick={oncompra}>
    {voce.vista === "sbloccata" ? "Compra" : `Fra ${plurale(voce.ore, "ora", "ore")}`}
  </Pulsante>
</div>

<style>
  .testa-voce { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-1); }
  .prezzo { font-size: var(--text-large-title, 34px); font-weight: var(--weight-bold); letter-spacing: -0.5px; }
  .stato {
    padding: 3px 9px; border-radius: var(--radius-full);
    font-size: var(--text-caption1); font-weight: var(--weight-semibold);
    color: var(--label-secondary); background: var(--fill-tertiary);
  }
  .stato[data-stato="sbloccata"] { color: var(--accento); background: color-mix(in srgb, var(--accento) 14%, transparent); }

  /* IL VERDETTO: una lastra col colore del tono, l'icona a sinistra. */
  .verdetto {
    --tono: var(--accento);
    display: flex; gap: var(--space-3); align-items: flex-start;
    padding: var(--space-4); border-radius: var(--radius-2xl, 22px);
    background: color-mix(in srgb, var(--tono) 13%, var(--fill-quaternary));
    box-shadow: inset 0 0 0 0.5px color-mix(in srgb, var(--tono) 35%, transparent);
  }
  .verdetto[data-tono="attesa"] { --tono: var(--color-blue); }
  .verdetto[data-tono="stretto"] { --tono: var(--color-orange); }
  .verdetto[data-tono="no"] { --tono: var(--color-red); }
  .v-icona {
    flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%;
    color: var(--tono); background: color-mix(in srgb, var(--tono) 20%, transparent);
  }
  .v-testo { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .v-testo b { color: var(--tono); }
  .v-testo span { color: var(--label-primary); line-height: 1.35; }

  /* QUANTO VALE: tre tessere uguali. */
  .vale { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: var(--space-2); }
  .misura {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: var(--space-3) var(--space-2); border-radius: var(--radius-xl); background: var(--fill-quaternary);
  }
  .misura b { font-size: var(--text-title2); font-weight: var(--weight-bold); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .misura small { font-size: var(--text-footnote); font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .misura span { font-size: var(--text-caption1); color: var(--label-secondary); text-align: center; }
  .nota-vale { margin: calc(-1 * var(--space-2)) var(--space-1) 0; color: var(--label-tertiary); }

  /* LE FONTI */
  .fonte { position: relative; display: flex; flex-direction: column; gap: 4px; padding: var(--space-3) var(--space-4); }
  .fonte + .fonte::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .fonte.scelta { background: color-mix(in srgb, var(--accento) 8%, transparent); }
  .f-testa { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
  .f-nome { font-weight: var(--weight-semibold); }
  .f-numeri b { color: var(--label-primary); font-weight: var(--weight-semibold); }
  .tag {
    flex: none; padding: 2px 8px; border-radius: var(--radius-full);
    font-size: var(--text-caption2); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.4px;
    color: var(--label-secondary); background: var(--fill-tertiary);
  }
  .tag[data-v="stretto"] { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 14%, transparent); }
  .tag[data-v="no"] { color: var(--color-red); background: color-mix(in srgb, var(--color-red) 12%, transparent); }
  .tag.consigliata { color: var(--accento); background: color-mix(in srgb, var(--accento) 16%, transparent); }

  .mosse { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
  .mossa {
    display: grid; grid-template-columns: auto auto auto 1fr; align-items: center; gap: var(--space-2);
    padding: 8px 12px; border-radius: var(--radius-lg, 12px); background: var(--fill-quaternary);
  }
  .m-tasca { font-size: var(--text-subheadline); font-weight: var(--weight-medium, 500); white-space: nowrap; }
  .m-freccia { display: inline-flex; color: var(--accento); }
  .m-imp { justify-self: end; font-weight: var(--weight-bold); color: var(--accento); }
  .f-nota { margin: 2px 0 0; }
  .male { color: var(--color-red) !important; }

  .azioni { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
</style>
