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
  import { oggiISO, piuGiorni, tocco, GIORNI_INIZIALI, daISO } from "$lib/core/ui";
  import { settimanaCorrente, slotDi, fatto, giornoSlot, alternaSlot } from "$condivisi/allenamenti/dati.js";

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
    return (["corsa", "palestra"] as const)
      .map((g) => {
        const miei = slot.filter((s) => s.genere === g).map((s) => ({ ...s, quando: etichetta(s.giorno) }));
        return { g, nome: g === "corsa" ? "Corsa" : "Palestra", slot: miei, fatti: miei.filter((s) => s.fatto).length };
      })
      .filter((x) => x.slot.length);
  });

  function spunta(s: any) {
    tocco(s.fatto ? 6 : 14);
    alternaSlot(s.id);
  }
</script>

<Pagina titolo="Training">
  {#snippet testata()}<TitoloGruppo id="allenamenti" />{/snippet}
  {#snippet azioni()}
    <Pulsante
      variante="vetro" misura="media" tondo icona="importa" etichetta="Importa"
      onclick={() => { quale = vista === "andamento" ? "corse" : "allenamenti"; fImport = true; }}
    />
  {/snippet}

  <Segmenti opzioni={[{ id: "settimana", testo: "Settimana" }, { id: "andamento", testo: "Andamento" }]} bind:valore={vista} etichetta="Vista" />

  {#if vista === "andamento"}
    <Andamento />
  {:else}
    <Striscia bind:scelta={settimana} />
    <Sezione><TestataSettimana n={settimana} /></Sezione>

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
                {#if s.quando}<span class="quando text-caption1">{s.quando}</span>{/if}
              </span>
              <span class="text-subheadline secondario testo">{s.lift ? s.lift : s.testo}</span>
              {#if s.lift && s.accessori?.length}
                <span class="text-footnote terziario">{s.accessori.join(" · ")}</span>
              {/if}
            </button>
            <span class="freccia"><Icona nome="freccia" misura={16} tratto={2.4} /></span>
          </div>
        {/each}
      </Sezione>
    {/each}
  {/if}
</Pagina>

<FoglioSlot bind:aperto={fSlot} id={slotId} />
<FoglioImport bind:aperto={fImport} {quale} />

<style>
  .slot { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: 12px var(--space-4); }
  :global(* + .slot)::before {
    content: ""; position: absolute; top: 0; right: 0; left: calc(var(--space-4) + 28px + var(--space-3));
    border-top: 0.5px solid var(--separator);
  }
  .corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; text-align: left; }
  .corpo:active { opacity: 0.6; }
  .freccia { flex: none; color: var(--label-tertiary); }
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
