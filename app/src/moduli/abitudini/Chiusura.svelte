<!--
  Il foglio che chiude il giorno.

  È il gesto che fa muovere il contatore, ed è l'unico irreversibile di
  tutta la app: dopo, quel giorno non si tocca più. Quindi il foglio dice la
  CONSEGUENZA prima della domanda — «riparti da 1», «domani sei al 13» — e
  non un generico «sei sicuro?». Un avviso che non dice che cosa perdi si
  impara a confermare senza leggerlo, ed è come non averlo messo.

  Il verdetto lo calcola `esito()` in p50.js, la stessa funzione che poi
  scrive il record. Scritto due volte, il numero promesso qui e quello che
  ti ritrovi domani divergerebbero al primo ritocco della regola.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO, tocco, avviso, celebra } from "$lib/core/ui";
  import { esito, chiudi, TOTALE } from "$condivisi/abitudini/p50.js";

  let {
    aperto = $bindable(false),
    giorno = oggiISO(),
  }: { aperto: boolean; giorno?: string } = $props();

  const e = $derived.by(() => { dati.versione; return aperto ? esito(giorno) : null; });

  // Il salto del contatore detto come lo si pensa: non «prossimo: 6» ma
  // «−7», che è la cosa che fa male e quindi la cosa da guardare.
  const salto = $derived(e ? e.prossimo - e.giorno : 0);

  function conferma() {
    const rec = chiudi(giorno);
    aperto = false;
    if (!rec) { avviso("Non si può chiudere adesso.", { tono: "male" }); return; }
    tocco(rec.esito === "ok" ? 18 : 30);
    if (rec.esito !== "ok") { avviso("Giorno perso. Si riparte da 1.", { tono: "male", durata: 4200 }); return; }
    if (rec.prossimo < rec.giorno) { avviso(`Settimana non rispettata: −7. Domani sei al giorno ${rec.prossimo}.`, { tono: "male", durata: 4800 }); return; }
    if (rec.giorno >= TOTALE) { celebra("Cinquanta."); return; }
    celebra(`Giorno ${rec.giorno} chiuso.`);
  }
</script>

<Foglio bind:aperto titolo="Chiudi il giorno">
  {#if e}
    <div class="verdetto" class:male={!e.completo}>
      <span class="eti text-footnote semibold">{e.completo ? "Giorno pieno" : "Giorno perso"}</span>
      <span class="conto cifre">{e.fatte}/{e.previste}</span>
      <p class="text-subheadline secondario">
        {e.completo
          ? "Tutte le voci non negoziabili sono fatte."
          : e.nomiMancate.length === 1
            ? `Manca ${e.nomiMancate[0]}.`
            : `Mancano ${e.nomiMancate.length} voci.`}
      </p>
    </div>

    {#if !e.completo}
      <!-- I nomi per esteso, uno per riga. «Mancano 3» è un numero; «No
           PMO» è la cosa che ti è costata il contatore, e il punto di
           leggerla adesso è ricordarsela domani. -->
      <ul class="mancate">
        {#each e.nomiMancate as n (n)}
          <li class="text-subheadline"><Icona nome="chiudi" misura={13} tratto={2.6} />{n}</li>
        {/each}
      </ul>
    {/if}

    {#if e.domenica}
      <!-- La domenica la settimana si chiude insieme al giorno, e la quota
           delle serate diventa una seconda sentenza: va detta qui, non
           scoperta domani guardando un numero che è sceso. -->
      <p class="serate text-subheadline" class:penalita={e.serate.penalita}>
        <Icona nome={e.serate.penalita ? "avviso" : "spunta"} misura={15} tratto={2.2} />
        {e.serate.penalita
          ? `Serate fuori ${e.serate.usate}/${e.serate.quota}: settimana non rispettata, −7 giorni.`
          : `Serate fuori ${e.serate.usate}/${e.serate.quota}: quota rispettata.`}
      </p>
    {/if}

    <div class="conseguenza" class:male={salto <= 0}>
      <span class="text-footnote secondario">Da domani</span>
      <div class="numeri">
        <span class="da cifre">{e.giorno}</span>
        <Icona nome="freccia" misura={18} tratto={2.2} />
        <span class="a cifre">{e.prossimo}</span>
        <span class="su text-subheadline secondario">/ {TOTALE}</span>
      </div>
      <span class="text-footnote secondario">
        {salto > 0 ? "+1" : e.prossimo === 1 ? "il contatore riparte da 1" : `${salto}`}
      </span>
    </div>

    <p class="nota text-footnote secondario">
      Dopo la chiusura questo giorno non si tocca più: le spunte restano com'erano adesso.
    </p>

    <div class="azioni">
      <!-- Il giorno perso si chiude con un pulsante rosso a velo, non
           grigio: `grigio` ignora il colore distruttivo, e quel bottone è
           l'unico della app che manda via due settimane di lavoro. -->
      <Pulsante variante={e.completo ? "pieno" : "tinto"} misura="grande" larga distruttivo={!e.completo} onclick={conferma}>
        {e.completo ? "Chiudi il giorno" : "Chiudi e riparti da 1"}
      </Pulsante>
      <Pulsante variante="testo" misura="media" larga onclick={() => (aperto = false)}>Non ancora</Pulsante>
    </div>
  {/if}
</Foglio>

<style>
  .verdetto {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: var(--space-4) var(--space-4) var(--space-5);
  }
  .eti { letter-spacing: 0.6px; text-transform: uppercase; color: var(--color-green); }
  .verdetto.male .eti { color: var(--color-red); }
  .conto { font-family: var(--font-display); font-size: 56px; line-height: 1; font-weight: var(--weight-bold); }
  .verdetto p { text-align: center; }

  .mancate {
    display: flex; flex-direction: column; gap: var(--space-2);
    margin-bottom: var(--space-4); padding: var(--space-3) var(--space-4);
    border-radius: 14px; background: var(--bg-grouped-secondary);
  }
  .mancate li { display: flex; align-items: center; gap: var(--space-2); color: var(--color-red); }

  .serate { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-4); }
  .serate.penalita { color: var(--color-orange); }

  .conseguenza {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    padding: var(--space-4); border-radius: 14px; background: var(--bg-grouped-secondary);
  }
  .numeri { display: flex; align-items: baseline; gap: var(--space-2); color: var(--color-green); }
  .conseguenza.male .numeri { color: var(--color-red); }
  .numeri :global(svg) { align-self: center; }
  .da { font-size: var(--text-title3); font-weight: var(--weight-semibold); color: var(--label-tertiary); }
  .a { font-family: var(--font-display); font-size: 40px; line-height: 1; font-weight: var(--weight-bold); }
  .su { align-self: center; }

  .nota { display: block; padding: var(--space-3) var(--space-2) var(--space-4); text-align: center; }
  .azioni { display: flex; flex-direction: column; gap: var(--space-2); padding-bottom: var(--space-3); }
</style>
