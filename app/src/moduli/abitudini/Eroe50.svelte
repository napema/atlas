<!--
  La carta di Project 50: tutto quello che riguarda la sfida, in un posto.

  Erano quattro pezzi sparsi — la testata col numero, una carta per le
  serate fuori, una riga per la chiusura in fondo alla pagina e, nella
  revisione, una fila di numeri — e ognuno aveva il suo margine, il suo
  bordo e il suo vuoto intorno. Sono la stessa cosa detta quattro volte a
  metà: a che giorno sei e che cosa ti manca per arrivare al prossimo.

  Dall'alto:
    GIORNO n / 50     il numero della sfida, e l'unico grande della carta
    la barra          dei cinquanta giorni, non delle spunte di oggi
    otto pallini      le otto di oggi. Un pallino vuoto su otto si VEDE:
                      «7/8» si legge come quasi, sette pallini verdi e uno
                      grigio si leggono come quello che sono
    serate fuori      la quota della settimana, che la domenica costa 7
    la chiusura       il pulsante dalle 21, o com'è andata

  In «Progressi» i pallini e le serate lasciano il posto ai tre numeri della
  revisione: record, tenuti, ripartenze.

  A sfida spenta la carta non sparisce: diventa l'invito a cominciarla. Il
  modulo è Project 50, e la sfida è la prima cosa che deve dire.
-->
<script lang="ts">
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import SerateFuori from "./SerateFuori.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { oggiISO, avviso, plurale } from "$lib/core/ui";
  import * as p50 from "$condivisi/abitudini/p50.js";
  import { progressoGiorno } from "$condivisi/abitudini/calcolo.js";

  let {
    giorno = oggiISO(),
    modo = "oggi",
    onchiudi,
  }: { giorno?: string; modo?: "oggi" | "progressi"; onchiudi?: () => void } = $props();

  const d = $derived.by(() => {
    dati.versione;
    if (!p50.attivo()) {
      const p = progressoGiorno(giorno);
      return { attivo: false as const, fatte: p.fatte, attese: p.attese };
    }
    const b = p50.bilancio(giorno);
    const otto = (p50.ottoVoci() as any[]).filter((h) => p50.vocePrevista(h, giorno));
    return {
      attivo: true as const,
      numero: p50.giornoCorrente(giorno) as number,
      fatte: b.fatte as number,
      previste: b.previste as number,
      completo: b.completo as boolean,
      pallini: otto.map((h) => ({ id: h.id, nome: h.name, fatta: p50.voceFatta(h, giorno) })),
      rec: p50.chiusuraDi(giorno) as any,
      chiudibile: p50.chiudibile(giorno) as string,
      s: p50.statistiche() as any,
      ripartito: p50.ripartenze() as number,
    };
  });

  const quota = $derived(d.attivo ? Math.max(0, Math.min(1, (d.numero - 1) / p50.TOTALE)) : 0);

  function comincia() {
    p50.comincia();
    avviso("Giorno 1. Si chiude stasera dalle 21.");
  }
</script>

