<!--
  Abitudini — le abitudini del giorno, spuntate in un tocco.

  In alto la settimana (si tocca un giorno per guardarlo o correggerlo),
  poi quante ne restano, poi la lista. «Serie» è l'altra faccia della
  stessa cosa: non cosa fare oggi, ma quanto stai tenendo.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Settimana from "$lib/ui/Settimana.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Anello from "$lib/ui/Anello.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import RigaAbitudine from "./RigaAbitudine.svelte";
  import Dettaglio from "./Dettaglio.svelte";
  import Modifica from "./Modifica.svelte";
  import Serie from "./Serie.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { oggiISO, piuGiorni, dataUmana, plurale, tocco } from "$lib/core/ui";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";
  import { progressoGiorno, eAttesa, giorniSettimana } from "$condivisi/abitudini/calcolo.js";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "serie">("oggi");
  let giorno = $state(oggiISO());

  let dettaglioAperto = $state(false);
  let dettaglioId = $state<string | null>(null);
  let modificaAperta = $state(false);
  let modificaId = $state<string | null>(null);

  const apriDettaglio = (id: string) => { dettaglioId = id; dettaglioAperto = true; };
  const apriModifica = (id: string | null) => { modificaId = id; modificaAperta = true; };

  // Le rotte che arrivano da fuori: `#/abitudini/nuova` è la scorciatoia
  // della home e delle notifiche, `#/abitudini/serie` apre le serie.
  $effect(() => {
    if (resto[0] === "nuova") queueMicrotask(() => apriModifica(null));
    if (resto[0] === "serie") vista = "serie";
  });

  // A mezzanotte il giorno scelto torna oggi: guardare «ieri» senza averlo
  // chiesto sarebbe un giorno sbagliato con la faccia di quello giusto.
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { giorno = oggiISO(); }));

  const oggi = $derived.by(() => { dati.versione; return oggiISO(); });
  const tutte = $derived.by(() => { dati.versione; return abitudiniVive(); });
  const attese = $derived.by(() => { dati.versione; return tutte.filter((h: any) => eAttesa(h, giorno)); });
  const altre = $derived.by(() => { dati.versione; return tutte.filter((h: any) => !eAttesa(h, giorno)); });
  const p = $derived.by(() => { dati.versione; return progressoGiorno(giorno); });
  const restano = $derived(Math.max(0, p.attese - p.fatte));
  const tutto = $derived(p.attese > 0 && restano === 0);

  const settimana = $derived.by(() => {
    dati.versione;
    return (giorniSettimana(giorno) as string[]).map((g) => {
      const x = progressoGiorno(g);
      return {
        iso: g,
        titolo: dataUmana(g),
        stato: g > oggi ? ("futuro" as const)
          : x.riposo ? ("riposo" as const)
          : x.fatte === 0 ? ("vuoto" as const)
          : x.frazione >= 1 ? ("pieno" as const)
          : ("parziale" as const),
      };
    });
  });

  const titoloGiorno = $derived(
    giorno === oggi ? "Oggi" : giorno === piuGiorni(oggi, -1) ? "Ieri" : dataUmana(giorno),
  );
</script>

{#snippet strumenti()}
  <Segmenti opzioni={[{ id: "oggi", testo: "Giorno" }, { id: "serie", testo: "Serie" }]} bind:valore={vista} etichetta="Vista" />
  {#if vista === "oggi" && tutte.length}
    <Settimana giorni={settimana} {oggi} scelto={giorno} onscegli={(g) => { tocco(6); giorno = g; }} />
  {/if}
{/snippet}

{#snippet riepilogo()}
  {#if vista === "serie"}
    <Serie parte="eroe" onapri={apriDettaglio} />
  {:else}
    <!-- «Quante ne restano» è la domanda, e la risposta è una cifra sola. -->
    <Sezione titolo="Riepilogo">
      <div class="eroe" class:tutto>
        <div class="numeri">
          <span class="text-footnote etichetta">
            {!p.attese ? "Giornata libera" : tutto ? "Tutto fatto" : "Ancora da fare"}
          </span>
          <span class="cifra cifre">{!p.attese ? "—" : tutto ? p.fatte : restano}</span>
          <span class="text-subheadline secondario">
            {!p.attese ? "Nessuna abitudine prevista per questo giorno."
              : tutto ? plurale(p.fatte, "abitudine spuntata", "abitudini spuntate")
              : `${p.fatte} di ${p.attese} già fatte`}
          </span>
        </div>
        <!-- In una giornata libera l'anello resta vuoto e al posto della
             percentuale c'è un trattino: «100%» accanto a «nessuna abitudine
             prevista» si contraddiceva, «0%» direbbe che hai mancato qualcosa. -->
        <Anello valore={p.frazione} misura={84} spessore={9} colore="var(--color-green)">
          <span class="pct cifre">{p.riposo ? "—" : `${Math.round(p.frazione * 100)}%`}</span>
        </Anello>
      </div>
    </Sezione>
  {/if}
{/snippet}

<Pagina titolo="Abitudini" {strumenti} laterale={tutte.length ? riepilogo : undefined}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="piu" etichetta="Nuova abitudine" onclick={() => apriModifica(null)} />
  {/snippet}

  {#if vista === "serie"}
    <Serie parte="resto" onapri={apriDettaglio} />
  {:else if !tutte.length}
    <Vuoto icona="abitudini" titolo="Nessuna abitudine" testo="Aggiungi la prima: una cosa piccola, da fare ogni giorno.">
      <Pulsante variante="pieno" misura="media" onclick={() => apriModifica(null)}>Nuova abitudine</Pulsante>
    </Vuoto>
  {:else}
    {#if attese.length}
      <Sezione titolo={titoloGiorno}>
        {#each attese as h (h.id)}
          <RigaAbitudine {h} {giorno} onapri={apriDettaglio} />
        {/each}
      </Sezione>
    {/if}

    {#if altre.length}
      <Sezione titolo="Non previste {giorno === oggi ? 'oggi' : 'quel giorno'}">
        {#each altre as h (h.id)}
          <RigaAbitudine {h} {giorno} spenta onapri={apriDettaglio} />
        {/each}
      </Sezione>
    {/if}
  {/if}
</Pagina>

<Dettaglio bind:aperto={dettaglioAperto} id={dettaglioId} onmodifica={(id) => setTimeout(() => apriModifica(id), 300)} />
<Modifica bind:aperto={modificaAperta} id={modificaId} />

<style>
  .eroe { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5); }
  .numeri { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .etichetta { font-weight: var(--weight-semibold); color: var(--accento); }
  .tutto .etichetta { color: var(--color-green); }
  .cifra { font-family: var(--font-display); font-size: 48px; line-height: 52px; font-weight: var(--weight-bold); }
  .pct { font-size: var(--text-subheadline); font-weight: var(--weight-semibold); }
</style>
