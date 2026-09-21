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
  import { avviso, centesimi, euro, nuovoId, oggiISO, plurale, tocco } from "$lib/core/ui";
  import {
    stato, TIPI, categoriaPerId, emojiCat, movimentiVivi, salvaMovimento, impara, normalizza,
    SOGLIE_PREDEFINITE, metteInSospeso,
  } from "$condivisi/finanze/dati.js";
  import { autoCategoria, settimana } from "$condivisi/finanze/calcolo.js";
  import { coloreCat, testoDa, pulisciImporto } from "./comune";

  let {
    aperto = $bindable(false),
    movimento = null,
    tipoIniziale = "out",
  }: { aperto: boolean; movimento?: any; tipoIniziale?: string } = $props();

  /* Da quale pocket parte e dove arriva, dato il tipo. UNA funzione sola per
     l'apertura e per il cambio di tipo: erano due posti, e hanno smesso di
     dire la stessa cosa — uno sforamento aperto dal pulsante rapido partiva
     da «Principale → niente» invece che da «ING → Principale». */
  function pocketPredefiniti(tipo: string) {
    if (tipo === "in") return { pocket: "ing", pocketTo: null };
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
  let fase = $state<"modulo" | "dormo">("modulo");
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
          data: oggiISO(), rimborsoDi: null, ...pocketPredefiniti(tipoIniziale) };
    testo = testoDa(b.imp);
    manuale = Boolean(movimento?.cat);
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

  function scrivi(imp: number, ecc: boolean) {
    salvaMovimento({ ...$state.snapshot(b), imp, ecc: b.tipo === "out" ? ecc : false });
    // Si impara solo da una scelta esplicita: memorizzare quello che ha
    // indovinato l'app la farebbe convergere sui propri errori.
    if (manuale && b.nota && b.cat) impara(b.nota, b.cat, b.sub);
    tocco(12);
    aperto = false;
    avviso(nuovo ? "Registrato." : "Aggiornato.");
  }

  /* FRIZIONE SULLE SPESE GROSSE. Sopra la soglia si passa da una domanda:
     le uscite sopra i 50 € sono cinque in due mesi e pesano più di tutte le
     colazioni sommate, quindi è lì che tre secondi valgono qualcosa. */
  function salva(ecc: boolean) {
    const imp = centesimi(testo);
    if (!imp) { avviso("Manca l'importo.", { tipo: "errore" }); return; }
    if (b.tipo === "out" && !b.cat) { avviso("Manca la categoria.", { tipo: "errore" }); return; }
    const soglia = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) }.spesaGrossa;
    if (nuovo && b.tipo === "out" && imp >= soglia) { inAttesa = { imp, ecc }; fase = "dormo"; return; }
    scrivi(imp, ecc);
  }

  const dormo = $derived.by(() => {
    if (!inAttesa) return null;
    const s = settimana();
    const sett = s.budget > 0 ? inAttesa.imp / s.budget : 0;
    return {
      s,
      quanto: sett >= 0.9 ? `Sono ${sett.toFixed(1).replace(".", ",")} settimane di budget.` : `Sono il ${Math.round((inAttesa.imp / Math.max(1, s.budget)) * 100)}% del budget della settimana.`,
    };
  });

  function ciDormoSu() {
    if (!inAttesa) return;
    metteInSospeso({ ...$state.snapshot(b), imp: inAttesa.imp, id: nuovoId("p") });
    aperto = false;
    avviso("Messa in sospeso. La ritrovi nel Riepilogo.");
  }
</script>

<Foglio bind:aperto titolo={fase === "dormo" ? "Un momento" : nuovo ? "Nuovo movimento" : "Modifica"}>
  {#if fase === "dormo" && inAttesa && dormo}
    <div class="dormo">
      <Importo centesimi={inAttesa.imp} misura={48} />
      <p class="text-title3">{dormo.quanto}</p>
      {#if dormo.s.resta > 0}
        <p class="text-subheadline secondario">Dopo questa ne restano {euro(dormo.s.resta - inAttesa.imp)} per {plurale(dormo.s.giorniRimasti, "giorno", "giorni")}.</p>
      {/if}
      <p class="text-footnote secondario">«Ci dormo su» non annulla: la mette in sospeso. Dopo ventiquattro ore la puoi registrare; se la ignori, decade da sola dopo sette giorni.</p>
    </div>
    <div class="due">
      <Pulsante variante="grigio" larga onclick={ciDormoSu}>Ci dormo su</Pulsante>
      <Pulsante variante="pieno" larga onclick={() => inAttesa && scrivi(inAttesa.imp, inAttesa.ecc)}>Registra</Pulsante>
    </div>
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
  .dormo { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-4) 0; }
</style>
