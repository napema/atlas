<!--
  Pagina — l'impalcatura di ogni schermata, come una UINavigationController.

  In alto il TITOLO GRANDE, che scorre via col contenuto. Quando è uscito
  dallo schermo compare la barra compatta: vetro, titolo piccolo al centro.
  Prima non c'è nessun vetro, ed è voluto: il vetro sopra una pagina ferma
  in cima non ha niente da sfocare, e si vede solo come una fascia grigia.

  La riga «sopra» (la data, lo stato del sync) sta nel CONTENUTO, sotto la
  barra, e non dentro la barra: nella app di prima stava in alto e l'effetto
  del bordo la sfocava — su iPhone si leggeva a malapena.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Icona from "./Icona.svelte";
  import { indietro as tornaIndietro } from "$lib/core/router.svelte";

  let {
    titolo,
    sopra,
    indietro,
    azioni,
    testata,
    larga = false,
    children,
  }: {
    titolo: string;
    /** La riga piccola sopra il titolo grande: una data, uno stato. */
    sopra?: Snippet | string;
    /** Il bottone indietro, con l'etichetta della schermata di prima. */
    indietro?: string | { etichetta: string; fai: () => void };
    /** I bottoni tondi a destra nella barra. */
    azioni?: Snippet;
    /** Qualcosa al posto del titolo grande (il selettore di un gruppo). */
    testata?: Snippet;
    /** La pagina fa da sé le sue colonne (la home): niente colonne automatiche. */
    larga?: boolean;
    children: Snippet;
  } = $props();

  let sentinella: HTMLElement | undefined = $state();
  let barraEl: HTMLElement | undefined = $state();
  let compatta = $state(false);

  $effect(() => {
    if (!sentinella) return;
    const el = sentinella;
    // Il titolo grande è «uscito» quando il suo fondo passa sotto la barra.
    // Un controllo sullo scorrimento e non un IntersectionObserver: quello
    // dava una prima lettura sbagliata durante la dissolvenza d'ingresso, e
    // la barra restava accesa su una pagina ferma in cima.
    let richiesto = false;
    const misura = () => {
      richiesto = false;
      // L'altezza vera della barra, notch compreso: la variabile CSS è un
      // `calc(env(...))` che da JavaScript non si legge come numero.
      const barra = barraEl?.getBoundingClientRect().bottom ?? 44;
      compatta = el.getBoundingClientRect().bottom < barra;
    };
    const suScorri = () => { if (!richiesto) { richiesto = true; requestAnimationFrame(misura); } };
    misura();
    addEventListener("scroll", suScorri, { passive: true });
    addEventListener("resize", suScorri, { passive: true });
    return () => { removeEventListener("scroll", suScorri); removeEventListener("resize", suScorri); };
  });

  const etichettaIndietro = $derived(typeof indietro === "string" ? indietro : indietro?.etichetta);
  const vaiIndietro = () => (typeof indietro === "object" ? indietro.fai() : tornaIndietro());
</script>

