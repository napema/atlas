<!--
  Training — tredici settimane verso i 5 km sotto i venti minuti.

  LA DOMANDA DELLA SCHERMATA È UNA SOLA: cosa mi resta questa settimana.
  «Quanto ho corso in tutto» e «a che punto è il blocco» sono buone domande
  ma di un'altra vista: stanno in «Andamento».
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Spunta from "$lib/ui/Spunta.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import TitoloGruppo from "$lib/ui/TitoloGruppo.svelte";
  import Striscia from "./Striscia.svelte";
  import TestataSettimana from "./TestataSettimana.svelte";
  import FoglioSlot from "./FoglioSlot.svelte";
  import FoglioImport from "./FoglioImport.svelte";
  import Andamento from "./Andamento.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { oggiISO, piuGiorni, plurale, tocco, GIORNI_INIZIALI, daISO } from "$lib/core/ui";
  import { settimanaCorrente, slotDi, fatto, giornoSlot, alternaSlot, oraDi } from "$condivisi/allenamenti/dati.js";
  import { gruppiSeduta, serieTotali } from "$condivisi/allenamenti/muscoli.js";
  import { km } from "$condivisi/allenamenti/calcolo.js";

  const NOMI_GRUPPI: Record<string, string> = {
    petto: "Petto", spalle: "Spalle", bicipiti: "Bicipiti", avambracci: "Avambracci",
    addome: "Addome", obliqui: "Obliqui", quadricipiti: "Quadricipiti", adduttori: "Adduttori",
    tibiali: "Tibiali", trapezio: "Trapezio", dorsali: "Dorsali", deltoidiPost: "Deltoidi post.",
    tricipiti: "Tricipiti", lombari: "Lombari", glutei: "Glutei", femorali: "Femorali", polpacci: "Polpacci",
  };

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"settimana" | "andamento">("settimana");
  let settimana = $state<number>(settimanaCorrente());
  let fSlot = $state(false), fImport = $state(false);
  let slotId = $state<string | null>(null);
  let quale = $state<"corse" | "allenamenti">("corse");

  $effect(() => {
    if (resto[0] === "andamento") vista = "andamento";
    if (resto[0] === "importa") queueMicrotask(() => { quale = "corse"; fImport = true; });
  });
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { settimana = settimanaCorrente(); }));

  const gruppi = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const slot = (slotDi(settimana) as any[]).map((s) => ({ ...s, fatto: fatto(s.id), giorno: giornoSlot(s.id) }));
    const etichetta = (iso: string) => {
      if (!iso) return "";
      if (iso === oggi) return "oggi";
      if (iso === piuGiorni(oggi, -1)) return "ieri";
      const d = daISO(iso);
      return `${GIORNI_INIZIALI[(d.getDay() + 6) % 7]} ${d.getDate()}`;
    };
    /* I generi PRESENTI, non quelli previsti. Erano due, scritti a mano, e
       un allenamento che non fosse corsa o palestra spariva dalla schermata
       pur essendo nei dati: importavi tre righe e ne vedevi due. */
    const NOMI_GENERE: Record<string, string> = { corsa: "Corsa", palestra: "Palestra", altro: "Altro" };
    const generi = ["corsa", "palestra", "altro"].filter((g) => slot.some((s) => s.genere === g));
    for (const s of slot) if (!generi.includes(s.genere)) generi.push(s.genere);

    return generi
      .map((g) => {
          const miei = slot.filter((s) => s.genere === g).map((s) => {
          // La riga di una seduta dice anche QUANTO lavoro è e DOVE arriva:
          // «Hack squat 4×8 · Leg curl 3×12 · …» era l'elenco della spesa.
          const righe = (s.lift
            ? [s.lift, ...(s.accessori || [])]
            : s.genere === "palestra" ? String(s.testo || "").split(/\s*[·;]\s*/) : []
          ).map((x: string) => String(x).trim()).filter(Boolean) as string[];
          const gr = righe.length ? gruppiSeduta(righe) : [];
          return {
            ...s, quando: etichetta(s.giorno), ora: oraDi(s),
            serie: righe.length ? serieTotali(righe) : 0,
            top: gr.slice(0, 3).map((x: any) => ({ id: x.id, nome: NOMI_GRUPPI[x.id] ?? x.id })),
            altri: Math.max(0, gr.length - 3),
          };
        });
        return { g, nome: NOMI_GENERE[g] ?? g, slot: miei, fatti: miei.filter((s) => s.fatto).length };
      })
      .filter((x) => x.slot.length);
  });

  /* OGGI. La domanda che si fa davanti allo schermo è «adesso cosa devo
     fare», e la settimana per rispondere va letta: sei righe, e quella di
     oggi è una di quelle, riconoscibile da un'etichetta piccola in fondo a
     destra. Qui sta in cima, in una riga sola.

     Non è un titolone. È una riga: se oggi c'è qualcosa la dice, se non c'è
     niente dice quanto resta da fare entro domenica — che è l'unica altra
     cosa utile in quel momento. */
  const oggiQui = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    const tutti = gruppi.flatMap((g: any) => g.slot);
    const diOggi = tutti.filter((s: any) => s.giorno === iso);
    const aperti = tutti.filter((s: any) => !s.fatto);
    return {
      iso,
      diOggi,
      fattiOggi: diOggi.filter((s: any) => s.fatto).length,
      aperti: aperti.length,
      // Senza giorno assegnato non si può dire «oggi tocca questo»: si dice
      // quanti ne restano, che è vero comunque.
      senzaGiorno: aperti.filter((s: any) => !s.giorno).length,
    };
  });

  function spunta(s: any) {
    tocco(s.fatto ? 6 : 14);
    alternaSlot(s.id);
  }
