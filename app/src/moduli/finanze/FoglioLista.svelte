<!--
  La lista d'attesa. Sostituisce «Posso permettermelo?».

  Il simulatore di prima rispondeva a una domanda che si fa davanti alla
  cassa, cioè quando la risposta non cambia più niente: la decisione era
  presa, si cercava un permesso. E dava un verdetto — «puoi, ma anticipi la
  Cassa» — a cui la risposta era sempre «non capisco cosa cambia».

  Qui l'ordine è invertito: prima si scrive, poi passano ventiquattro ore,
  poi si compra. Quelle ventiquattro ore sono l'unico meccanismo che abbia
  mai fatto cambiare idea a qualcuno, e sono anche l'unico modo di comprare
  sopra soglia senza finire in «Fuori piano»: la lista non è un promemoria,
  è il piano.

  Niente verdetti. Tre righe, una per serbatoio, ognuna un «da X a Y».
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Vuoto from "$lib/ui/Vuoto.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, centesimi, euro, nuovoId, oggiISO, plurale, tocco } from "$lib/core/ui";
  import {
    vociLista, statoVoce, oreAttesa, salvaVoce, cambiaStatoVoce, eliminaVoce, ATTESA_ORE,
  } from "$condivisi/finanze/dati.js";
  import { effettoVoce } from "$condivisi/finanze/piano.js";
  import { pulisciImporto } from "./comune";
  import { apri } from "./fogli.svelte";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  let nome = $state("");
  let testo = $state("");
  let aggiungo = $state(false);

  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    nome = ""; testo = ""; aggiungo = false;
  });

  /* `adesso` è uno stato e non `Date.now()` dentro il derivato: lo stato
     «sbloccata» dipende dall'orologio, e un derivato che legge l'orologio
     non si ricalcola quando l'orologio avanza. `dati.versione` cresce una
     volta al minuto, e lì si rilegge. */
  const d = $derived.by(() => {
    dati.versione;
    const adesso = Date.now();
    const iso = oggiISO();
    return {
      iso,
      voci: vociLista()
        .map((v: any) => ({ ...v, vista: statoVoce(v, adesso), ore: oreAttesa(v, adesso) }))
        .sort((a: any, b: any) => (b.ts || 0) - (a.ts || 0)),
    };
  });

  const attive = $derived(d.voci.filter((v: any) => v.vista === "attesa" || v.vista === "sbloccata"));
  const chiuse = $derived(d.voci.filter((v: any) => v.vista === "comprata" || v.vista === "scartata"));

  const ETICHETTA: Record<string, string> = {
    attesa: "in attesa", sbloccata: "sbloccata", comprata: "comprata", scartata: "scartata",
  };

  function aggiungi() {
    const imp = centesimi(testo);
    const n = nome.trim();
    if (!n) { avviso("Manca il nome.", { tipo: "errore" }); return; }
    if (!imp) { avviso("Manca il prezzo.", { tipo: "errore" }); return; }
    salvaVoce({ id: nuovoId("w"), nome: n, imp });
    tocco(12);
    nome = ""; testo = ""; aggiungo = false;
    avviso(`In lista. Sbloccata fra ${plurale(ATTESA_ORE, "ora", "ore")}.`);
  }

  /* COMPRARE da qui marca la voce e apre il movimento con `lista` dentro:
     è quel campo che la tiene fuori da «Fuori piano». Senza, la spesa
     finirebbe fra gli strappi proprio quando hai fatto la cosa giusta. */
  function compra(v: any) {
    cambiaStatoVoce(v.id, "comprata");
    aperto = false;
    apri({
      tipo: "movimento", tipoMov: "out",
      preset: { imp: v.imp, nota: v.nome, lista: v.id },
    });
  }
</script>

