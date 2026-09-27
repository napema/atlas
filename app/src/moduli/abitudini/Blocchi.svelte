<!--
  I due blocchi: le otto non negoziabili e il supporto.

  Sono DUE LASTRE PARI, affiancate sul PC e una sotto l'altra sul telefono,
  dove affiancarle vorrebbe dire otto righe larghe mezzo schermo con i nomi
  tagliati a metà.

  Restano due cose diverse, e questo è il punto che era costato caro
  scoprirlo: in una lista sola, quando ne manca una non sai se hai perso il
  contatore o se hai saltato la skincare. Ma la differenza sta nel CONTATORE
  E NEL VERDETTO — solo le otto hanno «3/8» in testa e un bordo che diventa
  verde — non nel far sembrare il supporto una voce di serie B. Le righe
  basse, il testo piccolo e l'opacità dicevano «questa cosa conta meno di
  te», e non è vero: è un'altra cosa, in parallelo.

  IL BORDO DELLE OTTO RESTA NEUTRO FINO A 7/8. Sette su otto non è «quasi»,
  è un giorno perso, e un feedback positivo parziale lo racconterebbe come
  un successo a cui manca poco. Il supporto invece può illuminarsi quando è
  pieno senza mentire a nessuno: lì non c'è niente da perdere.
-->
<script lang="ts">
  import RigaAbitudine from "./RigaAbitudine.svelte";

  let {
    otto,
    supporto,
    giorno,
    fatte,
    previste,
    supportoFatte = 0,
    bloccato = false,
    onapri,
  }: {
    otto: any[];
    supporto: any[];
    giorno: string;
    fatte: number;
    previste: number;
    supportoFatte?: number;
    /** Giorno chiuso: le righe si leggono e non si toccano. */
    bloccato?: boolean;
    onapri: (id: string) => void;
  } = $props();

  const pieno = $derived(previste > 0 && fatte === previste);
  const supportoPieno = $derived(supporto.length > 0 && supportoFatte === supporto.length);
</script>

<!-- Niente contenitore attorno ai due: sono due figli della griglia della
     pagina, e sul PC si dispongono da sé nelle sue colonne. Un involucro li
     avrebbe tenuti in una cella sola, che è come stavano prima. -->
<section class="blocco" class:pieno class:chiuso={bloccato}>
  <header class="capo">
    <span class="titolo text-footnote semibold">Project 50</span>
    <span class="conto cifre">{fatte}/{previste}</span>
  </header>
  <div class="righe">
    {#each otto as h (h.id)}
      <RigaAbitudine {h} {giorno} bloccata={bloccato} {onapri} />
    {/each}
  </div>
</section>

{#if supporto.length}
  <section class="blocco supporto" class:pieno={supportoPieno} class:chiuso={bloccato}>
    <header class="capo">
      <span class="titolo text-footnote semibold">Supporto</span>
      <span class="conto cifre">{supportoFatte}/{supporto.length}</span>
    </header>
    <div class="righe">
      {#each supporto as h (h.id)}
        <RigaAbitudine {h} {giorno} bloccata={bloccato} {onapri} />
      {/each}
    </div>
  </section>
{/if}

<style>
  .blocco {
    border-radius: 16px;
    background: var(--bg-grouped-secondary);
    box-shadow: inset 0 0 0 1.5px var(--separator);
    /* NIENTE `overflow: hidden` QUI. Rende il blocco un contenitore di
       scorrimento, e una testata `sticky` dentro un contenitore che non
       scorre non si stacca mai: restava incollata sopra la prima riga già a
       pagina ferma. Gli angoli se li arrotonda la testata da sé. */
    transition: box-shadow var(--duration-slow) var(--ease-default);
  }
  .blocco.pieno { box-shadow: inset 0 0 0 1.5px var(--color-green); }
  /* Un giorno chiuso e perso non prende il rosso al bordo: il rosso è la
     casella nella striscia e il verdetto nel foglio, detti una volta sola. */

  /* La testata resta in cima mentre scorri: con otto righe e la morning
     routine aperta, il contatore usciva dallo schermo proprio mentre lo
     stavi facendo salire. */
  .capo {
    position: sticky; top: calc(var(--altezza-barra) - 1px); z-index: 2;
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-grouped-secondary);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 0.5px 0 var(--separator);
  }
  .titolo { letter-spacing: 0.8px; text-transform: uppercase; color: var(--label-secondary); }
  .conto { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .pieno .titolo, .pieno .conto { color: var(--color-green); }
  /* Il titolo del supporto è secondario anche da pieno: il verde lì dice
     «fatto», non «contatore salvo». */
  .supporto .conto { font-size: var(--text-headline); }

  .righe { padding: 0 var(--space-4) var(--space-2); }
  .righe > :global(.abitudine + .abitudine) { box-shadow: inset 0 0.5px 0 var(--separator); }
</style>