<header class="barra" class:compatta class:larga bind:this={barraEl}>
  <div class="barra-riga">
    <div class="lato sinistra">
      {#if indietro}
        <button class="indietro" type="button" onclick={vaiIndietro}>
          <Icona nome="indietro" misura={22} tratto={2.2} />
          <span>{etichettaIndietro}</span>
        </button>
      {/if}
    </div>
    <div class="titolo-piccolo text-headline" aria-hidden={!compatta}>{titolo}</div>
    <div class="lato destra">{@render azioni?.()}</div>
  </div>
</header>

<main class="pagina" class:larga>
  {#if sopra}
    <p class="sopra text-footnote secondario">
      {#if typeof sopra === "string"}{sopra}{:else}{@render sopra()}{/if}
    </p>
  {/if}
  <div class="titolo-grande" bind:this={sentinella}>
    {#if testata}{@render testata()}{:else}<h1 class="text-large-title">{titolo}</h1>{/if}
  </div>
  <div class="contenuto">
    {@render children()}
  </div>
</main>

<style>
  /* LARGHEZZA. Sul telefono una colonna sola; sul PC la pagina prende quasi
     tutta la finestra — non tutta, con un margine d'aria ai lati — e le
     sezioni si dispongono in colonne, come un cruscotto. Una striscia da
     672px in mezzo a un monitor da 1900 era una app da telefono aperta sul
     PC, non una app per il PC. */
  :global(:root) {
    --larghezza-pagina: var(--readable-width);
    --altezza-barra: calc(env(safe-area-inset-top, 0px) + var(--navbar-height));
    /* quanto spazio lasciare in fondo per la barra delle schede che galleggia */
    --spazio-schede: calc(max(env(safe-area-inset-bottom, 0px), 12px) + 96px);
  }

  .barra {
    position: fixed; inset: 0 0 auto 0; z-index: 20;
    padding-top: env(safe-area-inset-top, 0px);
    height: var(--altezza-barra);
    /* Il vetro c'è sempre, ma spento: così accenderlo è una transizione e
       non un salto. */
    background: transparent;
    transition: background-color var(--duration-fast) var(--ease-default);
  }
  .barra::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    border-bottom: 0.5px solid var(--separator);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .barra.compatta::before { opacity: 1; }

  .barra-riga {
    height: var(--navbar-height);
    max-width: var(--larghezza-pagina); margin: 0 auto;
    padding: 0 var(--content-inset);
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--space-2);
  }
  .lato { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
  .destra { justify-content: flex-end; }

  .titolo-piccolo {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw;
    opacity: 0; transform: translateY(4px);
    transition: opacity var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-default);
  }
  .compatta .titolo-piccolo { opacity: 1; transform: none; }

  .indietro {
    display: inline-flex; align-items: center; gap: 2px;
    height: var(--touch-target); margin-left: -8px; padding-right: 8px;
    color: var(--accento);
    font-size: var(--text-body); letter-spacing: var(--ls-body);
  }
  .indietro:active { opacity: 0.5; }

  .pagina {
    max-width: var(--larghezza-pagina); margin: 0 auto;
    padding: calc(var(--altezza-barra) + 2px) var(--content-inset) var(--spazio-schede);
    min-height: 100dvh;
  }
  .sopra { margin: 0 0 2px; min-height: var(--lh-footnote); }
  .titolo-grande { margin-bottom: var(--space-4); }
  .titolo-grande h1 { overflow-wrap: anywhere; }
  .contenuto { display: flex; flex-direction: column; gap: var(--space-6); }

  @media (min-width: 1000px) {
    :global(:root) { --larghezza-pagina: min(calc(100vw - 96px), 1640px); }
    .pagina { padding-left: var(--space-8); padding-right: var(--space-8); }
    .barra-riga { padding-left: var(--space-8); padding-right: var(--space-8); }

    /* Le colonne: si riempiono dall'alto in basso e poi si passa alla
       successiva, e una sezione non si spezza mai fra due colonne. I
       controlli che valgono per tutta la pagina — i segmenti, le strisce di
       giorni e di settimane, il mese — attraversano tutte le colonne. */
    .pagina:not(.larga) .contenuto {
      display: block;
      column-width: 440px;
      column-gap: var(--space-6);
    }
    .pagina:not(.larga) .contenuto > :global(*) {
      break-inside: avoid;
      margin-bottom: var(--space-6);
    }
    .pagina:not(.larga) .contenuto > :global(.segmenti),
    .pagina:not(.larga) .contenuto > :global(.nastro),
    .pagina:not(.larga) .contenuto > :global(.settimana),
    .pagina:not(.larga) .contenuto > :global(.mese),
    .pagina:not(.larga) .contenuto > :global(.filtri),
    .pagina:not(.larga) .contenuto > :global(.intera) {
      column-span: all;
    }
    .pagina:not(.larga) .contenuto > :global(.segmenti) { max-width: 520px; }
  }
</style>
