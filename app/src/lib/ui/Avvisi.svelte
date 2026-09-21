<!--
  Avvisi — la capsula di vetro che scende dall'alto e risale da sola.
  `aria-live` perché VoiceOver la legga senza spostare il focus.
-->
<script lang="ts">
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { avvisi, chiudiAvviso } from "$lib/core/avvisi.svelte";
</script>

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

<style>
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
