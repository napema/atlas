<!--
  L'import di Training: le corse fatte (CSV di Garmin Connect) o gli
  allenamenti della chat di fitness. Reimportare lo stesso file non raddoppia
  niente: una corsa è data + distanza, uno slot è settimana + nome.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { plurale, avviso, dataUmana } from "$lib/core/ui";
  import { salvaCorse, salvaSettimana, daAbbinare, abbina, slotDi, fatto, settimanaDi } from "$condivisi/allenamenti/dati.js";
  import { corseDaCSV, allenamentiDaCSV, ESEMPIO_ALLENAMENTI } from "$condivisi/allenamenti/importa.js";
  import { km, mmss, descriviPezzi } from "$condivisi/allenamenti/calcolo.js";
  import { leggiFile } from "./comune";

  let { aperto = $bindable(false), quale = "corse" }: { aperto: boolean; quale?: "corse" | "allenamenti" } = $props();

  let scelta = $state<"corse" | "allenamenti">("corse");
  let testo = $state("");

  /* LE GIORNATE DA ABBINARE: TUTTE, non solo quelle appena importate.

     Era filtrato sulle date dell'ultimo import, e sembrava giusto — poi ci
     si accorge che chi ha importato ieri e se ne ricorda oggi dovrebbe
     reimportare lo stesso file solo per rivedere la proposta. Una giornata
     con delle corse che non stanno su nessuno slot e' da sistemare sempre,
     e aprire questo foglio e' esattamente il momento in cui te ne occupi. */
  const proposte = $derived.by(() => {
    dati.versione;
    return daAbbinare() as any[];
  });

  $effect(() => { if (aperto) { scelta = quale; testo = ""; } });

  /* LO SLOT PROPOSTO SI PUO' CAMBIARE, e serve: la proposta sceglie per
     distanza — 6 km somigliano piu' ai 7 della soglia che ai 7,6 degli
     intervalli — ma tre ripetute in pista sono intervalli, e questo il
     chilometraggio non lo sa. Chi ha corso si'. */
  let scelti = $state<Record<string, string>>({});

  const slotPossibili = (data: string) => {
    const n = settimanaDi(data);
    if (!n) return [];
    return (slotDi(n) as any[]).filter((x) => !x.bonus && x.genere === "corsa" && !fatto(x.id));
  };

  function collega(p: any) {
    const id = scelti[p.data];
    const slot = id ? slotPossibili(p.data).find((x) => x.id === id) ?? p.slot : p.slot;
    abbina({
      data: p.data, seduta: p.seduta, slot,
      /* Il nome resta quello dello slot quando la seduta e' una sola corsa;
         quando sono pezzi diventa quello che e', perche' «Facile» su tre
         ripetute a ritmo gara e' un'etichetta che mente. */
      nome: p.seduta.pezzi.length > 1 ? "Ripetute" : slot.nome,
      testo: p.seduta.pezzi.length > 1 ? descriviPezzi(p.seduta.pezzi) : "",
    });
    avviso(`${slot.nome}: fatto, ${km(p.seduta.km)}.`);
  }

  const PROMPT_FITNESS =
    "Dammi il lavoro in CSV con queste colonne, senza altro testo intorno:\n" +
    "settimana,nome,genere,testo,km\n" +
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
      const { corse, scartate, motivo, daGiri } = corseDaCSV(testo) as any;
      if (!corse.length) { avviso(motivo || "Non ho trovato corse.", { tipo: "errore" }); return; }
      const { nuove, aggiornate } = salvaCorse(corse);
      /* IL FOGLIO NON SI CHIUDE PIU' SE C'E' QUALCOSA DA ABBINARE: la
         proposta nasce proprio adesso, e chiuderla sopra sarebbe un
         suggerimento che non si e' visto. */
      testo = "";
      if (daAbbinare().length) {
        avviso(`${nuove} nuove, ${aggiornate} già c'erano. Guarda sotto: ci sono giornate da sistemare.`, { durata: 4200 });
        return;
      }
      aperto = false;
      /* IL FILE DEI GIRI NON HA LA DATA — non e' il parser che non la trova,
         Garmin non la scrive proprio: sta nella pagina da cui hai premuto
         «esporta». Quindi va detto che l'abbiamo messa a oggi, altrimenti
         lo si scopre fra un mese con la corsa sul giorno sbagliato. */
      if (daGiri) {
        avviso(`Importata: ${corse[0].km} km. Il file dei giri non ha la data — l'ho messa a oggi.`, { durata: 5200 });
      } else {
        avviso(`${nuove} nuove, ${aggiornate} già c'erano${scartate ? `, ${scartate} scartate` : ""}.`);
      }
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

  <!-- L'ABBINAMENTO. L'import portava i chilometri e lasciava lo slot
       aperto: la settimana diceva «sei allenamenti da fare» a uno che ne
       aveva appena finito uno. Qui si chiude il giro — e si PROPONE, non si
       fa: un CSV che riscrive il piano da solo toglie la fiducia nei dati
       piu' in fretta di qualunque bug. -->
  {#if scelta === "corse" && proposte.length}
    <Sezione titolo="Da sistemare"
      piede="Collegare una giornata la mette su quell'allenamento, ne scrive il contenuto vero e la spunta. Se erano più corse — le ripetute in pista sono tre attività separate sull'orologio — diventano i pezzi di una seduta sola. L'allenamento proposto è quello più vicino di chilometri: cambialo se non è quello.">
      {#each proposte as p (p.data)}
        <div class="proposta">
          <div class="p-testo">
            <span>{dataUmana(p.data)}</span>
            <span class="text-footnote secondario cifre">
              {p.seduta.quante > 1 ? `${plurale(p.seduta.quante, "corsa", "corse")} · ` : ""}{km(p.seduta.km)}{p.seduta.secondi ? ` · ${mmss(p.seduta.secondi)}` : ""}
            </span>
          </div>
          <select class="quale" aria-label="Su quale allenamento mettere il {p.data}" bind:value={
            () => scelti[p.data] ?? p.slot.id,
            (v) => (scelti = { ...scelti, [p.data]: v })
          }>
            {#each slotPossibili(p.data) as x (x.id)}
              <option value={x.id}>{x.nome} · {km(x.km)}</option>
            {/each}
          </select>
          <Pulsante variante="tinto" misura="piccola" onclick={() => collega(p)}>Collega</Pulsante>
        </div>
      {/each}
    </Sezione>
  {/if}
</Foglio>

<style>
  .proposta { position: relative; display: grid; grid-template-columns: 1fr auto; gap: var(--space-2) var(--space-3); align-items: center; padding: 10px var(--space-4); }
  .proposta + .proposta::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .p-testo { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .quale { grid-column: 1 / 2; font-size: 17px; padding: 5px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); color: var(--accento); border: 0; max-width: 100%; }
  textarea {
    width: 100%; min-height: 160px; padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-xl); background: var(--lastra-dentro);
    font-family: var(--font-mono); font-size: 17px; line-height: 1.4; resize: vertical; outline: none;
  }
  .esempio {
    white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-footnote);
    padding: var(--space-3); border-radius: var(--radius-lg); background: var(--lastra-dentro);
  }
  .file {
    position: relative; display: flex; align-items: center; justify-content: center; gap: var(--space-2);
    height: var(--button-height); border-radius: var(--radius-full);
    background: var(--fill-tertiary); font-weight: var(--weight-semibold); cursor: pointer;
  }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
</style>
