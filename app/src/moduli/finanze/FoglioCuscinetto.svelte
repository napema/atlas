<!--
  Il cuscinetto ING, aperto (v3.1).

  La carta nel Riepilogo dice quattro numeri; qui c'è da dove vengono. La
  proiezione è una lista di eventi — un versamento, il bollo, il rimborso —
  ognuno col saldo che lascia dietro: è la stessa cosa del grafico, ma si
  legge senza interpretare una curva, e dice PERCHÉ il 15 febbraio è il punto
  più basso.

  In fondo, quello che la proiezione NON conta: la tredicesima, finché non
  arriva con l'importo vero. Contarla prima vorrebbe dire dichiararsi sopra
  target con soldi stimati.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import GraficoFondo from "./GraficoFondo.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, oggiISO, daISO, GIORNI, MESI_BREVI } from "$lib/core/ui";
  import { cuscinetto } from "$condivisi/finanze/piano.js";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  const c = $derived.by(() => { dati.versione; return cuscinetto(oggiISO()); });

  /** «15 feb 2027». */
  const gma = (iso: string) => { const x = daISO(iso); return `${x.getDate()} ${MESI_BREVI[x.getMonth()]} ${x.getFullYear()}`; };
  /** «ven 23 ott». */
  const glm = (iso: string) => { const x = daISO(iso); return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`; };

  /* Il grafico: la proiezione come «piano», il saldo di oggi come unico
     punto «reale». Quattro tacche, una per stagione. */
  const grafico = $derived(c ? c.punti.map((p: any, i: number) => ({ quando: p.quando, piano: p.saldo, reale: i === 0 ? p.saldo : null })) : []);
  const tacche = $derived.by(() => {
    const n = grafico.length;
    return [...new Set([0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1])].filter((i) => i >= 0 && i < n);
  });
</script>

<Foglio bind:aperto titolo="Cuscinetto ING">
  {#if c}
    <div class="testa">
      <span class="cifre grande">{euro(c.saldo)}</span>
      <span class="secondario cifre">di {euro(c.target, { tondo: true })}{c.regola ? ` · ${c.regola}` : ""}</span>
    </div>

    <Sezione>
      <Riga titolo="Minimo previsto" sottotitolo={`dopo ${String(c.punti.find((p: any) => p.quando === c.quando && p.delta < 0)?.nome ?? "le uscite").toLowerCase()} · ${gma(c.quando)}`}
        valore={euro(c.minimo)} />
      <Riga titolo="Sopra target" sottotitolo="poi non scende più sotto"
        valore={c.sopraDal ? (c.sopraDal === c.punti[0].quando ? "già" : `dal ${gma(c.sopraDal)}`) : "non nei 12 mesi"} />
      {#if c.prossimo}
        <Riga titolo="Prossimo versamento" sottotitolo={glm(c.prossimo.quando)} valore={euro(c.prossimo.imp, { tondo: true })} />
      {/if}
      <Riga titolo="A regime" sottotitolo="la riga «Cuscinetto ING» del budget" valore={`${euro(c.versamento, { tondo: true })} a stipendio`} />
    </Sezione>

    {#if grafico.length > 1}
      <Sezione titolo="Dodici mesi">
        <div class="grafico">
          <GraficoFondo punti={grafico} target={c.target} etichette={tacche} />
        </div>
      </Sezione>
    {/if}

    <Sezione titolo="La proiezione"
      piede="Versamenti a ogni stipendio, entrate attese su ING, e le uscite che ci passano: bollo e assicurazione. Il target è un mese di spese fisse: se cambia il budget delle Fisse, cambia anche lui.">
      {#each c.punti.slice(1) as p (p.quando + p.nome + p.saldo)}
        <div class="evento" class:sotto={p.saldo < c.target}>
          <span class="e-data cifre text-footnote secondario">{gma(p.quando)}</span>
          <span class="e-nome">{p.nome}</span>
          <span class="e-delta cifre" class:meno={p.delta < 0}>{p.delta < 0 ? "−" : "+"}{euro(Math.abs(p.delta), { tondo: Math.abs(p.delta) % 100 === 0 })}</span>
          <span class="e-saldo cifre">{euro(p.saldo)}</span>
        </div>
      {/each}
    </Sezione>

    {#if c.fuori.length}
      <Sezione titolo="Fuori dalla proiezione"
        piede="Entra nel conto quando arriva, con l'importo vero: contarla prima vorrebbe dire dirsi sopra target con soldi stimati. A dicembre va tutta su ING.">
        {#each c.fuori as x (x.id ?? x.nome)}
          <Riga titolo={x.nome} sottotitolo={x.stimato ? "stimata" : null} valore={euro(x.imp, { tondo: true })} />
        {/each}
      </Sezione>
    {/if}
  {/if}
</Foglio>

<style>
  .testa { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) 0 var(--space-2); }
  .grande { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); }
  .secondario { color: var(--label-secondary); }
  .grafico { padding: var(--space-3) var(--space-4); }
  .evento {
    position: relative; display: grid; grid-template-columns: 80px minmax(0, 1fr) auto auto;
    align-items: baseline; gap: var(--space-3); padding: 9px var(--space-4);
  }
  .evento + .evento::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .e-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-delta { font-size: var(--text-subheadline); color: var(--label-secondary); }
  .e-delta.meno { color: var(--color-orange); }
  .e-saldo { font-weight: var(--weight-semibold); min-width: 84px; text-align: right; }
  /* Sotto il target: il saldo in grigio, non in rosso. Sotto target non è
     uno stato negativo — è un cuscinetto che si sta ancora riempiendo. */
  .sotto .e-saldo { color: var(--label-secondary); font-weight: var(--weight-regular); }
</style>
