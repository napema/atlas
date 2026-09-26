<!--
  Pasti — il piano è il registro. L'assunzione è che hai mangiato quello che
  c'era nel piano; l'archivio tiene solo gli scostamenti (in più, al posto
  di, saltato). Per questo la schermata può stare zitta una settimana e
  avere comunque numeri veri.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import Testata from "./Testata.svelte";
  import Pasto from "./Pasto.svelte";
  import Pianifica from "./Pianifica.svelte";
  import Calendario from "./Calendario.svelte";
  import FoglioFascia from "./FoglioFascia.svelte";
  import FoglioScegli from "./FoglioScegli.svelte";
  import FoglioAggiungi from "./FoglioAggiungi.svelte";
  import FoglioImport from "./FoglioImport.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { giornoCorrente } from "$lib/core/contesto";
  import { vaiA } from "$lib/core/router.svelte";
  import { avviso, dataBreve, dataUmana, GIORNI, maiuscola, numero, piuGiorni, tocco } from "$lib/core/ui";
  import {
    SCOSTAMENTI, pianoSettimana, pasto, regimeDi, lunediDi, eliminaScostamento, registraScostamento,
  } from "$condivisi/pasti/dati.js";
  import { bersagli, giornata, settimana as settimanaCalcolo } from "$condivisi/pasti/calcolo.js";
  import { assicuraPiano, rigenera } from "$condivisi/pasti/piano.js";
  import { MACRO, EMOJI_FASCIA, FASCE_T, kcal, sessione } from "./comune";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "settimana">("oggi");

  // I fogli. Uno alla volta: passare da uno all'altro vuol dire chiudere il
  // primo e aprire il secondo quando il primo è sceso.
  let fFascia = $state(false), fScegli = $state(false), fAggiungi = $state(false), fImport = $state(false);
  let fasciaScelta = $state<string | null>(null);
  let tipoAggiunta = $state<"aggiunta" | "cambio">("aggiunta");
  const dopo = (fn: () => void) => setTimeout(fn, 320);

  // Le rotte da fuori: `#/pasti/settimana`, `#/pasti/importa`,
  // `#/pasti/pianifica` (i giorni che restano) e `#/pasti/pianifica/prossima`.
  $effect(() => {
    if (resto[0] === "settimana") vista = "settimana";
    if (resto[0] === "importa") queueMicrotask(() => (fImport = true));
  });

  const iso = $derived.by(() => { dati.versione; return giornoCorrente(); });
  const b = $derived.by(() => { dati.versione; return bersagli(); });
  const g = $derived.by(() => { dati.versione; return giornata(iso); });
  const extra = $derived(g.scostamenti.filter((s: any) => s.tipo === "aggiunta"));

  const pianificando = $derived(resto[0] === "pianifica");

  /* QUALI GIORNI. Di domenica pomeriggio si pianifica la settimana che
     arriva, tutta. Chiamata a mano di mercoledì si pianificano i giorni che
     restano: rifare il lunedì che hai già mangiato non serve a nessuno. */
  const giorniDaPianificare = $derived.by(() => {
    /* UN INTERVALLO ESPLICITO, quando arriva dall'import: «da venerdì a
       venerdì prossimo» non è né questa settimana né la prossima, e
       costringerlo in una delle due vorrebbe dire far verificare giorni che
       non hai importato e saltarne di importati. Sta nella rotta e non in
       una variabile perché così sopravvive a un ricaricamento a metà. */
    const ISO = /^\d{4}-\d{2}-\d{2}$/;
    if (ISO.test(resto[1] || "") && ISO.test(resto[2] || "")) {
      const elenco: string[] = [];
      for (let d = resto[1]; d <= resto[2] && elenco.length < 31; d = piuGiorni(d, 1)) elenco.push(d);
      return elenco.length ? elenco : [resto[1]];
    }
    if (resto[1] === "prossima") {
      const lun = piuGiorni(lunediDi(iso), 7);
      return Array.from({ length: 7 }, (_, i) => piuGiorni(lun, i));
    }
    const fine = piuGiorni(lunediDi(iso), 6);
    const elenco: string[] = [];
    for (let d = iso; d <= fine; d = piuGiorni(d, 1)) elenco.push(d);
    return elenco.length ? elenco : [iso];
  });

  /* LA DOMENICA POMERIGGIO. Dalle tre in poi: la mattina è ancora il giorno
     prima, e chiederlo a pranzo vuol dire chiederlo mentre mangia. Si
     accende finché la settimana dopo non è confermata — non finché non
     esiste, perché il generatore una settimana la fa comunque, e sarebbe un
     promemoria che sparisce senza che tu abbia deciso niente. */
  const daPianificare = $derived.by(() => {
    dati.versione;
    const ora = new Date();
    if (ora.getDay() !== 0 || ora.getHours() < 15) return null;
    const lun = piuGiorni(lunediDi(iso), 7);
    return pianoSettimana(lun)?.confermato ? null : lun;
  });

  // Una volta per apertura, e poi mai più: il promemoria resta nella pagina.
  $effect(() => {
    if (!daPianificare || pianificando || sessione.pianificazioneProposta) return;
    sessione.pianificazioneProposta = true;
    queueMicrotask(() => vaiA("pasti/pianifica/prossima"));
  });


  const righe = $derived(g.fasce.map((f: any) => {
    const sost = g.scostamenti.find((s: any) => s.fascia === f.fascia && (s.tipo === "cambio" || s.tipo === "salto"));
    const saltato = sost?.tipo === "salto";
    const macro = sost && !saltato ? sost : f.contato;
    // `f.nome` è il nome del PASTO previsto, non della fascia: due campi
    // diversi con lo stesso nome, e confonderli è il baco che si scrive da solo.
    const fascia = FASCE_T.find((x) => x.id === f.fascia)!;
    return {
      id: f.fascia,
      fascia: fascia.nome,
      ora: fascia.ora,
      cosa: saltato ? "Saltato" : sost ? sost.nome : f.nome || (f.regime === "salto" ? "Non la fai" : "Da scegliere"),
      senza: saltato || (!f.nome && !sost),
      conti: saltato || (f.regime === "salto" && !sost)
        ? null
        : { kcal: macro.kcal || 0, p: macro.p || 0, c: macro.c || 0, g: macro.g || 0 },
    };
  }).map((r: any) => ({
    // Quanto pesa questo pasto sul bersaglio del GIORNO. E' la sola scala
    // che dice qualcosa: 40 g di proteine sono tanti o pochi a seconda di
    // quanti ne servono, e il pasto da solo non lo sa.
    ...r,
    quote: r.conti ? { p: b.p ? r.conti.p / b.p : 0, c: b.c ? r.conti.c / b.c : 0, g: b.g ? r.conti.g / b.g : 0 } : null,
  })));

  /* DI QUANTE SETTIMANE SEI AVANTI. Zero è questa. Serve a «vederli anche
     in anticipo»: la settimana che la chat ti ha appena generato è quella
     che comincia lunedì, e senza questo si poteva guardare solo quella in
     corso — cioè quella che non devi più decidere. */
  let avanti = $state(0);

  const sett = $derived.by(() => {
    dati.versione;
    const lunedi = piuGiorni(lunediDi(iso), avanti * 7);
    return { lunedi, s: settimanaCalcolo(lunedi), piano: pianoSettimana(lunedi) };
  });

  /* Il giorno su cui stai lavorando. Su «Oggi» è oggi; nel calendario è la
     cella che hai toccato — senza, cambiare il giovedì avrebbe cambiato il
     pasto di oggi, in silenzio. */
  let giornoAperto = $state<string | null>(null);
  const giornoFogli = $derived(giornoAperto || iso);

  function togli(s: any) {
    eliminaScostamento(s.id);
    avviso("Tolto.", { azione: { etichetta: "Annulla", fai: () => registraScostamento({ ...s }) } });
  }

  function generaSettimana() {
    const esito = sett.piano ? rigenera(sett.lunedi) : assicuraPiano(sett.lunedi);
    avviso(esito.creato ? "Settimana rifatta." : `Non fatto: ${esito.motivo}.`, { tipo: esito.creato ? "info" : "errore" });
  }
