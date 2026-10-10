<!--
  BarraSchede — la barra delle schede di iOS 27: una capsula di vetro che
  galleggia sopra il contenuto, staccata dal bordo. La scheda scelta ha una
  pastiglia dietro e il colore del SUO modulo: la barra dice dove sei anche
  con la coda dell'occhio.

  Cinque schede al massimo, e Impostazioni non è fra quelle (sta
  nell'ingranaggio della home): a sei le etichette diventano illeggibili
  proprio dove il pollice ha meno spazio.
-->
<script lang="ts">
  import Icona from "./Icona.svelte";
  import { router } from "$lib/core/router.svelte";
  import { MODULI_IN_BARRA, membroRicordato, voceDi } from "$lib/core/registro";

  const voci = MODULI_IN_BARRA.map((v) => ({
    ...v,
    accento: voceDi(v.gruppo ? v.gruppo.membri[0] : v.id)?.accento ?? "var(--color-blue)",
  }));

  const scelta = $derived(voci.findIndex((v) => v.rotte.includes(router.id)));

  // Il gruppo apre il membro guardato per ultimo: chi stava su Training ci
  // torna, non viene rimandato a Mobilità ogni volta.
  const destinazione = (v: (typeof voci)[number]) =>
    `#/${v.gruppo ? membroRicordato(v.gruppo) : v.id}`;
</script>

<nav class="barra-schede" aria-label="Schede" style:--n={voci.length}>
  <!-- LA PASTIGLIA NON VIAGGIA. Era un elemento solo, spostato con un
       `translateX` e una curva che rimbalzava oltre il bersaglio: toccando
       Corpo da Oggi strisciava sopra tutte le schede di mezzo e ci ballava
       sopra. Non lo fa nessuna barra di Apple. Su iOS la scheda scelta si
       accende DOVE l'hai toccata — e la lastrina compare sotto il dito già
       alla pressione, prima ancora di alzarlo. Adesso ogni scheda ha la sua,
       e cambiare scheda vuol dire spegnerne una e accenderne un'altra. -->
  <div class="capsula vetro">
    {#each voci as v, i (v.id)}
      <a
        class="scheda"
        class:scelta={i === scelta}
        href={destinazione(v)}
        style:--colore={v.accento}
        aria-current={i === scelta ? "page" : undefined}
      >
        <Icona nome={v.icona} misura={25} tratto={i === scelta ? 2 : 1.7} />
        <span class="nome">{v.nome}</span>
      </a>
    {/each}
  </div>
</nav>

<style>
  .barra-schede {
    position: fixed; z-index: 30; left: 0; right: 0;
    bottom: max(12px, calc(env(safe-area-inset-bottom, 0px) - 8px));
    display: flex; justify-content: center;
    padding: 0 var(--content-inset);
    pointer-events: none;
  }
  .capsula {
    position: relative; pointer-events: auto;
    display: grid; grid-template-columns: repeat(var(--n), 1fr);
    width: 100%; max-width: 440px; height: 62px; padding: 4px;
    /* Il materiale lo mette `.vetro` (app.css): corpo sfocato, anello in
       tre pezzi, speculare, ombra. Qui resta solo la forma. */
    border-radius: var(--radius-full);
  }
  .scheda {
    position: relative; isolation: isolate;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
    min-width: 0; border-radius: var(--radius-full);
    color: var(--label-primary);
    transition: color var(--duration-fast) var(--ease-default);
    -webkit-tap-highlight-color: transparent;
  }
  /* LA LASTRINA DI OGNI SCHEDA.

     GRIGIA, NON TINTA. Provata con la tinta della scheda: l'arancio di
     Finanze al venti per cento sopra un vetro scuro non e' arancione, e'
     fango — e lo stesso vale per il rosso e per l'indaco. Il colore della
     scheda si legge dove ha sempre vissuto, sull'icona e sull'etichetta.

     COMPARE SUL POSTO: si accende in dissolvenza e cresce appena, da poco
     sotto la sua misura, con una curva che NON va oltre il bersaglio. La
     curva di prima (`--ease-spring`) arrivava al 156 per cento e tornava
     indietro: un rimbalzo da giocattolo, non da sistema. */
  .scheda::before {
    content: ""; position: absolute; inset: 0; z-index: -1;
    border-radius: inherit;
    background: var(--fill-secondary);
    box-shadow: inset 0 0 0 0.5px var(--vetro-rim-su);
    opacity: 0; transform: scale(0.86);
    transition: opacity var(--duration-fast) var(--ease-default),
      transform var(--duration-fast) var(--ease-default);
  }
  .scheda.scelta::before { opacity: 1; transform: none; }
  /* SOTTO IL DITO, SUBITO. È quello che fa la barra di iOS: la lastrina
     compare alla pressione, non al rilascio. Prima la scheda si
     rimpiccioliva (`scale(0.92)`), che è il gesto di un bottone, non di
     una scheda. Un filo più chiara di quella scelta, perché è un tocco in
     corso e non ancora una scelta. */
  .scheda:active::before { opacity: 0.7; transform: none; transition-duration: var(--duration-micro); }
  .scheda.scelta { color: var(--colore); }
  .nome {
    font-size: 10px; line-height: 12px; letter-spacing: 0.1px; font-weight: var(--weight-semibold);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }

  /* In orizzontale la barra di sistema di iOS si abbassa e mette icona ed
     etichetta sulla stessa riga. Alta 62 su 390 era un sesto dello schermo
     coperto per cinque bottoni. */
  @media (orientation: landscape) and (max-height: 500px) {
    .capsula { height: 44px; max-width: 600px; padding: 3px; }
    .scheda { flex-direction: row; gap: 6px; }
    .scheda :global(svg) { width: 20px; height: 20px; }
    .nome { font-size: 12px; line-height: 14px; }
  }
</style>
