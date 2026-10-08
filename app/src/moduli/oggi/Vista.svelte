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
  import { MODULI_DATI, voceDi } from "$lib/core/registro";
  import { contratti } from "$lib/core/contratti.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { statoSync } from "$lib/core/statoSync.svelte";
  import { tinta } from "$lib/core/tinte";
  import { tocco, maiuscola, plurale } from "$lib/core/ui";
  import { quadro, saluto, type Scheda, type VoceResta } from "./giornata";

  let { resto = [] }: { resto?: string[] } = $props();

  const NOME = "Ema";

  /* Le misure della pagina come STATO e non come CSS: le pile del PC sono
     raggruppamenti diversi delle stesse carte, e un raggruppamento il CSS
     non lo può cambiare — può solo spostare scatole che esistono già. */
  const largo = new MediaQuery("min-width: 1300px");
  /* Il telefono in ORIZZONTALE (alto meno di 500) fa due pile come il PC
     medio: una colonna sola larga 850 punti erano righe lunghe quanto lo
     schermo e una carta alla volta. */
  const medio = new MediaQuery("(min-width: 900px), (orientation: landscape) and (min-width: 640px) and (max-height: 500px)");
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
  const mostrate = $derived(q.prio.slice(0, maxRighe));

  /* A POSTO PER ADESSO — e non «ecco le prossime due».

     Quando la fascia in corso è finita la home mostrava le due che vengono
     dopo, col loro momento. Sembrava informativo e invece era il contrario:
     alle nove di mattina, a lezione, non c'è NIENTE che si possa fare per
     quelle due — sono lì solo a ricordare che la giornata non è finita. Una
     schermata che a ogni apertura trova qualcosa da mostrarti non ti dice
     mai che sei a posto, e «sei a posto» è l'unica cosa che quella
     schermata poteva dirti di utile in quel momento.

     Quindi: se non c'è niente ORA, si chiude il cerchio. Nessuna riga, un
     segno di spunta, e fino a quando sei libero. */
  const aPosto = $derived(!q.prio.length && q.resta.length > 0);

  /* L'articolo sta qui e non nel modulo: «per la mattina» è come lo dice
     la home, non un dato. Tre voci e una scappatoia — un momento che non
     conosco diventa «per adesso», che è vero sempre e non mente mai. */
  const PER: Record<string, string> = {
    mattina: "per la mattina", pomeriggio: "per il pomeriggio", sera: "per la sera",
  };
  const perQuando = $derived((q.fasciaOra && PER[q.fasciaOra.id]) || "per adesso");

  /* «Niente altro fino a sera» — ma solo quando dice davvero qualcosa.

     Tre condizioni, e ognuna ha prodotto una frase sbagliata prima di
     diventare una condizione: il momento dev'essere UNO DEI TRE (senza il
     filtro usciva «fino a quando capita», che non è un'ora); dev'essere
     DIVERSO da quello in corso («a posto per la mattina, niente fino a
     mattina» si rilegge due volte per scoprire che non dice niente); e
     dev'essere tradotto dall'ID, non preso da `nomeFascia`, che è
     l'etichetta di coda della riga — Mobilità ci mette la durata, e
     veniva fuori «niente altro fino a 14 min». */
  const nomeDi = $derived((id: string | null) =>
    id ? (q.fasce.find((f) => f.id === id)?.nome ?? null) : null);
  const finoA = $derived.by(() => {
    const id = q.prossimaFascia;
    if (!id || !PER[id] || id === q.fasciaOra?.id) return null;
    return nomeDi(id);
  });
  const tuttiTardi = $derived(mostrate.length > 1 && mostrate.every((v) => v.quando === "tardi"));
  const nascoste = $derived(q.resta.length - mostrate.length);
  const f = $derived(q.finanze);
  /* ===================================================================
     ADESSO, E BASTA.

     La prima cosa della schermata e' una sola: quella che tocca ORA, con
     il gesto per farla. Non un elenco — un elenco in cima e' una lista di
     debiti, e si legge come un rimprovero prima ancora di avere il caffe'
     in mano.

     Se c'e' un allenamento con un'ora, vince lui: e' l'unica cosa della
     giornata che ha un appuntamento, e saperlo quindici minuti prima e'
     esattamente il momento in cui serve.
     =================================================================== */
  const adesso = $derived.by(() => {
    const conOra = q.giornata.find((v: any) => v.ora && !v.fatta) as any;
    if (conOra?.ora) {
      const m = Number(conOra.ora.slice(0, 2)) * 60 + Number(conOra.ora.slice(3, 5));
      const fra = m - (ora.getHours() * 60 + ora.getMinutes());
      // Entro tre ore e' «adesso»: prima non lo e', e dirlo alle otto di
      // mattina per le sei di sera e' solo un modo di non farti stare
      // tranquillo.
      if (fra > -90 && fra < 180) {
        return {
          ...conOra,
          occhiello: fra <= 0 ? "ADESSO" : fra < 60 ? `TRA ${fra} MIN` : `ALLE ${conOra.ora}`,
          sotto: [conOra.ora, conOra.dentro].filter(Boolean).join(" · "),
        };
      }
    }
    const v = q.prio[0];
    if (!v) return null;
    return {
      ...v,
      occhiello: v.quando === "tardi" ? "IN RITARDO" : "ADESSO",
      sotto: [v.dentro, v.nomeFascia].filter(Boolean).join(" · "),
    };
  });

  const voceDel = (id: string) => voceDi(id);

  /* La giornata, con il posto in cui sei adesso. `corrente` e' la prima
     non fatta: tutto quello che viene prima e' passato, il resto e' da
     venire. Una lista in cui niente e' «adesso» non e' una giornata. */
  const giorno = $derived.by(() => {
    const voci = q.giornata as any[];
    const i = voci.findIndex((v) => !v.fatta && !v.saltata);
    const corrente = i < 0 ? voci.length - 1 : i;

    /* UNA FINESTRA, NON L'ELENCO. Diciotto voci su un telefono sono un muro:
       si smette di vederle e si comincia a vederne una sola, lunga. La
       giornata serve a dire DOVE SEI, e per dirlo bastano due cose fatte
       dietro e quattro davanti — il resto e' contesto che si puo' aprire.

       Due dietro e non zero: senza niente di fatto sopra, la prima riga
       sembra l'inizio della giornata anche alle nove di sera. */
    const DIETRO = 2, AVANTI = 5;
    const da = Math.max(0, corrente - DIETRO);
    const a = Math.min(voci.length, corrente + AVANTI);
    const finestra = voci.length <= DIETRO + AVANTI + 1 ? voci : voci.slice(da, a);

    return {
      voci: finestra,
      // L'indice del «adesso» dentro la finestra, non dentro l'elenco.
      corrente: finestra.indexOf(voci[corrente]),
      prima: voci.length <= DIETRO + AVANTI + 1 ? 0 : da,
      dopo: voci.length <= DIETRO + AVANTI + 1 ? 0 : voci.length - a,
      fatte: voci.filter((v) => v.fatta).length,
      totale: voci.length,
      restano: voci.filter((v) => !v.fatta && !v.saltata).length,
    };
  });

  /* Mobilita' ha un gesto, non solo una schermata: se la sessione di oggi
     e' ancora da fare, la sua carta porta il bottone che la apre. La rotta
     la da' il modulo nella sua voce, la home non se la inventa. */
  const mobilitaApre = $derived(
    (q.resta.find((v) => v.modulo === "mobilita" && v.apre)?.apre as string | undefined) ?? null,
  );

  /** Le carte dei moduli: il numero che ognuno dice di oggi. */
  const carta = (id: string) => {
    const x = schede.find((s) => s.voce.id === id);
    return x?.dati ? { voce: x.voce, d: x.dati } : null;
  };

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

