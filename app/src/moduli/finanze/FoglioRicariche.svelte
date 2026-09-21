<!--
  I tre fogli dei soldi che si spostano: la ricarica del lunedì, la
  ricarica fuori ciclo, il saldo di ING. Stanno insieme perché sono la
  stessa forma — un numero, da dove, dove — con regole diverse.

  L'AVANZO NON SI AZZERA: se la settimana scorsa hai speso meno, quei soldi
  restano sul Principale e si sommano alla ricarica. Azzerare premierebbe
  chi arriva a domenica con zero, cioè insegnerebbe a spendere tutto entro
  sabato.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Tastierino from "$lib/ui/Tastierino.svelte";
  import { avviso, celebra, centesimi, dataBreve, euro, nuovoId, oggiISO, plurale, tocco } from "$lib/core/ui";
  import { stato, salvaMovimento, segnaRicarica, pocketPerId, scriviPocket } from "$condivisi/finanze/dati.js";
  import { saldoPocket, cicloDi, settimana, sforamenti } from "$condivisi/finanze/calcolo.js";
  import { testoDa, pulisciImporto } from "./comune";

  let { aperto = $bindable(false), quale }: { aperto: boolean; quale: "ricaricaSett" | "ricarica" | "saldoING" } = $props();

  let testo = $state("");
  let fonte = $state<"cassa" | "ing">("cassa");
  let perche = $state("");

  // I numeri di partenza si fotografano all'apertura: mentre scrivi non
  // devono cambiare sotto le dita.
  let f = $state<any>(null);
  $effect(() => {
    if (!aperto) return;
    const oggi = oggiISO();
    const previsto = Number(stato().config?.cassaSettimanale) || 0;
    const cassa = saldoPocket("cassa");
    const daIng = cassa <= 0;
    const massimo = daIng ? saldoPocket("ing") : cassa;
    f = {
      oggi, previsto, cassa, daIng, massimo,
      principale: saldoPocket("principale"),
      s: settimana(oggi), sf: sforamenti(cicloDi(oggi)),
    };
    testo = quale === "ricaricaSett" ? testoDa(Math.min(previsto, massimo))
      : quale === "saldoING" ? testoDa(pocketPerId("ing")?.saldo || 0) : "";
    fonte = "cassa"; perche = "";
  });

  const imp = $derived(centesimi(testo) ?? 0);

  function ricaricaSettimanale() {
    const x = Math.min(imp, f.massimo);
    salvaMovimento({
      id: nuovoId("m"), data: f.oggi,
      // Dalla Cassa è un travaso fra pocket miei; da ING è uno sforamento, e
      // la differenza è tutto il valore del contatore.
      tipo: f.daIng ? "extra" : "giro", imp: x,
      pocket: f.daIng ? "ing" : "cassa", pocketTo: "principale", cat: null, sub: null,
      nota: f.daIng ? "Ricarica settimanale — Cassa vuota" : "Ricarica settimanale",
    });
    segnaRicarica(f.oggi);
    tocco(14);
    aperto = false;
    celebra("Settimana ricaricata");
  }

  function ricaricaFuori() {
    const motivo = perche.trim();
    salvaMovimento(fonte === "cassa"
      ? { id: nuovoId("m"), data: f.oggi, tipo: "giro", imp, pocket: "cassa", pocketTo: "principale", cat: null, sub: null, nota: `Anticipo — ${motivo}` }
      // Anche lo sforamento ha due estremi: ESCE da ING ed ENTRA nel Principale.
      : { id: nuovoId("m"), data: f.oggi, tipo: "extra", imp, pocket: "ing", pocketTo: "principale", cat: null, sub: null, nota: motivo });
    tocco(14);
    aperto = false;
    avviso(fonte === "cassa" ? "Anticipo registrato." : "Sforamento registrato.");
  }

  function salvaIng() {
    scriviPocket("ing", { saldo: imp });
    aperto = false;
    avviso("Saldo aggiornato.");
  }
</script>

