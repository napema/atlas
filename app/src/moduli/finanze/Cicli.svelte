<!--
  Cicli — una riga per ciclo, cinque colonne, un grafico.

  Sostituisce Analisi, che aveva nove schede e tre grafici. Erano tutti
  numeri veri e non si guardavano: nove risposte in una schermata sono zero
  risposte. E il mese solare su cui erano costruiti spezza a metà il giro
  delle bollette — quelle del 28-30 in un mese, quelle del 1-9 in quello
  dopo — quindi nemmeno il confronto fra due mesi era onesto. Il ciclo dello
  stipendio ne contiene esattamente uno di ciascuna.

  Le cinque colonne sono le cinque cose su cui si può fare qualcosa. Le
  categorie stanno nel dettaglio di una riga: servono a cose fatte, non ogni
  mattina, e in home non ci tornano.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import GraficoFondo from "./GraficoFondo.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, oggiISO, plurale } from "$lib/core/ui";
  import { emojiCat } from "$condivisi/finanze/dati.js";
  import { nomeCiclo, categorieDelCiclo } from "$condivisi/finanze/calcolo.js";
  import { cicliRecenti, serieFondo, statoObiettivo } from "$condivisi/finanze/piano.js";
  import { coloreCat } from "./comune";
  import { apri } from "./fogli.svelte";

  let aperta = $state<string | null>(null);

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    const righe = cicliRecenti(8, iso);
    return {
      iso, righe,
      fondo: serieFondo(iso),
      obi: statoObiettivo(iso),
      // Le etichette del grafico: quattro, non una per stipendio — dieci
      // date sotto un grafico da 520px si sovrappongono e non si legge più
      // nessuna.
      tacche: (() => {
        const s = serieFondo(iso);
        if (!s) return [];
        const n = s.punti.length;
        return [...new Set([0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1])].filter((i) => i >= 0 && i < n);
      })(),
    };
  });

  const dettaglio = $derived.by(() => {
    dati.versione;
    if (!aperta) return null;
    const r = d.righe.find((x: any) => x.ciclo.indice === aperta);
    if (!r) return null;
    return {
      r,
      cats: (categorieDelCiclo(r.ciclo) as any[])
        .filter((c: any) => c.speso > 0 || c.budget > 0)
        .sort((a: any, b: any) => b.speso - a.speso),
    };
  });
</script>

