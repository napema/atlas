<!--
  Training in Impostazioni: il segnalibro per Garmin, la chiave di Hevy, il
  blocco e le sue regole.

  LA CHIAVE DI HEVY STA SOLO SU QUESTO DISPOSITIVO. Tutto il resto del
  modulo finisce nel repo dei dati; sincronizzarla vorrebbe dire metterla in
  un file che viaggia.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, dataBreve } from "$lib/core/ui";
  import { OBIETTIVO, ZONE, REGOLE, VINCOLO, inizioSettimana } from "$condivisi/allenamenti/dati.js";
  import { giornoTest } from "$condivisi/allenamenti/calcolo.js";
  import * as hevy from "$condivisi/allenamenti/hevy.js";
  import { SEGNALIBRO } from "$condivisi/allenamenti/garmin.js";

  let chiave = $state(hevy.chiave());
  let provo = $state(false);
  let catalogo = $state(hevy.esercizinoti().length);

  async function prova() {
    hevy.scriviChiave(chiave);
    provo = true;
    try {
      await hevy.provaChiave();
      const el = await hevy.scaricaEsercizi({ forza: true });
      catalogo = el.length;
      avviso(`Funziona. ${el.length} esercizi nel catalogo.`);
    } catch (e: any) {
      avviso(e.message, { tipo: "errore", durata: 4200 });
    } finally {
      provo = false;
    }
  }

  async function copiaSegnalibro() {
    try { await navigator.clipboard.writeText(SEGNALIBRO); avviso("Copiato. Salvalo come segnalibro."); }
    catch { avviso("Non riesco a copiare da qui.", { tipo: "errore" }); }
  }
</script>

<!-- IL SEGNALIBRO: gira DENTRO connect.garmin.com con la sessione già aperta,
     quindi nessuna password passa da qui. Garmin Connect non importa
     allenamenti: un .FIT caricato lì diventa un percorso. -->
<Sezione titolo="Segnalibro per Garmin" piede="Non passa da qui nessuna password: il segnalibro usa la sessione di Connect che hai già aperta. Se Garmin rifiuta, mostra il SUO messaggio.">
  <ol class="passi text-subheadline">
    <li>Copia il codice qui sotto.</li>
    <li>Salva un segnalibro qualunque, poi modificalo: chiamalo «ATLAS → Garmin» e incolla il codice al posto dell'indirizzo.</li>
    <li>In ATLAS tocca «Copia per Garmin Connect» su un allenamento.</li>
    <li>Apri connect.garmin.com → Allenamenti e tocca il segnalibro.</li>
    <li>Nel riquadro che si apre incolla e tocca «Crea allenamento».</li>
  </ol>
  <Riga titolo="Copia il codice del segnalibro" accento onclick={copiaSegnalibro} />
</Sezione>

<Sezione titolo="Hevy" piede="Hevy → Settings → Developer → Generate API Key (serve Pro). Resta su questo dispositivo e non viene sincronizzata.">
  <label class="chiave">
    <span>Chiave API</span>
    <input type="password" bind:value={chiave} placeholder="incollala qui" autocomplete="off" onchange={() => hevy.scriviChiave(chiave)} />
  </label>
  {#if catalogo}<Riga titolo="Catalogo in memoria" valore="{catalogo} esercizi" />{/if}
</Sezione>
<Pulsante variante="tinto" larga disabled={!chiave.trim() || provo} onclick={prova}>{provo ? "Provo…" : "Prova la chiave"}</Pulsante>

<Sezione titolo="Il blocco">
  <Riga titolo="Obiettivo" valore="{OBIETTIVO.nome} · {OBIETTIVO.passo}" />
  <Riga titolo="Inizio" valore={dataBreve(inizioSettimana(1))} />
  <Riga titolo="Test" valore={dataBreve(giornoTest())} />
  <Riga titolo="Zone" valore="{ZONE.z2.fc} · {ZONE.z3.fc}" />
</Sezione>

<Sezione titolo="Le regole" piede={VINCOLO}>
  <ul class="regole text-subheadline">
    {#each REGOLE as r, i (i)}<li>{r}</li>{/each}
  </ul>
</Sezione>

<style>
  .passi { padding: var(--space-4) var(--space-4) var(--space-4) 36px; list-style: decimal; display: flex; flex-direction: column; gap: 6px; }
  .chiave { display: flex; align-items: center; gap: var(--space-3); min-height: var(--list-row-height); padding: 0 var(--space-4); }
  .chiave span { flex: none; }
  .chiave input { flex: 1; min-width: 0; font-size: 17px; background: none; outline: none; text-align: right; }
  .regole { padding: var(--space-4) var(--space-4) var(--space-4) 32px; list-style: disc; display: flex; flex-direction: column; gap: 6px; }
</style>