<Foglio bind:aperto titolo={quale === "ricaricaSett" ? "Ricarica settimanale" : quale === "ricarica" ? "Ricarica fuori ciclo" : "Saldo ING"}>
  {#if f}
    {#if quale === "ricaricaSett"}
      <Sezione>
        <Riga titolo={f.daIng ? "ING" : "Cassa"} valore={euro(f.massimo)} />
        <Riga titolo="Principale" valore={euro(f.principale)} />
      </Sezione>
      {#if f.daIng}
        <p class="allarme text-subheadline"><b>Cassa vuota.</b> La ricarica arriva da ING e viene contata come sforamento. Succede dopo il 21, quando lo stipendio non è ancora entrato.</p>
      {:else if f.cassa < f.previsto}
        <p class="allarme text-subheadline"><b>In Cassa ci sono solo {euro(f.cassa)}.</b> Puoi trasferire quello che c'è, oppure prendere il resto da ING — quello sì conta come sforamento.</p>
      {/if}
      <Sezione piede="Dopo: {f.daIng ? 'ING' : 'Cassa'} {euro(f.massimo - Math.min(imp, f.massimo))} · Principale {euro(f.principale + Math.min(imp, f.massimo))}">
        <Campo etichetta="Trasferisci" bind:valore={testo} modo="decimal" allinea="destra" unita="€" />
      </Sezione>
      <Pulsante variante="pieno" larga disabled={imp <= 0 || imp > f.massimo} onclick={ricaricaSettimanale}>{imp > 0 ? `Trasferisci ${euro(Math.min(imp, f.massimo))}` : "Quanto?"}</Pulsante>
      <p class="text-footnote secondario spiega">{f.principale > 0 ? `Sul Principale ci sono ancora ${euro(f.principale)} della settimana scorsa: non si azzerano, si sommano.` : "Quello che avanza a fine settimana resta sul Principale e si somma alla prossima ricarica."}</p>

    {:else if quale === "ricarica"}
      <p class="text-subheadline secondario">
        Restano {plurale(f.s.giorniRimasti, "giorno", "giorni")} a lunedì. {f.sf.n === 0 ? "Questo ciclo non hai ancora ricaricato." : `Questo ciclo hai già ricaricato ${plurale(f.sf.n, "volta", "volte")}.`}
        {#if f.sf.n >= 1}L'ultima è del {dataBreve(f.sf.ultimo.data)} da {euro(f.sf.ultimo.imp, { tondo: true })}{f.sf.ultimo.nota ? ` — «${f.sf.ultimo.nota}»` : ""}.{/if}
      </p>
      <Segmenti opzioni={[{ id: "cassa", testo: "Dalla Cassa" }, { id: "ing", testo: "Da ING" }]} bind:valore={fonte} />
      <p class="text-subheadline conseguenza" class:male={fonte === "ing"}>
        {fonte === "ing" ? "Intacchi la riserva. Viene contato come sforamento."
          : imp > 0 ? `Anticipi la prossima settimana: lunedì avrai ${euro(Math.max(0, f.s.budget - imp))} invece di ${euro(f.s.budget)}.`
          : `Nella Cassa ci sono ${euro(f.cassa)}.`}
      </p>
      <label class="importo"><input type="text" inputmode="decimal" readonly={!matchMedia("(hover: hover) and (pointer: fine)").matches} placeholder="0,00" value={testo} oninput={(e) => (testo = pulisciImporto(e.currentTarget.value))} aria-label="Importo" /><span>€</span></label>
      <Tastierino bind:valore={testo} />
      <Sezione piede="Obbligatorio. A fine mese rileggere i motivi vale più dei totali.">
        <Campo etichetta="Perché" bind:valore={perche} segnaposto="cena fuori non prevista" />
      </Sezione>
      <Pulsante variante="pieno" larga disabled={!(imp > 0 && perche.trim().length >= 3)} onclick={ricaricaFuori}>
        {imp > 0 && perche.trim().length >= 3 ? `Ricarica ${euro(imp)}` : imp > 0 ? "Scrivi perché, anche due parole" : "Quanto ti serve?"}
      </Pulsante>

    {:else}
      <p class="text-subheadline secondario">ING è una riserva che sta fuori dall'app: il saldo non si deduce dai movimenti, si copia dall'estratto conto.</p>
      <label class="importo"><input type="text" inputmode="decimal" readonly={!matchMedia("(hover: hover) and (pointer: fine)").matches} placeholder="0,00" value={testo} oninput={(e) => (testo = pulisciImporto(e.currentTarget.value))} aria-label="Saldo" /><span>€</span></label>
      <Tastierino bind:valore={testo} />
      <Pulsante variante="pieno" larga onclick={salvaIng}>Salva</Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .allarme { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--label-primary); background: color-mix(in srgb, var(--color-red) 12%, transparent); }
  .allarme b { color: var(--color-red); }
  .spiega { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-4)); }
  .conseguenza { color: var(--label-secondary); }
  .conseguenza.male { color: var(--color-red); }
  .importo { display: flex; align-items: baseline; justify-content: center; gap: 6px; }
  .importo input { width: 100%; max-width: 260px; text-align: right; background: none; outline: none; font-family: var(--font-display); font-size: 52px; line-height: 60px; font-weight: var(--weight-bold); font-variant-numeric: tabular-nums; caret-color: var(--accento); }
  .importo input::placeholder { color: var(--label-tertiary); }
  .importo span { flex: 1; font-family: var(--font-display); font-size: 30px; font-weight: var(--weight-semibold); color: var(--label-secondary); }
</style>
