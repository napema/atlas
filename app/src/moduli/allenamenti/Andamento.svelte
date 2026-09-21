<!--
  Il blocco intero: la proiezione sui 5 km, i chilometri settimana per
  settimana, le corse importate.

  LA PREVISIONE PUÒ MANCARE, E QUANDO MANCA VA DETTO. Una proiezione su una
  corsa sola ha lo stesso aspetto di una vera, e una cifra che sembra solida
  è quella su cui poi decidi di alzare il ritmo.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { dataBreve, avviso } from "$lib/core/ui";
  import { OBIETTIVO, corseVive, eliminaCorsa, salvaCorse } from "$condivisi/allenamenti/dati.js";
  import { andamento, proiezione, kmTotali, mmss, passo, km } from "$condivisi/allenamenti/calcolo.js";
  import { fase } from "./comune";

  const d = $derived.by(() => {
    dati.versione;
    const righe = andamento() as any[];
    return {
      righe,
      massimo: Math.max(1, ...righe.map((r) => Math.max(r.previsti, r.fatti))),
      pr: proiezione(),
      corse: (corseVive() as any[]).slice(-12).reverse(),
      totale: kmTotali(),
    };
  });

  function togli(c: any) {
    eliminaCorsa(c.id);
    avviso("Corsa tolta.", { azione: { etichetta: "Annulla", fai: () => salvaCorse([{ ...c }]) } });
  }
</script>

<Sezione titolo="Proiezione sui 5 km">
  {#snippet coda()}<span class="text-footnote secondario">obiettivo {mmss(OBIETTIVO.secondi)}</span>{/snippet}
  <div class="proiezione" data-tono={!d.pr ? "" : d.pr.dentro ? "ok" : d.pr.scarto <= 90 ? "avviso" : ""}>
    {#if d.pr}
      <div class="cifre-riga">
        <span class="cifra cifre">{mmss(d.pr.secondi)}</span>
        <span class="text-subheadline secondario cifre">{passo(d.pr.passo)}</span>
      </div>
      <p class="text-subheadline">{d.pr.dentro ? `Sei dentro il muro di ${mmss(OBIETTIVO.secondi)}.` : `Mancano ${mmss(d.pr.scarto)} al sub-20.`}</p>
      <p class="text-footnote secondario">Da {km(d.pr.da.km)} in {mmss(d.pr.da.secondi)} del {dataBreve(d.pr.da.data)}, portati sui 5 km con la formula di Riegel.</p>
    {:else}
      <span class="cifra">—</span>
      <p class="text-footnote secondario">Serve almeno una corsa sopra i 3 km con il tempo, nelle ultime sei settimane. Più indietro non racconta la forma di adesso.</p>
    {/if}
  </div>
</Sezione>

<Sezione titolo="Chilometri per settimana">
  {#snippet coda()}<span class="text-footnote secondario cifre">{km(d.totale)}</span>{/snippet}
  <div class="barre">
    {#each d.righe as r (r.n)}
      <div class="barra" class:ora={r.corrente} style:--fase={fase(r.fase).colore} title={r.sopraIlTetto ? `Oltre il +10%: il tetto era ${km(r.tetto)}` : undefined}>
        <span class="n cifre">{r.n}</span>
        <span class="binario">
          <i class="piano" style:width="{(r.previsti / d.massimo) * 100}%"></i>
          <i class="fatto" class:sopra={r.sopraIlTetto} style:width="{(r.fatti / d.massimo) * 100}%"></i>
        </span>
        <span class="km cifre">{r.fatti > 0 ? km(r.fatti).replace(" km", "") : "—"}</span>
      </div>
    {/each}
    <div class="legenda text-caption1 secondario">
      <span><i class="chiave piano"></i>piano</span>
      <span><i class="chiave fatto"></i>fatto</span>
      <span><i class="chiave sopra"></i>oltre il +10%</span>
    </div>
  </div>
</Sezione>

<Sezione titolo="Corse importate" piede={d.corse.length ? "Tocca una corsa per toglierla." : "Nessuna. Senza corse non c'è né andamento né previsione: importa l'export di Garmin."}>
  {#each d.corse as c (c.id)}
    <Riga
      titolo={c.titolo || "Corsa"}
      sottotitolo="{dataBreve(c.data)} · {c.secondi && c.km ? passo(c.secondi / c.km) : '—'}"
      valore={km(c.km)}
      onclick={() => togli(c)}
    />
  {/each}
</Sezione>

<style>
  .proiezione { padding: var(--space-4); display: flex; flex-direction: column; gap: 4px; }
  .cifre-riga { display: flex; align-items: baseline; gap: var(--space-3); }
  .cifra { font-family: var(--font-display); font-size: 48px; line-height: 52px; font-weight: var(--weight-bold); }
  [data-tono="ok"] .cifra { color: var(--color-green); }
  [data-tono="avviso"] .cifra { color: var(--color-orange); }

  .barre { padding: var(--space-4); display: flex; flex-direction: column; gap: 6px; }
  .barra { display: grid; grid-template-columns: 22px 1fr 40px; align-items: center; gap: var(--space-2); }
  .n { font-size: var(--text-footnote); color: var(--label-tertiary); text-align: right; }
  .ora .n { color: var(--label-primary); font-weight: var(--weight-bold); }
  .binario { position: relative; height: 12px; }
  .binario i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; }
  .piano { background: color-mix(in srgb, var(--fase) 22%, transparent); }
  .fatto { background: var(--fase); }
  .fatto.sopra { background: var(--color-orange); }
  .km { font-size: var(--text-footnote); color: var(--label-secondary); text-align: right; }
  .legenda { display: flex; gap: var(--space-4); margin-top: var(--space-2); }
  .legenda span { display: inline-flex; align-items: center; gap: 5px; }
  .chiave { display: inline-block; width: 12px; height: 8px; border-radius: 2px; --fase: var(--color-teal); }
  .chiave.piano { background: color-mix(in srgb, var(--fase) 22%, transparent); }
  .chiave.fatto { background: var(--fase); }
  .chiave.sopra { background: var(--color-orange); }
</style>
