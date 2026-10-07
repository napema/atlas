<!--
  Nuovo movimento, o modifica. È il foglio che si apre dieci volte al
  giorno, quindi è quello che deve costare meno gesti: importo, nota, e la
  categoria si propone da sé mentre scrivi.

  L'importo si scrive in due modi. Su iPhone il tastierino disegnato è più
  veloce della tastiera di sistema e non fa saltare la vista; su un PC si
  scrive «46,50» sulla tastiera vera in mezzo secondo, e il tastierino si
  fa da parte.
-->
<script lang="ts">
  import { untrack } from "svelte";
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Tastierino from "$lib/ui/Tastierino.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import { avviso, centesimi, euro, nuovoId, oggiISO, tocco } from "$lib/core/ui";
  import {
    stato, TIPI, categoriaPerId, emojiCat, movimentiVivi, salvaMovimento, impara, normalizza,
    SOGLIE_PREDEFINITE, vociLista, statoVoce, cambiaStatoVoce, salvaVoce,
  } from "$condivisi/finanze/dati.js";
  import { autoCategoria } from "$condivisi/finanze/calcolo.js";
  import { quotaDi } from "$condivisi/finanze/piano.js";
  import { coloreCat, testoDa, pulisciImporto } from "./comune";
  import { apri } from "./fogli.svelte";

  let {
    aperto = $bindable(false),
    movimento = null,
    tipoIniziale = "out",
    preset = null,
    dopo = null,
  }: { aperto: boolean; movimento?: any; tipoIniziale?: string; preset?: any; dopo?: any } = $props();

  /* Da quale pocket parte e dove arriva, dato il tipo. UNA funzione sola per
     l'apertura e per il cambio di tipo: erano due posti, e hanno smesso di
     dire la stessa cosa — uno sforamento aperto dal pulsante rapido partiva
     da «Principale → niente» invece che da «ING → Principale». */
  function pocketPredefiniti(tipo: string) {
    /* UN'ENTRATA ARRIVA SUL PRINCIPALE. Era ING, e per lo stipendio era
       falso: arriva su Revolut, e i quattro travasi del giorno di paga
       partono da lì. Con ING come destinazione il Principale non si
       muoveva e la checklist travasava soldi che non c'erano. */
    if (tipo === "in") return { pocket: "principale", pocketTo: null };
    if (tipo === "extra") return { pocket: "ing", pocketTo: "principale" };
    if (tipo === "giro") return { pocket: "cassa", pocketTo: "principale" };
    return { pocket: "principale", pocketTo: null };
  }

  const SEGNAPOSTO: Record<string, string> = {
    out: "Cosa hai pagato?", in: "Da dove arriva?", rimb: "Chi ti ha rimborsato?",
    reso: "Cosa hai reso?", giro: "Da quale a quale pocket?", extra: "Da quale carta?",
  };

  let b = $state<any>({});
  let testo = $state("");
  let nuovo = $state(true);
  let manuale = $state(false);      // la categoria l'ha scelta l'utente
  let auto = $state(false);         // la categoria l'ha proposta l'app
  let fase = $state<"modulo" | "lista">("modulo");
  let inAttesa = $state<{ imp: number; ecc: boolean } | null>(null);

  // La bozza nasce all'apertura.
  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    nuovo = !movimento;
    b = movimento
      ? { ...movimento }
      : { id: nuovoId("m"), tipo: tipoIniziale, imp: 0, nota: "", cat: null, sub: null, rif: null, ecc: false,
          data: oggiISO(), rimborsoDi: null, ...pocketPredefiniti(tipoIniziale), ...(preset || {}) };
    testo = testoDa(b.imp);
    // Una categoria che arriva dal preset l'ha scelta lui nel simulatore:
    // vale come scelta a mano, altrimenti l'automatismo la riscriverebbe
    // appena scrive la nota.
    manuale = Boolean(movimento?.cat || preset?.cat);
    auto = false;
    fase = "modulo";
  });

  const daTastiera = typeof matchMedia !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cat = $derived(b.cat ? categoriaPerId(b.cat) : null);
  const pockets = $derived(((stato().pockets || []) as any[]).map((p) => ({ id: p.id, testo: p.nome })));
  const doppio = $derived(b.tipo === "giro" || b.tipo === "extra");
  const recenti = $derived(
    b.tipo === "rimb" || b.tipo === "reso"
      ? (movimentiVivi() as any[]).filter((m) => m.tipo === "out")
          .sort((a, c) => c.data.localeCompare(a.data) || (c.ts || 0) - (a.ts || 0)).slice(0, 12)
      : [],
  );

  /* LO SCHERMO NON PUÒ MOSTRARE UNA SCELTA CHE NEI DATI NON C'È. Il valore
     di ripiego della destinazione si SCRIVE nella bozza, non si mostra
     soltanto: il 16 e il 18 settembre sono spariti così 22 e 60 euro, con
     una pillola accesa che nei dati non era scritta. */
  $effect(() => {
    if (!doppio) return;
    if (!b.pocket) b.pocket = "principale";
    if (!b.pocketTo || b.pocketTo === b.pocket) {
      const dest = pockets.filter((p) => p.id !== b.pocket);
      b.pocketTo = dest.some((p) => p.id === "principale") ? "principale" : dest[0]?.id ?? null;
    }
  });

  const valido = $derived.by(() => {
    if (centesimi(testo) === null) return false;
    if (b.tipo !== "giro" && b.tipo !== "extra" && !String(b.nota || "").trim()) return false;
    if (b.tipo === "out" && !b.cat) return false;
    // Un travaso ha DUE estremi o non è un travaso.
    if (doppio && (!b.pocket || !b.pocketTo || b.pocket === b.pocketTo)) return false;
    return Boolean(b.data);
  });

  function cambiaTipo(t: string) {
    b = { ...b, tipo: t, cat: null, sub: null, rif: null, ...pocketPredefiniti(t) };
    auto = false; manuale = false;
  }

  // La proposta si aggiorna finché l'utente non ha scelto a mano: cambiare
  // una scelta esplicita mentre continua a scrivere è il modo più veloce
  // per far odiare l'autocategorizzazione.
  function suNota() {
    if (b.tipo !== "out" || !nuovo || manuale) return;
    const g = autoCategoria(b.nota, { normalizza, categoriaPerId });
    if (g && (g.cat !== b.cat || g.sub !== b.sub)) { b.cat = g.cat; b.sub = g.sub; auto = true; }
    else if (!g && auto) { b.cat = null; b.sub = null; auto = false; }
  }

  // A ogni lettera della nota, la proposta si rifà.
  $effect(() => { b.nota; untrack(suNota); });

  function scegliCat(id: string) {
    b.cat = id; b.sub = null; auto = false; manuale = true; tocco(6);
  }

  function scrivi(imp: number, ecc: boolean, extra: any = {}) {
    salvaMovimento({ ...$state.snapshot(b), ...extra, imp, ecc: b.tipo === "out" ? ecc : false });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (manuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    tocco(12);
    aperto = false;
    avviso(nuovo ? "Registrato." : "Aggiornato.");
    /* IL GIORNO DI PAGA. Lo stipendio arriva tutto sul Principale e per
       mezza giornata il conto dice duemila euro: e' il momento piu'
       pericoloso del mese, perche' ogni spesa fatta in quelle ore sembra
       gratis e i soldi delle bollette sono ancora li' in mezzo. La
       checklist si apre subito, non si va a cercare. */
    if (b.tipo === "in" && b.stip) {
      apri({ tipo: "paga", dataStip: b.data, entrata: imp });
      return;
    }
    /* IL PASSO DOPO. Una spesa dalla riserva sono DUE movimenti: la
       ricarica fuori budget che porta i soldi da ING al Principale, e
       l'uscita. Uno solo non basta — e non per pignoleria contabile: i
       pocket esterni li muovono soltanto `giro` ed `extra`, quindi
       un'uscita marcata «ING» lascia la riserva dov'era. Il simulatore
       avrebbe promesso un calo che non succedeva. */
    if (dopo) apri(dopo);
  }

  /* UNA DOMANDA SOLA: «Era in lista?».
     
     Sopra soglia, non alimentare, non legata a un ricorrente. Prima erano
     due frizioni diverse — «ci dormo su» qui e il simulatore «posso
     permettermelo?» altrove — e nessuna delle due teneva il conto di
     niente: la prima metteva la spesa in un limbo che scadeva da solo, la
     seconda dava un verdetto e poi lasciava comprare comunque.
     
     Adesso c'e' una lista, e la lista e' il piano: se la cosa era in lista
     da ventiquattro ore l'hai decisa a freddo e non e' uno strappo. Se non
     c'era, e' uno strappo, e lo si registra come tale invece di
     dimenticarlo. */
  const deveChiedere = $derived.by(() => {
    if (!nuovo || b.tipo !== "out") return false;
    if (b.pian || b.lista) return false;
    if (b.cat === "spesa") return false;
    const imp = centesimi(testo) || 0;
    return imp >= ({ ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) }.fuoriPiano || 0);
  });

  function salva(ecc: boolean) {
    const imp = centesimi(testo);
    if (!imp) { avviso("Manca l'importo.", { tipo: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tipo: "errore" }); return; }
    if (deveChiedere) { inAttesa = { imp, ecc }; fase = "lista"; return; }
    scrivi(imp, ecc);
  }

  /* Le voci della lista che potrebbero essere questa spesa: sbloccate, e
     con un prezzo che ci somiglia. Mostrare tutta la lista vorrebbe dire
     far scegliere fra cose che non c'entrano, e la scelta sbagliata qui
     marca «in piano» uno strappo vero. */
  const candidate = $derived.by(() => {
    const imp = inAttesa?.imp ?? centesimi(testo) ?? 0;
    const adesso = Date.now();
    return (vociLista() as any[])
      .map((v) => ({ ...v, vista: statoVoce(v, adesso) }))
      .filter((v) => v.vista === "attesa" || v.vista === "sbloccata")
      .sort((a, c) => Math.abs((a.imp || 0) - imp) - Math.abs((c.imp || 0) - imp));
  });

  const quanto = $derived.by(() => {
    const imp = inAttesa?.imp ?? 0;
    const q = quotaDi();
    return {
      q,
      // Quanti giorni di quota: e' il cambio che rende leggibile la cifra.
      giorni: q.quota > 0 ? imp / q.quota : 0,
    };
  });

  /** Era in lista: la voce diventa «comprata» e la spesa resta nel piano. */
  function daLista(v: any) {
    if (!inAttesa) return;
    cambiaStatoVoce(v.id, "comprata");
    scrivi(inAttesa.imp, inAttesa.ecc, { lista: v.id, fuoriPiano: false });
  }

  /** Non era in lista: si registra, e si registra come strappo. */
  function fuoriDalPiano() {
    if (!inAttesa) return;
    scrivi(inAttesa.imp, inAttesa.ecc, { fuoriPiano: true });
  }

  /** Nemmeno adesso: finisce in lista e si decide domani. */
  function mettiInLista() {
    const imp = inAttesa?.imp ?? 0;
    salvaVoce({ id: nuovoId("w"), nome: String(b.nota || "").trim() || "Spesa", imp });
    aperto = false;
    avviso("In lista. Sbloccata fra 24 ore.");
  }