</script>

<!-- ============================================================ CARTE -->

<!-- LA TESTATA DI UNA CARTA, uguale per tutte: pastiglia del colore del
     modulo, nome, e il chevron che dice «qui dentro c'e' una schermata».
     Era `Sezione titolo`, cioe' un testo grigio: due carte accanto si
     distinguevano solo leggendole. Il colore si riconosce da lontano, il
     nome lo conferma. -->
{#snippet testa(voce: any, rotta: string | null = null, fatto = false)}
  <a class="t-modulo" href={rotta ?? `#/${voce.id}`} style:--colore={voce.accento}>
    <span class="t-icona"><Icona nome={voce.icona} misura={16} tratto={2.1} /></span>
    <span class="t-nome text-subheadline semibold">{voce.nome}</span>
    {#if fatto}<span class="t-fatto" title="Fatto"><Icona nome="spunta" misura={12} tratto={3} /></span>{/if}
    <span class="t-freccia"><Icona nome="freccia" misura={15} tratto={2.4} /></span>
  </a>
{/snippet}

{#snippet strisciaAdesso()}
  {#if adesso}
    <div class="adesso lastra" style:--colore={voceDel(adesso.modulo)?.accento ?? "var(--color-blue)"}>
      <span class="a-icona">
        {#if adesso.emoji}<span class="emoji">{adesso.emoji}</span>
        {:else}<Icona nome={voceDel(adesso.modulo)?.icona ?? "oggi"} misura={20} tratto={2} />{/if}
      </span>
      <span class="a-testo">
        <span class="a-occhiello text-caption2">{adesso.occhiello}</span>
        <span class="a-nome text-title3">{adesso.nome}</span>
        {#if adesso.sotto}<span class="text-subheadline secondario">{adesso.sotto}</span>{/if}
      </span>
      <!-- UN VERBO CHE CORRISPONDE ALLA COSA.

           Era «Avvia» per tutto, perche' tutto quello che ha un `apre` si
           apriva allo stesso modo: su una cena diceva «Avvia», che non vuol
           dire niente. Una sessione si avvia, un'abitudine si spunta, un
           pasto si guarda — e dove il verbo e' «guarda» il secondo bottone
           non serve, perche' farebbe la stessa cosa del primo. -->
      <span class="a-azioni">
        {#if adesso.habitId}
          <Pulsante variante="pieno" misura="media" onclick={() => tocca(adesso as any)}>Fatto</Pulsante>
          <Pulsante variante="vetro" misura="media" href={`#/${adesso.modulo}`}>Apri</Pulsante>
        {:else if adesso.apre?.includes("/inizia")}
          <Pulsante variante="pieno" misura="media" href={adesso.apre}>Avvia</Pulsante>
          <Pulsante variante="vetro" misura="media" href={`#/${adesso.modulo}`}>Apri</Pulsante>
        {:else}
          <Pulsante variante="pieno" misura="media" href={adesso.apre ?? `#/${adesso.modulo}`}>Apri</Pulsante>
        {/if}
      </span>
    </div>
  {/if}
{/snippet}

{#snippet cartaGiornata()}
  {#if giorno.voci.length}
    <Sezione>
      <div class="blocco">
        <div class="g-testa">
          <span class="g-titolo text-subheadline semibold">Giornata</span>
          <span class="text-footnote secondario cifre">
            {giorno.restano ? plurale(giorno.restano, "rimasto", "rimasti") : "tutto fatto"}
          </span>
        </div>
        {#if giorno.prima}
          <span class="g-altre text-footnote secondario cifre">↑ {giorno.prima} prima</span>
        {/if}
        <ol class="g-lista">
          {#each giorno.voci as v, i (v.chiave)}
            <li class="g-voce" class:fatta={v.fatta} class:saltata={v.saltata} class:ora={i === giorno.corrente}>
              <span class="g-ora cifre text-footnote">{v.ora ?? ""}</span>
              <button type="button" class="g-segno" aria-label={v.fatta ? "Fatta" : "Segna fatta"}
                onclick={() => !v.ora && tocca(v as any)}>
                {#if v.fatta || v.saltata}<Icona nome="spunta" misura={13} tratto={3} />{/if}
              </button>
              <span class="g-nome">{v.nome}</span>
              {#if v.dentro}<span class="g-dentro text-footnote secondario">{v.dentro}</span>{/if}
            </li>
          {/each}
        </ol>
        {#if giorno.dopo}
          <a class="g-altre g-link text-footnote cifre" href="#/abitudini">↓ altre {giorno.dopo}</a>
        {/if}
      </div>
    </Sezione>
  {/if}
{/snippet}

<!-- LA CARTA DI UN MODULO: testata, il numero che quel modulo dice di oggi,
     una riga di dettaglio. Una forma sola per tutti — e' quello che rende
     la griglia leggibile a colpo d'occhio invece che sei carte diverse. -->
{#snippet cartaModulo(id: string, azione: string | null = null)}
  {@const c2 = carta(id)}
  {#if c2}
    {@const v = String(c2.d.valore ?? "—")}
    <div style:--accento={c2.voce.accento}>
      <Sezione>
        <div class="blocco modulo">
          {@render testa(c2.voce, c2.d.azione?.rotta ?? null, c2.d.fatto === true)}
          <span class="m-cifra cifre" class:lungo={v.length > 14}>{v}</span>
          {#if c2.d.dettaglio}<span class="text-subheadline secondario">{c2.d.dettaglio}</span>{/if}
          {#if typeof c2.d.avanzamento === "number" && c2.d.avanzamento > 0}
            <span class="m-barra" class:piena={c2.d.fatto === true}><i style:width="{Math.round(Math.min(1, c2.d.avanzamento) * 100)}%"></i></span>
          {/if}
          {#if azione}
            <Pulsante variante="tinto" misura="media" larga href={azione}>Inizia ora</Pulsante>
          {/if}
        </div>
      </Sezione>
    </div>
  {/if}
{/snippet}

{#snippet cartaFinanze()}
  {#if f}
    <!-- FINANZE: le tre domande che si fanno davanti a una cena fuori. -->
    <div style:--accento={voceDi("finanze")?.accento}>
      <Sezione>
        <!-- UN NUMERO, con la stessa etichetta che usa il modulo. Erano
             tre — il disponibile grande, «Oggi» e «Al giorno» in due
             riquadri — tutti della stessa misura: a colpo d'occhio non si
             capiva quale rispondesse a «posso spendere stasera». -->
        <div class="soldi">
          {@render testa(voceDi("finanze"), "#/finanze")}
          <span class="eti-oggi text-footnote semibold">Puoi spendere oggi</span>
          <span class="cifra cifre">{f.oggiPuoi ?? f.valore ?? "—"}</span>
          <span class="text-subheadline secondario">{f.oggiFino ?? f.eti ?? ""}</span>
        </div>

        <!-- Solo le uscite che bruciano: quelle scoperte e quelle entro due
             giorni, al massimo due. Sei righe di scadenze in home sono un
             estratto conto — si smettono di leggere, e con loro si smette
             di vedere quella che conta. -->
        {#if f.urgenti?.length}
          <div class="avvolge" style:--inizio-l="38px">
          {#each f.urgenti as e (e.chiave)}
            <Riga>
              {#snippet inizio()}
                <span class="data" data-tono={e.tono} class:oggi={e.oggi}>
                  <span class="data-g">{e.giornoNome}</span>
                  <span class="data-n cifre">{e.giornoData.split(" ")[0]}</span>
                </span>
              {/snippet}
              <span>{e.nome}</span>
              {#if e.dettaglio}<span class="text-subheadline secondario">{e.dettaglio}</span>{/if}
              {#snippet fine()}
                <span class="cifre importo" data-tono={e.tono}>{e.valore}</span>
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
  <!-- DUE PILE, non una griglia.

       La griglia condivide le righe: la seconda riga aspetta la carta piu'
       alta della prima, e sotto quella corta resta un buco. Su 1750 punti
       erano 71 di vuoto sotto Project 50 con «Adesso» a 345 — e piu' voci
       hai, piu' cresce. Non e' un difetto di spaziatura: e' quello che fa
       una griglia.

       Due pile che non sanno niente l'una dell'altra non hanno righe in
       comune, quindi non hanno buchi fra le carte. L'unico spazio che
       avanza e' in fondo alla pila piu' corta, dove finisce la pagina — ed
       e' spazio, non un buco. Era il disegno di partenza; l'avevo
       sostituito con la griglia e il buco e' arrivato con lei. -->
  <!-- LA STRISCIA DI ADESSO, a tutta larghezza e sopra ogni cosa.

       «Adesso» era una carta dentro la griglia, con dentro un elenco: a
       pari dignita' con Finanze e Pasti, e un elenco in cima e' una lista
       di debiti che si legge come un rimprovero. Qui e' UNA cosa — quella
       che tocca ora — col gesto per farla accanto. Quello che resta della
       giornata sta nella sua carta, piu' in basso, dove si guarda e non si
       subisce. -->
  {@render strisciaAdesso()}

  <!-- TRE PILE, non una griglia.

       Una griglia condivide le righe: la seconda riga aspetta la carta piu'
       alta della prima, e sotto quella corta resta il buco. Tre pile che non
       sanno niente l'una dell'altra non hanno righe in comune, quindi non
       hanno buchi: l'unico spazio che avanza e' in fondo alla pila piu'
       corta, dove la pagina finisce comunque.

       La prima e' piu' larga perche' porta le due carte che si LEGGONO —
       i soldi e la giornata — e le altre due portano quelle che si
       GUARDANO. -->
  <div class="bento">
    <div class="pila larga">
      <div class="tessera p-finanze">{@render cartaFinanze()}</div>
      <div class="tessera p-giornata">{@render cartaGiornata()}</div>
    </div>
    <div class="pila">
      <div class="tessera p-training">{@render cartaModulo("allenamenti")}</div>
      <div class="tessera p-mobilita">{@render cartaModulo("mobilita", mobilitaApre)}</div>
    </div>
    <div class="pila">
      <div class="tessera p-pasti">{@render cartaModulo("pasti")}</div>
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

  .saluto {
    font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: clamp(38px, 7vw, 64px); line-height: 1.04; letter-spacing: -0.03em;
    overflow-wrap: anywhere;
  }

  /* ============================================================ ADESSO ==
     La striscia. Una riga sola, a tutta larghezza, con il gesto a destra:
     e' l'unica cosa della schermata su cui si tocca per FARE invece che per
     andare, e deve sembrarlo prima di essere letta.

     Sul telefono le azioni scendono sotto e si allargano: due bottoni da
     trentaquattro punti stretti nell'angolo destro di 390 sono due bersagli
     che si sbagliano. */
  .adesso {
    display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-3) var(--space-4);
    align-items: center; padding: var(--space-4);
    /* NIENTE ALONE COLORATO SOTTO. Il velo c'era, al 14 per cento, e
       sommato alla pastiglia e all'occhiello faceva tre volte lo stesso
       colore sulla stessa striscia. Resta l'occhiello, che e' la parola che
       dice di quale modulo si tratta. */
  }
  .a-icona {
    display: grid; place-items: center; width: 44px; height: 44px; flex: none;
    border-radius: var(--radius-lg); font-size: 20px;
    background: color-mix(in srgb, var(--colore) 20%, transparent);
    color: var(--colore);
    box-shadow: inset 0 0 0 0.5px color-mix(in srgb, var(--colore) 35%, transparent);
  }
  .a-testo { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .a-occhiello {
    color: var(--colore); font-weight: var(--weight-bold);
    letter-spacing: 0.8px; text-transform: uppercase;
  }
  .a-nome { overflow-wrap: anywhere; }
  .a-azioni { display: flex; gap: var(--space-2); flex: none; }
  @media (max-width: 560px) {
    .adesso { grid-template-columns: auto 1fr; }
    .a-azioni { grid-column: 1 / -1; }
    .a-azioni :global(.pulsante) { flex: 1; }
  }

  /* ======================================================= LE CARTE =====
     TRE PILE, non una griglia. Una griglia condivide le righe: la seconda
     riga aspetta la carta piu' alta della prima, e sotto quella corta resta
     il buco — su 1750 punti erano settanta di vuoto. Tre pile che non sanno
     niente l'una dell'altra non hanno righe in comune, quindi non hanno
     buchi fra le carte.

     Sul telefono le pile spariscono (`display: contents`) e le carte
     tornano figlie dirette, in colonna. L'ordine lo rimette `order`, perche'
     nel DOM adesso stanno appaiate tre a tre. */
  .bento { display: flex; flex-direction: column; gap: var(--space-5); }
  .pila { display: contents; }
  .tessera { min-width: 0; display: flex; flex-direction: column; }
  /* UNA CARTA CHE NON C'E' NON OCCUPA SPAZIO. Lo snippet di un modulo
     senza dati non disegna niente, ma il suo contenitore resta — e in una
     pila con `gap` un contenitore vuoto e' un buco alto quanto il passo. */
  .tessera:empty { display: none; }
  .tessera > :global(*) { min-height: 0; }

  .p-giornata { order: 1; }
  .p-finanze  { order: 2; }
  .p-training { order: 3; }
  .p-mobilita { order: 4; }
  .p-pasti    { order: 5; }

  @media (min-width: 760px) {
    .bento { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-6); align-items: start; }
    .pila { display: flex; flex-direction: column; gap: var(--space-6); min-width: 0; }
    .tessera { order: 0; }
  }
  @media (min-width: 1200px) {
    /* La prima colonna e' piu' larga perche' porta le due carte che si
       LEGGONO — i soldi e la giornata — mentre le altre quattro si
       guardano. */
    .bento { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr); }
  }

  /* La forma comune di una carta di modulo. Il `blocco` e' l'interno di una
     lastra: il padding lo mette lui, cosi' `Sezione` resta nuda e tutte le
     carte cominciano alla stessa quota. */
  .blocco { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); }
  .modulo { gap: 2px; }
  .modulo .m-cifra { margin-top: 2px; }

  /* LA TESTATA. Pastiglia del colore del modulo, nome, chevron. Era un
     titolo grigio: due carte accanto si distinguevano solo leggendole. Il
     colore si riconosce da lontano, il nome lo conferma. */
  .t-modulo {
    display: flex; align-items: center; gap: var(--space-2);
    margin: -2px 0 var(--space-1);
  }
  .t-icona {
    display: grid; place-items: center; width: 28px; height: 28px; flex: none;
    border-radius: 9px;
    background: color-mix(in srgb, var(--colore) 20%, transparent);
    color: var(--colore);
    box-shadow: inset 0 0 0 0.5px color-mix(in srgb, var(--colore) 32%, transparent);
  }
  .t-nome { flex: 1; min-width: 0; color: var(--label-primary); }
  .t-freccia { color: var(--label-tertiary); display: flex; }
  /* La spunta del «fatto»: piccola, verde, nella testata. Il verde vuol dire
     «fatto» in tutta ATLAS, e qui lo dice su ventidue punti invece che su
     quaranta di cifra. */
  .t-fatto {
    display: grid; place-items: center; width: 20px; height: 20px; flex: none;
    border-radius: 50%; background: var(--color-green); color: #fff;
  }
  .t-modulo:active { opacity: 0.6; }

  .m-cifra {
    font-family: var(--font-display); font-size: 40px; line-height: 1.05;
    font-weight: var(--weight-bold); letter-spacing: -0.03em;
    overflow-wrap: anywhere;
    /* IL NUMERO NON È COLORATO.

       Era verde quando il modulo si dichiarava «fatto», e accanto aveva la
       barra della tinta del modulo: su Pasti faceva pastiglia rossa, nome
       rosso, numero verde e barra rossa — quattro colori in una carta da
       cento punti. Sei carte così sono un arlecchino, e il colore smette di
       voler dire qualcosa proprio mentre ce n'è di più.

       La regola, ed è quella di iOS: UNA carta, UN colore. La tinta del
       modulo sta sulla pastiglia dell'icona e sulla barra — che sono la
       stessa cosa, l'identità — e il testo resta del colore del testo. Il
       «fatto» lo dice una spunta nella testata, dove si guarda, e non
       ridipingendo quaranta punti di cifra. */
  }
  /* Sopra i quattordici caratteri non e' piu' una cifra: e' una frase, e a
     quaranta punti riempie la carta da sola. Torna al corpo del testo e va a
     capo, con un tetto di tre righe. */
  .m-cifra.lungo {
    font-family: var(--font-family); font-size: var(--text-callout); line-height: 1.3;
    font-weight: var(--weight-semibold); letter-spacing: 0;
    display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .m-barra { height: 5px; border-radius: var(--radius-full); background: var(--fill-tertiary); overflow: hidden; margin-top: var(--space-1); }
  .m-barra i { display: block; height: 100%; border-radius: inherit; background: var(--accento); transition: width var(--duration-slow) var(--ease-default); }
  /* Piena vuol dire «ci sei»: verde, che in ATLAS vuol dire quello. Il
     colore del modulo serve a dire DI CHI e' la barra, non come va. */
  .m-barra.piena i { background: var(--color-green); }

  /* ====================================================== LA GIORNATA ===
     La forma del giorno, non il debito. Le cose fatte restano, con la loro
     spunta: una lista in cui le fatte non ci sono mai state non dice che sei
     a meta' giornata — dice che hai ancora tre cose da fare, cioe' la stessa
     frase di stamattina.

     Una griglia a tre colonne: l'ora, il segno, il nome. Le ore incolonnate
     si leggono come un orario; in tre flex ognuna finirebbe dove capita. */
  .g-testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .g-titolo { color: var(--label-secondary); }
  .g-lista { display: grid; grid-template-columns: auto auto 1fr; gap: 0 var(--space-3); align-items: center; margin-top: 2px; }
  .g-voce { display: contents; }
  .g-ora { color: var(--label-tertiary); font-variant-numeric: tabular-nums; min-width: 34px; padding: 7px 0; }
  .g-segno {
    display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--label-quaternary); color: transparent;
  }
  .g-nome { padding: 7px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .g-dentro { grid-column: 3; margin-top: -6px; padding-bottom: 5px; }
  .g-altre { display: block; padding: 2px 0 0 37px; }
  .g-link { color: var(--accento); }

  /* VERDE TINTO, NON VERDE PIENO.

     Quattro dischi verdi saturi in colonna sono la cosa piu' accesa della
     schermata, e sono la parte della giornata che e' gia' passata: il
     contrario di quello che l'occhio dovrebbe cercare. Il verde resta —
     in ATLAS vuol dire «fatto» — ma come velo, non come bandiera. */
  .g-voce.fatta .g-segno {
    background: color-mix(in srgb, var(--color-green) 20%, transparent);
    box-shadow: none; color: var(--color-green);
  }
  .g-voce.fatta .g-nome { color: var(--label-tertiary); text-decoration: line-through; text-decoration-color: var(--label-quaternary); }
  .g-voce.saltata .g-segno { background: var(--fill-primary); box-shadow: none; color: var(--label-secondary); }
  .g-voce.saltata .g-nome { color: var(--label-tertiary); }
  /* DOVE SEI ADESSO. Non un fondo pieno su tutta la riga — in una griglia
     a celle separate si vedrebbero tre rettangoli — ma il segno acceso del
     colore della voce e il nome in grassetto. */
  /* DOVE SEI ADESSO: l'accento della PAGINA, non la tinta della voce.

     Con la tinta della voce, la cena faceva un cerchio e un orario rossi:
     sembrava un allarme invece di «sei qui». Il «sei qui» e' sempre la
     stessa cosa, quindi e' sempre lo stesso colore. */
  .g-voce.ora .g-segno { box-shadow: inset 0 0 0 2px var(--accento); }
  .g-voce.ora .g-nome { font-weight: var(--weight-semibold); }
  .g-voce.ora .g-ora { color: var(--accento); font-weight: var(--weight-semibold); }

  /* ========================================================= FINANZE ==== */
  .soldi { display: flex; flex-direction: column; gap: 2px; padding: var(--space-4); }
  .eti-oggi { color: var(--label-secondary); letter-spacing: 0.7px; text-transform: uppercase; }
  .soldi .cifra {
    font-family: var(--font-display); font-size: 46px; line-height: 1.05;
    font-weight: var(--weight-bold); letter-spacing: -0.03em;
  }
  .data { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--fill-quaternary); }
  .data.oggi { background: color-mix(in srgb, var(--accento) 18%, transparent); color: var(--accento); }
  .data[data-tono="male"] { background: color-mix(in srgb, var(--color-red) 18%, transparent); color: var(--color-red); }
  .data[data-tono="avviso"] { background: color-mix(in srgb, var(--color-orange) 18%, transparent); color: var(--color-orange); }
  .data-g { font-size: 9px; line-height: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; opacity: 0.8; }
  .data-n { font-size: var(--text-callout); line-height: 18px; font-weight: var(--weight-semibold); }
  .importo { font-weight: var(--weight-semibold); }
  .importo[data-tono="male"] { color: var(--color-red); }
  .importo[data-tono="avviso"] { color: var(--color-orange); }

  .allarme {
    display: flex; gap: var(--space-2); align-items: flex-start;
    padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator);
    color: var(--label-secondary);
  }
  .allarme .punto { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--color-orange); }

  .avvolge { display: contents; }
</style>
