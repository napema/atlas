<!--
  La settimana come calendario: sette giorni per cinque fasce.

  Serve dal momento in cui la settimana la genera qualcun altro — la chat, o
  il generatore. Un elenco di sette righe con «pranzo · cena» dentro dice se
  la settimana esiste, non che cosa mangi giovedì: per saperlo bisognava
  aprire giovedì, guardare, tornare indietro, aprire venerdì. Sette volte.

  SUL PC È UNA GRIGLIA VERA, perché è lì che si pianifica: le fasce sono le
  righe, i giorni le colonne, e l'occhio confronta il giovedì col venerdì
  senza toccare niente. Sul telefono la stessa griglia sarebbe illeggibile —
  sette colonne in 390 punti — quindi diventa una scheda per giorno, in
  colonna. Non sono due viste: sono gli stessi dati con due forme, e la
  seconda è quella che regge in mano.

  Una cella si tocca e si cambia. Guardare la settimana e non poterla
  correggere da lì vorrebbe dire tornare a «Oggi» e cambiare giorno, che è
  il giro che questa schermata esiste per togliere.
-->
<script lang="ts">
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { daISO, maiuscola, oggiISO, GIORNI } from "$lib/core/ui";
  import { FASCE, regimeDi } from "$condivisi/pasti/dati.js";
  import { giornata, bersagli } from "$condivisi/pasti/calcolo.js";
  import { EMOJI_FASCIA, kcal } from "./comune";

  let {
    giorni,
    onapri,
  }: {
    /** I sette ISO, da lunedì. */
    giorni: string[];
    onapri?: (iso: string, fascia: string) => void;
  } = $props();

  const b = $derived.by(() => { dati.versione; return bersagli(); });

  const settimana = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    return giorni.map((iso) => {
      const g = giornata(iso) as any;
      const d = daISO(iso);
      return {
        iso,
        oggi: iso === oggi,
        passato: iso < oggi,
        nome: maiuscola(GIORNI[(d.getDay() + 6) % 7]),
        numero: d.getDate(),
        totale: g.totale,
        // Quanto è pieno il giorno rispetto al bersaglio: serve alla barretta
        // sotto l'intestazione, che è il solo modo di vedere a colpo d'occhio
        // quale giorno è rimasto indietro.
        quota: b.kcal ? Math.min(1.25, g.totale.kcal / b.kcal) : 0,
        celle: (FASCE as any[]).map((f) => {
          const dentro = g.fasce.find((x: any) => x.fascia === f.id);
          const regime = regimeDi(iso, f.id);
          return {
            fascia: f.id,
            regime,
            voci: dentro?.voci ?? [],
            nome: dentro?.nome ?? null,
            kcal: dentro?.contato?.kcal ?? 0,
            vuota: regime === "casa" && !dentro?.certo,
          };
        }),
      };
    });
  });

  const tocca = (iso: string, fascia: string) => onapri?.(iso, fascia);
</script>

