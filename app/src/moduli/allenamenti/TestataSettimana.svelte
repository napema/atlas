<!--
  Il numero grande è QUANTO TI RESTA questa settimana, non quanto hai fatto.
  Il piano non assegna giorni («3 corse + 3 palestre, giorni liberi»),
  quindi la domanda vera è: quanto devo ancora piazzare, e in quanti giorni.

  Il colore sta in un posto solo e dice una cosa sola: gli slot aperti sono
  più dei giorni rimasti. Non è pessimismo, è aritmetica.
-->
<script lang="ts">
  import Traccia from "$lib/ui/Traccia.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO, plurale } from "$lib/core/ui";
  import { SETTIMANE, pianoDi, settimanaDi, inizioSettimana, FASE, dataTest } from "$condivisi/allenamenti/dati.js";
  import {
    progressoSettimana, kmFatti, kmPrevisti, giorniRimasti, passoSettimana, consiglio, km,
  } from "$condivisi/allenamenti/calcolo.js";
  import { fase } from "./comune";

  let { n }: { n: number } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const p = progressoSettimana(n);
    const corrente = settimanaDi(oggi) === n;
    const passo = passoSettimana(n, oggi);
    return {
      p, corrente,
      piano: pianoDi(n),
      aperti: p.totali - p.fatti,
      giorni: giorniRimasti(n, oggi),
      tono: !corrente ? "" : passo === "indietro" ? "avviso" : passo === "persa" ? "male" : "",
      fatti: kmFatti(n), previsti: kmPrevisti(n),
      // Il consiglio parla solo per la settimana in corso: su una passata
      // sarebbe un rimprovero su qualcosa che non si può più fare.
      consiglio: corrente ? consiglio(n, oggi) : null,
      /* Prima dell'inizio il blocco non e' «in ritardo»: non e' partito. */
      daIniziare: oggi < inizioSettimana(n),
      /* I giorni al test. Da oggi, non dall'inizio della settimana: e' un
         conto alla rovescia, e un conto alla rovescia che non scende ogni
         giorno non e' un conto alla rovescia. */
      alTest: Math.round(
        (new Date(`${dataTest()}T00:00:00`).getTime() - new Date(`${oggi}T00:00:00`).getTime()) / 86400000,
      ),
    };
  });
</script>

<div class="testata" data-tono={d.tono}>
  <div class="alto">
    <span class="bollo-fase text-caption1 semibold">{FASE}</span>
    <span class="fase text-caption1" style:--fase={fase(d.piano.fase).colore}>{d.piano.fase}</span>
  </div>

  <div class="alto">
    <span class="text-footnote secondario semibold">
      Settimana {n} di {SETTIMANE} · {km(d.fatti)} / {km(d.previsti)}
    </span>
    {#if d.alTest >= 0}
      <span class="text-footnote semibold conto">
        {d.alTest === 0 ? "Test oggi" : d.alTest === 1 ? "Test domani" : `Test tra ${d.alTest} giorni`}
      </span>
    {/if}
  </div>

  <div class="centro">
    <span class="cifra cifre" class:chiusa={d.aperti === 0}>{d.aperti === 0 ? "Chiusa" : d.aperti}</span>
    <p class="text-subheadline secondario">
      {d.aperti === 0
        ? `Tutti e ${d.p.totali} gli slot fatti.`
        : d.daIniziare
          ? `${plurale(d.p.totali, "allenamento", "allenamenti")}, da lunedì.`
          : `${plurale(d.aperti, "slot aperto", "slot aperti")} su ${d.p.totali}` + (d.corrente ? ` · ${plurale(d.giorni, "giorno", "giorni")} per piazzarli` : "")}
    </p>
  </div>

  <Traccia valore={d.p.frazione} colore={d.p.frazione >= 1 ? "var(--color-green)" : "var(--accento)"} altezza={6} />

  <div class="stat">
    <div><span class="v cifre">{d.p.corse}/{d.p.corseTotali}</span><span class="text-caption1 secondario">corse</span></div>
    <div><span class="v cifre">{d.p.palestra}/{d.p.palestraTotali}</span><span class="text-caption1 secondario">palestra</span></div>
    <div><span class="v cifre">{km(d.fatti)}</span><span class="text-caption1 secondario">su {km(d.previsti)}</span></div>
  </div>

  {#if d.consiglio}
    <p class="nota text-subheadline" data-tono={d.consiglio.tono}>
      <Icona nome="info" misura={16} tratto={2} /><span>{d.consiglio.testo}</span>
    </p>
  {/if}
  {#if d.piano.avvertenza}
    <p class="nota text-subheadline" data-tono="avviso">
      <Icona nome="avviso" misura={16} tratto={2.2} /><span>{d.piano.avvertenza}</span>
    </p>
  {/if}
</div>

<style>
  .testata { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .alto { display: flex; justify-content: space-between; align-items: center; }
  /* Il nome della fase sta sempre in testa: in quattro settimane non c'e'
     il tempo di dimenticarsi perche' si sta facendo questa cosa, ma c'e'
     quello di perdere di vista che ha una fine. */
  .bollo-fase {
    padding: 2px 8px; border-radius: var(--radius-full);
    letter-spacing: 0.8px; text-transform: uppercase;
    color: var(--accento); background: color-mix(in srgb, var(--accento) 16%, transparent);
  }
  .conto { color: var(--accento); }
  .fase {
    padding: 3px 10px; border-radius: var(--radius-full); font-weight: var(--weight-semibold);
    color: var(--fase); background: color-mix(in srgb, var(--fase) 16%, transparent);
  }
  .centro { display: flex; flex-direction: column; }
  .cifra { font-family: var(--font-display); font-size: 56px; line-height: 60px; font-weight: var(--weight-bold); }
  .cifra.chiusa { font-size: 40px; line-height: 48px; color: var(--color-green); }
  [data-tono="avviso"] .cifra { color: var(--color-orange); }
  [data-tono="male"] .cifra { color: var(--color-red); }
  .stat { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
  .stat div { display: flex; flex-direction: column; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary); }
  .v { font-size: var(--text-headline); font-weight: var(--weight-semibold); }
  .nota { display: flex; gap: var(--space-2); align-items: flex-start; color: var(--label-secondary); }
  .nota[data-tono="avviso"] :global(svg) { color: var(--color-orange); }
  .nota :global(.icona) { margin-top: 2px; }
</style>
