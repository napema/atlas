<!--
  Abitudini in Impostazioni: quando comincia la settimana, le abitudini
  tutte (anche le archiviate), e da qui si aprono per modificarle.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Modifica from "./Modifica.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso } from "$lib/core/ui";
  import { stato, abitudiniVive, scriviMeta } from "$condivisi/abitudini/dati.js";
  import { etichettaPiano } from "$condivisi/abitudini/calcolo.js";

  let aperta = $state(false);
  let id = $state<string | null>(null);
  const apri = (x: string | null) => { id = x; aperta = true; };

  const d = $derived.by(() => {
    dati.versione;
    return {
      inizio: String(stato().meta.weekStart ?? 1),
      vive: abitudiniVive() as any[],
      archiviate: (abitudiniVive({ conArchiviate: true }) as any[]).filter((h) => h.archived),
    };
  });
</script>

<Sezione titolo="La settimana comincia" piede="Conta per le abitudini settimanali: cambia quando si azzera il conteggio delle volte.">
  <div class="blocco">
    <Segmenti opzioni={[{ id: "1", testo: "Lunedì" }, { id: "0", testo: "Domenica" }]} valore={d.inizio} onscelta={(v) => { scriviMeta({ weekStart: Number(v) }); avviso("Salvato."); }} />
  </div>
</Sezione>

<Sezione titolo="Le tue abitudini">
  {#each d.vive as h (h.id)}
    <Riga titolo={h.name} valore={etichettaPiano(h)} freccia onclick={() => apri(h.id)}>
      {#snippet inizio()}<span class="emoji simbolo">{h.emoji || "⭐️"}</span>{/snippet}
    </Riga>
  {/each}
  <Riga titolo="Aggiungi un'abitudine" accento onclick={() => apri(null)} />
</Sezione>

{#if d.archiviate.length}
  <Sezione titolo="Archiviate" piede="Archiviare toglie un'abitudine dal giorno senza cancellarne lo storico: riattivandola riparte da dov'era.">
    {#each d.archiviate as h (h.id)}
      <Riga titolo={h.name} valore="archiviata" freccia onclick={() => apri(h.id)}>
        {#snippet inizio()}<span class="emoji simbolo">{h.emoji || "⭐️"}</span>{/snippet}
      </Riga>
    {/each}
  </Sezione>
{/if}

<Modifica bind:aperto={aperta} {id} />

<style>
  .blocco { padding: var(--space-4); }
  .simbolo { font-size: 20px; }
</style>