</script>

{#snippet strumenti()}
  <Segmenti opzioni={[{ id: "settimana", testo: "Settimana" }, { id: "andamento", testo: "Andamento" }]} bind:valore={vista} etichetta="Vista" />
  {#if vista !== "andamento"}<Striscia bind:scelta={settimana} />{/if}
{/snippet}

{#snippet riepilogo()}
  <Sezione titolo="Riepilogo"><TestataSettimana n={settimana} /></Sezione>
{/snippet}

<Pagina titolo="Training" {strumenti} laterale={vista === "andamento" ? undefined : riepilogo}>
  {#snippet testata()}<TitoloGruppo id="allenamenti" />{/snippet}
  {#snippet azioni()}
    <Pulsante
      variante="vetro" misura="media" tondo icona="importa" etichetta="Importa"
      onclick={() => { quale = vista === "andamento" ? "corse" : "allenamenti"; fImport = true; }}
    />
  {/snippet}

  {#if vista === "andamento"}
    <Andamento />
  {:else}
    <!-- OGGI, in una riga. -->
    {#if settimana === settimanaCorrente()}
      <div class="oggi intera" class:vuoto={!oggiQui.diOggi.length}>
        <span class="eti text-footnote semibold">Oggi</span>
        {#if oggiQui.diOggi.length}
          <span class="cose">
            {#each oggiQui.diOggi as s (s.id)}
              <button type="button" class="cosa" class:fatta={s.fatto} onclick={() => { slotId = s.id; fSlot = true; }}>
                <span class="nome-oggi">{s.nome}</span>
                <span class="text-caption1 dett">{s.ora} · {s.lift ? s.lift : s.testo}</span>
              </button>
            {/each}
          </span>
          <span class="text-footnote secondario stato">{oggiQui.fattiOggi}/{oggiQui.diOggi.length} fatto</span>
        {:else}
          <span class="text-subheadline secondario cose">
            Niente in programma per oggi.
            {#if oggiQui.aperti}
              Restano {plurale(oggiQui.aperti, "allenamento", "allenamenti")} questa settimana{oggiQui.senzaGiorno ? `, ${oggiQui.senzaGiorno} senza giorno` : ""}.
            {:else}
              La settimana è chiusa.
            {/if}
          </span>
        {/if}
      </div>
    {/if}


    {#each gruppi as gr (gr.g)}
      <Sezione titolo={gr.nome}>
        {#snippet coda()}<span class="text-subheadline secondario cifre">{gr.fatti}/{gr.slot.length}</span>{/snippet}
        {#each gr.slot as s (s.id)}
          <div class="slot" class:fatto={s.fatto}>
            <Spunta fatta={s.fatto} etichetta={s.fatto ? `Riapri ${s.nome}` : `Segna ${s.nome} come fatto`} onclick={() => spunta(s)} />
            <button type="button" class="corpo" onclick={() => { slotId = s.id; fSlot = true; }}>
              <span class="alto">
                <span class="nome">{s.nome}</span>
                {#if s.stella}<span class="stella" title="Seduta chiave"><Icona nome="bersaglio" misura={14} tratto={2.2} /></span>{/if}
                {#if s.cambiato}<span class="etichetta text-caption2">importato</span>{/if}
                {#if s.quando}<span class="quando text-caption1">{s.quando} · {s.ora}</span>{/if}
              </span>
              <span class="text-subheadline secondario testo">{s.lift ? s.lift : s.testo}</span>
              {#if s.top?.length}
                <span class="muscoli text-caption1 terziario">
                  {#each s.top as g, i (g.id)}<span class="punto" class:forte={i === 0}></span>{g.nome}{/each}
                  {#if s.altri}<span class="piu">+{s.altri}</span>{/if}
                </span>
              {/if}
            </button>
            <span class="misura">
              {#if s.serie}
                <span class="grande cifre">{s.serie}</span><span class="text-caption2 terziario">serie</span>
              {:else if s.km}
                <span class="grande cifre">{km(s.km)}</span>
              {/if}
              <span class="freccia"><Icona nome="freccia" misura={16} tratto={2.4} /></span>
            </span>
          </div>
        {/each}
      </Sezione>
    {/each}
  {/if}
</Pagina>

<FoglioSlot bind:aperto={fSlot} id={slotId} />
<FoglioImport bind:aperto={fImport} {quale} />

<style>
  .oggi {
    display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;
    padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--accento) 13%, transparent);
  }
  .oggi.vuoto { background: var(--bg-grouped-secondary); }
  .oggi .eti { color: var(--accento); flex: none; letter-spacing: 0.3px; }
  .oggi.vuoto .eti { color: var(--label-secondary); }
  .cose { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
  .cosa { display: flex; flex-direction: column; align-items: flex-start; text-align: left; min-width: 0; }
  .cosa:active { opacity: 0.6; }
  .nome-oggi { font-weight: var(--weight-semibold); }
  .cosa.fatta .nome-oggi { color: var(--label-secondary); text-decoration: line-through; }
  .dett { color: var(--label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46ch; }
  .stato { flex: none; }

  .slot { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); min-height: 76px; }
  :global(* + .slot)::before {
    content: ""; position: absolute; top: 0; right: 0; left: calc(var(--space-4) + 28px + var(--space-3));
    border-top: 0.5px solid var(--separator);
  }
  .corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; text-align: left; }
  .corpo:active { opacity: 0.6; }
  .misura { flex: none; display: flex; align-items: center; gap: 4px; color: var(--label-secondary); }
  .misura .grande { font-size: 20px; font-weight: var(--weight-semibold); color: var(--label-primary); }
  .fatto .misura .grande { color: var(--label-secondary); }
  .freccia { flex: none; color: var(--label-tertiary); margin-left: 2px; }
  .muscoli { display: flex; flex-wrap: wrap; align-items: center; gap: 3px 5px; }
  .punto { width: 6px; height: 6px; border-radius: 50%; margin-left: 4px; background: color-mix(in srgb, var(--accento) 40%, transparent); }
  .punto:first-child { margin-left: 0; }
  .punto.forte { background: var(--accento); }
  .piu { margin-left: 2px; }
  .alto { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .nome { font-weight: var(--weight-semibold); }
  .fatto .nome, .fatto .testo { color: var(--label-secondary); }
  .stella { color: var(--accento); display: inline-flex; }
  .etichetta {
    padding: 1px 7px; border-radius: var(--radius-full); font-weight: var(--weight-semibold);
    color: var(--color-indigo); background: color-mix(in srgb, var(--color-indigo) 16%, transparent);
  }
  .quando {
    margin-left: auto; padding: 2px 8px; border-radius: var(--radius-full);
    background: var(--fill-tertiary); color: var(--label-secondary); font-weight: var(--weight-medium);
  }
  .testo { overflow-wrap: anywhere; }
</style>
