<!--
  L'import di Training: le corse fatte (CSV di Garmin Connect) o gli
  allenamenti della chat di fitness. Reimportare lo stesso file non raddoppia
  niente: una corsa è data + distanza, uno slot è settimana + nome.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { plurale, avviso } from "$lib/core/ui";
  import { salvaCorse, salvaSettimana } from "$condivisi/allenamenti/dati.js";
  import { corseDaCSV, allenamentiDaCSV, ESEMPIO_ALLENAMENTI } from "$condivisi/allenamenti/importa.js";
  import { leggiFile } from "./comune";

  let { aperto = $bindable(false), quale = "corse" }: { aperto: boolean; quale?: "corse" | "allenamenti" } = $props();

  let scelta = $state<"corse" | "allenamenti">("corse");
  let testo = $state("");
  $effect(() => { if (aperto) { scelta = quale; testo = ""; } });

  const PROMPT_FITNESS =
    "Dammi il lavoro in CSV con queste colonne, senza altro testo intorno:
" +
    "settimana,nome,genere,testo,km
" +
    "`settimana` è un numero da 1 a 13. `nome` è come chiamo l'allenamento " +
    "(Fartlek, Full body, Giro in bici: quello che è). `genere` è corsa, " +
    "palestra o altro. `testo` è l'allenamento in una riga; per la palestra " +
    "separa gli esercizi con · e scrivi le serie come 4×8. `km` solo per la " +
    "corsa, col punto decimale. Una riga per allenamento: se la settimana ne " +
    "ha tre, scrivi tre righe.";

  async function file(e: Event) {
    try {
      const f = await leggiFile(e);
      if (f) { testo = f.testo; avviso(`Letto ${f.nome}.`); }
    } catch { avviso("Non riesco a leggere il file.", { tipo: "errore" }); }
  }

  async function copiaFormato() {
    try { await navigator.clipboard.writeText(PROMPT_FITNESS); avviso("Copiato: incollalo nella chat di fitness."); }
    catch { avviso("Non riesco a copiare da qui.", { tipo: "errore" }); }
  }

  function importa() {
    if (scelta === "corse") {
      const { corse, scartate, motivo } = corseDaCSV(testo);
      if (!corse.length) { avviso(motivo || "Non ho trovato corse.", { tipo: "errore" }); return; }
      const { nuove, aggiornate } = salvaCorse(corse);
      aperto = false;
      avviso(`${nuove} nuove, ${aggiornate} già c'erano${scartate ? `, ${scartate} scartate` : ""}.`);
    } else {
      const { settimane, scartate, motivo } = allenamentiDaCSV(testo);
      if (!settimane.length) { avviso(motivo || "Non ho trovato allenamenti.", { tipo: "errore" }); return; }
      /* SOSTITUISCE la settimana, non ci si appoggia sopra: se importi tre
         allenamenti quella settimana ne ha tre. Prima gli altri tre del
         blocco restavano sotto e la settimana ne diceva sei. */
      let scritti = 0;
      for (const w of settimane) scritti += salvaSettimana(w.sett, w.voci);
      aperto = false;
      avviso(`${scritti} allenamenti in ${plurale(settimane.length, "settimana", "settimane")}${scartate ? `, ${scartate} righe scartate` : ""}.`);
    }
  }
</script>

<Foglio bind:aperto titolo="Importa">
  <Segmenti opzioni={[{ id: "corse", testo: "Corse fatte" }, { id: "allenamenti", testo: "Allenamenti" }]} bind:valore={scelta} />

  {#if scelta === "corse"}
    <p class="text-subheadline secondario">Su Garmin Connect: Attività → Tutte le attività → l'icona di esportazione in alto a destra. Poi incolla qui il contenuto, o scegli il file.</p>
  {:else}
    <p class="text-subheadline secondario">Una riga per allenamento. Il <b>nome</b> lo scegli tu: non ci sono tipi fissi. Quello che importi <b>sostituisce</b> la settimana — tre righe fanno tre allenamenti, sette ne fanno sette.</p>
    <pre class="esempio">{ESEMPIO_ALLENAMENTI}</pre>
    <Pulsante variante="grigio" larga onclick={copiaFormato}>Copia il formato per la chat</Pulsante>
  {/if}

  <textarea bind:value={testo} rows="8" placeholder={scelta === "corse" ? "Incolla qui il CSV di Garmin Connect…" : ESEMPIO_ALLENAMENTI} aria-label="Testo da importare"></textarea>

  <label class="file">
    <Icona nome="importa" misura={18} tratto={1.9} />
    <span>…oppure scegli il file</span>
    <input type="file" accept=".csv,.txt" onchange={file} />
  </label>

  <Pulsante variante="pieno" larga disabled={!testo.trim()} onclick={importa}>
    {scelta === "corse" ? "Importa le corse" : "Importa gli allenamenti"}
  </Pulsante>
</Foglio>

<style>
  textarea {
    width: 100%; min-height: 160px; padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-xl); background: var(--bg-grouped-secondary);
    font-family: var(--font-mono); font-size: 17px; line-height: 1.4; resize: vertical; outline: none;
  }
  .esempio {
    white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-footnote);
    padding: var(--space-3); border-radius: var(--radius-lg); background: var(--bg-grouped-secondary);
  }
  .file {
    position: relative; display: flex; align-items: center; justify-content: center; gap: var(--space-2);
    height: var(--button-height); border-radius: var(--radius-full);
    background: var(--fill-tertiary); font-weight: var(--weight-semibold); cursor: pointer;
  }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
</style>
