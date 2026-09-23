<!--
  Uno slot aperto: che cosa si fa stasera.

  Prima era un paragrafo e un elenco puntato — «Stacco 5×3 @ 100 kg» e sotto
  cinque righe di testo piccolo. Tutto quello che serve sapere in palestra
  c'era dentro, e non si vedeva niente: quante serie in tutto, quale
  esercizio viene ora, dove arriva il lavoro.

  Ora la seduta si legge in tre livelli. La CIFRA in cima (le serie totali,
  perché è la misura del «quanto dura»), il CORPO con i gruppi accesi (dove
  arriva), e le SCHEDE degli esercizi — una per riga, serie e ripetizioni
  grandi, il carico a parte, i muscoli sotto. Toccarne una accende solo i
  suoi muscoli sul corpo: è l'unico modo per rispondere a «questo cos'è che
  allena» senza cercarlo su internet a metà seduta.

  Il resto — Garmin, Hevy, il giorno — non è cambiato: funzionava.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Corpo from "./Corpo.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, tocco, piuGiorni, plurale, GIORNI_INIZIALI } from "$lib/core/ui";
  import {
    slotDi, fatto, giornoSlot, alternaSlot, scegliGiorno, inizioSettimana, recordSlot, ripristinaSlot,
  } from "$condivisi/allenamenti/dati.js";
  import { km } from "$condivisi/allenamenti/calcolo.js";
  import { leggiRiga, gruppiSeduta, serieTotali } from "$condivisi/allenamenti/muscoli.js";
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

  /* LA SEDUTA LETTA. Il lift principale è il primo esercizio, non una cosa
     a parte: in palestra si fa per primo e basta. Ma resta marcato, perché
     è l'unico che cambia carico di settimana in settimana. */
  const seduta = $derived.by(() => {
    if (!s || s.genere !== "palestra") return null;
    const righe = [s.lift, ...(s.accessori || [])].filter(Boolean) as string[];
    if (!righe.length) return null;
    return {
      righe,
      esercizi: righe.map((r, i) => ({ ...leggiRiga(r)!, principale: i === 0 })),
      gruppi: gruppiSeduta(righe),
      serie: serieTotali(righe),
    };
  });

  // L'esercizio che stai guardando. Null = tutta la seduta insieme.
  let scelto = $state<number | null>(null);
  $effect(() => { id; aperto; scelto = null; });

  const acceso = $derived.by(() => {
    if (!seduta) return { primari: [], secondari: [] };
    if (scelto === null) {
      const g = seduta.gruppi;
      // Con tutta la seduta insieme: primario chi prende almeno un quarto
      // del lavoro del gruppo più colpito. Accendere tutto uguale direbbe
      // che un giorno di gambe allena i bicipiti quanto i quadricipiti.
      const massimo = g[0]?.serie || 1;
      return {
        primari: g.filter((x) => x.serie >= massimo * 0.34).map((x) => x.id),
        secondari: g.filter((x) => x.serie < massimo * 0.34).map((x) => x.id),
      };
    }
    const e = seduta.esercizi[scelto];
    return { primari: e.primari, secondari: e.secondari };
  });

  const NOMI: Record<string, string> = {
    petto: "Petto", spalle: "Spalle", bicipiti: "Bicipiti", avambracci: "Avambracci",
    addome: "Addome", obliqui: "Obliqui", quadricipiti: "Quadricipiti", adduttori: "Adduttori",
    tibiali: "Tibiali", trapezio: "Trapezio", dorsali: "Dorsali", deltoidiPost: "Deltoidi post.",
    tricipiti: "Tricipiti", lombari: "Lombari", glutei: "Glutei", femorali: "Femorali", polpacci: "Polpacci",
  };
  const serieTonde = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

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
    {#if seduta}
      <!-- LA CIFRA: quanto lavoro è, prima di qualunque dettaglio. -->
      <div class="eroe">
        <div class="numeri">
          <span class="text-footnote etichetta">Settimana {s.sett}</span>
          <span class="cifra cifre">{seduta.serie}</span>
          <span class="text-subheadline secondario">
            serie · {plurale(seduta.esercizi.length, "esercizio", "esercizi")}
          </span>
        </div>
        <div class="gruppi-eroe">
          {#each seduta.gruppi.slice(0, 4) as g (g.id)}
            <span class="pillola text-caption1">{NOMI[g.id] ?? g.id} <b class="cifre">{serieTonde(g.serie)}</b></span>
          {/each}
        </div>
      </div>

      <Sezione titolo="Dove arriva" piede={scelto === null
        ? "Pieno: il lavoro grosso. A metà: quello che partecipa. Tocca un esercizio qui sotto per vedere solo il suo."
        : `Solo ${seduta.esercizi[scelto].nome}. Tocca di nuovo per tornare a tutta la seduta.`}>
        <div class="mappa">
          <Corpo primari={acceso.primari} secondari={acceso.secondari} />
        </div>
      </Sezione>

      <Sezione titolo="La seduta">
        {#each seduta.esercizi as e, i (e.testo)}
          <button type="button" class="esercizio" class:scelto={scelto === i} onclick={() => { scelto = scelto === i ? null : i; tocco(6); }}>
            <span class="posto cifre">{i + 1}</span>
            <span class="centro">
              <span class="nome text-body">
                {e.nome}
                {#if e.principale}<span class="tag text-caption2">principale</span>{/if}
              </span>
              {#if e.primari.length || e.secondari.length}
                <span class="muscoli text-caption1 secondario">
                  {#each e.primari as g (g)}<span class="punto forte"></span>{NOMI[g] ?? g}{/each}
                  {#each e.secondari as g (g)}<span class="punto"></span>{NOMI[g] ?? g}{/each}
                </span>
              {/if}
            </span>
            <span class="lavoro">
              {#if e.serie}
                <span class="serie cifre">{e.serie}<i>×</i>{e.ripetizioni}</span>
              {:else}
                <span class="serie cifre piccolo">—</span>
              {/if}
              {#if e.carico}<span class="carico text-caption1 secondario cifre">{e.carico}</span>{/if}
            </span>
          </button>
        {/each}
      </Sezione>
    {:else}
      <Sezione piede={s.km ? `Circa ${km(s.km)} nel conteggio della settimana.` : undefined}>
        <div class="lavoro-testo"><p class="text-body">{s.testo}</p></div>
      </Sezione>
    {/if}

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
  .eroe {
    display: flex; align-items: center; gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    background: var(--bg-grouped-secondary); border-radius: var(--radius-xl);
  }
  .numeri { display: flex; flex-direction: column; gap: 2px; flex: none; }
  .etichetta { font-weight: var(--weight-semibold); color: var(--accento); }
  .cifra { font-family: var(--font-display); font-size: 48px; line-height: 50px; font-weight: var(--weight-bold); }
  .gruppi-eroe { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex: 1; }
  .pillola {
    padding: 4px 10px; border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--accento) 15%, transparent);
    color: color-mix(in srgb, var(--accento) 85%, var(--label-primary));
    font-weight: var(--weight-medium);
  }
  .pillola b { font-weight: var(--weight-bold); }

  .mappa { padding: var(--space-4) var(--space-3) var(--space-2); display: flex; justify-content: center; }

  .esercizio {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    padding: var(--space-3) var(--space-4); min-height: 64px;
    border-radius: var(--radius-lg);
    transition: background-color var(--duration-fast) var(--ease-default);
  }
  .esercizio + .esercizio { box-shadow: inset 0 0.5px 0 var(--separator); }
  .esercizio:active { background: var(--fill-quaternary); }
  .esercizio.scelto { background: color-mix(in srgb, var(--accento) 12%, transparent); }

  .posto {
    flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px;
    background: var(--fill-tertiary); color: var(--label-secondary);
    font-size: var(--text-caption1); font-weight: var(--weight-semibold);
  }
  .esercizio.scelto .posto { background: var(--accento); color: #fff; }

  .centro { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .nome { display: flex; align-items: center; gap: 6px; font-weight: var(--weight-medium); }
  .tag {
    flex: none; padding: 1px 7px; border-radius: var(--radius-full); font-weight: var(--weight-semibold);
    color: var(--accento); background: color-mix(in srgb, var(--accento) 16%, transparent);
  }
  .muscoli { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 5px; }
  .punto {
    width: 6px; height: 6px; border-radius: 50%; margin-left: 4px;
    background: color-mix(in srgb, var(--accento) 40%, transparent);
  }
  .punto:first-child { margin-left: 0; }
  .punto.forte { background: var(--accento); }

  .lavoro { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
  .serie { font-size: 22px; line-height: 24px; font-weight: var(--weight-semibold); }
  .serie i { font-style: normal; color: var(--label-tertiary); margin: 0 1px; font-size: 17px; }
  .serie.piccolo { font-size: 17px; color: var(--label-tertiary); }

  .lavoro-testo { padding: var(--space-4); }
  .blocco { padding: var(--space-4); }
  .passi { padding: var(--space-4) var(--space-4) var(--space-4) 36px; list-style: decimal; display: flex; flex-direction: column; gap: 4px; }
  .spiega { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-3)); }
</style>