<!-- ----------------------------------------------------------- IL PC --- -->
<div class="griglia" style:--giorni={giorni.length}>
  <div class="angolo"></div>
  {#each settimana as g (g.iso)}
    <div class="testa-giorno" class:oggi={g.oggi} class:passato={g.passato}>
      <span class="text-footnote semibold nome-g">{g.nome}</span>
      <span class="numero cifre">{g.numero}</span>
      <span class="text-caption1 secondario cifre">{kcal(g.totale.kcal)}</span>
      <span class="asta"><i style:width="{Math.round(Math.min(1, g.quota) * 100)}%" class:oltre={g.quota > 1}></i></span>
    </div>
  {/each}

  {#each FASCE as f, riga (f.id)}
    <div class="testa-fascia">
      <span class="emo">{EMOJI_FASCIA[f.id] ?? "\u{1F37D}"}</span>
      <span class="text-footnote semibold">{f.nome}</span>
      <span class="text-caption1 terziario cifre">{f.ora}</span>
    </div>
    {#each settimana as g (g.iso)}
      {@const c = g.celle[riga]}
      <button
        type="button"
        class="cella"
        class:oggi={g.oggi}
        class:passato={g.passato}
        data-regime={c.regime}
        class:vuota={c.vuota}
        onclick={() => tocca(g.iso, c.fascia)}
      >
        {#if c.regime === "salto"}
          <span class="text-footnote terziario">—</span>
        {:else if c.regime === "fuori"}
          <span class="text-footnote fuori">Fuori</span>
          {#if c.kcal}<span class="text-caption1 terziario cifre">{kcal(c.kcal)}</span>{/if}
        {:else if c.voci.length}
          <span class="cosa text-footnote">{c.nome}</span>
          <span class="text-caption1 terziario cifre">{kcal(c.kcal)}</span>
        {:else}
          <span class="piu"><Icona nome="piu" misura={14} tratto={2.2} /></span>
        {/if}
      </button>
    {/each}
  {/each}
</div>

<!-- ------------------------------------------------------- IL TELEFONO -->
<div class="colonna">
  {#each settimana as g (g.iso)}
    <section class="giorno" class:oggi={g.oggi} class:passato={g.passato}>
      <header class="capo-giorno">
        <span class="text-headline">{g.nome} {g.numero}</span>
        <span class="text-footnote secondario cifre">{kcal(g.totale.kcal)} / {kcal(b.kcal)} kcal</span>
      </header>
      <span class="asta lunga"><i style:width="{Math.round(Math.min(1, g.quota) * 100)}%" class:oltre={g.quota > 1}></i></span>
      {#each g.celle as c (c.fascia)}
        <button type="button" class="riga-fascia" data-regime={c.regime} onclick={() => tocca(g.iso, c.fascia)}>
          <span class="emo">{EMOJI_FASCIA[c.fascia] ?? "\u{1F37D}"}</span>
          <span class="testo-riga">
            {#if c.regime === "salto"}
              <span class="text-subheadline terziario">Non la fai</span>
            {:else if c.regime === "fuori"}
              <span class="text-subheadline fuori">Fuori</span>
            {:else if c.voci.length}
              <span class="text-subheadline cosa">{c.nome}</span>
            {:else}
              <span class="text-subheadline terziario">Da mettere</span>
            {/if}
          </span>
          {#if c.kcal}<span class="text-caption1 secondario cifre">{kcal(c.kcal)}</span>{/if}
        </button>
      {/each}
    </section>
  {/each}
</div>

<style>
  /* Sul telefono vive la colonna; il PC accende la griglia e spegne lei. */
  .griglia { display: none; }
  .colonna { display: flex; flex-direction: column; gap: var(--space-4); }

  .giorno {
    display: flex; flex-direction: column;
    border-radius: var(--radius-xl); background: var(--bg-grouped-secondary);
    overflow: hidden;
  }
  .giorno.oggi { box-shadow: inset 0 0 0 1.5px var(--accento); }
  .giorno.passato { opacity: 0.62; }
  .capo-giorno { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4) 6px; }

  .asta { display: block; height: 4px; background: var(--fill-tertiary); }
  .asta.lunga { margin: 0 var(--space-4) var(--space-2); border-radius: var(--radius-full); overflow: hidden; }
  .asta i { display: block; height: 100%; background: var(--accento); border-radius: inherit; }
  .asta i.oltre { background: var(--color-orange); }

  .riga-fascia {
    display: flex; align-items: center; gap: var(--space-3); width: 100%; text-align: left;
    padding: 9px var(--space-4); min-height: 44px;
  }
  .riga-fascia + .riga-fascia { box-shadow: inset 0 0.5px 0 var(--separator); }
  .riga-fascia:active { background: var(--fill-quaternary); }
  .emo { font-family: var(--font-emoji); font-size: 17px; line-height: 1; flex: none; }
  .testo-riga { flex: 1; min-width: 0; }
  .cosa { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  .fuori { color: var(--color-teal); }

  @media (min-width: 1000px) {
    .colonna { display: none; }

    /* LA GRIGLIA SI PRENDE LA FINESTRA. Dentro la larghezza normale della
       pagina — 1640 meno la colonna del riepilogo — restavano 155 punti a
       colonna, e in 155 punti un nome come «Merluzzo al forno + Pasta +
       Insalata condita» sta solo a undici pixel di corpo. Che è sotto la
       soglia sotto cui una tabella non si legge: per il testo denso il
       minimo è 13.

       Quindi qui la pagina si allarga davvero, e il riepilogo della
       settimana scende sotto invece di stare a fianco. Non è una
       preferenza: è che 155 punti non bastavano e nessuna scelta
       tipografica li avrebbe fatti bastare. */
    :global(:root:has(.griglia)) { --larghezza-pagina: min(calc(100vw - 64px), 1900px); }

    /* LE FASCE SONO LE RIGHE, I GIORNI LE COLONNE. Il contrario — un giorno
       per riga — sembra più naturale e non lo è: la domanda che ci si fa
       davanti a una settimana è «quante volte ho messo il pollo a cena»,
       e quella si legge scorrendo una riga, non sette colonne. */
    .griglia {
      display: grid;
      grid-template-columns: 132px repeat(var(--giorni), minmax(0, 1fr));
      gap: 4px;
      align-items: stretch;
    }

    .testa-giorno {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: var(--space-3) 6px 0;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }
    .testa-giorno.passato { opacity: 0.55; }
    .testa-giorno.oggi { background: color-mix(in srgb, var(--accento) 14%, transparent); }
    .nome-g { color: var(--label-secondary); }
    .testa-giorno.oggi .nome-g { color: var(--accento); }
    .numero { font-size: 24px; font-weight: var(--weight-semibold); line-height: 22px; }
    .testa-giorno .asta { width: 100%; margin-top: 4px; border-radius: var(--radius-full); overflow: hidden; }

    .testa-fascia {
      display: flex; align-items: center; gap: 6px;
      padding: var(--space-2) var(--space-2) var(--space-2) 0;
      color: var(--label-secondary);
    }
    .testa-fascia .emo { font-size: 15px; }
    .testa-fascia .cifre { margin-left: auto; }

    .cella {
      display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 3px;
      min-height: 86px; padding: 9px 10px; text-align: left;
      border-radius: var(--radius-md);
      background: var(--bg-grouped-secondary);
      transition: background-color var(--duration-fast) var(--ease-default);
    }
    .cella:hover { background: var(--fill-tertiary); }
    .cella.oggi { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accento) 55%, transparent); }
    .cella.passato { opacity: 0.55; }
    .cella[data-regime="salto"] { background: none; box-shadow: inset 0 0 0 1px var(--separator); align-items: center; justify-content: center; }
    .cella[data-regime="fuori"] { background: color-mix(in srgb, var(--color-teal) 12%, transparent); }
    /* Una cella da riempire si vede che è da riempire: tratteggio e un più
       al centro. Vuota e basta si legge come «non si mangia». */
    .cella.vuota { background: none; box-shadow: inset 0 0 0 1.5px var(--separator); align-items: center; justify-content: center; }
    .piu { color: var(--label-tertiary); display: grid; place-items: center; }
    .cella.vuota:hover .piu { color: var(--accento); }
    .cella .cosa { -webkit-line-clamp: 4; line-clamp: 4; }
  }
</style>
