<!--
  Le serate fuori della settimana: due, non di più.

  Sta SOPRA il blocco delle otto e con lo stesso peso visivo, non sotto e
  non più piccola. È una quota settimanale che, se non la rispetti, costa
  sette giorni alla domenica: metterla in fondo come un dettaglio vorrebbe
  dire scoprirla il giorno della penalità.

  Due caselle grandi da toccare invece di un più e un meno. Sono due: un
  contatore con i pulsanti sarebbe più codice per fare peggio, e soprattutto
  non si vedrebbe a colpo d'occhio quante te ne restano.
-->
<script lang="ts">
  import { tocco, daISO, maiuscola, oggiISO, GIORNI } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { serateDi, scriviSerate, config } from "$condivisi/abitudini/p50.js";

  let { giorno = oggiISO() }: { giorno?: string } = $props();

  const quota = $derived.by(() => { dati.versione; return config().quotaSerate ?? 2; });
  const usate = $derived.by(() => { dati.versione; return serateDi(giorno); });

  const nomeGiorno = $derived(maiuscola(GIORNI[(daISO(giorno).getDay() + 6) % 7]));

  /* Toccare la casella n la accende se è spenta, e SPEGNE dalla n in poi se
     era accesa: è il gesto delle stelline, e qui serve perché l'errore più
     probabile è segnarne una di troppo. */
  function tocca(n: number) {
    tocco(usate >= n ? 6 : 12);
    scriviSerate(usate >= n ? n - 1 : n, giorno);
  }
</script>

<section class="serate" class:piena={usate >= quota}>
  <div class="capo">
    <span class="eti text-footnote semibold">Serate fuori</span>
    <span class="conto cifre">{usate}/{quota}</span>
  </div>

  <div class="caselle">
    {#each Array.from({ length: quota }) as _, i (i)}
      <button
        type="button"
        class="casella"
        class:presa={usate > i}
        aria-pressed={usate > i}
        aria-label="Serata fuori {i + 1} di {quota}"
        onclick={() => tocca(i + 1)}
      ></button>
    {/each}
    <span class="text-footnote secondario giorno">{nomeGiorno}</span>
  </div>
</section>

<style>
  .serate {
    display: flex; flex-direction: column; gap: var(--space-3);
    padding: var(--space-4);
    border-radius: 16px;
    background: var(--bg-grouped-secondary);
    box-shadow: inset 0 0 0 1.5px var(--separator);
  }
  /* Quota raggiunta: il bordo si tinge, perché da quel momento una serata in
     più è la cosa che ti costa sette giorni. */
  .serate.piena { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--color-orange) 60%, transparent); }

  .capo { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti { letter-spacing: 0.6px; text-transform: uppercase; color: var(--label-secondary); }
  .conto { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .piena .conto { color: var(--color-orange); }

  .caselle { display: flex; align-items: center; gap: var(--space-3); }
  .casella {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--fill-tertiary);
    box-shadow: inset 0 0 0 1.5px var(--separator);
    transition: background-color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring);
  }
  .casella:active { transform: scale(0.94); }
  .casella.presa { background: var(--color-orange); box-shadow: none; }
  .giorno { margin-left: auto; }
</style>