<Foglio bind:aperto titolo="Lista d'attesa">
  {#if !attive.length && !aggiungo}
    <Vuoto icona="orologio" titolo="Lista vuota"
      testo="Una cosa sopra soglia si scrive qui, aspetta ventiquattro ore e poi si compra. È l'unico modo di comprarla senza che finisca in «Fuori piano»." />
  {/if}

  {#each attive as v (v.id)}
    {@const e = effettoVoce(v.imp || 0, d.iso)}
    <Sezione>
      <div class="voce">
        <div class="alto">
          <span class="nome">{v.nome}</span>
          <span class="cifre prezzo">{euro(v.imp)}</span>
          <span class="stato" data-stato={v.vista}>{ETICHETTA[v.vista]}</span>
        </div>

        {#if v.vista === "attesa"}
          <p class="text-footnote secondario cifre">Ancora {plurale(v.ore, "ora", "ore")}.</p>
        {/if}

        <!-- I TRE SERBATOI, in ordine di quanto costa attingerci. Sempre
             tutti e tre: è la scala che si legge, e a una scala che perde un
             gradino bisogna contare con il dito. -->
        <ul class="effetto">
          <li>
            <span class="e-eti text-subheadline secondario">quota del giorno</span>
            <span class="e-val cifre">
              da {euro(e.settimana.da)} a <b class:male={e.settimana.a <= 0}>{euro(e.settimana.a)}</b>
            </span>
          </li>
          <li>
            <span class="e-eti text-subheadline secondario">minimo di ING</span>
            <span class="e-val cifre">
              da {euro(e.ing.da, { tondo: true })} a <b>{euro(e.ing.a, { tondo: true })}</b>
            </span>
          </li>
          {#if e.fondo}
            <li>
              <span class="e-eti text-subheadline secondario">gap dell'obiettivo</span>
              <span class="e-val cifre">
                da {euro(e.fondo.da, { tondo: true })} a <b>{euro(e.fondo.a, { tondo: true })}</b>
              </span>
            </li>
          {/if}
        </ul>

        <div class="azioni">
          <Pulsante variante="testo" misura="piccola" onclick={() => { cambiaStatoVoce(v.id, "scartata"); avviso("Scartata."); }}>Scarta</Pulsante>
          <Pulsante variante="tinto" misura="piccola" disabled={v.vista !== "sbloccata"} onclick={() => compra(v)}>Compra</Pulsante>
        </div>
      </div>
    </Sezione>
  {/each}

  {#if aggiungo}
    <Sezione titolo="Nuova voce">
      <Campo etichetta="Cosa" bind:valore={nome} segnaposto="Stampante, scarpe, biglietti…" />
      <label class="prezzo-campo">
        <span class="text-footnote secondario">Prezzo</span>
        <input
          type="text" inputmode="decimal" placeholder="0,00" aria-label="Prezzo"
          value={testo}
          oninput={(e) => { const v = pulisciImporto(e.currentTarget.value); testo = v; e.currentTarget.value = v; }}
        />
        <span class="eu">€</span>
      </label>
    </Sezione>
    <div class="due">
      <Pulsante variante="grigio" larga onclick={() => (aggiungo = false)}>Annulla</Pulsante>
      <Pulsante variante="pieno" larga onclick={aggiungi}>Metti in lista</Pulsante>
    </div>
  {:else}
    <Pulsante variante="pieno" larga onclick={() => (aggiungo = true)}>Aggiungi</Pulsante>
  {/if}

  {#if chiuse.length}
    <Sezione titolo="Chiuse" piede="Restano per ricordare cosa hai lasciato perdere: è la parte della lista che si dimentica, ed è quella che la giustifica.">
      {#each chiuse.slice(0, 12) as v (v.id)}
        <div class="chiusa">
          <span class="nome">{v.nome}</span>
          <span class="cifre secondario">{euro(v.imp)}</span>
          <span class="stato" data-stato={v.vista}>{ETICHETTA[v.vista]}</span>
          <button type="button" class="via" aria-label="Togli dalla lista" onclick={() => eliminaVoce(v.id)}>×</button>
        </div>
      {/each}
    </Sezione>
  {/if}
</Foglio>

<style>
  .voce { display: flex; flex-direction: column; gap: 6px; padding: var(--space-4); }
  .alto { display: grid; grid-template-columns: 1fr auto auto; align-items: baseline; gap: 2px var(--space-2); }
  .nome { grid-column: 1 / -1; }
  .prezzo { font-size: var(--text-title3); font-weight: var(--weight-semibold); }
  .stato {
    padding: 2px 7px; border-radius: var(--radius-full);
    font-size: var(--text-caption2); font-weight: var(--weight-semibold);
    text-transform: uppercase; letter-spacing: 0.4px;
    color: var(--label-secondary); background: var(--fill-tertiary);
  }
  .stato[data-stato="sbloccata"] { color: var(--color-green); background: color-mix(in srgb, var(--color-green) 14%, transparent); }
  .stato[data-stato="comprata"] { color: var(--label-tertiary); }

  /* Due colonne: le etichette incolonnate a sinistra, i «da X a Y» a
     destra. Si confrontano con l'occhio, senza rileggere ogni etichetta. */
  .effetto {
    display: grid; grid-template-columns: auto 1fr; gap: 2px var(--space-3);
    margin-top: var(--space-2); padding-top: var(--space-3); border-top: 0.5px solid var(--separator);
  }
  .effetto li { display: contents; }
  .e-val { justify-self: end; text-align: right; font-size: var(--text-subheadline); font-variant-numeric: tabular-nums; }
  .e-val b { font-weight: var(--weight-semibold); }
  .male { color: var(--color-red); }

  .azioni { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-1); }
  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }

  .prezzo-campo { display: flex; align-items: baseline; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  .prezzo-campo span:first-child { flex: none; width: 92px; }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .prezzo-campo input { flex: 1; min-width: 0; font-size: 17px; text-align: right; outline: none; background: none; color: var(--accento); font-variant-numeric: tabular-nums; }
  .eu { flex: none; color: var(--label-secondary); }

  .chiusa { position: relative; display: flex; align-items: center; gap: var(--space-2); padding: 10px var(--space-4); }
  .chiusa + .chiusa::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .via { flex: none; width: 28px; height: 28px; border-radius: 50%; color: var(--label-tertiary); background: var(--fill-quaternary); font-size: 17px; line-height: 1; }
</style>
