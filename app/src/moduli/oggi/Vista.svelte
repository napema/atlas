<!--
  Oggi — la home. La misura del successo di ATLAS è questa schermata
  (CLAUDE.md, §0): se al mattino non dice più di tre app aperte in fila,
  ATLAS non è servito a niente.

  OGNI MODULO COMPARE UNA VOLTA SOLA. Come carta se ne ha una — Finanze,
  Project 50 — altrimenti come tessera in «Anche oggi». Prima Finanze e
  Abitudini c'erano due volte, carta e riga, e Costanza diceva la stessa
  cosa di Project 50 con un altro numero: quattro carte per due notizie.

  OGNI CARTA HA LA FORMA DEL SUO CONTENUTO. «Adesso» mostra quello che tocca
  adesso; se adesso non tocca niente mostra quello che resta della
  giornata, e se non resta niente si riduce a una riga. Non esiste più la
  carta che occupa mezza colonna per dire che non ha niente da dire.

  LE COLONNE SONO PILE, NON RIGHE. Sul PC ogni colonna impila le sue carte
  senza sapere quanto sono alte le vicine: una riga di griglia è alta quanto
  la sua carta più alta, e sotto le altre restava il buco. L'ordine delle
  pile lo decide l'importanza:

    telefono   adesso · project 50 · finanze · anche oggi
    PC medio   [adesso, anche oggi]  [project 50, finanze]
    PC largo   [adesso]  [project 50, anche oggi]  [finanze]

  Non ha dati propri: chiede a ogni modulo la sua `oggi()`.