<section class="eroe" class:spenta={!d.attivo}>
  {#if !d.attivo}
    <span class="eti text-footnote semibold">Project 50</span>
    <h2 class="invito text-title2">Otto voci, cinquanta giorni, niente sconti.</h2>
    <p class="text-subheadline secondario">
      Se una delle otto manca alla chiusura, il contatore riparte da 1. Non è una serie da allungare: è una sfida da finire.
    </p>
    <Pulsante variante="pieno" misura="grande" larga onclick={comincia}>Comincia oggi</Pulsante>
    {#if d.attese}
      <p class="text-footnote secondario">Oggi {d.fatte} di {plurale(d.attese, "abitudine", "abitudini")}.</p>
    {/if}
  {:else}
    <div class="testa">
      <span class="eti text-footnote semibold">Giorno</span>
      <span class="numero cifre">{d.numero}</span>
      <span class="su text-title3 cifre">/ {p50.TOTALE}</span>
    </div>

    <div class="asta" role="img" aria-label="{d.numero - 1} giorni su {p50.TOTALE}">
      <i style:width="{Math.round(quota * 100)}%"></i>
    </div>

    {#if modo === "oggi"}
      <div class="oggi">
        <ol class="pallini" aria-label="Le otto di oggi">
          {#each d.pallini as v (v.id)}
            <li class:fatta={v.fatta} title="{v.nome}{v.fatta ? ' · fatta' : ''}"></li>
          {/each}
        </ol>
        <span class="text-subheadline" class:tutte={d.completo}>
          {d.completo ? `Tutte e ${d.previste}` : `${d.fatte} di ${d.previste}`}
        </span>
      </div>

      <div class="riga-serate"><SerateFuori {giorno} incassata /></div>

      <!-- LA CHIUSURA sta qui, nella carta della sfida, e non in fondo alla
           pagina dopo tutte le righe: sul PC finiva sotto la colonna del
           supporto, sul telefono dopo tre schermate di scorrimento. -->
      <div class="chiusura">
        {#if d.rec}
          <p class="esito text-subheadline" class:male={d.rec.esito !== "ok"}>
            <Icona nome={d.rec.esito === "ok" ? "spunta" : "chiudi"} misura={15} tratto={2.4} />
            {d.rec.esito === "ok" ? `Giorno ${d.rec.giorno} chiuso` : `Giorno perso: si riparte dal ${d.rec.prossimo}`}
          </p>
        {:else if d.chiudibile === "si"}
          <Pulsante variante="pieno" misura="grande" larga onclick={() => onchiudi?.()}>Chiudi il giorno</Pulsante>
        {:else if d.chiudibile === "presto"}
          <p class="text-footnote secondario">Si chiude dalle {p50.DALLE_ORE}. Un giorno non chiuso non conta.</p>
        {:else}
          <p class="text-footnote secondario">Questo giorno non è stato chiuso: non conta, e non si chiude più.</p>
        {/if}
      </div>
    {:else}
      <!-- Il RECORD è l'unico numero che sopravvive a un reset: dopo la terza
           ripartenza il contatore dice 2, e senza il record la carta
           racconterebbe soltanto quello. -->
      <dl class="numeri">
        <div><dt class="text-footnote secondario">Record</dt><dd class="cifre">{d.s.record}</dd></div>
        <div><dt class="text-footnote secondario">Tenuti</dt><dd class="cifre">{d.s.bene}</dd></div>
        <div><dt class="text-footnote secondario">Ripartenze</dt><dd class="cifre" class:male={d.ripartito > 0}>{d.ripartito}</dd></div>
      </dl>
    {/if}
  {/if}
</section>

<style>
  .eroe {
    display: flex; flex-direction: column; gap: var(--space-3);
    padding: var(--space-4);
    border-radius: var(--radius-xxxl);
    background: var(--bg-grouped-secondary);
  }
  .eti { color: var(--accento); letter-spacing: 0.6px; text-transform: uppercase; }

  .invito { margin: 0; }
  .spenta :global(.pulsante) { margin-top: var(--space-2); }

  .testa { display: flex; align-items: baseline; gap: var(--space-2); }
  .testa .eti { align-self: center; }
  .numero {
    font-family: var(--font-display); font-size: 56px; line-height: 1; font-weight: var(--weight-bold);
    letter-spacing: -0.02em;
  }
  .su { color: var(--label-tertiary); font-weight: var(--weight-semibold); }

  /* Quattro punti, sottile: è quanta strada c'è, non un grafico. Più spessa
     diventerebbe la cosa che guardi al posto del numero. */
  .asta { height: 4px; border-radius: var(--radius-full); background: var(--fill-tertiary); overflow: hidden; }
  .asta i { display: block; height: 100%; background: var(--accento); border-radius: inherit; transition: width var(--duration-slow) var(--ease-default); }

  .oggi { display: flex; align-items: center; gap: var(--space-3); padding-top: var(--space-1); }
  .pallini { display: flex; gap: 6px; }
  .pallini li {
    width: 12px; height: 12px; border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--label-tertiary);
    transition: background-color var(--duration-fast) var(--ease-default);
  }
  .pallini li.fatta { background: var(--color-green); box-shadow: none; }
  .tutte { color: var(--color-green); font-weight: var(--weight-semibold); }

  .riga-serate { padding-top: var(--space-3); border-top: 0.5px solid var(--separator); }
  .chiusura { padding-top: var(--space-1); }
  .chiusura p { margin: 0; }
  .esito { display: flex; align-items: center; gap: var(--space-2); color: var(--color-green); font-weight: var(--weight-semibold); }
  .esito.male { color: var(--color-red); }

  .numeri { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); padding-top: var(--space-1); }
  /* `margin: 0`: un <dd> ha quaranta punti di rientro di fabbrica, e il
     numero finiva spostato a destra della sua etichetta. */
  .numeri dd { margin: 0; font-family: var(--font-display); font-size: 30px; line-height: 1.1; font-weight: var(--weight-bold); }
  .numeri dd.male { color: var(--color-red); }
</style>
