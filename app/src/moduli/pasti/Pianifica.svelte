<!--
  La pianificazione della settimana, un giorno per schermata.

  È la cosa che l'utente fa la domenica pomeriggio, e prima la faceva a
  mente: apri il frigo, decidi, e giovedì non te lo ricordi più. Quindi non
  è una schermata di impostazioni — è un percorso, come un onboarding: una
  domanda per volta, avanti e indietro, e alla fine una settimana che esiste.

  DUE SCELTE CHE REGGONO IL RESTO.

  Si SALVA MENTRE VAI, non alla fine. Sette giorni sono cinque minuti, e
  cinque minuti sono abbastanza perché arrivi una telefonata: un percorso
  che butta via tutto se esci a metà lo fai una volta sola. Chiudendo al
  terzo giorno, i primi tre restano fatti.

  C'è «COME IERI». È la scorciatoia che conta davvero: chi mangia così mangia
  per abitudini, e riscegliere da zero il pollo e il riso sette volte è il
  modo più sicuro di far abbandonare il percorso al quarto giorno.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import SceltaComponenti from "./SceltaComponenti.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { vaiA } from "$lib/core/router.svelte";
  import { avviso, dataUmana, maiuscola, tocco, GIORNI, daISO } from "$lib/core/ui";
  import {
    FASCE, ID_FASCE, regimeDi, lunediDi, pianoSettimana, vociPiano, scegliVoci, confermaPiano, pasto,
  } from "$condivisi/pasti/dati.js";
  import { bersagli } from "$condivisi/pasti/calcolo.js";
  import { assicuraPiano } from "$condivisi/pasti/piano.js";
  import { EMOJI_FASCIA, MACRO, kcal } from "./comune";

  let { giorni, onfine }: { giorni: string[]; onfine?: () => void } = $props();

  const lunedi = $derived(lunediDi(giorni[0]));
  const b = $derived.by(() => { dati.versione; return bersagli(); });

  /* Il passo: -1 è l'ingresso, 0..n-1 i giorni, n il riepilogo. L'ingresso
     esiste perché aprire un percorso di sette schermate senza dire quante
     sono è il modo più veloce per farlo chiudere. */
  let passo = $state(-1);
  let aperta = $state<string | null>(null);

  const iso = $derived(passo >= 0 && passo < giorni.length ? giorni[passo] : null);

  /* Le fasce da riempire per questo giorno: solo quelle a casa. Il pranzo in
     mensa non si pianifica, è già dichiarato nel profilo. */
  const fasceDelGiorno = $derived.by(() => {
    dati.versione;
    if (!iso) return [];
    return FASCE.filter((f: any) => regimeDi(iso, f.id) === "casa");
  });

  // La bozza del giorno, presa dal piano e riscritta quando esci dal giorno.
  let bozza = $state<Record<string, string[]>>({});
  let giornoInBozza = $state<string | null>(null);

  $effect(() => {
    if (!iso || giornoInBozza === iso) return;
    const piano = pianoSettimana(lunedi);
    const nuova: Record<string, string[]> = {};
    for (const f of ID_FASCE as string[]) nuova[f] = vociPiano(piano, iso, f);
    bozza = nuova;
    giornoInBozza = iso;
    // La prima fascia ancora vuota si apre da sola: è quella su cui devi
    // lavorare, e farla aprire a mano è un tocco chiesto per niente.
    aperta = FASCE.find((f: any) => regimeDi(iso, f.id) === "casa" && !nuova[f.id]?.length)?.id ?? null;
  });

  function salvaGiorno() {
    if (!iso) return;
    for (const f of ID_FASCE as string[]) {
      const prima = vociPiano(pianoSettimana(lunedi), iso, f);
      const adesso = bozza[f] || [];
      if (prima.join("|") !== adesso.join("|")) scegliVoci(lunedi, iso, f, adesso);
    }
  }

  function vai(delta: number) {
    salvaGiorno();
    tocco(8);
    passo = Math.max(-1, Math.min(giorni.length, passo + delta));
    aperta = null;
    window.scrollTo(0, 0);
  }

  /** Copia le scelte del giorno precedente di questo percorso. */
  function comeIeri() {
    const prima = giorni[passo - 1];
    if (!prima) return;
    const piano = pianoSettimana(lunedi);
    const nuova: Record<string, string[]> = { ...bozza };
    for (const f of fasceDelGiorno as any[]) nuova[f.id] = vociPiano(piano, prima, f.id);
    bozza = nuova;
    tocco(12);
  }

  /** Il generatore riempie i buchi, tu correggi. */
  function riempiTu() {
    const esito = assicuraPiano(lunedi, { forza: true });
    giornoInBozza = null;      // la bozza si rilegge dal piano nuovo
    avviso(esito.creato ? "Riempita. Ora correggi quello che non ti va." : `Non fatto: ${esito.motivo}.`,
      { tipo: esito.creato ? "info" : "errore" });
  }

  const totale = $derived.by(() => {
    dati.versione;
    const voci = Object.values(bozza).flat().map((id) => pasto(id)).filter(Boolean) as any[];
    return voci.reduce((t, v) => ({ kcal: t.kcal + v.kcal, p: t.p + v.p, c: t.c + v.c, g: t.g + v.g }),
      { kcal: 0, p: 0, c: 0, g: 0 });
  });

  const riassunto = $derived.by(() => {
    dati.versione;
    const piano = pianoSettimana(lunedi);
    return giorni.map((g, i) => {
      const fasce = (FASCE as any[]).filter((f) => regimeDi(g, f.id) === "casa");
      const voci = fasce.flatMap((f) => vociPiano(piano, g, f.id)).map((id) => pasto(id)).filter(Boolean) as any[];
      const vuote = fasce.filter((f) => !vociPiano(piano, g, f.id).length).length;
      return {
        iso: g, indice: i,
        nome: maiuscola(GIORNI[(daISO(g).getDay() + 6) % 7]),
        data: dataUmana(g),
        kcal: voci.reduce((t, v) => t + v.kcal, 0),
        p: voci.reduce((t, v) => t + v.p, 0),
        vuote,
      };
    });
  });

  const mancanti = $derived(riassunto.reduce((t, r) => t + r.vuote, 0));

  function chiudi() {
    salvaGiorno();
    if (onfine) onfine(); else vaiA("pasti");
  }

  function conferma() {
    salvaGiorno();
    confermaPiano(lunedi);
    avviso("Settimana pianificata.");
    chiudi();
  }

  /* «Mercoledì oggi» no. Quando la data ha un nome proprio quello basta, e
     il giorno della settimana lo dice già lui. */
  const nomeGiorno = $derived.by(() => {
    if (!iso) return "";
    const umana = dataUmana(iso);
    if (["oggi", "ieri", "domani"].includes(umana)) return maiuscola(umana);
    const settimana = maiuscola(GIORNI[(daISO(iso).getDay() + 6) % 7]);
    return `${settimana} ${daISO(iso).getDate()}`;
  });
  const riassuntoFascia = (f: string) =>
    (bozza[f] || []).map((id) => pasto(id)?.nome).filter(Boolean).join(" + ");
  const contoFascia = (f: string) =>
    (bozza[f] || []).map((id) => pasto(id)).filter(Boolean).reduce((t: number, v: any) => t + v.kcal, 0);
