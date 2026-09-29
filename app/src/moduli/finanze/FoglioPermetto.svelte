<!--
  «Posso permettermelo?» — una simulazione, non un movimento.

  Non tocca nessun saldo finché non premi Registra. È la differenza fra
  chiedere e fare, e senza quella differenza la domanda non la fai: apri il
  form di uscita, vedi il numero che cala e a quel punto tanto vale pagare.

  Il verdetto è un FATTO, non un consiglio. L'app non sa perché stai
  comprando quella cosa, quindi non può dirti se è una buona idea: può dirti
  da dove escono i soldi e cosa cambia dopo. Tre righe al massimo, e sono
  numeri — «restano 55 fino a domenica, 9,17 al giorno invece di 16,66».
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, oggiISO, daISO, dataBreve, maiuscola, GIORNI, nuovoId } from "$lib/core/ui";
  import { stato } from "$condivisi/finanze/dati.js";
  import { simula } from "$condivisi/finanze/calcolo.js";
  import { apri } from "./fogli.svelte";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  let testo = $state("");
  let cat = $state<string | null>(null);

  // Si riparte puliti a ogni apertura: un prezzo rimasto dalla volta scorsa
  // dà un verdetto su una domanda che non hai fatto.
  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    testo = "";
    cat = null;
  });

  const categorie = $derived.by(() => { dati.versione; return stato().cats || []; });

  /** «12,50» → 1250. Virgola e punto valgono uguale: si digita come viene. */
  const centesimi = $derived(Math.round((Number(testo.replace(",", ".")) || 0) * 100));

  const s = $derived.by(() => {
    dati.versione;
    return centesimi > 0 ? simula(centesimi, cat, oggiISO()) : null;
  });

  const SEGNO: Record<string, string> = {
    si: "spunta", forse: "info", riserva: "allarme", no: "chiudi",
  };
  const TITOLO: Record<string, string> = {
    si: "Sì, dalla settimana",
    forse: "Sì, ma anticipi la Cassa",
    riserva: "Solo da ING",
    no: "No",
  };

  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`;
  };
  const ggLungo = (iso: string) => {
    const x = daISO(iso);
    return `${maiuscola(GIORNI[(x.getDay() + 6) % 7])} ${x.getDate()}`;
  };

  /* REGISTRA NON SALVA: apre il form di uscita già compilato. Il salvataggio
     resta un gesto solo, in un posto solo — e per una spesa sopra la soglia
     è quel form a chiedere «ci dormo su», che è la frizione che c'era già e
     scatta esattamente alla cifra giusta.

     Da dove esce dipende dal verdetto, e non è un dettaglio contabile:

     - A: uscita dal Principale, e basta.
     - B: uscita dalla Cassa. La Cassa è il parcheggio da cui esce la
       ricarica di lunedì, quindi spendere di lì la accorcia — che è
       esattamente la conseguenza che il verdetto ha appena mostrato.
     - C: DUE movimenti. Prima la ricarica fuori budget ING → Principale,
       poi l'uscita. Non è pignoleria: `deltaPocket` fa muovere i pocket
       esterni SOLO a `giro` e `extra`, quindi un'uscita marcata «ING»
       lascia la riserva dov'era. Il verdetto avrebbe promesso un calo che
       non sarebbe mai successo — cioè la cosa peggiore che possa fare un
       simulatore. */
  function registra() {
    if (!s) return;
    const uscita = {
      tipo: "movimento" as const, tipoMov: "out",
      preset: { id: nuovoId("m"), imp: s.prezzo, cat, pocket: s.fonte === "cassa" ? "cassa" : "principale" },
    };
    if (s.fonte === "riserva") {
      apri({
        tipo: "movimento", tipoMov: "extra",
        preset: { id: nuovoId("m"), imp: s.prezzo, pocket: "ing", pocketTo: "principale" },
        dopo: uscita,
      });
      return;
    }
    apri(uscita);
  }
</script>

<Foglio bind:aperto titolo="Posso permettermelo?">
  <Sezione>
    <Riga titolo="Quanto costa">
      {#snippet fine()}
        <span class="campo">
          <input
            type="text" inputmode="decimal" placeholder="0,00"
            bind:value={testo} aria-label="Prezzo" />
          <span class="secondario">€</span>
        </span>
      {/snippet}
    </Riga>
  </Sezione>

  <!-- La categoria è facoltativa: senza, il verdetto sui soldi vale lo
       stesso, e obbligarla prima di rispondere significa non rispondere. -->
  <Sezione titolo="Di che cosa" piede="Serve a dire quanto resta di quel budget. Si può lasciare in bianco.">
    <div class="blocco">
      <Pillole
        opzioni={categorie.map((c: any) => ({ id: c.id, testo: c.nome }))}
        scelte={cat ? [cat] : []}
        oncambio={(v: string[]) => (cat = v[0] ?? null)} />
    </div>
  </Sezione>

  {#if s}
    <div class="verdetto lastra" data-esito={s.esito}>
      <span class="capo">
        <span class="segno"><Icona nome={SEGNO[s.esito]} misura={20} tratto={2.2} /></span>
        <span class="text-title3">{TITOLO[s.esito]}</span>
      </span>

      <ul class="conseguenze">
        {#each s.righe as r (r.voce)}
          <li class="text-subheadline">
            {#if r.voce === "resta"}
              Restano <b class="cifre">{euro(r.importo, { tondo: true })}</b> fino a {gg(r.fino)}
              → <b class="cifre">{euro(r.a)}</b>/giorno <span class="secondario">(oggi {euro(r.da)})</span>
            {:else if r.voce === "ricarica"}
              {ggLungo(r.quando)} ricevi <b class="cifre">{euro(r.a, { tondo: true })}</b>
              <span class="secondario">invece di {euro(r.da, { tondo: true })}</span>
            {:else if r.voce === "ciclo"}
              Fino al {daISO(r.fino).getDate()}: da <b class="cifre">{euro(r.da)}</b>
              a <b class="cifre">{euro(r.a)}</b> al giorno
            {:else if r.voce === "libera"}
              Riserva libera: <b class="cifre">{euro(r.da, { tondo: true })}</b>
              → <b class="cifre">{euro(r.a, { tondo: true })}</b>
            {:else if r.voce === "minimo"}
              Punto più basso previsto ({dataBreve(r.quando)}):
              <b class="cifre">{euro(r.da, { tondo: true })}</b>
              → <b class="cifre">{euro(r.a, { tondo: true })}</b>
            {:else if r.voce === "mancano"}
              Mancano <b class="cifre">{euro(r.importo, { tondo: true })}</b> anche usando la riserva libera
            {/if}
          </li>
        {/each}

        {#if s.categoria}
          <!-- Vale anche quando i soldi ci sono: un budget sforato con la
               settimana in pari resta un budget sforato. -->
          <li class="text-subheadline" class:sfora={s.categoria.sfora}>
            {s.categoria.nome}: <b class="cifre">{euro(s.categoria.speso, { tondo: true })}</b>
            → <b class="cifre">{euro(s.categoria.dopo, { tondo: true })}</b>
            {#if s.categoria.budget > 0}<span class="secondario">su {euro(s.categoria.budget, { tondo: true })}</span>{/if}
          </li>
        {/if}
      </ul>
    </div>

    <div class="bottoni">
      <Pulsante variante="grigio" larga onclick={() => (aperto = false)}>Annulla</Pulsante>
      <Pulsante variante="pieno" larga onclick={registra}>Registra</Pulsante>
    </div>
  {:else}
    <p class="vuoto text-subheadline secondario">
      Scrivi quanto costa e ti dico da dove escono e cosa cambia dopo. Niente si muove finché non premi Registra.
    </p>
  {/if}
</Foglio>

<style>
  .campo { display: inline-flex; align-items: baseline; gap: 4px; }
  /* 17px e non meno: sotto, iOS zooma al focus e non torna indietro. */
  .campo input {
    width: 7ch; text-align: right; font-size: 17px; font-variant-numeric: tabular-nums;
    font-weight: var(--weight-semibold); outline: none;
  }
  .blocco { padding: var(--space-3) var(--space-4); }

  .verdetto {
    display: flex; flex-direction: column; gap: var(--space-3);
    padding: var(--space-4); margin-top: var(--space-4);
  }
  .capo { display: flex; align-items: center; gap: var(--space-3); }
  .segno {
    flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
    color: var(--label-secondary); background: var(--fill-tertiary);
  }
  /* Il colore dice la FONTE, non un giudizio: verde i soldi della
     settimana, ambra quelli che stai anticipando, rosso solo il «no», che
     non è un rimprovero ma l'unica risposta che chiude la domanda. */
  [data-esito="si"] .segno { color: var(--color-green); background: color-mix(in srgb, var(--color-green) 16%, transparent); }
  [data-esito="forse"] .segno { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent); }
  [data-esito="riserva"] .segno { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent); }
  [data-esito="no"] .segno { color: var(--color-red); background: color-mix(in srgb, var(--color-red) 16%, transparent); }

  .conseguenze { display: flex; flex-direction: column; gap: var(--space-2); }
  .conseguenze li { color: var(--label-primary); }
  .conseguenze .sfora { color: var(--color-orange); }
  .conseguenze .secondario { color: var(--label-secondary); }

  .bottoni { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-top: var(--space-4); }
  .vuoto { padding: var(--space-4); }
</style>