</script>

<Foglio bind:aperto titolo={fase === "lista" ? "Era in lista?" : nuovo ? "Nuovo movimento" : "Modifica"}>
  {#if fase === "lista" && inAttesa}
    <div class="dormo">
      <Importo centesimi={inAttesa.imp} misura={48} />
      <p class="text-subheadline secondario cifre">
        {quanto.giorni >= 1
          ? `${quanto.giorni.toFixed(1).replace(".", ",")} giorni di quota`
          : `il ${Math.round(quanto.giorni * 100)}% della quota di oggi`}
        · quota {euro(quanto.q.quota)}/g
      </p>
    </div>

    {#if candidate.length}
      <Sezione titolo="Dalla lista" piede="Una voce in lista da almeno ventiquattro ore è il piano, non uno strappo: la spesa resta dentro.">
        {#each candidate as v (v.id)}
          <button type="button" class="candidata" onclick={() => daLista(v)}>
            <span class="c-nome">{v.nome}</span>
            <span class="cifre">{euro(v.imp)}</span>
            <span class="c-stato" data-stato={v.vista}>{v.vista === "sbloccata" ? "sbloccata" : "in attesa"}</span>
          </button>
        {/each}
      </Sezione>
    {/if}

    <div class="due">
      <Pulsante variante="grigio" larga onclick={mettiInLista}>Mettila in lista</Pulsante>
      <Pulsante variante="pieno" larga onclick={fuoriDalPiano}>No, registra</Pulsante>
    </div>
    <p class="text-footnote secondario nota">«No, registra» la segna fuori piano. Non è un rimprovero: è l'unica voce su cui si può fare qualcosa, e per farci qualcosa deve essere contata.</p>
    <Pulsante variante="testo" larga onclick={() => (fase = "modulo")}>Torna indietro</Pulsante>
  {:else if b.tipo}
    <div class="tipi">
      <Pillole
        opzioni={Object.entries(TIPI as Record<string, { nome: string }>).map(([k, t]) => ({ id: k, testo: t.nome }))}
        scelte={[b.tipo]}
        oncambio={(v) => cambiaTipo(v[0])}
        etichetta="Tipo"
      />
    </div>

    <label class="importo" class:vuoto={!testo} class:entrata={["in", "rimb", "reso"].includes(b.tipo)} class:uscita={["out", "extra"].includes(b.tipo)}>
      <input
        type="text"
        inputmode="decimal"
        aria-label="Importo"
        placeholder="0,00"
        readonly={!daTastiera}
        value={testo}
        oninput={(e) => { const v = pulisciImporto(e.currentTarget.value); testo = v; e.currentTarget.value = v; }}
        onkeydown={(e) => { if (e.key === "Enter" && valido) { e.preventDefault(); salva(false); } }}
      />
      <span class="euro">€</span>
    </label>
    <Tastierino bind:valore={testo} />

    <Sezione>
      <Campo etichetta="Nota" bind:valore={b.nota} segnaposto={SEGNAPOSTO[b.tipo]} />
    </Sezione>

    {#if b.tipo === "out"}
      <Sezione titolo="Categoria" piede={auto ? "Assegnata in automatico dalla nota: toccane un'altra per cambiarla." : undefined}>
        <div class="categorie">
          {#each stato().cats as c (c.id)}
            <button type="button" class="cat" class:scelta={b.cat === c.id} style:--tinta={coloreCat(c.id)} aria-pressed={b.cat === c.id} onclick={() => scegliCat(c.id)}>
              <span class="emoji">{emojiCat(c.id)}</span>
              <span class="text-caption1">{c.nome}</span>
            </button>
          {/each}
        </div>
      </Sezione>
      {#if cat?.sub?.length}
        <Sezione titolo="Sottocategoria">
          <div class="blocco">
            <Pillole opzioni={cat.sub.map((s: string) => ({ id: s, testo: s }))} scelte={b.sub ? [b.sub] : []} oncambio={(v) => { b.sub = v[0] === b.sub ? null : v[0]; manuale = true; }} etichetta="Sottocategoria" />
          </div>
        </Sezione>
      {/if}
    {/if}

    {#if b.tipo === "rimb" || b.tipo === "reso"}
      <Sezione titolo="Aggancia alla spesa" piede="Senza aggancio il rimborso abbassa il totale ma non si sa da quale spesa venga.">
        <div class="blocco">
          {#if recenti.length}
            <Pillole opzioni={recenti.map((m) => ({ id: m.id, testo: `${m.nota} · ${euro(m.imp)}` }))} scelte={b.rif ? [b.rif] : []} oncambio={(v) => (b.rif = v[0] === b.rif ? null : v[0])} />
          {:else}
            <p class="text-subheadline secondario">Nessuna spesa recente da agganciare.</p>
          {/if}
        </div>
      </Sezione>
    {/if}

    <!-- Da quale pocket: un tocco, non un menu nascosto. -->
    <Sezione titolo={doppio ? "Da quale pocket esce" : b.tipo === "in" ? "Su quale pocket entra" : "Da quale pocket"}>
      <div class="blocco"><Pillole opzioni={pockets} scelte={[b.pocket]} oncambio={(v) => (b.pocket = v[0])} /></div>
    </Sezione>
    {#if doppio}
      <Sezione titolo="E su quale entra">
        <div class="blocco"><Pillole opzioni={pockets.filter((p) => p.id !== b.pocket)} scelte={b.pocketTo ? [b.pocketTo] : []} oncambio={(v) => (b.pocketTo = v[0])} /></div>
      </Sezione>
    {/if}

    <Sezione>
      <Campo etichetta="Data" tipo="date" bind:valore={b.data} />
    </Sezione>

    <!-- LO STIPENDIO È UN'ENTRATA CHE APRE UNA PROCEDURA. Marcarlo serve a
         due cose: fa partire la checklist dei quattro travasi, e dà al ciclo
         la data VERA — se la banca ha pagato il 24, il ciclo parte il 24. -->
    {#if b.tipo === "in"}
      <Sezione>
        <button type="button" class="stip" class:acceso={Boolean(b.stip)} aria-pressed={Boolean(b.stip)}
          onclick={() => { b.stip = !b.stip; tocco(6); }}>
          <span>È lo stipendio</span>
          <span class="text-footnote secondario">
            {b.stip ? "Alla conferma si apre la checklist dei quattro travasi." : "Il ciclo parte da questa data."}
          </span>
        </button>
      </Sezione>
    {/if}

    <!-- Ordinaria o straordinaria è la domanda che tiene in piedi tutto il
         calcolo: si chiede al salvataggio invece di nasconderla in una
         casella che nessuno spunta. -->
    {#if b.tipo === "out"}
      <div class="due">
        <Pulsante variante="pieno" larga disabled={!valido} onclick={() => salva(false)}>Ordinaria</Pulsante>
        <Pulsante variante="tinto" larga disabled={!valido} onclick={() => salva(true)}>Straordinaria</Pulsante>
      </div>
      <p class="text-footnote secondario nota">Ordinaria: capita spesso, conta nel budget. Straordinaria: una volta tanto, fuori dal budget.</p>
    {:else}
      <Pulsante variante="pieno" larga disabled={!valido} onclick={() => salva(false)}>Salva</Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .tipi { overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--space-4)); padding: 0 var(--space-4); }
  .tipi :global(.pillole) { flex-wrap: nowrap; }
  .tipi :global(button) { flex: none; }
  .importo { display: flex; align-items: baseline; justify-content: center; gap: 6px; padding: var(--space-2) 0; }
  .importo input {
    width: 100%; max-width: 280px; text-align: right; background: none; outline: none;
    font-family: var(--font-display); font-size: 56px; line-height: 64px; font-weight: var(--weight-bold);
    letter-spacing: -1px; font-variant-numeric: tabular-nums; caret-color: var(--accento);
  }
  .importo input::placeholder { color: var(--label-tertiary); }
  /* La cifra prende il colore della direzione: rossa se esce, verde se entra. */
  .importo.uscita input { color: var(--color-red); }
  .importo.entrata input { color: var(--color-green); }
  .euro { font-family: var(--font-display); font-size: 32px; font-weight: var(--weight-semibold); color: var(--label-secondary); flex: 1; }
  .categorie { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); padding: var(--space-3); }
  .cat {
    display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px;
    border-radius: var(--radius-lg); background: var(--fill-quaternary); font-size: 22px;
    transition: background-color var(--duration-fast), box-shadow var(--duration-fast), transform var(--duration-fast) var(--ease-spring);
  }
  .cat:active { transform: scale(0.95); }
  .cat.scelta { background: color-mix(in srgb, var(--tinta) 22%, transparent); box-shadow: inset 0 0 0 2px var(--tinta); }
  .blocco { padding: var(--space-3) var(--space-4); }
  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
  .nota { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-4)); }
  .dormo { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-2); padding: var(--space-4) 0; }
  .candidata { position: relative; display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: 11px var(--space-4); text-align: left; }
  .candidata + .candidata::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .candidata:active { background: var(--fill-quaternary); }
  .c-nome { flex: 1; min-width: 0; }
  .c-stato { flex: none; padding: 2px 7px; border-radius: var(--radius-full); font-size: var(--text-caption2); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.4px; color: var(--label-secondary); background: var(--fill-tertiary); }
  .c-stato[data-stato="sbloccata"] { color: var(--color-green); background: color-mix(in srgb, var(--color-green) 14%, transparent); }
  .stip { display: flex; flex-direction: column; gap: 1px; width: 100%; padding: var(--space-3) var(--space-4); text-align: left; }
  .stip.acceso { color: var(--accento); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accento) 40%, transparent); border-radius: var(--radius-xl); }
</style>
