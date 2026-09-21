<!--
  Avvisi — la capsula di vetro che scende dall'alto e risale da sola.
  `aria-live` perché VoiceOver la legga senza spostare il focus.
-->
<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { scale } from "svelte/transition";
  import { avvisi, chiudiAvviso, celebrazione } from "$lib/core/avvisi.svelte";

  /* IL LIVELLO PIÙ ALTO, sopra anche ai fogli. Un <dialog> aperto con
     `showModal()` sta nel «top layer» del browser, sopra a qualunque
     z-index: un avviso normale finirebbe sotto il foglio, e «Serve un nome»
     detto dentro un foglio non lo vedrebbe nessuno. Un popover sta nello
     stesso livello, e riaprirlo lo rimette in cima alla pila. */
  let strato: HTMLElement | undefined = $state();
  $effect(() => {
    const c = avvisi.corrente?.id ?? celebrazione.corrente?.id;
    if (!strato || !("showPopover" in strato)) return;
    try {
      if (strato.matches(":popover-open")) strato.hidePopover();
      if (c != null) strato.showPopover();
    } catch { /* senza popover resta un livello normale */ }
  });
</script>

<div class="strato" popover="manual" bind:this={strato}>

<div class="cassetto" role="status" aria-live="polite">
  {#key avvisi.corrente?.id}
    {#if avvisi.corrente}
      {@const a = avvisi.corrente}
      <div
        class="bolla text-subheadline"
        class:errore={a.tipo === "errore"}
        in:fly={{ y: -24, duration: 320, easing: cubicOut }}
        out:fly={{ y: -24, duration: 220 }}
      >
        <span class="testo">{a.testo}</span>
        {#if a.azione}
          <button type="button" class="azione" onclick={() => { a.azione?.fai(); chiudiAvviso(); }}>
            {a.azione.etichetta}
          </button>
        {/if}
      </div>
    {/if}
  {/key}
</div>

{#key celebrazione.corrente?.id}
  {#if celebrazione.corrente}
    <div class="festa" aria-hidden="true" in:scale={{ start: 0.8, duration: 260, easing: cubicOut }} out:scale={{ start: 0.9, duration: 200, opacity: 0 }}>
      <svg viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 33.5 28 43.5 46 22" class="tratto" />
      </svg>
      {#if celebrazione.corrente.testo}<p class="text-headline">{celebrazione.corrente.testo}</p>{/if}
    </div>
  {/if}
{/key}
</div>

<style>
  .strato {
    position: fixed; inset: 0; width: 100%; height: 100%;
    margin: 0; padding: 0; border: 0; background: transparent; overflow: visible;
    pointer-events: none; color: inherit;
  }
  .strato:not(:popover-open) { display: block; }
  .festa {
    position: fixed; z-index: 60; left: 50%; top: 42%; translate: -50% -50%;
    min-width: 160px; max-width: 240px; padding: var(--space-6) var(--space-5) var(--space-5);
    display: flex; flex-direction: column; align-items: center; gap: var(--space-2); text-align: center;
    border-radius: var(--radius-xxxl);
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), var(--glass-shadow);
    color: var(--label-primary); pointer-events: none;
  }
  .festa svg { color: var(--color-green); }
  .tratto { stroke-dasharray: 48; stroke-dashoffset: 48; animation: disegna 0.4s var(--ease-out) 0.1s forwards; }
  @keyframes disegna { to { stroke-dashoffset: 0; } }
  .cassetto {
    position: fixed; z-index: 50; left: 0; right: 0;
    top: calc(env(safe-area-inset-top, 0px) + 6px);
    display: grid; justify-items: center; pointer-events: none;
    padding: 0 var(--content-inset);
  }
  .bolla {
    grid-area: 1 / 1;
    pointer-events: auto;
    display: flex; align-items: center; gap: var(--space-3);
    max-width: 420px; min-height: 44px; padding: 10px 18px;
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(6px) saturate(1.8);
    backdrop-filter: blur(6px) saturate(1.8);
    box-shadow: inset 0 0 0 0.5px var(--glass-rim), var(--glass-shadow);
    font-weight: var(--weight-medium);
  }
  .errore .testo { color: var(--color-red); }
  .azione { color: var(--accento, var(--color-blue)); font-weight: var(--weight-semibold); flex: none; }
</style>
