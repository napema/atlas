<!--
  Finanze — cinque blocchi, un ordine fisso, nessuna frase.

  L'ordine è una gerarchia di decisioni, non un'estetica:

    OBIETTIVO    dove sto andando. Sta in cima perché è la cosa che rende
                 una spesa costosa: 105 € non sono 105 €, sono due terzi di
                 un versamento al fondo.
    OGGI         quanto posso spendere. È il numero che si guarda dieci
                 volte al giorno, e deve essere UNO.
    FUORI PIANO  cosa ho fatto fuori dal piano. Non è un rimprovero: è
                 l'unica voce su cui si può agire, perché è l'unica fatta
                 di decisioni e non di addebiti.
    IN ARRIVO    cosa ribalta la risposta di «oggi».
    POCKET       dove sono i soldi, e da quando il numero è affidabile.

  Quello che c'era prima e non c'è più: nove barre per categoria, «come
  spendi», il check di oggi, gli sforamenti come blocco a sé. Erano tutte
  cose vere che non cambiavano niente — si guardavano una volta e poi si
  scorreva oltre. Le categorie restano in Cicli e in Movimenti, che sono le
  schermate fatte per guardare indietro.

  Regola di scrittura: etichette e numeri. Niente testo generato, niente
  consigli. Al massimo una riga per blocco, e quella riga è un confronto fra
  due cifre.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Anello from "$lib/ui/Anello.svelte";
  import PianoTravasi from "./PianoTravasi.svelte";
  import { pianoTravasi } from "$condivisi/finanze/travasi.js";
  import { travasiPaga } from "$condivisi/finanze/paga.js";
  import { prossimoStipendio } from "$condivisi/finanze/calcolo.js";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale, oggiISO, daISO, GIORNI, MESI_BREVI } from "$lib/core/ui";
  import { stato, TIPI_POCKET } from "$condivisi/finanze/dati.js";
  import { nomePocket } from "./comune";
  import { cicloDi, importoEffettivo, pocketConSaldi } from "$condivisi/finanze/calcolo.js";
  import {
    quotaDi, quotaDomani, tiroObiettivo, passoObiettivo,
    fuoriPianoDelCiclo, ingPrevisto, inArrivoDiviso,
  } from "$condivisi/finanze/piano.js";
  import { allineamento } from "$condivisi/finanze/chiusura.js";
  import { apri } from "./fogli.svelte";

  /** `lato`: obiettivo e quota — la colonna sinistra sul PC. */
  let { parte }: { parte: "lato" | "resto" } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const ciclo = cicloDi(oggi);
    const pk = pocketConSaldi();
    const q = quotaDi(oggi);
    return {
      oggi, ciclo, pk, q,

      // Zero perché non è configurato non è zero perché hai finito i soldi:
      // senza un'ancora su un pocket il conto della quota non può partire.
      configurato: pk.some((p: any) => p.ancoraDa || p.saldo),

      obi: tiroObiettivo(oggi),
      passo: passoObiettivo(oggi),
      domani: quotaDomani(oggi),
      travasi: pianoTravasi(oggi),
      /* Quello che la lista del prossimo giorno di paga chiederà davvero di
         mettere sul fondo. La riga «cosa fare» dell'obiettivo dice QUESTA
         cifra e nessun'altra: se dicesse quella consigliata, il 23 la lista
         ne chiederebbe un'altra e le due schermate si smentirebbero. */
      versaProssimo: travasiPaga(prossimoStipendio(oggi)).righe.find((r: any) => r.id === "fondo")?.imp ?? 0,
      // Il nome vero del pocket («Fondo naso»): è quello che leggi su
      // Revolut e sulla riga del giorno di paga, e deve essere lo stesso.
      nomeFondo: ((stato().pockets || []) as any[]).find((p) => p.id === (tiroObiettivo(oggi)?.pocket || "fondo"))?.nome || "Fondo",
      fp: fuoriPianoDelCiclo(ciclo, oggi),
      ing: ingPrevisto(oggi),
      arrivo: inArrivoDiviso(14, oggi),
      all: allineamento(oggi),
      totale: pk.reduce((t: number, p: any) => t + p.saldoVero, 0),
    };
  });

  /** «ven 23». Il giorno della settimana serve: «23» da solo non si colloca. */
  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`;
  };
  /** «23 ott». */
  const gm = (iso: string) => {
    const x = daISO(iso);
    return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };
  /** «ven 23 ott», per le date lontane: senza il mese, «15» non dice nulla. */
  const glm = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };

  /** «1 ago 2027»: la data dell'obiettivo è lontana, l'anno serve. */
  const glma = (iso: string) => {
    const x = daISO(iso);
    return `${x.getDate()} ${MESI_BREVI[x.getMonth()]} ${x.getFullYear()}`;
  };

  const NOTA_POCKET: Record<string, string> = {
    principale: "spendibile", contanti: "in tasca", cassa: "parcheggio",
    fisse: "addebiti automatici", ing: "riserva", fondo: "obiettivo",
  };
</script>

{#if parte === "lato"}

<!-- 1. L'OBIETTIVO -------------------------------------------------------
     DUE RIGHE: COSA FARE, E SE BASTA.

     Il riquadro diceva il saldo, il traguardo, la stima, una barra, un
     verdetto, due leve («+64 € a stipendio / oppure 5 stipendi in più») e
     il prossimo versamento con due righe di spiegazione. Nove pezzi per una
     domanda sola — «cosa devo fare?» — e la risposta era il nono.

     Adesso la prima riga è L'AZIONE, con la sua data e la sua cifra: è
     quello che farai su Revolut. La seconda dice se basta, e quando non
     basta dice la cifra GIUSTA da versare — il totale, non il «+64»: un
     totale si scrive nel campo dell'importo, una differenza va prima
     sommata a mente. Le alternative (spostare la data, abbassare il
     traguardo) stanno nel foglio, a un tocco. -->
{#if d.obi}
  {@const giusto = d.obi.inPiu ? d.obi.versamento + d.obi.inPiu : d.obi.versamento}
  {@const prossimo = d.passo?.prossimo ?? d.obi.prossimo}
  <Sezione>
    <div class="blocco obi">
      <button type="button" class="obi-apri" onclick={() => apri({ tipo: "obiettivo" })}>
        <span class="testa">
          <span class="eti">{d.obi.nome.toUpperCase()}</span>
          <span class="eti-dx cifre">entro {glma(d.obi.data)}</span>
        </span>
        <span class="obi-riga">
          <span class="obi-cifre">
            <b class="cifre">{euro(d.obi.saldo, { tondo: true })}</b>
            <span class="secondario cifre">di {euro(d.obi.target, { tondo: true })}</span>
          </span>
          <Anello valore={d.obi.frazione} misura={40} spessore={6} />
        </span>
      </button>

      <!-- 1. COSA FARE. La cifra è quella che la lista del giorno di paga
           ti chiederà, non quella consigliata: le due coincidono solo se
           l'obiettivo è in linea, e se non coincidono la differenza la
           dice la riga sotto, con il modo di cambiarla. -->
      <div class="righe-obi">
      {#if d.passo?.tipo === "da-fare"}
        <button type="button" class="azione adesso" onclick={() => apri({ tipo: "paga", dataStip: d.passo!.dataStip })}>
          <span class="a-ico" aria-hidden="true"><Icona nome="freccia" misura={14} tratto={2.8} /></span>
          <span class="a-testo"><b>Adesso: {euro(d.passo.imp, { tondo: true })} sul fondo</b></span>
          <span class="a-coda" aria-hidden="true"><Icona nome="freccia" misura={14} tratto={2.4} /></span>
        </button>
      {:else if d.passo}
        <div class="azione">
          <span class="a-ico" aria-hidden="true">
            <Icona nome={d.passo.tipo === "fatto" ? "spunta" : "calendario"} misura={14} tratto={2.4} />
          </span>
          <span class="a-testo">
            {#if d.passo.tipo === "fatto"}
              <b>Fatto per questo ciclo</b>
              {#if d.passo.prossimo}<span class="secondario cifre"> · il prossimo {glm(d.passo.prossimo)}</span>{/if}
            {:else}
              <b class="cifre">{prossimo ? glm(prossimo) : "Al prossimo stipendio"}: {euro(d.versaProssimo, { tondo: true })} sul fondo</b>
            {/if}
          </span>
        </div>
      {/if}

      <!-- 2. BASTA? Verde se ci arrivi. Se no, la cifra che manca e la
           cifra giusta, e quella giusta è un BOTTONE: apre il foglio
           dell'obiettivo, dove il versamento si cambia — e da lì in poi la
           riga sopra e la lista del giorno di paga dicono la cifra nuova. -->
      {#if d.obi.versamento}
        {#if d.obi.cela}
          <div class="basta">
            <Icona nome="spunta" misura={14} tratto={2.8} />
            <span>Così ci arrivi{#if d.obi.avanzo > 0}<span class="secondario cifre">, con {euro(d.obi.avanzo, { tondo: true })} di margine</span>{/if}</span>
          </div>
        {:else}
          <div class="basta no">
            <Icona nome="avviso" misura={14} tratto={2.4} />
            <span class="cifre">Così arrivi a {euro(d.obi.proiezione, { tondo: true })}, non a {euro(d.obi.target, { tondo: true })}.</span>
          </div>
          {#if d.obi.inPiu}
            <button type="button" class="correggi" onclick={() => apri({ tipo: "obiettivo" })}>
              <span>Per arrivarci: <b class="cifre">{euro(giusto, { tondo: true })}</b> a stipendio</span>
              <Icona nome="freccia" misura={14} tratto={2.4} />
            </button>
          {/if}
        {/if}
      {/if}
      </div>
    </div>
  </Sezione>
{/if}

<!-- 2. OGGI --------------------------------------------------------------
     TRE LIVELLI, E BASTA.

     Era una carta da sette righe in quattro colori — il numero, «oltre la
     quota», la quota con la sua freccia, lo sforo, il divisibile, il piano,
     «in tasca... basta fino a...» — e chi non sapeva già di cosa parlava
     non ci capiva niente. Adesso:

       1. il numero: quanto puoi ancora spendere oggi. Rosso se sei oltre.
       2. l'anello: quanto della razione di oggi è andato. Si capisce senza
          leggere — pieno e rosso vuol dire sforato.
       3. tre caselle, tre parole: la razione, lo speso, e domani.

     Tutto il resto se n'è andato o è andato altrove. «In tasca, basta
     fino a» è la domanda dei travasi, e sta nella carta sotto. Il piano
     contro la razione sta nell'Analisi. «−1,91 € da ieri» non cambiava
     nessuna decisione. Il colore del numero dice UNA cosa: rosso, sei
     oltre. L'arancione per «quota sotto il piano» era una regola che non
     si vedeva, e faceva sembrare un allarme un numero tranquillo. -->
<Sezione>
  <div class="blocco oggi">
    {#if !d.configurato}
      <span class="testa"><span class="eti">OGGI</span></span>
      <span class="vuota cifre">—</span>
      <Pulsante variante="pieno" larga onclick={() => apri({ tipo: "pocket" })}>Imposta i saldi</Pulsante>
    {:else}
      {@const oltre = d.q.resta < 0}
      <span class="testa">
        <span class="eti">OGGI</span>
        <span class="eti-dx cifre">{plurale(d.q.giorni, "giorno", "giorni")} allo stipendio</span>
      </span>

      <div class="eroe">
        <Anello valore={d.q.quota > 0 ? d.q.speso / d.q.quota : d.q.speso > 0 ? 1 : 0}
          misura={64} spessore={9} colore={oltre ? "var(--color-red)" : "var(--accento)"} />
        <div class="eroe-testo">
          <Importo centesimi={d.q.resta} misura={44} tono={oltre ? "male" : ""} />
          <span class="stato" class:male={oltre}>{oltre ? "oltre la razione di oggi" : "puoi ancora spendere"}</span>
        </div>
      </div>

      <div class="caselle">
        <div class="casella">
          <span>Razione</span>
          <b class="cifre">{euro(d.q.quota)}</b>
        </div>
        <div class="casella">
          <span>Speso</span>
          <b class="cifre" class:male={oltre}>{euro(d.q.speso)}</b>
        </div>
        <!-- DOMANI risponde a «e adesso?» dopo uno sforo, e a «se mi fermo
             qui?» negli altri giorni. È la stessa razione che usa il piano
             dei travasi qui sotto: una cifra sola per la stessa domanda. -->
        <div class="casella">
          <span>{d.domani ? "Domani" : "Stipendio"}</span>
          <b class="cifre">{d.domani ? euro(d.domani.quota) : "domani"}</b>
        </div>
      </div>
    {/if}
  </div>
</Sezione>

<!-- 2bis. DA SPOSTARE ------------------------------------------------------
     La domanda della domenica sera, e di ogni giorno in cui il Principale
     non arriva a domenica. Il conto lo fa `pianoTravasi()`. -->
{#if d.configurato}
  <Sezione>
    <PianoTravasi piano={d.travasi} />
  </Sezione>
{/if}

<!-- La lista d'attesa accanto ai due gesti: è il terzo gesto, e arriva nello
     stesso momento — davanti a una cosa che costa. -->
<Sezione>
  <Riga titolo="Lista d'attesa" freccia onclick={() => apri({ tipo: "lista" })}>
    {#snippet inizio()}<span class="ico"><Icona nome="orologio" misura={17} tratto={2.1} /></span>{/snippet}
    {#snippet fine()}
      {@const n = (stato().lista || []).filter((v: any) => v && !v.del && (v.stato === "attesa" || !v.stato)).length}
      <span class="cifre secondario">{n || ""}</span>
    {/snippet}
  </Riga>
</Sezione>

{:else}

<!-- 3. FUORI PIANO ------------------------------------------------------- -->
<Sezione>
  <div class="blocco fp" data-tono={d.fp.n ? "male" : "ok"}>
    <span class="testa">
      <span class="eti">FUORI PIANO · QUESTO CICLO</span>
      <span class="eti-dx cifre">
        {#if d.fp.n}{d.fp.n} · {euro(d.fp.totale, { tondo: true })}{:else}0{/if}
      </span>
    </span>

    {#if !d.fp.n}
      <span class="zero cifre">{plurale(d.fp.giorniSenza, "giorno", "giorni")} senza fuori piano</span>
    {:else}
      <ul class="elenco">
        {#each d.fp.voci.slice(0, 5) as m (m.id)}
          <li>
            <button type="button" class="e-riga" onclick={() => apri({ tipo: "dettaglio", id: m.id })}>
              <span class="e-data cifre secondario">{gm(m.data)}</span>
              <span class="e-nome">{m.nota || "—"}</span>
              {#if m.daRiserva}<span class="tag">da ING</span>{/if}
              <span class="e-cifra cifre">{euro(importoEffettivo(m))}</span>
            <span class="e-chev" aria-hidden="true"><Icona nome="freccia" misura={13} tratto={2.4} /></span>
            </button>
          </li>
        {/each}
        {#if d.fp.voci.length > 5}
          <li class="piu text-footnote secondario">+{d.fp.voci.length - 5}</li>
        {/if}
      </ul>
      <span class="righe text-subheadline">
        {#if d.fp.pct != null}
          <!-- Il paragone è il punto: 209 € non vogliono dire niente, «un
               versamento e mezzo al fondo» vuol dire che l'obiettivo si è
               spostato. Ma «= 134% del versamento» cominciava con un uguale
               sospeso e chiedeva una divisione a mente. -->
          <span class="secondario cifre">
            {d.fp.pct >= 0.95
              ? `vale ${(Math.round(d.fp.pct * 10) / 10).toLocaleString("it-IT")} versamenti al fondo`
              : `vale ${Math.round(d.fp.pct * 100)}% di un versamento al fondo`}
          </span>
        {/if}
        {#if d.fp.ricariche.n}
          <span class="secondario cifre">ricariche da ING non pianificate: {d.fp.ricariche.n} · {euro(d.fp.ricariche.totale, { tondo: true })}</span>
        {/if}
      </span>
    {/if}
  </div>
</Sezione>

<!-- 4. IN ARRIVO --------------------------------------------------------- -->
<Sezione>
  <div class="blocco">
    <span class="testa">
      <span class="eti">IN ARRIVO · 14 GIORNI</span>
      {#if d.arrivo.prima.totale}<span class="eti-dx cifre">{euro(d.arrivo.prima.totale, { tondo: true })}</span>{/if}
    </span>

    <ul class="elenco">
      {#each d.arrivo.prima.voci as v (`${v.origine}:${v.id}:${v.quando}`)}
        {@const cop = (d.arrivo.prima.perPocket as any)[v.pocket || "principale"]}
        <li>
          <button type="button" class="e-riga" onclick={() => apri({ tipo: "arrivo", voce: v })}>
            <span class="e-data cifre secondario">{gg(v.quando)}</span>
            <span class="e-nome">{v.nome}</span>
            <span class="e-nota text-footnote" class:male={cop && !cop.coperto}>
              {nomePocket(v.pocket)}
              · {cop && !cop.coperto ? `manca ${euro(cop.scoperto, { tondo: true })}` : "coperto"}
            </span>
            <span class="e-cifra cifre">{euro(v.importo)}</span>
            <span class="e-chev" aria-hidden="true"><Icona nome="freccia" misura={13} tratto={2.4} /></span>
          </button>
        </li>
      {/each}

      <!-- LA RIGA DELLA PAGA, e tutto quello che sta sotto non ha allarmi:
           una bolletta del 9 novembre la paga lo stipendio del 23 ottobre, e
           segnalarla scoperta oggi è un allarme su un mese che torna. -->
      <li class="paga-li">
        <button type="button" class="paga" onclick={() => apri({ tipo: "paga", dataStip: d.arrivo.paga })}>
          <span class="cifre">{gg(d.arrivo.paga)}</span>
          <span>GIORNO DI PAGA</span>
          <span class="e-chev" aria-hidden="true"><Icona nome="freccia" misura={13} tratto={2.4} /></span>
        </button>
      </li>

      {#each d.arrivo.dopo as v (`${v.origine}:${v.id}:${v.quando}`)}
        <li class="dopo">
          <button type="button" class="e-riga" onclick={() => apri({ tipo: "arrivo", voce: v })}>
            <span class="e-data cifre secondario">{gg(v.quando)}</span>
            <span class="e-nome secondario">{v.nome}</span>
            <span class="e-cifra cifre secondario">{euro(v.importo)}</span>
            <span class="e-chev" aria-hidden="true"><Icona nome="freccia" misura={13} tratto={2.4} /></span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</Sezione>

<!-- 5. I POCKET ---------------------------------------------------------- -->
<Sezione>
  <div class="blocco">
    <span class="testa">
      <span class="eti">POCKET</span>
      <button type="button" class="eti-dx all" data-tono={d.all.vecchio ? "avviso" : ""} onclick={() => apri({ tipo: "chiusura" })}>
        {#if d.all.quando}allineato all'estratto: {gm(d.all.quando)}{:else}mai allineato{/if}
      </button>
    </span>

    <ul class="elenco pocket">
      {#each d.pk as p (p.id)}
        <li>
          <button type="button" class="e-riga" onclick={() => apri({ tipo: "pocket" })}>
            <span class="e-nome">{p.nome}</span>
            <span class="e-nota text-footnote secondario">{d.obi && p.id === d.obi.pocket ? `salvadanaio · ${d.obi.nome}` : NOTA_POCKET[p.id] ?? (TIPI_POCKET as any)[p.tipo]?.nome ?? ""}</span>
            <span class="e-cifra cifre" class:male={p.saldoVero < 0}>{euro(p.saldoVero)}</span>
            <span class="e-chev" aria-hidden="true"><Icona nome="freccia" misura={13} tratto={2.4} /></span>
          </button>
        </li>
      {/each}
    </ul>

    <!-- ING: il saldo non dice niente da solo. Il punto più basso dei
         prossimi dodici mesi è l'unico numero che risponde a «posso
         attingere». -->
    <span class="righe text-subheadline">
      <span class="cifre" class:avviso={d.ing.sotto}>
        <span class="secondario">ING minimo previsto</span>
        <b>{euro(d.ing.minimo, { tondo: true })}</b>
        <span class="secondario">· {glm(d.ing.quando)}</span>
      </span>
      <span class="secondario cifre">tutto insieme: {euro(d.totale, { tondo: true })}</span>
    </span>
  </div>
</Sezione>

{/if}

<style>
  /* Un blocco solo per tutti e cinque: testa con due etichette, corpo,
     righe di chiusura. La ripetizione è il punto — cinque blocchi che si
     leggono con lo stesso movimento degli occhi. */
  .blocco { display: flex; flex-direction: column; gap: 6px; padding: var(--space-4); width: 100%; text-align: left; }
  .testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti {
    font-size: var(--text-caption1); font-weight: var(--weight-semibold);
    letter-spacing: 0.7px; color: var(--label-secondary);
  }
  .eti-dx { font-size: var(--text-footnote); color: var(--label-secondary); }
  .all { font-size: var(--text-footnote); color: var(--label-secondary); }
  .all[data-tono="avviso"] { color: var(--color-orange); }

  .righe { display: flex; flex-direction: column; gap: 2px; }
  /* A 375 punti «177,30 € fino a gio 22 · 15 giorni» e «piano 17,83 €/g»
     non ci stanno sulla stessa riga: il primo andava a capo in mezzo, e
     «giorni» restava da solo sotto. Il primo non va a capo mai; quando non
     ci sta, e' il secondo a scendere, intero e allineato a destra. */
  .secondario { color: var(--label-secondary); }
  .male { color: var(--color-red); }
  .avviso { color: var(--color-orange); }

  /* --- obiettivo --- */
  /* La pressione la fa `.premibile` (app.css): la lastra cede di un
     filo e la luce si alza. Un `background` sull'elemento non si vedrebbe
     — il materiale gli sta davanti. */
  .obi-riga { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
  .obi-cifre { display: flex; align-items: baseline; gap: 6px; }

  /* Le due righe: l'azione e la verifica. Stessa forma — icona, testo —
     perché si leggono insieme, una sotto l'altra, come una lista di due. */
  .azione {
    display: flex; align-items: center; gap: var(--space-2); width: 100%;
    padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary);
    text-align: left; color: inherit; font-size: var(--text-subheadline);
  }
  .azione b { font-weight: var(--weight-semibold); }
  .azione.adesso { background: color-mix(in srgb, var(--accento) 16%, transparent); color: var(--accento); }
  .azione.adesso:active { opacity: 0.6; }
  .a-ico { display: grid; place-items: center; flex: none; color: var(--accento); }
  .a-testo { flex: 1; min-width: 0; }
  .a-coda { display: inline-flex; opacity: 0.6; }
  /* Le righe sotto la testata: stanno DENTRO il margine della carta. La
     testata è un bottone a tutta larghezza (si tocca per aprire il
     foglio), e le righe sotto ne ereditavano lo zero di padding — finivano
     contro il bordo, l'icona dell'avviso appoggiata allo spigolo. */
  .righe-obi { display: flex; flex-direction: column; gap: var(--space-2); padding: 0 var(--space-4) var(--space-4); }
  .basta { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--text-subheadline); color: var(--color-green); padding: 0 2px; }
  .correggi {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
    padding: 10px 12px; border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--color-orange) 15%, transparent); color: var(--color-orange);
    font-size: var(--text-subheadline); text-align: left;
  }
  .correggi span { color: var(--label-primary); }
  .correggi b { color: var(--color-orange); font-weight: var(--weight-semibold); }
  .correggi:active { opacity: 0.6; }
  .basta > span { color: var(--label-primary); }
  .basta.no { color: var(--color-orange); }
  .obi-cifre b { font-family: var(--font-display); font-size: 30px; line-height: 34px; font-weight: var(--weight-bold); }
  .obi { padding: 0; gap: 0; }
  .obi-apri { display: flex; flex-direction: column; gap: 6px; width: 100%; padding: var(--space-4); text-align: left; }
  .obi-apri:active { background: var(--fill-quaternary); }
  /* IL PROSSIMO PASSO. Separato dal resto da un filo, perché è un'altra
     cosa: sopra si guarda, qui si fa. «Da fare» prende l'accento del modulo
     — è un invito, non un allarme —, «fatto» il verde, l'attesa niente. */
  .tag {
    padding: 1px 6px; border-radius: var(--radius-sm); font-size: var(--text-caption2);
    font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.4px;
    color: var(--label-secondary); background: var(--fill-tertiary);
  }

  /* --- oggi --- */

  /* --- OGGI: il numero, l'anello, tre caselle --- */
  .eroe { display: flex; align-items: center; gap: var(--space-4); margin: var(--space-2) 0 var(--space-1); }
  .eroe-testo { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .stato { font-size: var(--text-subheadline); color: var(--label-secondary); }
  .stato.male { color: var(--color-red); font-weight: var(--weight-semibold); }
  .caselle { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); margin-top: var(--space-2); }
  .casella {
    display: flex; flex-direction: column; gap: 2px; min-width: 0;
    padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary);
  }
  .casella span { font-size: var(--text-caption1); font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .casella b { font-size: var(--text-headline); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .casella b.male { color: var(--color-red); }

  .vuota { font-family: var(--font-display); font-size: 46px; line-height: 52px; font-weight: var(--weight-bold); color: var(--label-tertiary); }

  .ico { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--fill-tertiary); color: var(--label-secondary); }

  /* --- gli elenchi: una griglia, non tre flex.

     Le cifre a destra incolonnate si confrontano con l'occhio; in tre flex
     ognuna finisce dove capita e per leggere la terza bisogna rileggere la
     prima. --- */
  .elenco { display: grid; grid-template-columns: auto 1fr auto auto; gap: 2px var(--space-3); margin-top: 2px; align-items: baseline; }
  /* `display: contents` e non `subgrid`: le celle delle righe devono stare
     sulla griglia del genitore, e questo lo fa su tutto quello che esiste. */
  .elenco li { display: contents; }

  /* UNA RIGA CHE SI APRE.

     Le righe erano `<span>` dentro un `<li>` senza scatola: si leggevano e
     basta, e davanti a una bolletta pagata stamattina non c'era niente da
     toccare. Ora ogni riga e' un bottone — il foglio che apre esisteva
     gia', non lo apriva nessuno.

     `subgrid` perche' servono tutte e due le cose: il bottone dev'essere
     una scatola vera (un'area di tocco non si fa con `display: contents`)
     e le sue celle devono restare sulle colonne dell'elenco, se no ogni
     riga incolonna per conto suo e le cifre a destra non si confrontano
     piu'.

     Il padding e' solo verticale: uno orizzontale sposterebbe le colonne
     della subgriglia rispetto a quelle di sopra, cioe' romperebbe proprio
     la cosa per cui `subgrid` e' li'. */
  .e-riga {
    grid-column: 1 / -1;
    display: grid; grid-template-columns: subgrid;
    align-items: baseline; gap: 2px var(--space-3);
    padding: 5px 0; margin: -5px 0;
    width: 100%; text-align: left; color: inherit;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .e-riga:active { opacity: 0.45; }
  /* Il chevron e' il motivo per cui la quarta colonna esiste: senza, una
     riga che si apre e una che non si apre hanno lo stesso aspetto. Spento,
     perche' sono tante. */
  .e-chev { align-self: center; color: var(--label-quaternary); display: inline-flex; }
  .e-data { font-size: var(--text-footnote); white-space: nowrap; }
  .e-nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-cifra { justify-self: end; font-variant-numeric: tabular-nums; font-weight: var(--weight-semibold); }
  /* La nota va a capo sotto il nome: è la parte che si legge una volta. */
  .e-nota { grid-column: 2 / 3; color: var(--label-secondary); }
  .elenco .tag { grid-column: 2 / 3; justify-self: start; }
  /* Queste due righe NON sono `display: contents`: hanno un bordo e un
     margine, e una scatola che non esiste non si può bordare. */
  .piu { display: block; grid-column: 1 / -1; }

  .pocket { grid-template-columns: 1fr auto auto; }
  .pocket .e-nota { grid-column: 1 / 2; }

  /* La riga del giorno di paga: è un separatore, non una voce — ma apre il
     foglio dei travasi, che è quello che quel giorno ti chiede. */
  .paga-li { display: contents; }
  .paga {
    display: flex; align-items: center; gap: var(--space-3); grid-column: 1 / -1;
    width: 100%; margin: 6px 0; padding-top: 7px; border-top: 0.5px solid var(--separator);
    color: var(--color-green); text-align: left;
    font-size: var(--text-footnote); font-weight: var(--weight-semibold); letter-spacing: 0.6px;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .paga .e-chev { margin-left: auto; color: color-mix(in srgb, var(--color-green) 55%, transparent); }
  .paga:active { opacity: 0.45; }
  .dopo .e-nome, .dopo .e-cifra { font-weight: var(--weight-regular); }

  /* --- fuori piano --- */
  .zero { font-family: var(--font-display); font-size: var(--text-title3); font-weight: var(--weight-semibold); color: var(--color-green); }
  .fp[data-tono="male"] .e-cifra { color: var(--color-red); }
</style>
