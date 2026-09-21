<!--
  Impostazioni — come Impostazioni di iOS: una lista di voci con le tessere
  colorate, e ogni voce è una pagina con «‹ Impostazioni» in alto.

  Le pagine dei moduli le disegnano i moduli (`impostazioni` nel registro):
  qui non si sa cosa c'è dentro, e nessun modulo viene importato.
-->
<script lang="ts">
  import type { Component } from "svelte";
  import Pagina from "$lib/ui/Pagina.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Generali from "./Generali.svelte";
  import { MODULI_DATI, voceDi } from "$lib/core/registro";
  import { vaiA } from "$lib/core/router.svelte";
  import { statoSync } from "$lib/core/statoSync.svelte";

  let { resto = [] }: { resto?: string[] } = $props();

  const GENERALI = [
    { id: "aspetto", nome: "Aspetto", icona: "sole", colore: "var(--color-blue)" },
    { id: "notifiche", nome: "Notifiche", icona: "campanella", colore: "var(--color-pink)" },
    { id: "sync", nome: "Sincronizzazione", icona: "sync", colore: "var(--color-teal)" },
    { id: "dati", nome: "Spazio e dati", icona: "nuvola", colore: "var(--color-gray)" },
  ] as const;

  const pagina = $derived(resto[0] || "");
  const generale = $derived(GENERALI.find((g) => g.id === pagina) ?? (pagina === "diagnostica" ? { id: "diagnostica", nome: "Diagnostica" } : null));
  const modulo = $derived(MODULI_DATI.find((m) => m.id === pagina) ?? null);

  const tema = $derived.by(() => {
    try { return ({ chiaro: "Chiaro", scuro: "Scuro" } as Record<string, string>)[localStorage.getItem("atlas.tema") || ""] || "Sistema"; }
    catch { return "Sistema"; }
  });

  // Entrando in una pagina si parte dall'alto, come in iOS.
  $effect(() => { pagina; window.scrollTo(0, 0); });

  // La pagina di un modulo si carica quando la apri.
  let Sua = $state.raw<Component | null>(null);
  $effect(() => {
    Sua = null;
    const m = modulo;
    m?.impostazioni?.().then((x) => { if (m === modulo) Sua = x.default; });
  });
</script>

{#if generale}
  <Pagina titolo={generale.nome} indietro={{ etichetta: "Impostazioni", fai: () => vaiA("impostazioni") }}>
    <Generali pagina={generale.id as any} />
  </Pagina>
{:else if modulo}
  <!-- La pagina di un modulo prende il SUO colore: le sue scelte accese si
       leggono nel colore del modulo, non in quello di Impostazioni. -->
  <div class="modulo" style:--accento={modulo.accento}>
    <Pagina titolo={modulo.nome} indietro={{ etichetta: "Impostazioni", fai: () => vaiA("impostazioni") }}>
      {#if Sua}<Sua />{/if}
    </Pagina>
  </div>
{:else}
  <Pagina titolo="Impostazioni" indietro={{ etichetta: "Oggi", fai: () => vaiA("oggi") }}>
    <Sezione>
      {#each GENERALI as g (g.id)}
        <Riga
          titolo={g.nome}
          valore={g.id === "aspetto" ? tema : g.id === "sync" ? ({ off: "Spenta", ok: "Attiva", corso: "In corso", err: "Errore", inattivo: "In attesa" } as Record<string, string>)[statoSync.stato] : undefined}
          href="#/impostazioni/{g.id}"
          freccia
        >
          {#snippet inizio()}<span class="tessera" style:--colore={g.colore}><Icona nome={g.icona} misura={18} tratto={2} /></span>{/snippet}
        </Riga>
      {/each}
    </Sezione>

    <Sezione titolo="Moduli">
      {#each MODULI_DATI as m (m.id)}
        <Riga titolo={m.nome} href="#/impostazioni/{m.id}" freccia>
          {#snippet inizio()}<span class="tessera" style:--colore={voceDi(m.id)?.accento}><Icona nome={m.icona} misura={18} tratto={2} /></span>{/snippet}
        </Riga>
      {/each}
    </Sezione>

    <Sezione piede="ATLAS · un'app sola al posto di tre.">
      <Riga titolo="Diagnostica" href="#/impostazioni/diagnostica" freccia>
        {#snippet inizio()}<span class="tessera" style:--colore="var(--color-gray)"><Icona nome="grafico" misura={18} tratto={2} /></span>{/snippet}
      </Riga>
    </Sezione>
  </Pagina>
{/if}

<style>
  .tessera { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--colore); color: #fff; }
  .modulo { display: contents; }
</style>