-->
<script lang="ts">
  import { flip } from "svelte/animate";
  import { MediaQuery } from "svelte/reactivity";
  import { slide } from "svelte/transition";
  import Pagina from "$lib/ui/Pagina.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Spunta from "$lib/ui/Spunta.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Settimana from "$lib/ui/Settimana.svelte";
  import { MODULI_DATI, voceDi } from "$lib/core/registro";
  import { contratti } from "$lib/core/contratti.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { statoSync } from "$lib/core/statoSync.svelte";
  import { tinta } from "$lib/core/tinte";
  import { tocco, dataUmana, maiuscola } from "$lib/core/ui";
  import { quadro, saluto, costanza, fraseSerie, type Scheda, type VoceResta } from "./giornata";

  let { resto = [] }: { resto?: string[] } = $props();

  const NOME = "Ema";

  /* Le misure della pagina come STATO e non come CSS: le pile del PC sono
     raggruppamenti diversi delle stesse carte, e un raggruppamento il CSS
     non lo può cambiare — può solo spostare scatole che esistono già. */
  const largo = new MediaQuery("min-width: 1300px");
  const medio = new MediaQuery("min-width: 900px");
  const modo = $derived(largo.current ? 3 : medio.current ? 2 : 1);

  /** Quante righe in «Adesso» prima che diventi un elenco. Sul PC di più:
      c'è lo spazio, e una colonna mezza vuota non è sobrietà. */
  /* Tre righe sul telefono, quattro dove c'è posto. Sopra, si smette di
     vedere le voci e si comincia a vedere una lista — e una lista chiede di
     essere scorsa invece che fatta. Le altre non spariscono: le conta la
     riga in fondo. */
  const maxRighe = $derived(modo === 1 ? 3 : 4);

  // Tollerante di proposito: un modulo rotto non deve portarsi via la home,
  // che è la schermata che si apre più spesso di tutte.
  const schede = $derived.by<Scheda[]>(() => {
    dati.versione;
    const pronti = contratti.pronti;
    return MODULI_DATI.filter((m) => pronti[m.id]).map((voce) => {
      const contratto = pronti[voce.id];
      let d = null;
      try { d = contratto.oggi?.() ?? null; }
      catch (e) { console.error(`[oggi] la scheda di "${voce.id}" non si è calcolata`, e); }
      return { voce, contratto, dati: d };
    });
  });

  const q = $derived.by(() => { dati.versione; return quadro(schede); });
  const c = $derived.by(() => { dati.versione; return costanza(); });
  const ora = $derived.by(() => { dati.versione; return new Date(); });

  /* «ADESSO» MOSTRA ADESSO, E NIENT'ALTRO.

     Prima, quando la fascia corrente era vuota, ripiegava sull'INTERO resto
     della giornata: alle otto di mattina l'elenco arrivava alla cena. Un
     elenco di tutto quello che dovrai fare non è una lista di cose da fare,
     è il bilancio di quanto sei indietro — e alle otto di mattina sei
     indietro per definizione.

     Adesso: se c'è qualcosa ora, è quello. Se non c'è niente ora, si vedono
     le DUE che vengono dopo e basta, col loro momento. Il numero di quelle
     che restano sta in una riga sola, che dice «ce n'è dell'altro» senza
     chiedere di essere letta. */
  const PROSSIME = 2;
  const elenco = $derived(q.prio.length ? q.prio : q.resta.slice(0, PROSSIME));
  const titoloAdesso = $derived(q.prio.length || !q.resta.length ? "Adesso" : "Più tardi");
  const mostrate = $derived(elenco.slice(0, maxRighe));
  const tuttiTardi = $derived(mostrate.length > 1 && mostrate.every((v) => v.quando === "tardi"));
  const nascoste = $derived(q.resta.length - mostrate.length);
  const f = $derived(q.finanze);
  /* PROJECT 50 ha una card sua, distinta da Abitudini: la riga del modulo
     dice quante ne hai spuntate oggi, questa dice a che GIORNO sei. Sono
     due unità di misura diverse, e in una frazione sola non si leggevano
     più né l'una né l'altra.

     La home non conosce Abitudini (regola 12): prende `sfida` da qualunque
     scheda la porti, e se non la porta nessuno la card non esiste. */
  const sfida = $derived(q.sfida);

  /* LE TESSERE PICCOLE. Le avevo tolte perché ripetevano la barra delle
     schede, e non era sbagliato: ripetono la navigazione. Ma toglierle ha
     tolto anche l'unica cosa che dava colore e respiro al bento — tre
     lastre grigie grandi e nient'altro — e soprattutto ha tolto Pasti e
     Mobilità dalla schermata che dovrebbe dire come va la giornata.

     Tornano come quadrati: l'accento del modulo, l'icona, e il NUMERO che
     quel modulo dice di oggi. È la differenza fra un collegamento e uno
     stato: la barra ti porta lì, questa ti dice se serve andarci. */
  const tessere = $derived(schede.filter((x) =>
    x.voce.id !== "finanze" && !(sfida && !sfida.spenta && x.voce.id === "abitudini")));

  const nomeSfida = $derived(voceDi("abitudini")?.nome ?? "Project 50");

  const dataLunga = $derived(maiuscola(ora.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })));

  function tocca(v: VoceResta) {
    // Una sessione non si spunta, si fa: toccarla apre il player.
    if (v.apre) { location.hash = v.apre; return; }
    const contr = contratti.pronti[v.modulo];
    // Parte e abitudine intera sono due chiamate diverse: unirle con un `??`
    // spuntava la parte `null`, sotto una chiave che nessuno rilegge.
    if (v.parteId) contr?.spuntaParte?.(v.habitId, v.parteId);
    else contr?.spunta?.(v.habitId);
    tocco(12);
  }

  const giorniCostanza = $derived(c.giorni.map((g) => ({
    iso: g.giorno,
    stato: g.stato === "ignoto" ? ("riposo" as const) : g.stato,
    titolo: `${dataUmana(g.giorno)} · ` + (
      g.stato === "ignoto" ? "nessun dato"
      : g.stato === "riposo" ? "niente in programma"
      : `${g.spuntate} su ${g.attese}`),
  })));
</script>

<!-- ============================================================ CARTE -->

