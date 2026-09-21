<!--
  Le serie. Una serie diventa una leva solo quando la vedi crescere e vedi
  cosa rischi di perdere. Tre cose, nell'ordine in cui contano: il numero
  corrente, il RECORD (l'unica cifra che dà un bersaglio), e il rischio di
  oggi, detto solo quando è vero.

  Quello che NON c'è, deliberatamente: punteggi, livelli, medaglie. Una
  serie è già un punteggio, e sovrapporne un secondo lo svaluta.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import { tinta } from "$lib/core/tinte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO, piuGiorni, dataUmana, plurale } from "$lib/core/ui";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";
  import { serie, serieMigliore, costanza, fattaIl, eAttesa, ePrevista } from "$condivisi/abitudini/calcolo.js";

  let { onapri }: { onapri: (id: string) => void } = $props();

  const righe = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    return abitudiniVive().map((h: any) => ({
      h,
      n: serie(h, oggi),
      record: serieMigliore(h, oggi),
      cost: costanza(h, 30, oggi),
      fatta: fattaIl(h, oggi),
      attesa: eAttesa(h, oggi),
      // Ventotto giorni: quattro settimane intere, così una colonna è
      // sempre lo stesso giorno della settimana e si vede DOVE si rompe.
      celle: Array.from({ length: 28 }, (_, i) => {
        const g = piuGiorni(oggi, -(27 - i));
        return { g, prevista: ePrevista(h, g), fatta: fattaIl(h, g) };
      }),
    })).sort((a: any, b: any) => b.n - a.n || b.record - a.record);
  });

  const migliore = $derived(righe[0]);
  const aRischio = $derived(righe.filter((r: any) => r.n > 0 && r.attesa && !r.fatta));
</script>

{#if !righe.length}
  <Vuoto icona="fiamma" titolo="Nessuna abitudine" testo="Le serie compaiono appena ne aggiungi una." />
{:else}
  <Sezione>
    <div class="eroe">
      <span class="text-footnote secondario">La più lunga in corso</span>
      <div class="cifra-riga">
        <span class="cifra cifre">{migliore.n}</span>
        <span class="text-title3 secondario">{migliore.n === 1 ? "giorno" : "giorni"}</span>
      </div>
      <p class="text-body">{migliore.n > 0 ? migliore.h.name : "Nessuna serie aperta. Se spunti qualcosa oggi ne parte una."}</p>
      <!-- Il rischio si dice una volta sola: è la frase che fa alzare dal
           divano, e ripetuta su ogni riga non lo fa più. -->
      {#if aRischio.length}
        <p class="rischio text-subheadline">
          {aRischio.length === 1
            ? `Se stasera salti ${aRischio[0].h.name.toLowerCase()} perdi ${plurale(aRischio[0].n, "giorno", "giorni")}.`
            : `${plurale(aRischio.length, "serie aperta", "serie aperte")} da difendere oggi.`}
        </p>
      {/if}
    </div>
  </Sezione>

  <Sezione titolo="Tutte le serie">
    {#snippet coda()}<span class="text-footnote secondario">corrente · record</span>{/snippet}
    {#each righe as r (r.h.id)}
      <Riga onclick={() => onapri(r.h.id)}>
        {#snippet inizio()}<span class="emoji simbolo" style:--tinta={tinta(r.h.tint)}>{r.h.emoji || "⭐️"}</span>{/snippet}
        <span>{r.h.name}</span>
        <span class="text-footnote secondario">{r.cost}% negli ultimi 30 giorni</span>
        <!-- La barra confronta la serie col RECORD, non con un numero tondo:
             il bersaglio giusto è quello che hai già fatto una volta. -->
        <span class="barra"><Traccia valore={r.record ? r.n / r.record : 0} colore={tinta(r.h.tint)} altezza={4} /></span>
        {#snippet fine()}
          <span class="numeri cifre" class:rischio={r.n > 0 && r.attesa && !r.fatta}>
            <b class:viva={r.n > 0}>{r.n}</b><span class="secondario"> / {r.record}</span>
          </span>
        {/snippet}
      </Riga>
    {/each}
  </Sezione>

  <Sezione
    titolo="Ultime quattro settimane"
    piede="Una riga per abitudine, una casella per giorno. Serve a vedere dove si rompono: quasi sempre è lo stesso giorno della settimana."
  >
    <div class="mappa">
      {#each righe as r (r.h.id)}
        <div class="mappa-riga" style:--tinta={tinta(r.h.tint)}>
          <span class="emoji">{r.h.emoji || "⭐️"}</span>
          <div class="celle">
            {#each r.celle as c (c.g)}
              <span class="cella" class:piena={c.prevista && c.fatta} class:spenta={!c.prevista} title="{dataUmana(c.g)} · {r.h.name}"></span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </Sezione>
{/if}

<style>
  .eroe { padding: var(--space-4); display: flex; flex-direction: column; gap: 2px; }
  .cifra-riga { display: flex; align-items: baseline; gap: var(--space-2); }
  .cifra { font-family: var(--font-display); font-size: 56px; line-height: 60px; font-weight: var(--weight-bold); color: var(--color-orange); }
  .rischio { color: var(--color-orange); margin-top: var(--space-2); }
  .simbolo {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; font-size: 17px;
    background: color-mix(in srgb, var(--tinta) 22%, transparent);
  }
  .barra { display: block; margin-top: 6px; max-width: 200px; }
  .numeri { font-size: var(--text-body); }
  .numeri b { font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .numeri b.viva { color: var(--color-orange); }

  .mappa { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); }
  .mappa-riga { display: flex; align-items: center; gap: var(--space-3); }
  .celle { flex: 1; display: grid; grid-template-columns: repeat(28, 1fr); gap: 2px; }
  .cella { aspect-ratio: 1; border-radius: 3px; background: var(--fill-tertiary); }
  .cella.piena { background: var(--tinta); }
  .cella.spenta { background: none; }
</style>
