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
  <div class="capsula">
    {#if scelta >= 0}
      <span class="pastiglia" style:--i={scelta} aria-hidden="true"></span>
    {/if}
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
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), var(--glass-shadow);
    isolation: isolate;
  }
  .pastiglia {
    position: absolute; z-index: -1; top: 4px; bottom: 4px; left: 4px;
    width: calc((100% - 8px) / var(--n));
    transform: translateX(calc(100% * var(--i)));
    border-radius: var(--radius-full);
    background: var(--fill-tertiary);
    transition: transform var(--duration-normal) var(--ease-spring);
  }
  .scheda {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
    min-width: 0; border-radius: var(--radius-full);
    color: var(--label-primary);
    transition: color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring);
  }
  .scheda:active { transform: scale(0.92); }
  .scheda.scelta { color: var(--colore); }
  .nome {
    font-size: 10px; line-height: 12px; letter-spacing: 0.1px; font-weight: var(--weight-semibold);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }
</style>
