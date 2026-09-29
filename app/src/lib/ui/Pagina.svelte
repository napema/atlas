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
    stretta = false,
    strumenti,
    laterale,
    children,
  }: {
    titolo: string;
    /** La riga piccola sopra il titolo grande: una data, uno stato. */
    sopra?: Snippet | string;
    /** Il bottone indietro, con l'etichetta della schermata di prima. */
    indietro?: string | { etichetta: string; fai: () => void };
    /** I bottoni tondi sulla linea del titolo. */
    azioni?: Snippet;
    /** Qualcosa al posto del titolo grande (il selettore di un gruppo). */
    testata?: Snippet;
    /** La pagina fa da sé le sue colonne (la home): niente colonne automatiche. */
    larga?: boolean;
    /** Una colonna sola, stretta e centrata: le schermate da compilare —
        le impostazioni — non sono un cruscotto. Su Mac le Impostazioni di
        Sistema sono una colonna da seicento punti anche a tutto schermo. */
    stretta?: boolean;
    /** I controlli della pagina (segmenti, strisce di giorni): una riga in
        cima, a tutta larghezza. */
    strumenti?: Snippet;
    /** Il riepilogo del modulo: sul PC è la colonna fissa di sinistra. */
    laterale?: Snippet;
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

<header class="barra" class:compatta class:larga class:stretta bind:this={barraEl}>
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
    <div class="lato destra azioni-barra">{@render azioni?.()}</div>
  </div>
</header>

<main class="pagina" class:larga class:stretta>
  {#if sopra}
    <p class="sopra text-footnote secondario">
      {#if typeof sopra === "string"}{sopra}{:else}{@render sopra()}{/if}
    </p>
  {/if}
  <div class="titolo-grande" bind:this={sentinella}>
    <div class="titolo-riga">
      <div class="titolo-testo">
        {#if testata}{@render testata()}{:else}<h1 class="text-large-title">{titolo}</h1>{/if}
      </div>
      <!-- Le azioni della schermata stanno QUI, sulla linea del titolo, sul
           telefono come sul PC. Nell'angolo della barra erano un bottone
           solo in alto a destra, a cento punti dal titolo di cui sono
           l'azione. -->
      {#if azioni}<div class="azioni-titolo">{@render azioni()}</div>{/if}
    </div>
  </div>
  <div class="contenuto" class:con-laterale={Boolean(laterale)}>
    {#if strumenti}<div class="strumenti">{@render strumenti()}</div>{/if}
    {#if laterale}<aside class="laterale">{@render laterale()}</aside>{/if}
    <div class="principale">{@render children()}</div>
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
  /* IL VETRO SI ACCENDE SOLO QUANDO SERVE, e la sfocatura con lui.
     Prima `backdrop-filter` stava qui sempre, spento con `opacity: 0`: su
     iPhone invisibile non vuol dire inattivo — la sfocatura continuava ad
     applicarsi ai primi cento punti dello schermo. L'icona dentro la barra
     e la riga della data si vedevano sgranate, e sopra non c'era niente a
     cui dare la colpa. (Ed è anche una sfocatura a tutta larghezza
     ricalcolata a ogni fotogramma di scorrimento, per niente.) */
  .barra::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    background: var(--glass-bg);
    border-bottom: 0.5px solid var(--separator);
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-default);
  }
  .barra.compatta::before {
    opacity: 1;
    /* Il vetro da solo non copriva: scorrendo, il titolo piccolo finiva
       sopra la cifra della carta sotto e si leggevano due testi uno
       sull'altro. Nemmeno al 94 per cento bastava — una cifra bianca
       grande si vedeva lo stesso — quindi qui e' opaca, con la sua
       riga sottile sotto, come la barra di iOS quando il titolo si
       stringe. Il vetro di ATLAS sta nelle carte e nella barra delle
       schede, dove dietro c'e' davvero qualcosa; qui dietro c'e' solo il
       testo che questa barra esiste per coprire, e la sfocatura su iOS
       costava anche la nitidezza dell'ingranaggio. */
    background: var(--bg-grouped-primary);
  }

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
  .titolo-riga { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-width: 0; }
  .titolo-testo { min-width: 0; flex: 1; }
  /* LE AZIONI STANNO COL TITOLO, ovunque. Nella barra erano un bottone
     solo, in alto a destra, a un centinaio di punti dal titolo di cui sono
     l'azione: non si capiva a cosa appartenessero. Tornano nella barra
     quando il titolo grande è scorso via, che è l'unico momento in cui lì
     hanno di nuovo un titolo accanto. */
  .azioni-titolo { display: flex; flex: none; align-items: center; gap: var(--space-2); }
  /* Niente vetro qui: sotto c'è il fondo della pagina, non c'è niente da
     sfocare — e su iPhone `backdrop-filter` ricampiona il contenuto del
     bottone, cioè sgrana l'icona che sta dentro. */
  .azioni-titolo :global(.vetro) {
    -webkit-backdrop-filter: none; backdrop-filter: none;
    background: var(--fill-tertiary);
    box-shadow: none;
  }
  .barra:not(.compatta) .azioni-barra { visibility: hidden; }
  /* Sul telefono: una colonna, nell'ordine strumenti → riepilogo → resto. */
  .contenuto, .strumenti, .laterale, .principale { display: flex; flex-direction: column; gap: var(--space-6); }
  .principale > :global(*), .laterale > :global(*), .strumenti > :global(*) { min-width: 0; }

  /* SUL PC, UNA GRIGLIA COL RIGHELLO. Tre regole, uguali in ogni modulo:

     1. gli STRUMENTI stanno in una riga a tutta larghezza, allineati a
        sinistra e non stirati;
     2. il RIEPILOGO del modulo è una colonna fissa di 380px a sinistra, e
        resta in vista mentre scorri;
     3. il RESTO è una griglia di celle da almeno 420px, con i bordi
        superiori sulla stessa linea in ogni riga.

     Prima le sezioni si versavano in colonne automatiche: ognuna cadeva
     dove capitava, un titolo a 205px e quello accanto a 238, un bottone da
     solo in cima alla terza colonna. Qui niente cade: ha un posto. */
  @media (min-width: 1000px) {
    :global(:root) { --larghezza-pagina: min(calc(100vw - 96px), 1640px); }
    .pagina { padding-left: max(var(--space-8), var(--content-inset)); padding-right: max(var(--space-8), var(--content-inset)); }
    .barra-riga { padding-left: max(var(--space-8), var(--content-inset)); padding-right: max(var(--space-8), var(--content-inset)); }

    .pagina:not(.larga) .contenuto {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      column-gap: var(--space-8); row-gap: var(--space-6);
      align-items: start;
    }
    .pagina:not(.larga) .contenuto.con-laterale { grid-template-columns: 380px minmax(0, 1fr); }
    .strumenti { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: var(--space-8); row-gap: var(--space-4); }
    .strumenti > :global(.segmenti) { width: 420px; }
    .strumenti > :global(.settimana) { width: 520px; }
    .strumenti > :global(.nastro) { flex: 1 1 100%; margin: 0; padding: 4px 0; }
    .laterale { position: sticky; top: calc(var(--altezza-barra) + var(--space-4)); }
    /* LE LASTRE SI IMPILANO PER COLONNA, NON PER RIGA.

       Era una griglia `auto-fit`: bella finché le lastre erano alte uguali,
       e non lo sono mai. Una riga di griglia è alta quanto la sua lastra più
       alta, quindi sotto «Dove sono i soldi» restava un buco alto quanto la
       differenza con «In arrivo», e così in ogni modulo — il buco FRA le
       carte, che è la cosa che si nota di più e che si perdona di meno.

       Ora sono colonne che scorrono, come un giornale: ogni lastra si mette
       sotto la precedente della sua colonna, e fra due lastre c'è sempre e
       solo il passo della pagina. Le colonne possono finire ad altezze
       diverse, ma solo in fondo, dove una pagina finisce comunque.

       L'ordine si legge dall'alto in basso e poi a destra: la prima lastra
       del modulo è la prima in alto a sinistra, che è dove deve stare la
       più importante.

       Mai una colonna vuota: con due lastre al massimo due colonne, con una
       una sola — altrimenti tornerebbe il mezzo monitor nero di prima. */
    .pagina:not(.larga):not(.stretta) .principale {
      display: block;
      columns: 400px;
      column-gap: var(--space-8);
    }
    .pagina:not(.larga):not(.stretta) .principale:not(:has(> :nth-child(3))) { columns: 400px 2; }
    .pagina:not(.larga):not(.stretta) .principale:not(:has(> :nth-child(2))) { columns: 1; }
    .pagina:not(.larga):not(.stretta) .principale > :global(*) {
      break-inside: avoid;
      margin-bottom: var(--space-6);
    }
    .principale > :global(.vuoto), .principale > :global(.intera) { column-span: all; }

    /* STRETTA: una colonna sola, centrata. Niente riepilogo a sinistra e
       niente colonne: le impostazioni si leggono dall'alto in basso. */
    .pagina.stretta .contenuto { display: flex; align-items: stretch; width: 100%; max-width: 680px; margin: 0 auto; }
    .pagina.stretta .titolo-grande, .pagina.stretta .sopra { max-width: 680px; margin-left: auto; margin-right: auto; }
    /* Anche «‹ Impostazioni» sta sopra la colonna, non nell'angolo dello
       schermo a cinquecento punti dal titolo di cui è il ritorno. */
    .barra.stretta .barra-riga { max-width: calc(680px + 2 * var(--space-8)); }

    /* Una sezione senza titolo accanto a una col titolo cominciava 33px più
       in alto. Sul PC anche lei tiene lo spazio del titolo, vuoto: le lastre
       partono tutte alla stessa quota. */
    .pagina:not(.stretta) .principale > :global(.sezione > .testa-vuota),
    .pagina:not(.stretta) .laterale > :global(.sezione:first-child > .testa-vuota) { display: block; }
  }

  /* L'IPHONE IN ORIZZONTALE: alto 375-430 punti, largo 667-932.

     Con le regole del telefono in verticale la pagina restava una colonna
     sola larga 672: titolo grande, segmenti e la prima domanda riempivano
     da soli tutto lo schermo, la barra delle schede copriva quello che
     veniva dopo, e la cosa da fare stava tre scorrimenti più in basso.

     Qui la pagina prende tutta la larghezza meno gli inset (che adesso
     tengono fuori la Dynamic Island, vedi `--content-inset`), il titolo si
     accorcia — in orizzontale iOS non mostra affatto il titolo grande, qui
     lo si tiene ma più basso perché porta le azioni e il selettore del
     gruppo — e riepilogo e contenuto si mettono FIANCO A FIANCO, come sul
     PC: il contesto a sinistra, la cosa da fare a destra, tutte e due nel
     primo schermo.

     Il riepilogo non è appiccicato: in 390 punti di altezza una colonna
     ferma più alta dello schermo nasconderebbe per sempre il suo fondo. */
  @media (orientation: landscape) and (max-height: 500px) {
    :global(:root) {
      --larghezza-pagina: 100%;
      --spazio-schede: calc(max(env(safe-area-inset-bottom, 0px), 8px) + 64px);
    }
    .pagina { padding-top: calc(var(--altezza-barra) - 12px); }
    .titolo-grande { margin-bottom: var(--space-3); }
    .titolo-grande :global(.text-large-title) { font-size: 28px; line-height: 34px; }
    .contenuto { gap: var(--space-4); }
    .contenuto.con-laterale {
      display: grid;
      grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
      column-gap: var(--space-6); row-gap: var(--space-4);
      align-items: start;
    }
    .strumenti { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: var(--space-6); row-gap: var(--space-3); }
    .strumenti > :global(.segmenti) { flex: 1 1 280px; max-width: 420px; }
    .strumenti > :global(.settimana) { flex: 1 1 320px; max-width: 520px; }
    .laterale { position: static; }
  }
</style>
