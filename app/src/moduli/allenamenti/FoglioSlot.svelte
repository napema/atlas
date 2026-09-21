<!--
  Uno slot: il lavoro, la spunta, il giorno (facoltativo), e come portarlo
  fuori — Garmin per le corse, Hevy per la palestra. Le due strade non sono
  la stessa cosa e il foglio lo dice: Hevy ha un'API e la routine si crea
  davvero; Garmin no, e servono il segnalibro o il file .FIT.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, tocco, piuGiorni, GIORNI_INIZIALI } from "$lib/core/ui";
  import {
    slotDi, fatto, giornoSlot, alternaSlot, scegliGiorno, inizioSettimana, recordSlot, ripristinaSlot,
  } from "$condivisi/allenamenti/dati.js";
  import { km } from "$condivisi/allenamenti/calcolo.js";
  import { leggiAllenamento, descrivi } from "$condivisi/allenamenti/passi.js";
  import { fileAllenamento, scarica } from "$condivisi/allenamenti/fit.js";
  import * as hevy from "$condivisi/allenamenti/hevy.js";
  import { allenamentoJSON } from "$condivisi/allenamenti/garmin.js";

  let { aperto = $bindable(false), id }: { aperto: boolean; id: string | null } = $props();

  const s = $derived.by(() => {
    dati.versione;
    if (!id) return null;
    const n = Number(id.slice(1, 3));
    return (slotDi(n) as any[]).find((x) => x.id === id) ?? null;
  });
  const f = $derived.by(() => { dati.versione; return id ? fatto(id) : false; });
  const giorno = $derived.by(() => { dati.versione; return id ? giornoSlot(id) : ""; });
  const coperto = $derived.by(() => { dati.versione; return Boolean(id && recordSlot(id)?.testo); });

  const giorni = $derived(s ? Array.from({ length: 7 }, (_, i) => ({ id: piuGiorni(inizioSettimana(s.sett), i), testo: GIORNI_INIZIALI[i] })) : []);
  const letto = $derived(s?.genere === "corsa" ? leggiAllenamento(s.testo) : null);
  let creo = $state(false);

  function alterna() {
    if (!s) return;
    alternaSlot(s.id);
    tocco(14);
    aperto = false;
  }

  /* IL GIORNO È UNA SCELTA, NON UN OBBLIGO: il piano dice «giorni liberi».
     Chi non vuole pianificare spunta e basta. Toccare di nuovo lo toglie. */
  function giornoScelto(v: string[]) {
    if (!s) return;
    scegliGiorno(s.id, v[0] === giorno ? "" : v[0]);
  }

  async function copiaGarmin() {
    if (!s || !letto) return;
    try {
      const j = allenamentoJSON(`${s.nome} · S${s.sett}`, letto.passi, "Da ATLAS — blocco 5 km sub-20");
      await navigator.clipboard.writeText(JSON.stringify(j));
      avviso("Copiato. Apri Connect → Allenamenti e tocca il segnalibro.");
    } catch (e: any) {
      avviso(`Non riesco a copiare: ${e.message}`, { tipo: "errore" });
    }
  }

  function scaricaFit() {
    if (!s || !letto) return;
    try {
      scarica(`atlas-s${s.sett}-${s.chiave}.fit`, fileAllenamento(`${s.nome} S${s.sett}`, letto.passi));
      avviso("Salvato. Copialo in GARMIN/NewFiles con il cavo USB.");
    } catch (e: any) {
      avviso(`Non riesco a costruire il file: ${e.message}`, { tipo: "errore" });
    }
  }

  async function creaSuHevy() {
    if (!s) return;
    creo = true;
    try {
      const { mancanti } = await hevy.creaRoutine({
        titolo: `${s.nome} · Settimana ${s.sett}`,
        note: "Da ATLAS — blocco 5 km sub-20",
        righe: [s.lift, ...(s.accessori || [])].filter(Boolean),
      });
      aperto = false;
      avviso(mancanti.length
        ? `Creata. ${mancanti.length} esercizi non erano nel catalogo: ${mancanti.join(", ")}.`
        : "Routine creata su Hevy.", { durata: mancanti.length ? 5200 : 2400 });
    } catch (e: any) {
      avviso(e.message, { tipo: "errore", durata: 4200 });
    } finally {
      creo = false;
    }
  }
