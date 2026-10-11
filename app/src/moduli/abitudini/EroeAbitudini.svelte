<!--
  La testata delle Abitudini: com'è andata oggi, e cosa viene dopo.

  Prende il posto della carta di Project 50 (sospeso dall'11 ottobre 2026)
  e parla la lingua della carta OGGI di Finanze: un anello, un numero, una
  riga. Lo stesso disegno per la stessa domanda — «a che punto sono?» — in
  due moduli diversi: è quello che rende la app una app sola.

    l'anello   quanto della giornata è spuntato. Pieno e verde = tutto fatto,
               che in ATLAS vuol dire solo questo
    il numero  «3 di 7», perché una frazione si legge e una percentuale si
               calcola
    la riga    la PROSSIMA cosa con il suo orario, o «tutto fatto» con la
               serie. Mai l'elenco di quello che manca: quello è la lista
               qui sotto, e dirlo due volte lo farebbe leggere zero.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Anello from "$lib/ui/Anello.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { plurale, oggiISO, dataUmana, maiuscola } from "$lib/core/ui";
  import { giornataOggi, serie } from "$condivisi/abitudini/calcolo.js";
  import { abitudiniVive } from "$condivisi/abitudini/dati.js";

  let { giorno }: { giorno: string } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const oggi = giorno === oggiISO();
    const adesso = new Date();
    const hhmm = `${String(adesso.getHours()).padStart(2, "0")}:${String(adesso.getMinutes()).padStart(2, "0")}`;
    /* Il conto è per ORARIO, come i gettoni della home e le notifiche: gli
       integratori delle 08:00 e quelli delle 13:00 sono due cose fatte, non
       una. Contare le abitudini dava «0 di 3» sopra cinque cose da fare. */
    const tutte = giornataOggi(giorno) as any[];
    const voci = tutte.filter((v) => !v.fatta && !v.saltata);
    const p = { attese: tutte.length, fatte: tutte.length - voci.length, frazione: tutte.length ? (tutte.length - voci.length) / tutte.length : 0 };
    /* La prossima: la prima ancora aperta a partire da ADESSO. Se l'orario
       è già passato è «da fare», non «prossima»: si mostra quella in
       ritardo, perché è lei la cosa da fare. */
    const inRitardo = oggi ? voci.find((v) => v.ora && v.ora <= hhmm) : null;
    const prossima = inRitardo ?? voci.find((v) => v.ora && (!oggi || v.ora > hhmm)) ?? voci[0] ?? null;
    return {
      p, oggi,
      prossima, ritardo: Boolean(inRitardo),
      migliore: (abitudiniVive() as any[]).reduce((m, h) => Math.max(m, serie(h)), 0),
    };
  });

  const pieno = $derived(d.p.attese > 0 && d.p.fatte >= d.p.attese);
</script>

<Sezione>
  <div class="eroe" class:pieno>
    <span class="testa">
      <span class="eti">{d.oggi ? "OGGI" : maiuscola(dataUmana(giorno)).toUpperCase()}</span>
      {#if d.migliore > 1}<span class="eti-dx cifre">serie migliore {plurale(d.migliore, "giorno", "giorni")}</span>{/if}
    </span>

    <div class="corpo">
      <Anello valore={d.p.frazione} misura={64} spessore={9} colore={pieno ? "var(--color-green)" : "var(--accento)"} />
      <div class="testo">
        <span class="numero cifre">{d.p.fatte}<span class="di">{` di ${d.p.attese}`}</span></span>
        <span class="riga" class:ritardo={d.ritardo}>
          {#if !d.p.attese}
            nessuna abitudine prevista
          {:else if pieno}
            tutto fatto
          {:else if d.prossima}
            {d.ritardo ? "da fare" : "poi"}: {d.prossima.emoji ?? ""} {d.prossima.nome}{#if d.prossima.ora}{` · ${d.prossima.ora}`}{/if}
          {/if}
        </span>
      </div>
    </div>
  </div>
</Sezione>

<style>
  .eroe { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); }
  .testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti { font-size: var(--text-caption1); font-weight: var(--weight-semibold); letter-spacing: 0.6px; color: var(--label-secondary); }
  .eti-dx { font-size: var(--text-footnote); color: var(--label-secondary); white-space: nowrap; }
  .corpo { display: flex; align-items: center; gap: var(--space-4); }
  .testo { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .numero {
    font-family: var(--font-display); font-size: 40px; line-height: 1.05;
    font-weight: var(--weight-bold); letter-spacing: -0.02em;
  }
  .di { font-size: var(--text-title3); font-weight: var(--weight-semibold); color: var(--label-secondary); letter-spacing: 0; }
  .pieno .numero { color: var(--color-green); }
  .riga { font-size: var(--text-subheadline); color: var(--label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .riga.ritardo { color: var(--color-orange); font-weight: var(--weight-semibold); }
</style>
