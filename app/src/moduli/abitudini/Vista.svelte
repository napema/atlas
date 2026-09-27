<!--
  Project 50 — la sfida, e le abitudini che ci stanno intorno.

  Era «Abitudini» con la sfida accesa da un interruttore in Impostazioni, e
  si vedeva: due liste, una per le otto e una per il supporto, e i pezzi
  della sfida sparsi fra una testata, una carta per le serate e una riga di
  chiusura in fondo alla pagina. Adesso il modulo È la sfida:

    la carta di Project 50   giorno, le otto di oggi, serate, chiusura
                             (sul PC la colonna del riepilogo, sul
                             telefono la prima cosa sotto il titolo)
    la giornata              UNA lista, divisa per momento — mattina, in
                             giornata, sera — con le otto segnate «50» in
                             cima al loro momento

  «Progressi» è l'altra faccia: i cinquanta giorni, che cosa ti ha fatto
  ripartire, le chiusure. A sfida spenta la carta invita a cominciarla e
  «Progressi» mostra le serie di ogni abitudine, come prima.
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Settimana from "$lib/ui/Settimana.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import Dettaglio from "./Dettaglio.svelte";
  import Modifica from "./Modifica.svelte";
  import Serie from "./Serie.svelte";
  import Chiusura from "./Chiusura.svelte";
  import Revisione from "./Revisione.svelte";
  import Eroe50 from "./Eroe50.svelte";
  import Giornata from "./Giornata.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { voceDi } from "$lib/core/registro";
  import { oggiISO, dataUmana, tocco } from "$lib/core/ui";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";
  import * as p50 from "$condivisi/abitudini/p50.js";
  import { progressoGiorno, eAttesa, giorniSettimana, giornataPerMomenti } from "$condivisi/abitudini/calcolo.js";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "progressi">("oggi");
  let giorno = $state(oggiISO());

  let chiusuraAperta = $state(false);
  let dettaglioAperto = $state(false);
  let dettaglioId = $state<string | null>(null);
  let modificaAperta = $state(false);
  let modificaId = $state<string | null>(null);

  const apriDettaglio = (id: string) => { dettaglioId = id; dettaglioAperto = true; };
  const apriModifica = (id: string | null) => { modificaId = id; modificaAperta = true; };

  /* Le rotte che arrivano da fuori restano quelle: sono gli indirizzi delle
     notifiche. `nuova` apre il foglio, `serie` apre i progressi, `chiudi`
     apre la chiusura — ma solo se il giorno è chiudibile: la rotta non
     scavalca la regola. */
  $effect(() => {
    if (resto[0] === "nuova") queueMicrotask(() => apriModifica(null));
    if (resto[0] === "serie") vista = "progressi";
    if (resto[0] === "chiudi" && p50.chiudibile(oggiISO()) === "si") {
      queueMicrotask(() => (chiusuraAperta = true));
    }
  });

  // A mezzanotte il giorno scelto torna oggi: guardare «ieri» senza averlo
  // chiesto sarebbe un giorno sbagliato con la faccia di quello giusto.
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { giorno = oggiISO(); }));

  const oggi = $derived.by(() => { dati.versione; return oggiISO(); });

  /* LA GIORNATA. Le otto sono attese secondo la regola della sfida (il
     workout segue il piano di Training), le altre secondo il loro
     calendario. Poi una lista sola, per momenti. */
  const g = $derived.by(() => {
    dati.versione;
    const sfida = p50.attivo();
    const tutte = abitudiniVive() as any[];
    const delle8 = (h: any) => sfida && h.blocco === "p50";
    const attesa = (h: any) => (delle8(h) ? p50.vocePrevista(h, giorno) : eAttesa(h, giorno));
    const previste = tutte.filter(attesa);
    return {
      sfida,
      tutte,
      momenti: giornataPerMomenti(previste, delle8),
      spente: tutte.filter((h) => !attesa(h)),
      chiuso: sfida && p50.giornoChiuso(giorno),
    };
  });

  /* La striscia della settimana. In sfida un giorno o è chiuso bene, o
     chiuso male, o non ancora chiuso — nessun riempimento parziale, perché
     «5 su 8» come mezza casella direbbe che sei a metà strada, e in una
     sfida tutto-o-niente la metà strada non esiste. Senza sfida torna la
     striscia delle abitudini, con i suoi stati. */
  const settimana = $derived.by(() => {
    dati.versione;
    return (giorniSettimana(giorno) as string[]).map((d) => {
      if (g.sfida) {
        const c = p50.chiusuraDi(d);
        return {
          iso: d,
          titolo: dataUmana(d),
          stato: d > oggi ? ("futuro" as const)
            : c ? (c.esito === "ok" ? ("pieno" as const) : ("fallito" as const))
            // Un giorno passato e mai chiuso non è «in corso»: è perso.
            : d < oggi ? ("vuoto" as const)
            : ("aperto" as const),
        };
      }
      const x = progressoGiorno(d);
      return {
        iso: d,
        titolo: dataUmana(d),
        stato: d > oggi ? ("futuro" as const)
          : x.riposo ? ("riposo" as const)
          : x.fatte === 0 ? ("vuoto" as const)
          : x.frazione >= 1 ? ("pieno" as const)
          : ("parziale" as const),
      };
    });
  });

  const titolo = $derived(voceDi("abitudini")?.nome ?? "Project 50");
</script>

{#snippet strumenti()}
  <Segmenti opzioni={[{ id: "oggi", testo: "Oggi" }, { id: "progressi", testo: "Progressi" }]} bind:valore={vista} etichetta="Vista" />
  {#if vista === "oggi" && g.tutte.length}
    <Settimana giorni={settimana} {oggi} scelto={giorno} onscegli={(d) => { tocco(6); giorno = d; }} />
  {/if}
{/snippet}

{#snippet riepilogo()}
  {#if vista === "progressi" && !g.sfida}
    <Serie parte="eroe" onapri={apriDettaglio} />
  {:else}
    <Eroe50 {giorno} modo={vista} onchiudi={() => (chiusuraAperta = true)} />
  {/if}
{/snippet}

<Pagina {titolo} {strumenti} laterale={riepilogo}>
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="piu" etichetta="Nuova abitudine" onclick={() => apriModifica(null)} />
  {/snippet}

  {#if vista === "progressi"}
    {#if g.sfida}<Revisione />{:else}<Serie parte="resto" onapri={apriDettaglio} />{/if}
  {:else if !g.tutte.length}
    <Vuoto icona="abitudini" titolo="Nessuna abitudine" testo="Aggiungi la prima: una cosa piccola, da fare ogni giorno.">
      <Pulsante variante="pieno" misura="media" onclick={() => apriModifica(null)}>Nuova abitudine</Pulsante>
    </Vuoto>
  {:else}
    <Giornata momenti={g.momenti} spente={g.spente} {giorno} bloccato={g.chiuso} sfida={g.sfida} onapri={apriDettaglio} />
  {/if}
</Pagina>

<Chiusura bind:aperto={chiusuraAperta} {giorno} />
<Dettaglio bind:aperto={dettaglioAperto} id={dettaglioId} onmodifica={(id) => setTimeout(() => apriModifica(id), 300)} />
<Modifica bind:aperto={modificaAperta} id={modificaId} />