</script>

<Pagina
  titolo={passo < 0 ? "Pianifica" : passo >= giorni.length ? "Ci siamo" : nomeGiorno}
  sopra={passo < 0 || passo >= giorni.length ? undefined : `Giorno ${passo + 1} di ${giorni.length}`}
  indietro={{ etichetta: "Pasti", fai: chiudi }}
>
  {#snippet strumenti()}
    {#if passo >= 0}
      <div class="avanzamento" aria-label="Avanzamento">
        {#each giorni as g, i (g)}<span class="tacca" class:fatta={i <= passo}></span>{/each}
      </div>
    {/if}
  {/snippet}

  {#if passo < 0}
    <!-- ------------------------------------------------------- l'ingresso -->
    <Sezione>
      <div class="intro">
        <span class="emo-grande">{"\u{1F4C5}"}</span>
        <h2 class="text-title2">
          {giorni.length === 7 ? "La settimana che viene" : `I prossimi ${giorni.length} giorni`}
        </h2>
        <p class="text-body secondario">
          Da {dataUmana(giorni[0])} a {dataUmana(giorni[giorni.length - 1])}. Un giorno per schermata: tocchi
          quello che c'è nel piatto e il conto si fa da sé. Si salva mentre vai, quindi puoi
          fermarti e riprendere.
        </p>
        <p class="text-subheadline secondario">
          Il bersaglio è {kcal(b.kcal)} kcal e {b.p} g di proteine al giorno.
        </p>
      </div>
    </Sezione>
    <Pulsante variante="pieno" larga misura="grande" onclick={() => vai(1)}>Cominciamo</Pulsante>
    <Pulsante variante="grigio" larga onclick={riempiTu}>Riempi tu, correggo io</Pulsante>

  {:else if passo >= giorni.length}
    <!-- ------------------------------------------------------ il riepilogo -->
    <Sezione titolo="Come è venuta" piede={mancanti
      ? `${mancanti} fasce sono ancora vuote. Puoi confermare lo stesso: quelle restano da decidere.`
      : "Tutte le fasce hanno qualcosa. Da qui in poi la settimana è tua e il generatore non ci torna sopra."}>
      {#each riassunto as r (r.iso)}
        <button type="button" class="riga-riepilogo" onclick={() => { passo = r.indice; aperta = null; }}>
          <span class="giorno">
            <span class="text-body semibold">{r.nome}</span>
            <span class="text-caption1 terziario">{r.data}</span>
          </span>
          <span class="barre">
            <Traccia valore={b.kcal ? r.kcal / b.kcal : 0} colore="var(--accento)" altezza={5} etichetta="Calorie" />
            <span class="text-caption1 secondario cifre">{kcal(r.kcal)} kcal · {Math.round(r.p)} g prot.</span>
          </span>
          {#if r.vuote}<span class="manca text-caption2">{r.vuote} da fare</span>{/if}
          <span class="frec"><Icona nome="freccia" misura={15} tratto={2.4} /></span>
        </button>
      {/each}
    </Sezione>
    <Pulsante variante="pieno" larga misura="grande" onclick={conferma}>Conferma la settimana</Pulsante>
    <Pulsante variante="testo" larga onclick={() => vai(-1)}>Torna all'ultimo giorno</Pulsante>

  {:else}
    <!-- ------------------------------------------------------ un giorno -->
    {#each fasceDelGiorno as f (f.id)}
      <Sezione>
        <button type="button" class="testa-fascia" class:aperta={aperta === f.id}
                onclick={() => { tocco(6); aperta = aperta === f.id ? null : f.id; }}>
          <span class="tessera">{EMOJI_FASCIA[f.id] ?? "\u{1F37D}"}</span>
          <span class="etichette">
            <span class="text-footnote semibold secondario">{f.nome} <i class="cifre terziario">{f.ora}</i></span>
            <span class="cosa text-body" class:secondario={!riassuntoFascia(f.id)}>
              {riassuntoFascia(f.id) || "Da mettere"}
            </span>
          </span>
          {#if contoFascia(f.id)}
            <span class="conto-f cifre">{kcal(contoFascia(f.id))}<i>kcal</i></span>
          {/if}
          <span class="verso" class:giu={aperta === f.id}><Icona nome="freccia" misura={15} tratto={2.4} /></span>
        </button>
        {#if aperta === f.id}
          <div class="dentro">
            <SceltaComponenti bind:scelti={bozza[f.id]} fascia={f.id} bersaglio={b} />
          </div>
        {/if}
      </Sezione>
    {/each}

    <div class="chiusura">
      <div class="totale-giorno">
        <span class="text-footnote secondario">Il giorno</span>
        <span class="grande cifre">{kcal(totale.kcal)}<i>/ {kcal(b.kcal)} kcal</i></span>
        <div class="macro-giorno">
          {#each MACRO as m (m.k)}
            <span class="text-caption1 secondario">
              <b class="cifre">{Math.round(totale[m.k as "p" | "c" | "g"])}</b>/{b[m.k]} g {m.breve}
            </span>
          {/each}
        </div>
        <Traccia valore={b.kcal ? totale.kcal / b.kcal : 0} colore="var(--accento)" altezza={6} etichetta="Calorie del giorno" />
      </div>

      <div class="bottoni">
        {#if passo > 0}
          <Pulsante variante="grigio" onclick={comeIeri}>Come ieri</Pulsante>
        {/if}
        <Pulsante variante="pieno" misura="grande" onclick={() => vai(1)}>
          {passo === giorni.length - 1 ? "Vedi il riepilogo" : "Avanti"}
        </Pulsante>
      </div>
      {#if passo > 0}
        <Pulsante variante="testo" larga onclick={() => vai(-1)}>Indietro</Pulsante>
      {/if}
    </div>
  {/if}
</Pagina>

<style>
  .avanzamento { display: flex; gap: 4px; width: 100%; }
  .tacca { flex: 1; height: 4px; border-radius: var(--radius-full); background: var(--fill-tertiary); transition: background-color var(--duration-fast) var(--ease-default); }
  .tacca.fatta { background: var(--accento); }

  .intro { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-6) var(--space-4); }
  .emo-grande { font-family: var(--font-emoji); font-size: 52px; line-height: 1; }

  .testa-fascia {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    padding: var(--space-3) var(--space-4); min-height: 64px;
  }
  .testa-fascia:active { background: var(--fill-quaternary); }
  .tessera {
    flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
    background: var(--fill-tertiary); font-family: var(--font-emoji); font-size: 22px; line-height: 1;
  }
  .etichette { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .etichette i { font-style: normal; font-weight: var(--weight-regular); }
  .cosa { overflow-wrap: anywhere; font-weight: var(--weight-medium); }
  .conto-f { flex: none; font-weight: var(--weight-semibold); }
  .conto-f i { font-style: normal; font-size: var(--text-caption2); font-weight: var(--weight-regular); color: var(--label-tertiary); margin-left: 3px; }
  .verso { flex: none; color: var(--label-tertiary); transition: transform var(--duration-fast) var(--ease-default); }
  .verso.giu { transform: rotate(90deg); }

  .dentro { padding: var(--space-2) var(--space-4) var(--space-4); border-top: 0.5px solid var(--separator); }

  .chiusura { display: flex; flex-direction: column; gap: var(--space-4); }
  .totale-giorno {
    display: flex; flex-direction: column; gap: 6px;
    padding: var(--space-4); border-radius: var(--radius-xl); background: var(--bg-grouped-secondary);
  }
  .totale-giorno .grande { font-family: var(--font-display); font-size: 30px; font-weight: var(--weight-bold); }
  .totale-giorno .grande i { font-style: normal; font-size: var(--text-subheadline); font-weight: var(--weight-regular); color: var(--label-tertiary); margin-left: 6px; }
  .macro-giorno { display: flex; flex-wrap: wrap; gap: var(--space-3); }

  .bottoni { display: flex; gap: var(--space-3); }
  .bottoni > :global(*:last-child) { flex: 1; }

  .riga-riepilogo { display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left; padding: var(--space-3) var(--space-4); }
  .riga-riepilogo:active { background: var(--fill-quaternary); }
  .giorno { flex: none; width: 110px; display: flex; flex-direction: column; }
  .barre { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .manca {
    flex: none; padding: 2px 8px; border-radius: var(--radius-full); font-weight: var(--weight-semibold);
    color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent);
  }
  .frec { flex: none; color: var(--label-tertiary); }
</style>
