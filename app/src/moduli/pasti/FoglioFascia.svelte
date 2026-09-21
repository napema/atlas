<!--
  Cosa si può fare con una fascia: cambiare il pasto del piano, dire che hai
  mangiato altro al suo posto, dire che l'hai saltata. Tre scostamenti, e
  nessun quarto: il piano è il registro, l'archivio tiene solo le deviazioni.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { avviso } from "$lib/core/ui";
  import { REGIMI, regimeDi, nomeFascia, registraScostamento, eliminaScostamento } from "$condivisi/pasti/dati.js";

  let {
    aperto = $bindable(false),
    iso,
    fascia,
    onscegli,
    onaltro,
  }: {
    aperto: boolean;
    iso: string;
    fascia: string | null;
    onscegli: () => void;
    onaltro: () => void;
  } = $props();

  const regime = $derived(fascia ? regimeDi(iso, fascia) : "casa");
  const nome = $derived(fascia ? nomeFascia(fascia) : "");

  function salta() {
    if (!fascia) return;
    const r = registraScostamento({ tipo: "salto", data: iso, fascia });
    aperto = false;
    avviso(`${nome} saltato.`, { azione: r ? { etichetta: "Annulla", fai: () => eliminaScostamento(r.id) } : undefined });
  }
</script>

<Foglio bind:aperto titolo={nome}>
  <Sezione piede="Questa fascia è «{(REGIMI as Record<string, string>)[regime] ?? regime}» nella tua settimana tipo. Si cambia in Impostazioni.">
    {#if regime === "casa"}
      <Riga titolo="Cambia il pasto pianificato" freccia onclick={() => { aperto = false; onscegli(); }}>
        {#snippet inizio()}<Icona nome="matita" misura={21} tratto={1.8} />{/snippet}
      </Riga>
    {/if}
    <Riga titolo="Ho mangiato altro, al posto di questo" freccia onclick={() => { aperto = false; onaltro(); }}>
      {#snippet inizio()}<Icona nome="piatto" misura={21} tratto={1.8} />{/snippet}
    </Riga>
    <Riga titolo="L'ho saltato" onclick={salta}>
      {#snippet inizio()}<Icona nome="salta" misura={21} tratto={1.8} />{/snippet}
    </Riga>
  </Sezione>
</Foglio>
