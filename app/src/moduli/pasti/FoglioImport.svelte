<!--
  L'import del piano dalla chat: incolla → guarda cosa entra → verifica.

  Prima portava dentro PASTI — voci del database, senza un giorno — e la
  settimana bisognava comunque comporla. Ma quando chiedi alla chat «da
  venerdì a venerdì prossimo» la risposta HA già le date: buttarle via per
  poi ricostruirle a mano era l'unico passaggio davvero inutile del giro.

  DUE SCHERMATE PRIMA DI SCRIVERE, e non è cautela di maniera: è un testo
  incollato da fuori che tocca il piano di sette giorni. La prima dice che
  cosa ha capito — quanti giorni, quali date, quali cibi non conosce
  ancora — e la seconda è la verifica vera, giorno per giorno, con lo
  stesso percorso della pianificazione della domenica.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, plurale, dataUmana } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { pastiVivi, nomeFascia } from "$condivisi/pasti/dati.js";
  import { pianoDaJSON, applicaPiano, PROMPT_CHAT } from "$condivisi/pasti/importa.js";
  import { kcal } from "./comune";

  let { aperto = $bindable(false), onverifica }: {
    aperto: boolean;
    /** Chiamata con le date scritte: la vista apre la verifica su quelle. */
    onverifica?: (date: string[]) => void;
  } = $props();

  let testo = $state("");
  let mostraPrompt = $state(false);

  $effect(() => { if (aperto) { testo = ""; mostraPrompt = false; } });

  /* Si legge mentre scrive, senza toccare niente: l'anteprima è l'unica
     difesa che c'è su un testo incollato a mano. */
  const letto = $derived.by(() => {
    dati.versione;
    if (!testo.trim()) return null;
    return pianoDaJSON(testo, { noti: pastiVivi() }) as any;
  });

  const pasti = $derived(letto ? letto.giorni.reduce((t: number, g: any) => t + g.pasti.length, 0) : 0);

  async function copia() {
    try {
      await navigator.clipboard.writeText(PROMPT_CHAT);
      avviso("Prompt copiato.");
    } catch {
      // Safari lo blocca fuori da un gesto diretto: si mostra e basta.
      mostraPrompt = true;
    }
  }

  function importa() {
    if (!letto?.giorni.length) return;
    const r = applicaPiano(letto);
    aperto = false;
    avviso(`${plurale(r.fasce, "pasto messo", "pasti messi")} in ${plurale(r.date.length, "giorno", "giorni")}.`);
    // Si passa subito alla verifica: un piano arrivato da fuori va guardato
    // una volta, e il momento in cui lo guardi è adesso.
    setTimeout(() => onverifica?.(r.date), 320);
  }
</script>

<Foglio bind:aperto titolo="Importa il piano">
  <p class="text-subheadline secondario">
    Chiedi alla chat il piano dei giorni che vuoi e incolla qui la risposta. Le staccionate ``` vanno bene: le tolgo io.
  </p>
  <Pulsante variante="grigio" larga icona="importa" onclick={copia}>Copia il prompt per la chat</Pulsante>
  {#if mostraPrompt}<pre class="prompt">{PROMPT_CHAT}</pre>{/if}

  <textarea bind:value={testo} rows="8" placeholder={'{ "giorni": [ … ] }'} aria-label="JSON del piano"></textarea>

  {#if letto}
    {#if letto.giorni.length}
      <Sezione titolo="Cosa entra" piede="Niente è ancora scritto. Dopo «Importa» ti faccio verificare giorno per giorno.">
        <Riga titolo="Giorni" valore={`${letto.giorni.length} · ${dataUmana(letto.giorni[0].data)} → ${dataUmana(letto.giorni[letto.giorni.length - 1].data)}`} />
        <Riga titolo="Pasti" valore={String(pasti)} />
        <Riga titolo="Cibi nuovi" valore={letto.nuovi.length ? String(letto.nuovi.length) : "nessuno"} />
      </Sezione>

      {#if letto.nuovi.length}
        <Sezione titolo="Entrano nel database" piede="Quelli che già conosci tengono i valori che hanno: reimportare non riscrive il catalogo.">
          {#each letto.nuovi.slice(0, 12) as n (n.nome)}
            <Riga titolo={n.nome} sottotitolo={n.porzione} valore="{kcal(n.kcal)} kcal" />
          {/each}
          {#if letto.nuovi.length > 12}
            <Riga><span class="text-subheadline secondario">e altri {letto.nuovi.length - 12}.</span></Riga>
          {/if}
        </Sezione>
      {/if}

      <Sezione titolo="I giorni">
        {#each letto.giorni as g (g.data)}
          <Riga
            titolo={dataUmana(g.data)}
            sottotitolo={g.pasti.map((p: any) => nomeFascia(p.fascia)).join(" · ")}
            valore={`${g.pasti.reduce((t: number, p: any) => t + p.componenti.length, 0)} voci`}
          />
        {/each}
      </Sezione>
    {/if}

    {#if letto.problemi.length}
      <Sezione titolo={letto.giorni.length ? "Righe saltate" : "Non ci siamo"} piede="Il resto entra lo stesso.">
        {#each letto.problemi.slice(0, 8) as p (p)}
          <Riga><span class="text-subheadline male">{p}</span></Riga>
        {/each}
      </Sezione>
    {/if}
  {/if}

  <Pulsante variante="pieno" larga disabled={!letto?.giorni.length} onclick={importa}>
    {letto?.giorni.length ? `Importa ${plurale(letto.giorni.length, "giorno", "giorni")} e verifica` : "Importa"}
  </Pulsante>
</Foglio>

<style>
  textarea {
    width: 100%; min-height: 160px; padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-xl); background: var(--bg-grouped-secondary);
    font-family: var(--font-mono); font-size: 17px; line-height: 1.4; resize: vertical; outline: none;
  }
  .prompt {
    white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-footnote);
    padding: var(--space-3); border-radius: var(--radius-lg); background: var(--bg-grouped-secondary);
    -webkit-user-select: text; user-select: text;
  }
  .male { color: var(--color-red); }
</style>
