<!--
  TitoloGruppo — il titolo grande che è anche un menu.

  Mobilità e Training sono una scheda sola nella barra («Corpo»): quale dei
  due stai guardando lo dice il titolo, e toccandolo si passa all'altro.
  È il gesto del titolo di Foto e di Promemoria in iOS: una freccetta
  accanto al nome, un menu di vetro che scende da lì. Nella app di prima
  c'erano un interruttore SOPRA il titolo e le pillole sotto: tre righe di
  navigazione prima del primo dato.
-->
<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import Icona from "./Icona.svelte";
  import { GRUPPI, voceDi, ricordaMembro } from "$lib/core/registro";
  import { vaiA } from "$lib/core/router.svelte";

  let { id }: { id: string } = $props();

  const gruppo = $derived(GRUPPI.find((g) => g.membri.includes(id))!);
  const membri = $derived(gruppo.membri.map((m) => voceDi(m)!));
  let aperto = $state(false);

  function scegli(m: string) {
    aperto = false;
    if (m === id) return;
    ricordaMembro(gruppo.id, m);
    vaiA(m, { sostituisci: true });
  }

  function suTasto(e: KeyboardEvent) {
    if (e.key === "Escape") aperto = false;
  }
</script>

<svelte:window onkeydown={suTasto} />

<div class="gruppo">
  <button
    type="button"
    class="titolo text-large-title"
    aria-haspopup="menu"
    aria-expanded={aperto}
    onclick={() => (aperto = !aperto)}
  >
    {voceDi(id)?.nome}
    <span class="freccia" class:su={aperto}><Icona nome="giu" misura={20} tratto={2.6} /></span>
  </button>

  {#if aperto}
    <button type="button" class="velo" aria-label="Chiudi" onclick={() => (aperto = false)} transition:fade={{ duration: 150 }}></button>
    <div class="menu" role="menu" transition:scale={{ start: 0.9, duration: 180, opacity: 0 }}>
      {#each membri as m (m.id)}
        <button type="button" role="menuitemradio" aria-checked={m.id === id} class="voce" onclick={() => scegli(m.id)}>
          <span class="tessera" style:--colore={m.accento}><Icona nome={m.icona} misura={17} tratto={2} /></span>
          <span class="nome">{m.nome}</span>
          {#if m.id === id}<span class="spunta"><Icona nome="spunta" misura={17} tratto={2.6} /></span>{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .gruppo { position: relative; }
  .titolo { display: inline-flex; align-items: center; gap: 6px; }
  .titolo:active { opacity: 0.6; }
  .freccia {
    display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
    background: var(--fill-tertiary); color: var(--label-secondary);
    transition: transform var(--duration-normal) var(--ease-spring);
  }
  .freccia.su { transform: rotate(180deg); }

  .velo { position: fixed; inset: 0; z-index: 40; background: transparent; cursor: default; }
  .menu {
    position: absolute; z-index: 41; top: calc(100% + 6px); left: 0;
    min-width: 240px; padding: 6px;
    border-radius: var(--radius-xxl);
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), var(--glass-shadow);
    transform-origin: top left;
  }
  .voce {
    width: 100%; display: flex; align-items: center; gap: var(--space-3);
    min-height: 48px; padding: 0 var(--space-3); border-radius: var(--radius-lg);
    font-size: var(--text-body);
  }
  .voce:active { background: var(--fill-tertiary); }
  .tessera { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--colore); color: #fff; }
  .nome { flex: 1; text-align: left; }
  .spunta { color: var(--accento); }
</style>
