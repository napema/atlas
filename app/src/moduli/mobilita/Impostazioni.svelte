<!--
  Mobilità in Impostazioni: il programma, il giorno di palestra, l'aggancio,
  l'assessment, e la sessione di oggi forzata a mano.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Assessment from "./Assessment.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, dataUmana, oggiISO } from "$lib/core/ui";
  import { stato, sessioniVive, scriviMeta, segnaGiorno, TIPI_SESSIONE } from "$condivisi/mobilita/dati.js";
  import { getState } from "$condivisi/mobilita/ponte.js";
  import { settimanaEffettiva } from "$condivisi/mobilita/sessione.js";

  let assessment = $state(false);

  const d = $derived.by(() => {
    dati.versione;
    const s = stato();
    return {
      p: s.meta.programma, a: s.meta.assessment,
      settimana: settimanaEffettiva(getState()),
      sessioni: sessioniVive().length,
      forza: s.giornoCorrente?.data === oggiISO() ? s.giornoCorrente.forza : null,
    };
  });

  let aggancio = $state(stato().meta.programma.aggancio || "");
  const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((g, i) => ({ id: i, testo: g }));
</script>

<Sezione titolo="Il programma" piede="La settimana effettiva sale solo se il blocco precedente è stato fatto almeno al 70% dei giorni: è il controllo che impedisce di ritrovarsi venti minuti sullo schermo con la stessa fatica del primo giorno.">
  <Riga titolo="Settimana" valore="{d.settimana} (effettiva)" />
  <Riga titolo="Sessioni" valore="{d.sessioni} in totale" />
  {#if d.p.inizioProgramma}
    <Riga titolo="Iniziato" valore={dataUmana(d.p.inizioProgramma)} />
  {:else}
    <Riga titolo="Fai partire il programma da oggi" accento onclick={() => { scriviMeta((m: any) => { m.programma.inizioProgramma = oggiISO(); }); avviso("Programma avviato."); }} />
  {/if}
</Sezione>

<Sezione titolo="Giorno di palestra" piede="In quel giorno l'app propone la sessione sotto carico invece del quotidiano. Mai il giorno dopo le gambe: è allenamento vero, non mobilità.">
  <div class="blocco">
    <Pillole opzioni={GIORNI} scelte={[d.p.giornoPalestra ?? 2]} oncambio={(v) => { scriviMeta((m: any) => { m.programma.giornoPalestra = v[0]; }); avviso("Salvato."); }} />
  </div>
</Sezione>

<Sezione titolo="L'aggancio" piede="Un'abitudine attaccata a una cosa che fai già regge molto più di una attaccata a un orario.">
  <Campo bind:valore={aggancio} segnaposto="Subito dopo la doccia serale" oninvio={() => { scriviMeta((m: any) => { m.programma.aggancio = aggancio; }); avviso("Salvato."); }} />
</Sezione>

<Sezione titolo="Assessment" piede="Completato con la sola lateralizzazione è uno stato reale, non un dato rotto: il programma parte lo stesso, e i test mancanti si fanno dopo senza ricominciare.">
  <Riga titolo="Completato" valore={d.a.completato ? "sì" : "no"} />
  <Riga titolo="Lato lateralizzato" valore={d.a.esitoTest2?.latoLateralizzato?.toUpperCase() || "non rilevato"} />
  <Riga titolo="Baseline fotografica" valore={d.a.baselineTest3?.completatoIl ? dataUmana(d.a.baselineTest3.completatoIl) : "mai fatta"} />
  <Riga titolo={d.a.completato ? "Rifai l'assessment" : "Fai l'assessment"} accento freccia onclick={() => (assessment = true)} />
</Sezione>

<Sezione titolo="Oggi" piede="Di norma è l'app a decidere che sessione fare. Da qui puoi forzarla per oggi.">
  <div class="blocco">
    <Pillole
      opzioni={Object.entries(TIPI_SESSIONE as Record<string, { nome: string }>).map(([k, v]) => ({ id: k, testo: v.nome }))}
      scelte={d.forza ? [d.forza] : []}
      oncambio={(v) => { segnaGiorno({ data: oggiISO(), forza: v[0] }); avviso(`Oggi: ${(TIPI_SESSIONE as any)[v[0]].nome}.`); }}
    />
  </div>
  {#if d.forza}
    <Riga titolo="Lascia decidere all'app" accento onclick={() => { segnaGiorno({ data: oggiISO(), forza: null }); avviso("Scelta automatica."); }} />
  {/if}
</Sezione>

<Assessment bind:aperto={assessment} />

<style>
  .blocco { padding: var(--space-3) var(--space-4); }
</style>