<!-- IL GRAFICO, uno solo. -->
{#if d.fondo && d.obi}
  <Sezione titolo="{d.obi.nome} · {euro(d.obi.target, { tondo: true })}"
    piede="Linea piena: quello che c'è. Tratteggiata: i versamenti programmati. Riga orizzontale: il traguardo.">
    {#snippet coda()}
      <span class="text-footnote secondario cifre">
        {d.obi.gap > 0 ? `mancano ${euro(d.obi.gap, { tondo: true })}` : "arriva"}
      </span>
    {/snippet}
    <div class="grafico">
      <GraficoFondo punti={d.fondo.punti} target={d.fondo.target} etichette={d.tacche} />
    </div>
  </Sezione>
{/if}

<!-- LA TABELLA. Su telefono è una pila di carte: sei colonne a 390px non
     esistono, e una tabella che si scorre in orizzontale non si legge. -->
<Sezione titolo="I cicli" piede="Da stipendio a stipendio. Tocca una riga per il dettaglio per categoria.">
  {#each d.righe as r (r.ciclo.indice)}
    <button type="button" class="ciclo" class:corrente={r.corrente} class:aperta={aperta === r.ciclo.indice}
      onclick={() => (aperta = aperta === r.ciclo.indice ? null : r.ciclo.indice)}>
      <span class="c-testa">
        <span class="c-nome">{nomeCiclo(r.ciclo)}{r.corrente ? " · in corso" : ""}</span>
        <span class="cifre c-pat" class:vuoto={!r.patrimonio.attendibile}>
          {r.patrimonio.attendibile ? euro(r.patrimonio.totale, { tondo: true }) : "—"}
        </span>
      </span>

      <span class="celle">
        <span class="cella">
          <span class="k">Vita</span>
          <span class="v cifre" class:male={r.budget > 0 && r.vita > r.budget}>
            {euro(r.vita, { tondo: true })}<span class="secondario">/{euro(r.budget, { tondo: true })}</span>
          </span>
        </span>
        <span class="cella">
          <span class="k">Fuori piano</span>
          <span class="v cifre" class:male={r.fuoriPiano.n > 0} class:ok={r.fuoriPiano.n === 0}>
            {r.fuoriPiano.n}{r.fuoriPiano.n ? ` · ${euro(r.fuoriPiano.totale, { tondo: true })}` : ""}
          </span>
        </span>
        <span class="cella">
          <span class="k">Ricariche ING</span>
          <span class="v cifre" class:male={r.ricariche > 0} class:ok={r.ricariche === 0}>{r.ricariche}</span>
        </span>
        <span class="cella">
          <span class="k">Al fondo</span>
          <span class="v cifre" class:ok={r.fondo > 0}>{euro(r.fondo, { tondo: true })}</span>
        </span>
      </span>
    </button>

    {#if aperta === r.ciclo.indice && dettaglio}
      <div class="dett">
        {#each dettaglio.cats as c (c.id)}
          {@const f = c.budget > 0 ? c.speso / c.budget : 0}
          <button type="button" class="cat" style:--tinta={coloreCat(c.id)}
            onclick={() => apri({ tipo: "categoria", catId: c.id, mese: r.ciclo.indice })}>
            <span class="cat-alto">
              <span class="cat-nome"><span class="emoji">{emojiCat(c.id)}</span>{c.nome}</span>
              <span class="cifre text-subheadline" class:male={c.budget > 0 && c.speso > c.budget}>
                {euro(c.speso, { tondo: true })}
                {#if c.budget > 0}<span class="secondario">/ {euro(c.budget, { tondo: true })}</span>{/if}
              </span>
            </span>
            {#if c.budget > 0}
              <span class="barra"><i style:width="{Math.min(100, Math.round(f * 100))}%"></i></span>
            {/if}
          </button>
        {/each}
        {#if !dettaglio.cats.length}
          <p class="text-subheadline secondario vuota">Nessun movimento in questo ciclo.</p>
        {/if}
      </div>
    {/if}
  {/each}
</Sezione>

{#if d.fondo}
  <Sezione titolo="Il piano dei versamenti" piede="Un versamento a ogni stipendio, più gli extra previsti. Un versamento saltato si vede qui il giorno dopo, non a fine anno.">
    {#each d.fondo.punti.slice(1, 7) as p (p.quando)}
      <Riga titolo={p.quando} sottotitolo={p.reale != null ? `saldo reale ${euro(p.reale, { tondo: true })}` : null}
        valore={euro(p.piano, { tondo: true })} />
    {/each}
    {#if d.obi}
      <Riga titolo="Alla data obiettivo" sottotitolo={plurale(d.obi.versamenti, "versamento", "versamenti")}
        valore={euro(d.obi.proiezione, { tondo: true })} />
    {/if}
  </Sezione>
{/if}

<style>
  .grafico { padding: var(--space-4); }

  .ciclo { position: relative; display: flex; flex-direction: column; gap: var(--space-2); width: 100%; padding: 12px var(--space-4); text-align: left; }
  .ciclo + .ciclo::before, .dett + .ciclo::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .ciclo:active { background: var(--fill-quaternary); }
  .ciclo.aperta { background: var(--fill-quaternary); }
  .c-testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .c-nome { font-weight: var(--weight-semibold); }
  .corrente .c-nome { color: var(--accento); }
  .c-pat { font-size: var(--text-callout); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; }
  .c-pat.vuoto { color: var(--label-tertiary); }

  /* Quattro celle a griglia: due per riga sul telefono, quattro in fila
     dove c'è spazio. Le etichette sopra i numeri e non accanto, perché una
     colonna di numeri si scorre con l'occhio e una di coppie no. */
  .celle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px var(--space-4); }
  @media (min-width: 560px) { .celle { grid-template-columns: repeat(4, 1fr); } }
  .cella { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .k { font-size: var(--text-caption1); color: var(--label-tertiary); }
  .v { font-size: var(--text-subheadline); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; }
  .secondario { color: var(--label-secondary); font-weight: var(--weight-regular); }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }

  .dett { position: relative; background: var(--fill-quaternary); }
  .cat { position: relative; width: 100%; display: flex; flex-direction: column; gap: 5px; padding: 9px var(--space-4) 11px; text-align: left; }
  .cat + .cat::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .cat:active { opacity: 0.6; }
  .cat-alto { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-2); }
  .cat-nome { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
  .barra { height: 5px; border-radius: 3px; overflow: hidden; background: var(--fill-tertiary); }
  .barra i { display: block; height: 100%; border-radius: inherit; background: var(--tinta); }
  .vuota { padding: var(--space-3) var(--space-4); }
</style>
