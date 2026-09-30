<!--
  Sezione — un gruppo di righe su una lastra, con titolo e nota facoltativi.
  È la lista «inset grouped» di iOS: la pagina è il fondo, i gruppi salgono.

  `nuda` toglie la lastra, per le sezioni che contengono carte proprie
  (i riquadri della home, un grafico).
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    titolo,
    piede,
    coda,
    nuda = false,
    children,
  }: {
    titolo?: string;
    /** La nota piccola sotto la lastra. */
    piede?: string | Snippet;
    /** Un collegamento a destra del titolo («Tutte», «Modifica»). */
    coda?: Snippet;
    nuda?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="sezione">
  {#if titolo || coda}
    <div class="testa">
      {#if titolo}<h2 class="text-title3">{titolo}</h2>{/if}
      {#if coda}<div class="coda text-body">{@render coda()}</div>{/if}
    </div>
  {:else}
    <!-- Lo spazio del titolo, vuoto: lo accende Pagina sul PC per allineare
         le lastre di una riga. Sul telefono non occupa niente. -->
    <div class="testa-vuota" aria-hidden="true"></div>
  {/if}
  <div class={nuda ? "nuda" : "lastra"}>
    {@render children()}
  </div>
  {#if piede}
    <p class="piede text-footnote secondario">
      {#if typeof piede === "string"}{piede}{:else}{@render piede()}{/if}
    </p>
  {/if}
</section>

<style>
  .sezione { display: flex; flex-direction: column; }
  /* ALTEZZA FISSA, non «quello che ci sta dentro». Una coda con una
     pastiglia — «8 in ritardo» — è alta 28 punti contro i 25 della riga del
     titolo, e faceva scendere la SUA carta di tre punti rispetto a quella
     accanto: due lastre della stessa riga che non partono dalla stessa
     quota. Tre punti si vedono, ed è esattamente il genere di storto che
     non si riesce a indicare ma si sente.

     `center` e non `baseline` per la stessa ragione: una pastiglia
     allineata alla linea di base del titolo pende verso il basso. */
  .testa {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    height: var(--lh-title3);
    padding: 0 var(--space-1);
    margin-bottom: var(--space-2);
  }
  /* La coda e' una RIGA. Era un blocco, e con due cose dentro — un
     contatore e un bottone — la seconda andava a capo e finiva a penzolare
     sotto, fuori dalla testa che ha altezza fissa. */
  .coda {
    display: flex; align-items: center; gap: var(--space-2);
    color: var(--accento);
  }
  /* Lo stesso ingombro della testa piena: riga del titolo più il distacco. */
  .testa-vuota { display: none; height: calc(var(--lh-title3) + var(--space-2)); }
  /* Il fondo, l'anello, la luce e l'ombra della lastra stanno in `app.css`,
     globali: sono la stessa ricetta per ogni carta della app. Qui resta solo
     quello che riguarda la sezione, cioè tenere dentro le righe. */
  .lastra { overflow: hidden; }
  .nuda { display: flex; flex-direction: column; gap: var(--space-3); }
  .piede { padding: var(--space-2) var(--space-4) 0; }
</style>
