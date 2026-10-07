<!--
  Il giorno di paga: quattro travasi, uno per volta.

  Si apre registrando l'entrata marcata «stipendio», e si può riaprire dal
  blocco Pocket finché i quattro non sono fatti.

  Ogni spunta CREA il giro. Non è un promemoria che si spunta: è il gesto
  che muove i soldi, altrimenti resterebbe una lista di cose da fare su
  Revolut e l'app racconterebbe saldi che non esistono.

  L'ordine non si cambia. Il Fondo per primo perché un fondo che prende
  quello che resta non riceve niente — e questa non è una regola di
  disciplina, è aritmetica di tutti i mesi scorsi. L'ING per ultimo perché è
  l'unico che può essere negativo, e quando è negativo la domanda è «cosa
  taglio», non «quanto metto da parte».
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, euro, nuovoId, plurale, tocco, daISO, MESI_BREVI, GIORNI } from "$lib/core/ui";
  import { salvaMovimento, segnaTravaso } from "$condivisi/finanze/dati.js";
  import { travasiPaga, travasiFatti } from "$condivisi/finanze/paga.js";
  import { nomePocket } from "./comune";

  let { aperto = $bindable(false), dataStip, entrata = null }:
    { aperto: boolean; dataStip: string; entrata?: number | null } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const t = travasiPaga(dataStip, entrata);
    const fatti = new Set(travasiFatti(dataStip));
    return {
      ...t,
      fatti,
      restano: t.righe.filter((r: any) => !fatti.has(r.id)).length,
      allocato: t.righe.reduce((s: number, r: any) => s + (r.tipo === "extra" ? -r.imp : r.imp), 0),
    };
  });

  const glm = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };

  function fai(r: any) {
    if (d.fatti.has(r.id)) return;
    if (r.imp <= 0) { segnaTravaso(dataStip, r.id); tocco(8); return; }
    salvaMovimento({
      id: nuovoId("m"), tipo: r.tipo, imp: r.imp, nota: r.nota,
      cat: null, sub: null, pocket: r.da, pocketTo: r.a,
      data: dataStip, rif: null, ecc: false,
      // `pianificata: true` su un `extra` del giorno di paga: è previsto
      // dal piano, non è uno strappo, e non deve finire in «Fuori piano».
      ...(r.tipo === "extra" ? { pianificata: true } : {}),
    });
    segnaTravaso(dataStip, r.id);
    tocco(12);
    avviso(`${r.nome} · ${euro(r.imp)}`);
  }
</script>

<Foglio bind:aperto titolo="Giorno di paga">
  <div class="testa">
    <span class="text-footnote secondario">{glm(dataStip)}</span>
    <span class="cifre entrata">{euro(d.entrate)}</span>
    {#if d.eccezione}
      <span class="tag">importi scritti a mano per questo stipendio</span>
    {/if}
  </div>

  <Sezione titolo="I quattro travasi" piede={d.restano
    ? `Ogni spunta crea il giro. ${plurale(d.restano, "ne manca", "ne mancano")}.`
    : "Fatti tutti e quattro."}>
    {#each d.righe as r (r.id)}
      {@const fatto = d.fatti.has(r.id)}
      <button type="button" class="travaso" class:fatto disabled={fatto} onclick={() => fai(r)}>
        <span class="spunta" class:ok={fatto}>
          {#if fatto}<Icona nome="spunta" misura={15} tratto={3} />{/if}
        </span>
        <span class="corpo">
          <span class="nome">{r.nome}</span>
          <span class="text-footnote secondario">{nomePocket(r.da)} → {nomePocket(r.a)} · {r.perche}</span>
        </span>
        <span class="cifre imp" class:male={r.allarme}>{euro(r.imp)}</span>
      </button>
    {/each}
  </Sezione>

  <!-- Il dettaglio delle Fisse: è il numero che non si può tenere a mente,
       quindi è il numero che va mostrato per esteso. -->
  {#if !d.eccezione && d.fisse.dettaglio.length}
    <Sezione titolo="Cosa copre il travaso alle Fisse"
      piede="Le quote sono gli accantonamenti per quello che scade più avanti: 150 € ogni due mesi non si mettono da parte il mese in cui arrivano.">
      {#each d.fisse.dettaglio as x (x.nome + x.quando)}
        <div class="voce">
          <span class="v-data cifre secondario text-footnote">{glm(x.quando)}</span>
          <span class="v-nome">{x.nome}{x.quota ? ` · quota 1/${x.su}` : ""}</span>
          <span class="cifre">{euro(x.imp)}</span>
        </div>
      {/each}
      <div class="voce totale">
        <span class="v-data"></span>
        <span class="v-nome text-footnote secondario">
          scadenze {euro(d.fisse.scadenze, { tondo: true })} + quote {euro(d.fisse.quote, { tondo: true })} − saldo {euro(d.fisse.saldo, { tondo: true })}
        </span>
        <span class="cifre semibold">{euro(d.fisse.importo)}</span>
      </div>
    </Sezione>
  {/if}

  <Pulsante variante={d.restano ? "grigio" : "pieno"} larga onclick={() => (aperto = false)}>
    {d.restano ? "Chiudi, finisco dopo" : "Fatto"}
  </Pulsante>
</Foglio>

<style>
  .testa { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) 0 var(--space-4); }
  .entrata { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--color-green); }
  .tag { font-size: var(--text-caption1); color: var(--color-orange); }

  .travaso { position: relative; display: flex; align-items: center; gap: var(--space-3); width: 100%; padding: var(--space-3) var(--space-4); text-align: left; }
  .travaso + .travaso::before { content: ""; position: absolute; top: 0; left: calc(var(--space-4) + 28px + var(--space-3)); right: 0; border-top: 0.5px solid var(--separator); }
  .travaso:active:not(.fatto) { background: var(--fill-quaternary); }
  .travaso.fatto { opacity: 0.5; }
  .spunta { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--fill-tertiary); color: #fff; }
  .spunta.ok { background: var(--color-green); }
  .corpo { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .nome { font-weight: var(--weight-semibold); }
  .imp { flex: none; font-size: var(--text-callout); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; }
  .male { color: var(--color-red); }

  .voce { position: relative; display: flex; align-items: baseline; gap: var(--space-3); padding: 8px var(--space-4); }
  .voce + .voce::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .v-data { flex: none; width: 76px; }
  .v-nome { flex: 1; min-width: 0; }
  .voce .cifre { font-variant-numeric: tabular-nums; }
  .totale { border-top: 0.5px solid var(--separator); }
</style>