</script>

<Foglio bind:aperto titolo={s?.nome ?? ""}>
  {#if s}
    <Sezione piede={s.km ? `Circa ${km(s.km)} nel conteggio della settimana.` : undefined}>
      <div class="lavoro">
        <p class="text-body">{s.lift ? s.lift : s.testo}</p>
        {#if s.accessori?.length}
          <ul class="accessori text-subheadline secondario">
            {#each s.accessori as a (a)}<li>{a}</li>{/each}
          </ul>
        {/if}
      </div>
    </Sezione>

    <Pulsante variante={f ? "grigio" : "pieno"} larga icona={f ? undefined : "spunta"} onclick={alterna}>
      {f ? "Riapri lo slot" : "Segna come fatto"}
    </Pulsante>

    <Sezione titolo="Giorno" piede="Facoltativo. Il piano lascia i giorni liberi: se lo scegli, la home e i consigli ne tengono conto.">
      <div class="blocco">
        <Pillole opzioni={giorni} scelte={giorno ? [giorno] : []} oncambio={giornoScelto} etichetta="Giorno" />
      </div>
    </Sezione>

    {#if s.genere === "corsa" && letto}
      <!-- COSA FINIRÀ NELL'OROLOGIO, prima di salvarlo: un file che parte alla
           cieca e si scopre sbagliato a metà ripetuta è il modo peggiore di
           scoprire che il lettore non aveva capito la frase. -->
      <Sezione titolo="Porta su Garmin" piede={!letto.completo
        ? "Una parte non l'ho saputa tradurre in passi: arriva come corsa libera, e il dettaglio resta qui."
        : letto.assunzioni ? "Gli allunghi senza durata li ho messi a 30\" con 60\" di pausa." : undefined}>
        <ol class="passi text-subheadline">
          {#each descrivi(letto.passi) as r, i (i)}<li>{r}</li>{/each}
        </ol>
      </Sezione>
      <Pulsante variante="tinto" larga icona="scarica" onclick={copiaGarmin}>Copia per Garmin Connect</Pulsante>
      <p class="text-footnote secondario spiega">Poi su connect.garmin.com → Allenamenti tocca il segnalibro «ATLAS → Garmin». Il segnalibro si salva una volta sola, da Impostazioni.</p>
      <Pulsante variante="grigio" larga icona="scarica" onclick={scaricaFit}>Scarica il .FIT per l'orologio</Pulsante>
      <p class="text-footnote secondario spiega">Dal PC, col cavo, nella cartella GARMIN/NewFiles. Non caricarlo su Connect: lì diventerebbe un percorso.</p>
    {:else if s.genere === "palestra"}
      <Sezione titolo="Porta su Hevy" piede={hevy.configurato()
        ? "La routine compare nell'app, in «My Routines»."
        : "Serve la chiave API, una volta sola: Impostazioni → Training."}>
        <div class="blocco">
          <Pulsante variante="tinto" larga icona="nuvola" disabled={!hevy.configurato() || creo} onclick={creaSuHevy}>
            {creo ? "Creo…" : "Crea la routine su Hevy"}
          </Pulsante>
        </div>
      </Sezione>
    {/if}

    {#if coperto}
      <Pulsante variante="testo" larga onclick={() => { if (s) { ripristinaSlot(s.id); avviso("Rimesso il piano."); } }}>
        Rimetti il piano originale
      </Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .lavoro { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .accessori { display: flex; flex-direction: column; gap: 4px; list-style: disc; padding-left: 20px; }
  .blocco { padding: var(--space-4); }
  .passi { padding: var(--space-4) var(--space-4) var(--space-4) 36px; list-style: decimal; display: flex; flex-direction: column; gap: 4px; }
  .spiega { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-3)); }
</style>
