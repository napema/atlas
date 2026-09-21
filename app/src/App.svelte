<!--
  App — il guscio. La schermata della rotta corrente, la barra delle schede,
  gli avvisi. Niente altro: tutto ciò che sa di un modulo sta nel modulo.
-->
<script lang="ts">
  import type { Component } from "svelte";
  import { fade } from "svelte/transition";
  import { router } from "$lib/core/router.svelte";
  import { MODULI, voceDi, gruppoDi, ricordaMembro } from "$lib/core/registro";
  import BarraSchede from "$lib/ui/BarraSchede.svelte";
  import Avvisi from "$lib/ui/Avvisi.svelte";

  // Le schermate già caricate. `raw`: sono funzioni, non c'è niente dentro
  // da rendere reattivo, e un proxy sopra un componente non serve a nessuno.
  let schermate = $state.raw<Record<string, Component<{ resto: string[] }>>>({});
  let guasto = $state<string | null>(null);

  function carica(id: string) {
    if (schermate[id]) return Promise.resolve();
    const voce = voceDi(id);
    if (!voce) return Promise.resolve();
    return voce.vista()
      .then((m) => { schermate = { ...schermate, [id]: m.default }; })
      .catch((e) => {
        console.error(`[app] schermata "${id}" non caricata`, e);
        guasto = id;
      });
  }

  $effect(() => {
    const id = router.id;
    guasto = null;
    carica(id);
    const g = gruppoDi(id);
    if (g) ricordaMembro(g.id, id);
  });

  // Cambiando scheda si riparte dall'alto: arrivare a metà di una
  // schermata che non hai mai visto disorienta.
  let ultimo = "";
  $effect(() => {
    const id = router.id;
    if (ultimo && ultimo !== id) window.scrollTo(0, 0);
    ultimo = id;
  });

  // Le altre schermate si caricano appena il telefono respira: il primo
  // tocco su una scheda non deve aspettare la rete.
  $effect(() => {
    const presto = (fn: () => void) =>
      "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 800);
    presto(() => { for (const m of MODULI) carica(m.id); });
  });

  const voce = $derived(voceDi(router.id)!);
  const Schermata = $derived(schermate[router.id]);
</script>

<div class="guscio" style:--accento={voce.accento}>
  {#if Schermata}
    {#key router.id}
      <div class="schermata" in:fade={{ duration: 160 }}>
        <Schermata resto={router.resto} />
      </div>
    {/key}
  {:else if guasto}
    <div class="guasto">
      <p class="text-headline">Questa schermata non si è caricata.</p>
      <p class="text-subheadline secondario">Controlla la connessione e riprova.</p>
      <button type="button" onclick={() => location.reload()}>Riprova</button>
    </div>
  {/if}

  <BarraSchede />
  <Avvisi />
</div>

<style>
  .guscio { min-height: 100dvh; }
  .guasto {
    min-height: 80dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: var(--space-2); padding: var(--space-6); text-align: center;
  }
  .guasto button { margin-top: var(--space-3); color: var(--accento); font-weight: var(--weight-semibold); }
</style>