</script>

{#snippet strumenti()}
  <Segmenti opzioni={[{ id: "oggi", testo: "Oggi" }, { id: "settimana", testo: "Settimana" }]} bind:valore={vista} etichetta="Vista" />
  {#if vista === "settimana"}
    <div class="naviga">
      <button type="button" aria-label="Settimana precedente" onclick={() => { tocco(6); avanti -= 1; }}>
        <Icona nome="indietro" misura={17} tratto={2.4} />
      </button>
      <span class="finestra text-subheadline">
        {avanti === 0 ? "Questa settimana" : avanti === 1 ? "La prossima" : avanti === -1 ? "La scorsa" : `${dataBreve(sett.lunedi)} – ${dataBreve(piuGiorni(sett.lunedi, 6))}`}
      </span>
      <button type="button" aria-label="Settimana successiva" onclick={() => { tocco(6); avanti += 1; }}>
        <Icona nome="freccia" misura={17} tratto={2.4} />
      </button>
      {#if avanti !== 0}
        <button type="button" class="oggi-di-nuovo text-subheadline" onclick={() => (avanti = 0)}>Oggi</button>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet riepilogo()}
  {#if vista === "oggi"}
    <Sezione titolo="Il bilancio">
      <Testata {b} t={g.totale} incerte={g.incerte.length} />
    </Sezione>
    <Pulsante variante="pieno" larga icona="piu" onclick={() => { fasciaScelta = null; tipoAggiunta = "aggiunta"; fAggiungi = true; }}>
      Ho mangiato qualcos'altro
    </Pulsante>
  {:else}
    <Sezione titolo="Media della settimana" piede="La media conta più del singolo giorno: una cena saltata il martedì non è un problema se la settimana torna.">
      <div class="medie">
        {#each [{ k: "kcal", nome: "Calorie", colore: "var(--accento)", u: "kcal" }, ...MACRO.map((m) => ({ ...m, u: "g" }))] as m (m.k)}
          <div class="voce">
            <div class="riga-m text-subheadline">
              <span>{m.nome}</span>
              <span class="cifre secondario">{numero(Math.round(sett.s.media[m.k]))} / {numero(b[m.k])} {m.u}</span>
            </div>
            <Traccia valore={b[m.k] ? sett.s.media[m.k] / b[m.k] : 0} colore={m.colore} altezza={6} />
          </div>
        {/each}
      </div>
    </Sezione>
    <Pulsante variante="tinto" larga onclick={generaSettimana}>
      {sett.piano ? "Rigenera la settimana" : "Genera la settimana"}
    </Pulsante>
    {#if sett.piano?.bloccato}
      <p class="text-footnote secondario nota">Questa settimana l'hai modificata a mano, quindi il generatore la lascia stare. Rigenerandola perdi le modifiche.</p>
    {/if}
  {/if}
{/snippet}

{#if pianificando}
  <Pianifica giorni={giorniDaPianificare} onfine={() => vaiA("pasti")} />
{:else}
<Pagina titolo="Pasti" {strumenti} laterale={vista === "oggi" ? riepilogo : undefined}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="importa" etichetta="Importa pasti" onclick={() => (fImport = true)} />
  {/snippet}

  {#if vista === "oggi"}
    {#if daPianificare}
      <button type="button" class="domenica intera" onclick={() => vaiA("pasti/pianifica/prossima")}>
        <span class="emo-dom">{"\u{1F4C5}"}</span>
        <span class="testo-dom">
          <span class="text-headline">Pianifica la settimana</span>
          <span class="text-subheadline secondario">
            Da {dataUmana(daPianificare)}. Un giorno per schermata, cinque minuti.
          </span>
        </span>
        <span class="frec-dom"><Icona nome="freccia" misura={17} tratto={2.4} /></span>
      </button>
    {/if}

    <Sezione titolo="La giornata">
      {#each righe as r (r.id)}
        <Pasto
          id={r.id} fascia={r.fascia} ora={r.ora} cosa={r.cosa} senza={r.senza}
          conti={r.conti} quote={r.quote}
          onclick={() => { tocco(6); giornoAperto = null; fasciaScelta = r.id; fFascia = true; }}
        />
      {/each}
    </Sezione>

    {#if extra.length}
      <Sezione titolo="In più, oggi" piede="Tocca una riga per toglierla.">
        {#each extra as s (s.id)}
          <Riga
            titolo={s.nome}
            sottotitolo={[s.ora, (SCOSTAMENTI as Record<string, string>)[s.tipo]].filter(Boolean).join(" · ")}
            valore="{kcal(s.kcal)} kcal"
            onclick={() => { tocco(6); togli(s); }}
          >
            {#snippet inizio()}<span class="emo-extra">{EMOJI_FASCIA[s.fascia] ?? "\u{1F37D}"}</span>{/snippet}
          </Riga>
        {/each}
      </Sezione>
    {/if}
  {:else}
    <div class="intera">
      <Calendario
        giorni={sett.s.giorni.map((g: any) => g.iso)}
        onapri={(giorno, fascia) => { tocco(6); giornoAperto = giorno; fasciaScelta = fascia; fFascia = true; }}
      />
    </div>
    {@render riepilogo()}
  {/if}
</Pagina>
{/if}

<FoglioFascia
  bind:aperto={fFascia}
  iso={giornoFogli}
  fascia={fasciaScelta}
  onscegli={() => dopo(() => (fScegli = true))}
  onaltro={() => dopo(() => { tipoAggiunta = "cambio"; fAggiungi = true; })}
/>
<FoglioScegli bind:aperto={fScegli} iso={giornoFogli} fascia={fasciaScelta} />
<FoglioAggiungi bind:aperto={fAggiungi} iso={giornoFogli} fascia={fasciaScelta} tipo={tipoAggiunta} />
<FoglioImport
  bind:aperto={fImport}
  onverifica={(date) => { if (date.length) vaiA(`pasti/pianifica/${date[0]}/${date[date.length - 1]}`); }}
/>

<style>
  .domenica {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    padding: var(--space-4); border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--accento) 14%, transparent);
    transition: transform var(--duration-fast) var(--ease-spring);
  }
  .domenica:active { transform: scale(0.99); }
  .emo-dom { flex: none; font-family: var(--font-emoji); font-size: 30px; line-height: 1; }
  .testo-dom { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .frec-dom { flex: none; color: var(--accento); }

  .naviga { display: flex; align-items: center; gap: var(--space-2); }
  .naviga button { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; background: var(--fill-tertiary); color: var(--label-primary); }
  .naviga button:active { opacity: 0.6; }
  .finestra { min-width: 132px; text-align: center; font-weight: var(--weight-medium); }
  .oggi-di-nuovo { width: auto !important; padding: 0 var(--space-3); border-radius: var(--radius-full) !important; color: var(--accento) !important; font-weight: var(--weight-medium); }

  .emo-extra {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
    background: var(--fill-tertiary); font-family: var(--font-emoji); font-size: 17px; line-height: 1;
  }
  .medie { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .voce { display: flex; flex-direction: column; gap: 6px; }
  .riga-m { display: flex; justify-content: space-between; }
  .nota { padding: 0 var(--space-4); }
</style>
