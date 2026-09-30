<!--
  L'allenamento in più: il settimo, quello che il programma non prevede.

  Due strade sole. Il modello «Upper B», che è quello che si aggiunge nove
  volte su dieci e deve costare un tocco; e il testo libero, per la volta
  che non è Upper B. Niente scelta di giorno, niente ora: quelle le mette
  l'automazione come per ogni altro slot, e chiederle qui vorrebbe dire
  chiedere due volte la stessa cosa.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { avviso, tocco } from "$lib/core/ui";
  import { UPPER_B, aggiungiBonus, pianoDi } from "$condivisi/allenamenti/dati.js";

  let { aperto = $bindable(false), settimana }: { aperto: boolean; settimana: number } = $props();

  let nome = $state("");
  let testo = $state("");

  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    nome = "";
    testo = "";
  });

  /* L'avviso del taper si DICE, non si impone. Nelle ultime due settimane
     un allenamento in più è quasi sempre un errore, ma «quasi sempre» non
     è «sempre»: chi ha saltato tre sedute per l'influenza sa una cosa che
     il piano non sa. Quindi si scrive, e il bottone resta acceso. */
  const p = $derived(pianoDi(settimana));
  const taper = $derived(/taper|test/i.test(String(p?.fase || "")));

  function salva(n: string, t: string) {
    if (!t.trim()) { avviso("Manca il contenuto dell'allenamento.", { tipo: "errore" }); return; }
    aggiungiBonus(settimana, { nome: n, testo: t });
    tocco(12);
    aperto = false;
    avviso(`${n} aggiunto alla settimana ${settimana}.`);
  }
</script>

<Foglio bind:aperto titolo="Allenamento in più">
  {#if taper}
    <p class="avvertenza text-subheadline">
      <Icona nome="info" misura={16} tratto={2.2} />
      Settimana di {String(p?.fase).toLowerCase()}: allenamento extra sconsigliato.
    </p>
  {/if}

  <Sezione titolo="Modello" piede="Si aggiunge in fondo alla Palestra di questa settimana, spuntabile come gli altri.">
    <button type="button" class="modello" onclick={() => salva(UPPER_B.nome, UPPER_B.testo)}>
      <span class="m-alto">
        <span class="text-headline">{UPPER_B.nome}</span>
        <span class="tag text-caption2">bonus</span>
      </span>
      <span class="text-footnote secondario">{UPPER_B.testo}</span>
    </button>
  </Sezione>

  <Sezione titolo="Personalizzato">
    <label class="campo">
      <span class="text-footnote secondario">Nome</span>
      <input type="text" bind:value={nome} placeholder="Come si chiama" />
    </label>
    <label class="campo">
      <span class="text-footnote secondario">Esercizi</span>
      <textarea bind:value={testo} rows="4" placeholder="Separa gli esercizi con ·"></textarea>
    </label>
  </Sezione>

  <Pulsante variante="pieno" larga onclick={() => salva(nome.trim() || "Bonus", testo)}>Aggiungi</Pulsante>
</Foglio>

<style>
  .avvertenza {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg);
    color: var(--color-yellow);
    background: color-mix(in srgb, var(--color-yellow) 12%, transparent);
    margin-bottom: var(--space-4);
  }

  .modello {
    display: flex; flex-direction: column; gap: 4px; width: 100%;
    padding: var(--space-4); text-align: left;
  }
  .modello:active { opacity: 0.6; }
  .m-alto { display: flex; align-items: center; gap: var(--space-2); }
  .tag {
    padding: 1px 6px; border-radius: var(--radius-sm);
    color: var(--color-yellow);
    background: color-mix(in srgb, var(--color-yellow) 16%, transparent);
    text-transform: uppercase; letter-spacing: 0.5px;
  }

  .campo {
    display: flex; flex-direction: column; gap: 2px;
    padding: var(--space-3) var(--space-4);
    border-top: 0.5px solid var(--separator);
  }
  .campo:first-child { border-top: 0; }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .campo input, .campo textarea {
    font-size: 17px; width: 100%; outline: none; resize: vertical;
    font-family: inherit;
  }
</style>
