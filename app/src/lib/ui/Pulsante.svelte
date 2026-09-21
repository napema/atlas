<!--
  Pulsante — le quattro forme dei bottoni di iOS 27, e basta.

    pieno   il colore del modulo, testo bianco: l'azione principale, UNA
            per schermata
    tinto   il colore del modulo a velo, testo nel colore: le secondarie
    grigio  riempimento di sistema: le neutre («Annulla»)
    vetro   Liquid Glass: i bottoni che galleggiano sopra il contenuto,
            nella barra e nei fogli

  `tondo` lo fa cerchio, per un'icona sola.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Icona from "./Icona.svelte";

  let {
    variante = "tinto",
    misura = "grande",
    tondo = false,
    larga = false,
    distruttivo = false,
    icona,
    etichetta,
    href,
    type = "button",
    disabled = false,
    onclick,
    children,
  }: {
    variante?: "pieno" | "tinto" | "grigio" | "vetro" | "testo";
    misura?: "grande" | "media" | "piccola";
    tondo?: boolean;
    larga?: boolean;
    distruttivo?: boolean;
    icona?: string;
    /** Per VoiceOver, obbligatoria sui bottoni tondi senza testo. */
    etichetta?: string;
    href?: string;
    type?: "button" | "submit";
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();

  const misuraIcona = $derived(misura === "grande" ? 22 : misura === "media" ? 19 : 16);
</script>

<svelte:element
  this={href ? "a" : "button"}
  class="pulsante {variante} {misura}"
  class:tondo
  class:larga
  class:distruttivo
  href={href}
  type={href ? undefined : type}
  disabled={href ? undefined : disabled}
  aria-label={etichetta}
  onclick={onclick}
>
  {#if icona}<Icona nome={icona} misura={misuraIcona} tratto={2} />{/if}
  {@render children?.()}
</svelte:element>

<style>
  .pulsante {
    --colore: var(--accento, var(--color-blue));
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    flex: none;
    border-radius: var(--radius-full);
    font-weight: var(--weight-semibold);
    white-space: nowrap;
    user-select: none; -webkit-user-select: none;
    transition: transform var(--duration-fast) var(--ease-spring), opacity var(--duration-micro) linear,
      background-color var(--duration-fast) var(--ease-default);
  }
  .pulsante.distruttivo { --colore: var(--color-red); }
  .pulsante:active:not(:disabled) { transform: scale(0.96); opacity: 0.85; }
  .pulsante:disabled { opacity: 0.35; cursor: default; }

  .grande  { height: var(--button-height); padding: 0 var(--space-6); font-size: var(--text-body); letter-spacing: var(--ls-body); }
  .media   { height: var(--button-height-medium); padding: 0 var(--space-4); font-size: var(--text-subheadline); letter-spacing: var(--ls-subheadline); }
  .piccola { height: 28px; padding: 0 var(--space-3); font-size: var(--text-footnote); letter-spacing: var(--ls-footnote); }

  .tondo { padding: 0; aspect-ratio: 1; }
  .tondo.grande  { width: var(--button-height); }
  .tondo.media   { width: var(--touch-target); height: var(--touch-target); }
  .tondo.piccola { width: 28px; }
  .larga { width: 100%; }

  .pieno  { background: var(--colore); color: #fff; }
  .tinto  { background: color-mix(in srgb, var(--colore) 18%, transparent); color: var(--colore); }
  .grigio { background: var(--fill-tertiary); color: var(--label-primary); }
  .testo  { background: none; color: var(--colore); padding-inline: var(--space-2); font-weight: var(--weight-regular); }
  .testo.tondo { padding: 0; }

  /* Liquid Glass «regular», la ricetta misurata: sfocatura 6, saturazione
     1,8, anello chiaro, ombra ampia e morbida. */
  .vetro {
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), 0 4px 24px rgba(0, 0, 0, 0.14);
    color: var(--label-primary);
    font-weight: var(--weight-medium);
  }
</style>