{#snippet cartaAdesso()}
  <!-- ADESSO: l'unica carta su cui si tocca per FARE invece che per andare. -->
  <Sezione titolo={titoloAdesso}>
    {#snippet coda()}
      {#if q.inRitardo.length}
        <span class="conta ritardo-conta cifre">{q.inRitardo.length} in ritardo</span>
      {:else if q.prio.length}
        <span class="conta cifre">{q.prio.length}</span>
      {/if}
    {/snippet}
    {#if !q.resta.length}
      <!-- Niente da fare: una riga, non una carta vuota. -->
      <div class="calmo">
        <span class="segno ok"><Icona nome="fatto" misura={20} tratto={2} /></span>
        <p>{q.conDati.length ? "Niente. Hai spuntato tutto quello che c'era oggi." : "Sto leggendo i moduli…"}</p>
      </div>
    {:else}
      {#each mostrate as v (v.chiave)}
        <div animate:flip={{ duration: 280 }} out:slide={{ duration: 220 }} class="voce avvolge" style:--tinta={tinta(v.tint)}>
          <Riga onclick={() => tocca(v)} freccia={Boolean(v.apre)}>
            {#snippet inizio()}
              {#if v.apre}
                <span class="apri"><Icona nome="play" misura={14} tratto={2.4} /></span>
              {:else}
                <Spunta finta misura={26} />
              {/if}
            {/snippet}
            <span class="voce-nome">
              {#if v.emoji}<span class="emoji">{v.emoji}</span>{/if}
              {v.nome}
            </span>
            {#if v.dentro}<span class="text-subheadline secondario">{v.dentro}</span>{/if}
            {#snippet fine()}
              {#if v.quando === "tardi" && !tuttiTardi}
                <!-- Quando SONO TUTTE in ritardo la scritta non distingue
                     niente: cinque etichette rosse in colonna sono rumore, e
                     il rosso smette di voler dire qualcosa. In quel caso lo
                     dice una volta la testata, e qui resta il momento. -->
                <span class="text-subheadline ritardo">in ritardo</span>
              {:else if v.nomeFascia}
                <span class="text-subheadline secondario">{v.nomeFascia}</span>
              {/if}
            {/snippet}
          </Riga>
        </div>
      {/each}
      {#if nascoste > 0}
        <Riga titolo="Altre {nascoste} in {nomeSfida}" href="#/abitudini" freccia accento />
      {/if}
    {/if}
  </Sezione>
{/snippet}

{#snippet cartaSfida()}
  {#if sfida?.spenta}
    <!-- NON COMINCIATA. La carta più grande sotto «Adesso» non può essere
         un contatore a zero con sotto «giorni senza spuntare niente»: è
         vero e non serve a niente. Qui c'è il numero della sfida e il modo
         di cominciarla, e la costanza resta sotto come contorno. -->
    <div style:--accento={voceDi("abitudini")?.accento}>
      <Sezione titolo={nomeSfida}>
        <div class="invito">
          <div class="capo">
            <span class="cifra cifre">{sfida.totale}</span>
            <span class="su text-title3 secondario">giorni</span>
          </div>
          <p class="text-subheadline secondario">
            {sfida.quante} voci non negoziabili. Una sola saltata e si riparte dal giorno uno.
          </p>
          <Pulsante variante="pieno" misura="media" larga href={sfida.rotta}>Comincia</Pulsante>
        </div>
        <div class="contorno">
          <Settimana giorni={giorniCostanza} oggi={c.oggi} />
        </div>
      </Sezione>
    </div>
  {:else if sfida}
    <!-- PROJECT 50. La misura è il GIORNO: la barra è dei cinquanta giorni,
         i pallini sono le otto di oggi. Da chiudere, il bordo si accende. -->
    <div style:--accento={voceDi("abitudini")?.accento}>
      <Sezione titolo={nomeSfida}>
        {#snippet coda()}<a href="#/abitudini">Apri</a>{/snippet}
        <div class="sfida" class:urgente={sfida.urgente} class:chiusa={sfida.chiuso}>
          <div class="capo">
            <span class="text-footnote">Giorno</span>
            <span class="cifra cifre">{sfida.giorno}</span>
            <span class="su text-title3 cifre secondario">/ {sfida.totale}</span>
          </div>
          <div class="asta" role="img" aria-label="{sfida.giorno - 1} giorni su {sfida.totale}">
            <i style:width="{Math.round(Math.max(0, Math.min(1, (sfida.giorno - 1) / sfida.totale)) * 100)}%"></i>
          </div>
          {#if sfida.chiuso}
            <p class="riga text-subheadline">
              <Icona nome={sfida.esito === "ok" ? "spunta" : "chiudi"} misura={15} tratto={2.4} />
              {sfida.esito === "ok" ? "Giorno chiuso." : `Giorno perso: da domani riparti dal ${sfida.prossimo}.`}
            </p>
          {:else}
            <div class="riga">
              <ol class="pallini" aria-label="Le otto di oggi">
                {#each sfida.pallini ?? [] as p, i (i)}<li class:fatta={p.fatta} title={p.nome}></li>{/each}
              </ol>
              <span class="text-subheadline secondario">
                {sfida.completo ? "tutte fatte"
                  : sfida.nomiMancate.length === 1 ? `manca ${sfida.nomiMancate[0].toLowerCase()}`
                  : `mancano ${sfida.nomiMancate.length}`}
              </span>
            </div>
            <!-- Il bottone solo quando si può davvero chiudere: prima delle
                 21, nessun bersaglio che si tocca per scoprire che non è
                 ancora il momento. -->
            {#if sfida.daChiudere}
              <Pulsante variante="pieno" misura="media" larga href={sfida.rotta}>Chiudi il giorno</Pulsante>
            {/if}
          {/if}
        </div>
      </Sezione>
    </div>
  {:else}
    <!-- COSTANZA, senza nemmeno le voci della sfida: con la sfida accesa il contatore di
         Project 50 È la serie, e due numeri per la stessa domanda fanno
         chiedere in che cosa differiscono. -->
    <Sezione titolo="Costanza">
      <div class="costanza">
        <div class="serie">
          <span class="cifra cifre" class:magra={c.serie > 0 && c.pieni === 0}>{c.serie}</span>
          <span class="text-subheadline secondario">{c.serie === 1 ? "giorno di fila" : "giorni di fila"}</span>
          {#if c.attese > 0}
            <span class="rapporto text-footnote secondario"><b class="cifre">{c.spuntate}/{c.attese}</b> spunte in 7 giorni</span>
          {/if}
        </div>
        <Settimana giorni={giorniCostanza} oggi={c.oggi} />
        <p class="text-subheadline secondario">{fraseSerie(c.serie, c.pieni, c.vuotiDiFila)}</p>
      </div>
    </Sezione>
  {/if}
{/snippet}

{#snippet cartaFinanze()}
  {#if f}
    <!-- FINANZE: le tre domande che si fanno davanti a una cena fuori. -->
    <div style:--accento={voceDi("finanze")?.accento}>
      <Sezione titolo="Finanze">
        {#snippet coda()}<a href="#/finanze">Apri</a>{/snippet}
        <div class="soldi">
          <div class="eroe">
            <span class="cifra cifre">{f.valore ?? "—"}</span>
            <span class="text-subheadline secondario">{f.eti || "spendibili"}</span>
          </div>
          <div class="due">
            <div><span class="text-footnote secondario">Oggi</span><span class="num cifre">{f.spesoOggi ?? "0 €"}</span></div>
            <div><span class="text-footnote secondario">Al giorno</span><span class="num cifre">{f.alGiorno ?? "—"}</span></div>
          </div>
        </div>
        <!-- Le uscite in arrivo solo se ci sono: «Niente in uscita» era una
             riga intera per un'assenza. -->
        {#if f.calendario?.length}
          <div class="avvolge" style:--inizio-l="38px">
          {#each f.calendario as e (e.chiave)}
            <Riga>
              {#snippet inizio()}
                <span class="data" class:oggi={e.oggi}>
                  <span class="data-g">{e.giornoNome}</span>
                  <span class="data-n cifre">{e.giornoData.split(" ")[0]}</span>
                </span>
              {/snippet}
              <span>{e.nome}</span>
              {#if e.dettaglio}<span class="text-subheadline secondario">{e.dettaglio}</span>{/if}
              {#snippet fine()}
                <span class="cifre importo">{e.valore}</span>
              {/snippet}
            </Riga>
          {/each}
          </div>
        {/if}
        {#if q.allarme}
          <div class="allarme text-subheadline"><span class="punto"></span>{q.allarme}</div>
        {/if}
      </Sezione>
    </div>
  {/if}
{/snippet}

<Pagina titolo="{saluto(ora.getHours())}, {NOME}" larga>
  {#snippet testata()}
    <!-- Il saluto è la prima cosa che vedi e pesava come un sottotitolo.
         Qui è grande davvero: apre la schermata invece di introdurla. -->
    <h1 class="saluto">{saluto(ora.getHours())}, {NOME}</h1>
  {/snippet}
  {#snippet sopra()}
    <span>{dataLunga}</span>
    <span class="sync" title={statoSync.titolo}>
      <span class="pallino" data-stato={statoSync.stato}></span>{statoSync.etichetta}
    </span>
  {/snippet}
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="ingranaggio" etichetta="Impostazioni" href="#/impostazioni" />
  {/snippet}

  <!-- IL BENTO. Non colonne di carte impilate: una griglia sola in cui ogni
       carta occupa un numero di celle proporzionale a quanto pesa, e le
       tessere si incastrano.

       Le colonne erano il difetto vero. Ogni pila cresceva per conto suo, e
       bastava che «Adesso» si svuotasse — alle nove di mattina, con tutto
       già fatto — perché una colonna finisse a metà e le altre no: la
       schermata sembrava storta senza che niente fosse sbagliato.

       Qui le carte della stessa riga sono alte uguali (`stretch`) e i buchi
       li riempie `dense`, che ripesca una tessera più piccola e la mette nel
       vuoto lasciato da una più grande. Una carta che si accorcia non lascia
       un gradino: lascia un posto, e qualcun altro ci entra. -->
  <div class="bento">
    <div class="tessera grande">{@render cartaAdesso()}</div>
    <div class="tessera alta">{@render cartaSfida()}</div>
    <div class="tessera media">{@render cartaFinanze()}</div>

    <!-- I quadrati stanno in una FASCIA loro, larga quanto la griglia, e si
         dividono lo spazio in parti uguali. Messi come tessere della
         griglia si incastravano finché erano il numero giusto: con tre e
         sei colonne l'ultimo restava solo su una riga nuova, con cinque
         colonne vuote a fianco. Così invece il puzzle si chiude comunque
         siano — due, tre o sei. -->
    <div class="tessera striscia">
    {#each tessere as x (x.voce.id)}
      <!-- In 179 punti non ci sta un menu. «Bacon + Pasta + Verdure
           grigliate + Sugo di pomodoro» a 27px diventa «Bacon + P…», e
           tagliato a tre righe piccole è un muro. Il primo pezzo e quanti
           altre ne restano: si legge da lontano e resta vero. -->
      {@const pezzi = String(x.dati?.valore ?? "—").split(/\s*\+\s*/).filter(Boolean)}
      {@const v = pezzi[0] ?? "—"}
      {@const altri = pezzi.length - 1}
      <a class="quadrata" class:fatta={x.dati?.fatto === true}
         href={x.dati?.azione?.rotta || `#/${x.voce.id}`} style:--colore={x.voce.accento}>
        <span class="q-alto">
          <span class="q-icona"><Icona nome={x.voce.icona} misura={19} tratto={2} /></span>
          {#if x.dati?.fatto === true}
            <span class="q-fatto" title="Fatto"><Icona nome="spunta" misura={13} tratto={2.8} /></span>
          {/if}
        </span>
        <span class="q-basso">
          <span class="q-nome text-footnote semibold">{x.voce.nome}</span>
          <span class="q-valore cifre" class:lungo={v.length > 11}>{v}{#if altri > 0}<span class="q-altri"> +{altri}</span>{/if}</span>
        </span>
      </a>
    {/each}
    </div>
  </div>
</Pagina>

<style>
  .sync { display: inline-flex; align-items: center; gap: 5px; margin-left: 8px; text-transform: none; }
  .pallino { width: 7px; height: 7px; border-radius: 50%; background: var(--label-tertiary); }
  .pallino[data-stato="ok"] { background: var(--color-green); }
  .pallino[data-stato="corso"] { background: var(--color-blue); animation: pulsa 1.2s ease-in-out infinite; }
  .pallino[data-stato="err"] { background: var(--color-red); }
  @keyframes pulsa { 50% { opacity: 0.35; } }


  /* LE PILE. Ogni colonna è una pila che non sa niente delle altre: niente
     righe condivise, quindi niente buchi FRA le carte — le colonne possono
     finire ad altezze diverse solo in fondo. `minmax(0, …)` e non `1fr`:
     una colonna `1fr` non scende sotto la larghezza del suo contenuto, e il
     nome lungo di una cena la allargava oltre lo schermo. */
  /* Sul telefono una colonna: un bento a due tessere su 390 punti sarebbe
     due francobolli. La gerarchia lì la fa l'ordine, che è già quello. */
  .bento { display: grid; gap: var(--space-5); grid-template-columns: minmax(0, 1fr); }
  .tessera { min-width: 0; display: flex; flex-direction: column; }

  .invito { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
  .invito .capo { display: flex; align-items: baseline; gap: var(--space-2); }
  .invito .cifra { font-size: 56px; line-height: 1; font-weight: var(--weight-bold); letter-spacing: -0.03em; color: var(--accento); }
  .contorno { padding: 0 var(--space-4) var(--space-4); }

  .saluto {
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: clamp(38px, 7vw, 64px); line-height: 1.04; letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }

  /* I QUADRATI. Colore del modulo, icona, e il numero che quel modulo dice
     di oggi — non un elenco di nomi ma uno stato per tessera. Il fondo è
     tinto piano: acceso pieno, sei tessere diventerebbero sei cartelloni e
     le carte grandi sparirebbero sotto. */
  /* LA FASCIA È UNA GRIGLIA, non un flex che si allarga.

     Con `flex: 1 1 170px` e l'a capo, l'ultima tessera di una riga cresceva
     a riempire tutto lo spazio rimasto: su iPhone le prime due stavano
     affiancate e la terza diventava un rettangolo largo quanto lo schermo.
     Con `auto-fill` le celle restano tutte della stessa misura e quella
     dispari occupa la sua, lasciando il posto vuoto dov'è. */
  .striscia {
    display: grid; gap: var(--space-3);
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  /* LA TESSERA, vetro di iOS 27.

     Vetro nell'aspetto e non con `backdrop-filter`: sotto c'è il fondo
     pieno della pagina, quindi non c'è niente da sfocare — e su iPhone quel
     filtro ricampiona il CONTENUTO della tessera, cioè sgrana l'icona e il
     numero. È lo stesso guasto che abbiamo tolto dalla barra in alto.
     Quindi: fondo stratificato, anello chiaro sul bordo, una luce in alto a
     sinistra e un alone del colore del modulo che sale dal basso. La
     saturazione sta tutta nel bollo dell'icona, dove serve.

     NIENTE VERDE QUI DENTRO. Il verde vuol dire «fatto» in tutta ATLAS, ma
     scritto dentro una tessera tinta di rosa diventa una macchia che non si
     può guardare. Il «fatto» lo dice una spunta in alto a destra, che è
     dove si guarda, e il numero resta del colore del testo. */
  .quadrata {
    position: relative; overflow: hidden;
    aspect-ratio: 1 / 1; min-height: 0;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: var(--space-4);
    border-radius: 22px;
    color: inherit;
    background:
      radial-gradient(120% 90% at 50% 130%, color-mix(in srgb, var(--colore) 26%, transparent), transparent 70%),
      linear-gradient(180deg, color-mix(in srgb, #fff 6%, transparent), transparent 55%),
      var(--bg-grouped-secondary);
    box-shadow:
      inset 0 0 0 0.5px var(--glass-rim),
      inset 0 1px 0 color-mix(in srgb, #fff 10%, transparent),
      0 6px 20px rgba(0, 0, 0, 0.18);
    transition: transform var(--duration-fast) var(--ease-spring);
  }
  .quadrata:active { transform: scale(0.97); }

  .q-alto { display: flex; align-items: flex-start; justify-content: space-between; }
  .q-icona {
    display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px;
    background: var(--colore); color: #fff;
    box-shadow: 0 2px 10px color-mix(in srgb, var(--colore) 45%, transparent);
  }
  .q-fatto {
    display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
    background: color-mix(in srgb, #fff 16%, transparent); color: var(--label-primary);
  }

  .q-basso { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .q-nome { color: var(--label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .q-valore {
    font-family: var(--font-display); font-size: 27px; line-height: 1.05;
    font-weight: var(--weight-bold); letter-spacing: -0.02em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .q-altri { color: var(--label-tertiary); font-weight: var(--weight-semibold); }
  .q-valore.lungo {
    font-size: 15px; line-height: 1.25; letter-spacing: 0; white-space: normal;
    display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical;
  }
  /* La carta riempie la sua tessera: è questo che rende la riga una riga e
     non tre carte appoggiate alla stessa linea. */
  .tessera > :global(*) { flex: 1; min-height: 0; }

  @media (min-width: 700px) {
    .bento {
      grid-template-columns: repeat(6, minmax(0, 1fr));
      /* `dense` è la regola che tiene insieme il disegno quando il contenuto
         cambia: senza, una tessera che non entra nella riga lascia il buco
         dov'è e scende. Con `dense` il buco viene riempito da quella dopo. */
      grid-auto-flow: dense;
      align-items: stretch;
      gap: var(--space-6);
    }
    .grande   { grid-column: span 4; }
    .alta     { grid-column: span 2; }
    .media    { grid-column: 1 / -1; }
    .striscia { grid-column: 1 / -1; }
  }

  /* Al largo il bento si chiude a due righe: sopra la carta grande con la
     colonna della sfida a fianco, sotto Finanze e i quadrati che si
     dividono la riga. Tre fasce a tutta larghezza una sopra l'altra non
     sono un bento — sono strisce, e su 1920 punti la gerarchia sparisce
     perché tutto è largo uguale. */
  @media (min-width: 1100px) {
    .grande   { grid-column: span 4; }
    .alta     { grid-column: span 2; }
    .media    { grid-column: span 3; }
    .striscia { grid-column: span 3; align-content: start; }
  }

  .sfida { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
  .sfida .capo { display: flex; align-items: baseline; gap: var(--space-2); }
  .sfida .cifra { font-family: var(--font-display); font-size: 44px; line-height: 1; font-weight: var(--weight-bold); }
  .sfida .capo .text-footnote { color: var(--accento); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.6px; align-self: center; }
  .asta { height: 4px; border-radius: var(--radius-full); background: var(--fill-tertiary); overflow: hidden; }
  .asta i { display: block; height: 100%; background: var(--accento); border-radius: inherit; transition: width var(--duration-slow) var(--ease-default); }
  .sfida .riga { display: flex; align-items: center; gap: var(--space-3); margin: 0; }
  .chiusa .riga { color: var(--color-green); gap: 6px; }
  .pallini { display: flex; gap: 5px; }
  .pallini li { width: 11px; height: 11px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--label-tertiary); }
  .pallini li.fatta { background: var(--color-green); box-shadow: none; }
  /* Da chiudere: il bordo della lastra si accende. Il numero resta nero —
     è il conto dei giorni, non un allarme. */
  .urgente { box-shadow: inset 0 0 0 1.5px var(--color-orange); border-radius: var(--radius-xxxl); }

  .ritardo-conta { background: color-mix(in srgb, var(--color-orange) 18%, transparent); color: var(--color-orange); padding: 0 10px; }
  .conta {
    display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 8px;
    border-radius: var(--radius-full); background: var(--fill-tertiary);
    color: var(--label-primary); font-size: var(--text-subheadline); font-weight: var(--weight-semibold);
  }

  .calmo { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); }
  .segno {
    flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
    color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent);
  }
  .segno.ok { color: var(--color-green); background: color-mix(in srgb, var(--color-green) 16%, transparent); }

  .voce { display: block; }
  .voce-nome { display: inline-flex; align-items: center; gap: 6px; }
  .apri {
    display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
    background: var(--tinta); color: #fff; padding-left: 2px;
  }
  .ritardo { color: var(--color-red); font-weight: var(--weight-medium); }

  .soldi { padding: var(--space-4) var(--space-4) var(--space-3); display: flex; flex-direction: column; gap: var(--space-4); }
  .eroe { display: flex; flex-direction: column; gap: 2px; }
  .eroe .cifra {
    font-family: var(--font-display); font-size: 40px; line-height: 44px; letter-spacing: -0.5px;
    font-weight: var(--weight-bold);
  }
  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .due div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary); }
  .num { font-size: var(--text-title3); line-height: var(--lh-title3); font-weight: var(--weight-semibold); }

  .data {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: var(--radius-md);
    background: var(--fill-quaternary);
  }
  .data.oggi { background: color-mix(in srgb, var(--accento) 18%, transparent); color: var(--accento); }
  .data-g { font-size: 9px; line-height: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.8; }
  .data-n { font-size: var(--text-callout); line-height: 18px; font-weight: var(--weight-semibold); }
  .importo { font-weight: var(--weight-medium); }
  /* Un'uscita è rossa, sempre: il colore dice la direzione dei soldi. */
  .importo { color: var(--color-red); }

  .allarme {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4) var(--space-4);
    border-top: 0.5px solid var(--separator);
    color: var(--label-secondary);
  }
  .punto { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--color-orange); }

  .costanza { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
  .serie { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }
  .serie .cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--color-orange); }
  .serie .cifra.magra { color: var(--label-primary); }
  .rapporto { margin-left: auto; }
  .rapporto b { color: var(--label-primary); font-weight: var(--weight-semibold); }

</style>
