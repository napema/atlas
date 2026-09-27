<!--
  Abitudini in Impostazioni: quando comincia la settimana, le abitudini
  tutte (anche le archiviate), e da qui si aprono per modificarle.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Modifica from "./Modifica.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso } from "$lib/core/ui";
  import { stato, abitudiniVive, scriviMeta } from "$condivisi/abitudini/dati.js";
  import * as p50 from "$condivisi/abitudini/p50.js";
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
      sfida: p50.attivo(),
      giorno: p50.giornoCorrente(),
      quota: p50.config().quotaSerate ?? 2,
    };
  });

</script>

<Sezione titolo="Project 50" piede={d.sfida
  ? `Sei al giorno ${d.giorno}. Le voci del blocco Project 50 sono non negoziabili: se ne manca una alla chiusura, il contatore riparte da 1.`
  : "Otto voci non negoziabili per cinquanta giorni. Se ne manca una il contatore riparte da 1: non è una serie da allungare, è una sfida da finire."}>
  <Riga titolo="Sfida attiva">
    {#snippet fine()}
      <Interruttore
        acceso={d.sfida}
        etichetta="Project 50"
        oncambio={(v) => { if (v) p50.comincia(); else p50.scriviConfig({ attivo: false }); avviso(v ? "Cominciata." : "Sospesa."); }}
      />
    {/snippet}
  </Riga>
  {#if d.sfida}
    <Riga titolo="Serate fuori a settimana" valore={String(d.quota)} />
  {/if}
</Sezione>

<Sezione titolo="La settimana comincia" piede="Conta per le abitudini settimanali: cambia quando si azzera il conteggio delle volte.">
  <div class="blocco">
    <Segmenti opzioni={[{ id: "1", testo: "Lunedì" }, { id: "0", testo: "Domenica" }]} valore={d.inizio} onscelta={(v) => { scriviMeta({ weekStart: Number(v) }); avviso("Salvato."); }} />
  </div>
</Sezione>

<!-- UNA LISTA SOLA. Prima ce n'erano due, le stesse dodici abitudini
     stampate una volta per scegliere il blocco e una per modificarle: due
     elenchi identici nella stessa schermata non sono due funzioni, sono una
     funzione e un sosia. Il blocco si sceglie dove si modifica l'abitudine,
     e qui è scritto, non da scegliere. -->
<Sezione titolo="Le tue abitudini"
  piede={d.sfida ? "Il blocco si cambia aprendo l'abitudine. Le abitudini che esistevano prima della sfida stanno nel supporto: non finiscono fra le otto per un valore di fabbrica." : undefined}>
  {#each d.vive as h (h.id)}
    <Riga titolo={h.name} sottotitolo={etichettaPiano(h)} freccia onclick={() => apri(h.id)}>
      {#snippet inizio()}<span class="emoji simbolo">{h.emoji || "⭐️"}</span>{/snippet}
      {#snippet fine()}
        {#if d.sfida}
          <span class="blocco-eti text-caption1 semibold" class:otto={h.blocco === "p50"}>
            {h.blocco === "p50" ? "Otto" : "Supporto"}
          </span>
        {/if}
      {/snippet}
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
  /* L'etichetta del blocco è piccola e neutra: dice a quale delle due liste
     appartiene, non è un secondo bersaglio da toccare. */
  .blocco-eti {
    padding: 3px 8px; border-radius: var(--radius-full);
    background: var(--fill-tertiary); color: var(--label-secondary);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .blocco-eti.otto { background: color-mix(in srgb, var(--accento) 20%, transparent); color: var(--accento); }
</style>
