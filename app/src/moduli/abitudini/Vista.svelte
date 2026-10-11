<!--
  Abitudini — come ai vecchi tempi, senza Project 50.

  La sfida è sospesa dall'11 ottobre 2026 (`SOSPESA` in p50.js) e la
  schermata non la nomina più: niente carta dei cinquanta giorni, niente
  «le otto» in cima alla lista, niente chiusura del giorno. Il codice della
  sfida resta dov'è, ogni ramo che ne dipende guarda `g.sfida` — che adesso
  è sempre falso — e la riaccende chi riaccende l'interruttore.

    la testata   com'è andata oggi e cosa viene dopo (EroeAbitudini); sul
                 PC è la colonna di sinistra, sul telefono la prima cosa
    la lista     UNA lista, in ordine di orologio: è la stessa giornata che
                 si legge in home, e due ordini diversi per le stesse cose
                 sono due app
    Progressi    le serie di ogni abitudine
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
  import EroeAbitudini from "./EroeAbitudini.svelte";
  import { oraDiParte, partiDi } from "$condivisi/abitudini/dati.js";
  import Lista from "./Lista.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { ascolta, EVENTI } from "$lib/core/bus";
  import { voceDi } from "$lib/core/registro";
  import { oggiISO, dataUmana, tocco } from "$lib/core/ui";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";
  import * as p50 from "$condivisi/abitudini/p50.js";
  import { progressoGiorno, eAttesa, giorniSettimana } from "$condivisi/abitudini/calcolo.js";

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
    if (resto[0] === "chiudi" && p50.chiudibile(giorno) === "si") {
      queueMicrotask(() => (chiusuraAperta = true));
    }
  });

  // A mezzanotte il giorno scelto torna oggi: guardare «ieri» senza averlo
  // chiesto sarebbe un giorno sbagliato con la faccia di quello giusto.
  $effect(() => ascolta(EVENTI.GIORNO_CAMBIATO, () => { giorno = oggiISO(); }));

  const oggi = $derived.by(() => { dati.versione; return oggiISO(); });

  /* LA GIORNATA. Le otto sono attese secondo la regola della sfida (il
     workout segue il piano di Training), le altre secondo il loro
     calendario. Poi una lista sola. */
  const g = $derived.by(() => {
    dati.versione;
    const sfida = p50.attivo();
    const tutte = abitudiniVive() as any[];
    /* Il blocco di una voce NON dipende dal fatto che la sfida sia accesa:
       le otto sono le otto anche il giorno prima di cominciare. Con
       `sfida &&` qui dentro, a sfida spenta `delle8` era sempre falso e
       TUTTE le voci finivano nel supporto: la lista si apriva con la riga
       «Supporto · nessuna conseguenza» in cima e le otto sotto, cioè
       esattamente il contrario di quello che quella riga dice. Chi guarda
       la sera prima di cominciare vede le voci che contano marchiate come
       quelle che non contano.

       A dipendere dalla sfida resta solo QUANDO una voce è attesa: la
       regola della sfida (il workout segue il piano di Training) vale
       quando la sfida c'è, altrimenti vale il calendario della voce. */
    const delle8 = (h: any) => h.blocco === "p50";
    const attesa = (h: any) => (sfida && delle8(h) ? p50.vocePrevista(h, giorno) : eAttesa(h, giorno));
    const previste = tutte.filter(attesa);
    /* UNA LISTA SOLA, e l'unica divisione che resta è quella che cambia le
       conseguenze: le otto prima, il supporto dopo. Dividere per momento
       della giornata faceva tre lastre e tre contatori — alle sette di
       mattina non si capiva quale fosse la cosa da fare, si leggeva un
       indice. */
    /* In ordine di OROLOGIO: la prima ora di ogni abitudine (il suo
       promemoria, o la parte più presto). È l'ordine della giornata in
       home, e le stesse cose in due ordini diversi sono due app. Quelle
       senza ora vanno in fondo, nell'ordine in cui le hai messe. */
    const primaOra = (h: any) => {
      const ore = [h.remind, ...partiDi(h).map((p: any) => oraDiParte(h, p))].filter(Boolean) as string[];
      return ore.length ? ore.sort()[0] : "99:99";
    };
    const perOra = (a: any, b: any) => primaOra(a).localeCompare(primaOra(b)) || (a.order ?? 0) - (b.order ?? 0);
    return {
      sfida,
      tutte,
      otto: sfida ? previste.filter(delle8) : [],
      supporto: (sfida ? previste.filter((h: any) => !delle8(h)) : previste).sort(perOra),
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
          /* Un giorno passato e mai chiuso resta APERTO, non «perso»: da
             oggi si può ancora chiudere, e segnarlo come perso vorrebbe
             dire dare per fatta una cosa che devi ancora decidere. */
          stato: d > oggi ? ("futuro" as const)
            : c ? (c.esito === "ok" ? ("pieno" as const) : ("fallito" as const))
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

  const titolo = $derived(voceDi("abitudini")?.nome ?? "Abitudini");
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
  {:else if g.sfida}
    <Eroe50 {giorno} modo={vista} onchiudi={() => (chiusuraAperta = true)} />
  {:else if g.tutte.length}
    <EroeAbitudini {giorno} />
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
    <Lista otto={g.otto} supporto={g.supporto} spente={g.spente} {giorno} bloccato={g.chiuso} sfida={g.sfida} onapri={apriDettaglio} />
  {/if}
</Pagina>

<Chiusura bind:aperto={chiusuraAperta} {giorno} />
<Dettaglio bind:aperto={dettaglioAperto} id={dettaglioId} onmodifica={(id) => setTimeout(() => apriModifica(id), 300)} />
<Modifica bind:aperto={modificaAperta} id={modificaId} />
