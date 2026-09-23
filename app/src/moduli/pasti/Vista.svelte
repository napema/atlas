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
  import Riga from "$lib/ui/Riga.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import Testata from "./Testata.svelte";
  import Pasto from "./Pasto.svelte";
  import FoglioFascia from "./FoglioFascia.svelte";
  import FoglioScegli from "./FoglioScegli.svelte";
  import FoglioAggiungi from "./FoglioAggiungi.svelte";
  import FoglioImport from "./FoglioImport.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { giornoCorrente } from "$lib/core/contesto";
  import { avviso, dataBreve, GIORNI, maiuscola, numero, tocco } from "$lib/core/ui";
  import {
    SCOSTAMENTI, pianoSettimana, pasto, regimeDi, lunediDi, eliminaScostamento, registraScostamento,
  } from "$condivisi/pasti/dati.js";
  import { bersagli, giornata, settimana as settimanaCalcolo } from "$condivisi/pasti/calcolo.js";
  import { assicuraPiano, rigenera } from "$condivisi/pasti/piano.js";
  import { MACRO, EMOJI_FASCIA, FASCE_T, kcal } from "./comune";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "settimana">("oggi");

  // I fogli. Uno alla volta: passare da uno all'altro vuol dire chiudere il
  // primo e aprire il secondo quando il primo è sceso.
  let fFascia = $state(false), fScegli = $state(false), fAggiungi = $state(false), fImport = $state(false);
  let fasciaScelta = $state<string | null>(null);
  let tipoAggiunta = $state<"aggiunta" | "cambio">("aggiunta");
  const dopo = (fn: () => void) => setTimeout(fn, 320);

  // Le rotte da fuori: `#/pasti/settimana`, `#/pasti/importa`.
  $effect(() => {
    if (resto[0] === "settimana") vista = "settimana";
    if (resto[0] === "importa") queueMicrotask(() => (fImport = true));
  });

  const iso = $derived.by(() => { dati.versione; return giornoCorrente(); });
  const b = $derived.by(() => { dati.versione; return bersagli(); });
  const g = $derived.by(() => { dati.versione; return giornata(iso); });
  const extra = $derived(g.scostamenti.filter((s: any) => s.tipo === "aggiunta"));

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

  const sett = $derived.by(() => {
    dati.versione;
    const lunedi = lunediDi(iso);
    return { lunedi, s: settimanaCalcolo(lunedi), piano: pianoSettimana(lunedi) };
  });

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

<Pagina titolo="Pasti" {strumenti} laterale={riepilogo}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="importa" etichetta="Importa pasti" onclick={() => (fImport = true)} />
  {/snippet}

  {#if vista === "oggi"}
    <Sezione titolo="La giornata">
      {#each righe as r (r.id)}
        <Pasto
          id={r.id} fascia={r.fascia} ora={r.ora} cosa={r.cosa} senza={r.senza}
          conti={r.conti} quote={r.quote}
          onclick={() => { tocco(6); fasciaScelta = r.id; fFascia = true; }}
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
    <Sezione titolo="I sette giorni">
      {#each sett.s.giorni as giorno, i (giorno.iso)}
        {@const pianoG = sett.piano?.giorni?.[giorno.iso] || {}}
        {@const principali = ["pranzo", "cena"].map((f) => (regimeDi(giorno.iso, f) === "fuori" ? "fuori" : pasto(pianoG[f])?.nome)).filter(Boolean)}
        <Riga
          titolo="{maiuscola(GIORNI[i])} {dataBreve(giorno.iso)}"
          sottotitolo={principali.join(" · ") || "da pianificare"}
          valore="{kcal(giorno.totale.kcal)} kcal"
          accento={giorno.iso === iso}
        />
      {/each}
    </Sezione>
  {/if}
</Pagina>

<FoglioFascia
  bind:aperto={fFascia}
  {iso}
  fascia={fasciaScelta}
  onscegli={() => dopo(() => (fScegli = true))}
  onaltro={() => dopo(() => { tipoAggiunta = "cambio"; fAggiungi = true; })}
/>
<FoglioScegli bind:aperto={fScegli} {iso} fascia={fasciaScelta} />
<FoglioAggiungi bind:aperto={fAggiungi} {iso} fascia={fasciaScelta} tipo={tipoAggiunta} />
<FoglioImport bind:aperto={fImport} />

<style>
  .emo-extra {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
    background: var(--fill-tertiary); font-family: var(--font-emoji); font-size: 17px; line-height: 1;
  }
  .medie { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .voce { display: flex; flex-direction: column; gap: 6px; }
  .riga-m { display: flex; justify-content: space-between; }
  .nota { padding: 0 var(--space-4); }
</style>
