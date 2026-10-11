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
  import Anello from "$lib/ui/Anello.svelte";
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
  /* «↓ altre 3» portava a `#/abitudini`, che da oggi non c'e' piu'. E non
     era giusto nemmeno prima: quelle voci non sono di un modulo solo, sono
     il resto della GIORNATA. Si aprono qui. */
  let giornataIntera = $state(false);

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
    const intera = giornataIntera || voci.length <= DIETRO + AVANTI + 1;
    const da = intera ? 0 : Math.max(0, corrente - DIETRO);
    const a = intera ? voci.length : Math.min(voci.length, corrente + AVANTI);
    const finestra = intera ? voci : voci.slice(da, a);

    return {
      voci: finestra,
      // L'indice del «adesso» dentro la finestra, non dentro l'elenco.
      corrente: finestra.indexOf(voci[corrente]),
      prima: da,
      dopo: voci.length - a,
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

  /* Senza abitudini previste la carta non c'è, e il suo posto nella
     griglia resterebbe un buco: Finanze prende anche la sua riga. */
  const haAbitudini = $derived(((carta("abitudini")?.d as any)?.attese ?? 0) > 0);

  const dataLunga = $derived(maiuscola(ora.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })));

  function tocca(v: VoceResta) {
    // Una sessione non si spunta, si fa: toccarla apre il player.
    if (v.apre) { location.hash = v.apre; return; }
    const contr = contratti.pronti[v.modulo];
    // Parte e abitudine intera sono due chiamate diverse: unirle con un `??`
    // spuntava la parte `null`, sotto una chiave che nessuno rilegge.
    if (v.parti && v.parti.length > 1) contr?.spuntaParti?.(v.habitId, v.parti);
    else if (v.parteId) contr?.spuntaParte?.(v.habitId, v.parteId);
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
                onclick={() => (v.spuntabile || !v.ora) && tocca(v as any)}>
                {#if v.fatta || v.saltata}<Icona nome="spunta" misura={13} tratto={3} />{/if}
              </button>
              <!-- IL NOME PORTA ALLA COSA. Il cerchio a sinistra la spunta,
                   il nome la apre: due gesti diversi, due bersagli diversi.
                   Il lavoro non apre niente — non e' di nessun modulo — e
                   allora resta testo, invece di essere un link che non va da
                   nessuna parte. -->
              {#if v.apre || v.modulo !== "oggi"}
                <a class="g-vai" href={v.apre ?? `#/${v.modulo}`}>
                  <span class="g-nome">{v.nome}</span>
                  {#if v.dentro}<span class="g-dentro text-footnote secondario">{v.dentro}</span>{/if}
                </a>
              {:else}
                <span class="g-vai">
                  <span class="g-nome">{v.nome}</span>
                  {#if v.dentro}<span class="g-dentro text-footnote secondario">{v.dentro}</span>{/if}
                </span>
              {/if}
            </li>
          {/each}
        </ol>
        {#if giorno.dopo || giornataIntera}
          <button type="button" class="g-altre g-link text-footnote cifre"
            onclick={() => (giornataIntera = !giornataIntera)}>
            {giornataIntera ? "↑ mostra meno" : `↓ altre ${giorno.dopo}`}
          </button>
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
          <!-- `#/<modulo>` e non `azione.rotta`: su Mobilità quella rotta è
               `#/mobilita/inizia`, cioè il player. Con la testata, il corpo e
               il bottone che portavano tutti e tre allo stesso posto, da
               nessuna parte si poteva semplicemente GUARDARE il modulo. -->
          {@render testa(c2.voce, null, c2.d.fatto === true)}
          <!-- TUTTO IL CORPO E' IL BERSAGLIO, non solo la testata. Il numero
               grande e' la cosa che si guarda, quindi e' anche la cosa che si
               tocca: cercare il nome in cima per entrare e' il gesto che non
               fa nessuno. Il bottone sotto resta fuori dal link — un bottone
               dentro un link non e' HTML valido, e soprattutto fa due cose
               diverse. -->
          <a class="m-corpo" href="#/{c2.voce.id}">
            <span class="m-cifra cifre" class:lungo={v.length > 14}>{v}</span>
            {#if c2.d.dettaglio}<span class="text-subheadline secondario">{c2.d.dettaglio}</span>{/if}
            {#if typeof c2.d.avanzamento === "number" && c2.d.avanzamento > 0}
              <span class="m-spazio"></span>
              <span class="m-barra" class:piena={c2.d.fatto === true}><i style:width="{Math.round(Math.min(1, c2.d.avanzamento) * 100)}%"></i></span>
            {/if}
          </a>
          {#if azione}
            <Pulsante variante="tinto" misura="media" larga href={azione}>Inizia ora</Pulsante>
          {/if}
        </div>
      </Sezione>
    </div>
  {/if}
{/snippet}

<!-- LA CARTA DELLE ABITUDINI: l'anello, «3 di 7», e la giornata in GETTONI.

     Non la forma comune delle altre carte (numero + riga + barra), perché
     qui la cosa da guardare non è un numero: sono le abitudini stesse. Un
     gettone per ogni cosa da fare oggi, nell'ordine dell'orologio — pieno
     e verde quando è fatta, spento quando aspetta, con l'anello del colore
     del modulo attorno alla prossima. Si legge come l'anello di Fitness: a
     colpo d'occhio, senza leggere.

     E si TOCCA: un gettone si spunta da qui, con un piccolo battito quando
     si accende. È la cosa che fa tornare ogni giorno — spuntare deve essere
     più veloce che pensarci.

     Un gettone per ORARIO e non per parte: gli integratori delle 08:00 sono
     uno, quelli delle 13:00 un altro. È la stessa unità della giornata e
     delle notifiche. -->
{#snippet cartaAbitudini()}
  {@const c3 = carta("abitudini")}
  {#if c3 && (c3.d.attese ?? 0) > 0}
    {@const righe = [...((c3.d.gettoni ?? c3.d.giornata ?? []) as any[])].sort((a, b) => (a.ora ?? "99").localeCompare(b.ora ?? "99"))}
    <!-- Il conto è quello dei GETTONI, cioè degli orari: «0 di 3» sopra
         cinque gettoni erano due unità diverse nella stessa carta. -->
    {@const fatte = righe.filter((r) => r.fatta || r.saltata).length}
    {@const hhmm = `${String(ora.getHours()).padStart(2, "0")}:${String(ora.getMinutes()).padStart(2, "0")}`}
    {@const aperte = righe.filter((r) => !r.fatta && !r.saltata)}
    {@const prossima = aperte.find((r) => r.ora && r.ora >= hhmm) ?? aperte[0] ?? null}
    {@const pieno = righe.length > 0 && fatte >= righe.length}
    <div style:--accento={c3.voce.accento}>
      <Sezione>
        <div class="blocco modulo abitudini">
          {@render testa(c3.voce, null, pieno)}
          <div class="ab-dentro">
          <a class="ab-corpo" href="#/abitudini">
            <Anello valore={righe.length ? fatte / righe.length : 0} misura={52} spessore={7}
              colore={pieno ? "var(--color-green)" : "var(--accento)"} />
            <span class="ab-testo">
              <span class="m-cifra cifre" class:verde={pieno}>{fatte}<span class="ab-di">{` di ${righe.length}`}</span></span>
              <span class="text-subheadline secondario ab-poi">
                {#if pieno}tutto fatto
                {:else if prossima}{prossima.ora && prossima.ora < hhmm ? "da fare" : "poi"}: {prossima.nome}{prossima.ora ? ` · ${prossima.ora}` : ""}{/if}
              </span>
            </span>
          </a>
          <div class="gettoni" role="group" aria-label="Le abitudini di oggi">
            {#each righe as r (r.chiave)}
              <button type="button" class="gettone" class:fatta={r.fatta} class:saltata={r.saltata}
                class:prossima={r === prossima}
                style:--tinta={tinta(r.tint)}
                aria-pressed={Boolean(r.fatta)}
                aria-label="{r.nome}{r.ora ? ` alle ${r.ora}` : ''}{r.fatta ? ', fatta' : ''}"
                title="{r.nome}{r.ora ? ` · ${r.ora}` : ''}"
                onclick={() => tocca({ ...r, modulo: "abitudini" })}>
                <!-- TUTTI I GETTONI HANNO LE DUE RIGHE. Prima l'orario c'era
                     solo su alcuni, e le emoji di quelli senza scendevano a metà:
                     una fila di icone a due altezze. Senza orario, il nome. -->
                <span class="gt-emoji" aria-hidden="true">{r.emoji ?? "⭐️"}</span>
                <span class="gt-etichetta" class:cifre={Boolean(r.ora)}>{r.ora ?? r.nome}</span>
              </button>
            {/each}
          </div>
          </div>
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
        <div class="fin">
        <div class="soldi">
          {@render testa(voceDi("finanze"), "#/finanze")}
          <!-- L'ETICHETTA LA SCRIVE IL MODULO, insieme al numero. Qui era
               scritta a mano — «Puoi spendere oggi» — sopra un numero che
               il modulo manda negativo quando la giornata è andata oltre:
               «Puoi spendere oggi −35,76 €» non vuol dire niente. -->
          <a class="s-corpo" href="#/finanze">
            <span class="eti-oggi text-footnote semibold" class:male={f.oggiMale}>{f.oggiEti ?? "Puoi spendere oggi"}</span>
            <span class="cifra cifre" class:male={f.oggiMale}>{f.oggiPuoi ?? f.valore ?? "—"}</span>
            <span class="text-subheadline secondario">{f.oggiFino ?? f.eti ?? ""}</span>
          </a>
        </div>

        <!-- Solo le uscite che bruciano: quelle scoperte e quelle entro due
             giorni, al massimo due. Sei righe di scadenze in home sono un
             estratto conto — si smettono di leggere, e con loro si smette
             di vedere quella che conta. -->
        {#if f.urgenti?.length || q.allarme}
        <!-- Il dettaglio: le uscite che bruciano e l'allarme. Sotto il numero
             quando la carta è stretta, accanto quando è larga. -->
        <div class="fin-lato">
        {#if f.urgenti?.length}
          <div class="avvolge" style:--inizio-l="38px">
          {#each f.urgenti as e (e.chiave)}
            <!-- `e.rotta` apre la scadenza DENTRO Finanze, dove c'e' «Paga».
                 Era la riga che si guardava il giorno dell'addebito senza
                 poterci fare niente. -->
            <Riga href={e.rotta} freccia>
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
        </div>
        {/if}
        </div>
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

  <!-- UNA GRIGLIA VERA, con le righe in comune — e la gerarchia nelle misure.

       Prima erano tre pile che non sapevano niente l'una dell'altra: niente
       buchi FRA le carte, ma ogni colonna finiva a una quota sua, e le
       Abitudini restavano sole in basso a sinistra con mezza pagina vuota
       accanto. Una pagina che finisce in tre punti diversi non si legge come
       una pagina.

       Qui le righe sono condivise e le carte di una riga sono alte uguali:
       il fondo è uno solo. E la misura dice quanto conta una carta, come nei
       widget di Apple:

         LA GIORNATA      alta due righe, a sinistra. È il senso della home:
                          com'è fatto oggi, dall'alto in basso.
         FINANZE          larga, in alto: il numero che si guarda dieci volte
         ABITUDINI        al giorno, e la cosa che si fa dieci volte al giorno.
         TRAINING, MOBILITÀ, PASTI
                          tre carte uguali in fondo: si guardano, raccontano
                          come va, e nessuna delle tre conta più delle altre.

       Le carte larghe NON sono carte strette allungate: quando c'è spazio si
       aprono in due colonne — il numero a sinistra, il dettaglio a destra.
       Lo decide la carta guardando la propria larghezza (container query),
       non la finestra: una carta larga sul tablet e una sul PC sono la stessa
       carta. -->
  <div class="bento" class:senza-abitudini={!haAbitudini}>
    <div class="tessera a-giornata">{@render cartaGiornata()}</div>
    <div class="tessera a-finanze">{@render cartaFinanze()}</div>
    <div class="tessera a-abitudini">{@render cartaAbitudini()}</div>
    <div class="tessera a-training">{@render cartaModulo("allenamenti")}</div>
    <div class="tessera a-mobilita">{@render cartaModulo("mobilita", mobilitaApre)}</div>
    <div class="tessera a-pasti">{@render cartaModulo("pasti")}</div>
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

  /* IL TELEFONO: una colonna, nell'ordine in cui si vive la giornata. */
  .bento { display: flex; flex-direction: column; gap: var(--space-5); }
  .a-giornata  { order: 1; }
  .a-abitudini { order: 2; }
  .a-finanze   { order: 3; }
  .a-training  { order: 4; }
  .a-mobilita  { order: 5; }
  .a-pasti     { order: 6; }

  /* OGNI LIVELLO CRESCE COL SUO GENITORE: la tessera, il colore del modulo,
     la sezione, la lastra, il blocco. Basta che uno non lo faccia e la
     carta resta alta quanto il suo contenuto, dentro una riga più alta. */
  .tessera { min-width: 0; display: flex; flex-direction: column; container-type: inline-size; }
  .tessera:empty { display: none; }
  .tessera > :global(*) { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .tessera :global(.sezione) { flex: 1; }
  .tessera :global(.lastra) { flex: 1; display: flex; flex-direction: column; }
  .tessera :global(.lastra > *:last-child) { flex: 1; }

  /* IL TABLET: due colonne, e la stessa idea del PC. Finanze e Abitudini
     larghe in alto — larghe vuol dire nella loro forma a due colonne, come
     sul PC. Sotto, la giornata alta a sinistra accanto a Training e
     Mobilità impilate: le due altezze si somigliano, e il fondo è uno.
     Con la giornata accanto alle Abitudini, invece, la carta delle
     abitudini si allungava fino alla lista e restava vuota a metà. */
  @media (min-width: 760px) {
    .bento {
      display: grid; gap: var(--space-5);
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        "finanze   finanze"
        "abitudini abitudini"
        "giornata  training"
        "giornata  mobilita"
        "pasti     pasti";
    }
    .bento.senza-abitudini {
      grid-template-areas:
        "finanze   finanze"
        "giornata  training"
        "giornata  mobilita"
        "pasti     pasti";
    }
    .tessera { order: 0; }
  }

  /* IL PC: tre colonne uguali, e la gerarchia nelle misure. */
  @media (min-width: 1180px) {
    .bento {
      gap: var(--space-6);
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-areas:
        "giornata finanze   finanze"
        "giornata abitudini abitudini"
        "training mobilita  pasti";
    }
    .bento.senza-abitudini {
      grid-template-areas:
        "giornata finanze  finanze"
        "giornata finanze  finanze"
        "training mobilita pasti";
    }
  }
  .a-giornata  { grid-area: giornata; }
  .a-finanze   { grid-area: finanze; }
  .a-abitudini { grid-area: abitudini; }
  .a-training  { grid-area: training; }
  .a-mobilita  { grid-area: mobilita; }
  .a-pasti     { grid-area: pasti; }

  /* --- FINANZE: sopra e sotto quando è stretta, accanto quando è larga --- */
  .fin { display: flex; flex-direction: column; flex: 1; }
  .fin-lato { display: flex; flex-direction: column; justify-content: center; }
  @container (min-width: 600px) {
    .fin { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); }
    .fin .soldi { justify-content: center; }
    .fin-lato { border-left: 0.5px solid var(--separator); padding: var(--space-2) 0; }
    .fin-lato :global(* + .riga::before),
    .fin-lato :global(.avvolge > .riga:first-child::before) { left: var(--space-4); }
  }

  /* --- LA CARTA DELLE ABITUDINI --- */
  .ab-dentro { display: flex; flex-direction: column; flex: 1; }
  .ab-corpo { display: flex; align-items: center; gap: var(--space-3); margin-top: auto; color: inherit; }
  .ab-corpo:active { opacity: 0.6; }
  .ab-testo { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .ab-di { font-size: var(--text-headline); font-weight: var(--weight-semibold); color: var(--label-secondary); letter-spacing: 0; }
  .abitudini .m-cifra.verde { color: var(--color-green); }
  .ab-poi { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .abitudini .m-cifra { margin-top: 0; }
  @container (min-width: 600px) {
    .ab-dentro { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-6); margin-top: auto; }
    .ab-corpo { margin-top: 0; min-width: 200px; }
    .ab-dentro .gettoni { margin-top: 0; }
  }

  /* I GETTONI. Una griglia di colonne uguali, e TUTTI con le stesse due
     righe — l'emoji in una scatola fissa, l'etichetta sotto — così le icone
     stanno sulla stessa linea anche quando un gettone ha l'orario e un
     altro no. */
  .gettoni {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr));
    gap: var(--space-2); margin-top: var(--space-4);
  }
  .gettone {
    display: grid; grid-template-rows: 30px 14px; justify-items: center; align-content: center; gap: 4px;
    height: 68px; min-width: 0; padding: 0 6px; border-radius: 16px;
    background: var(--fill-quaternary);
    transition: background-color var(--duration-normal) var(--ease-default),
      box-shadow var(--duration-normal) var(--ease-default);
    -webkit-tap-highlight-color: transparent;
  }
  .gettone:active { transform: scale(0.94); }
  /* L'emoji in una scatola quadrata e centrata, con l'interlinea a 1: senza,
     ogni glifo porta con sé la sua linea di base e due emoji vicine non
     stanno mai alla stessa altezza. */
  .gt-emoji {
    display: grid; place-items: center; width: 30px; height: 30px;
    font-size: 24px; line-height: 1;
    filter: grayscale(0.7); opacity: 0.55;
    transition: filter var(--duration-normal) var(--ease-default), opacity var(--duration-normal) var(--ease-default);
  }
  .gt-etichetta {
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 11px; line-height: 14px; font-weight: var(--weight-semibold); color: var(--label-tertiary);
  }
  .gettone.fatta { background: color-mix(in srgb, var(--color-green) 20%, transparent); animation: battito 360ms var(--ease-fluido); }
  .gettone.fatta .gt-emoji { filter: none; opacity: 1; }
  .gettone.fatta .gt-etichetta { color: var(--color-green); }
  .gettone.saltata .gt-emoji { opacity: 0.35; }
  .gettone.prossima { box-shadow: inset 0 0 0 2px var(--accento); }
  .gettone.prossima .gt-emoji { filter: none; opacity: 1; }
  .gettone.prossima .gt-etichetta { color: var(--accento); }
  @keyframes battito { 0% { transform: scale(0.88); } 55% { transform: scale(1.06); } 100% { transform: scale(1); } }

  /* La forma comune di una carta di modulo. Il `blocco` e' l'interno di una
     lastra: il padding lo mette lui, cosi' `Sezione` resta nuda e tutte le
     carte cominciano alla stessa quota. */
  .blocco { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-5) var(--space-4) var(--space-4); }

  /* IL RITMO VERTICALE DI UNA CARTA, e non un `gap` solo per tutto.

     Era `gap: 2px`: testata, numero, dettaglio e bottone tutti attaccati,
     un blocco di testo senza respiro — e il bottone «Inizia ora» incollato
     alla riga sopra. Le distanze non sono tutte uguali perche' i legami non
     sono tutti uguali: il dettaglio appartiene al numero e gli sta vicino,
     la testata e' un'altra cosa e sta lontana, l'azione e' un'altra cosa
     ancora e sta piu' lontana di tutte.

     Il `min-height` serve all'allineamento: quattro carte di stato affiancate
     che vanno da ottanta a duecento punti si leggono come quattro cose
     diverse. Con un fondo comune diventano quattro tessere. */
  /* 196 e' la misura della carta piu' alta delle tre — Mobilita', che ha
     anche il bottone. Dandola a tutte, la colonna delle tre tessere finisce
     esattamente dove finisce Finanze accanto: la simmetria non e' un vezzo,
     e' la differenza fra tre carte e una colonna. */
  .modulo { gap: 0; min-height: 196px; }
  .modulo .t-modulo { margin-bottom: var(--space-4); }
  /* IL NUMERO SOTTO LA TESTATA, IL RESTO IN FONDO. Col corpo spinto in
     basso, la carta col bottone teneva il numero in alto e le altre due in
     basso: tre carte nella stessa riga con i numeri a tre quote. Così i
     numeri stanno su una linea sola, e su un'altra la barra e il bottone. */
  .modulo .m-corpo {
    flex: 1; display: flex; flex-direction: column; color: inherit;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .modulo .m-corpo:active { opacity: 0.55; }
  .modulo .m-cifra + :global(*) { margin-top: var(--space-1); }
  /* Uno spazio che cresce, ma mai sotto i 12 punti: un margine `auto` da
     solo lascerebbe la barra attaccata al testo nella carta più piena. */
  .modulo .m-spazio { flex: 1; min-height: var(--space-3); }
  .modulo :global(.pulsante) { margin-top: var(--space-4); }

  /* LA TESTATA. Pastiglia del colore del modulo, nome, chevron. Era un
     titolo grigio: due carte accanto si distinguevano solo leggendole. Il
     colore si riconosce da lontano, il nome lo conferma. */
  .t-modulo { display: flex; align-items: center; gap: var(--space-2); }
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
  .m-barra { height: 5px; border-radius: var(--radius-full); background: var(--fill-tertiary); overflow: hidden; }
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
  .g-testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
  .g-titolo { color: var(--label-secondary); }
  /* `start` e non `center`: una voce con la sua sotto-riga e' alta il
     doppio, e con `center` la sua ora scendeva a meta' — le ore non si
     leggevano piu' come un orario. */
  .g-lista { display: grid; grid-template-columns: auto auto 1fr; gap: 0 var(--space-3); align-items: start; margin-top: 2px; }
  .g-voce { display: contents; }
  .g-ora { color: var(--label-tertiary); font-variant-numeric: tabular-nums; min-width: 38px; padding: 9px 0; }
  .g-segno {
    display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
    margin-top: 8px;
    box-shadow: inset 0 0 0 1.5px var(--label-quaternary); color: transparent;
  }
  /* Nome e sotto-riga in una cella sola: sono la stessa cosa, e devono
     essere lo stesso bersaglio. Prima erano due celle su due righe della
     griglia, tenute insieme da un margine negativo. */
  .g-vai { grid-column: 3; display: flex; flex-direction: column; min-width: 0; padding: 7px 0; }
  .g-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .g-dentro { margin-top: 1px; }
  a.g-vai:active { opacity: 0.5; }
  .g-altre { display: block; padding: 2px 0 0 37px; text-align: left; }
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
  .s-corpo {
    display: flex; flex-direction: column; gap: 2px; color: inherit;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .s-corpo:active { opacity: 0.55; }
  .eti-oggi { color: var(--label-secondary); letter-spacing: 0.7px; text-transform: uppercase; }
  .soldi .male { color: var(--color-red); }
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
