<!--
  Costruire un pasto toccando le cose che lo compongono.

  È il gesto centrale di Pasti da qui in avanti, e vale ovunque: nella
  pianificazione della domenica, quando cambi il pasto di una fascia, e in
  «ho mangiato altro». Un piatto non è una voce da scegliere in un elenco di
  combinazioni — è piadina, pollo, insalata: tre tocchi, e il totale cresce
  mentre li fai.

  Il totale che sale è la parte importante. Sceglierlo alla cieca e scoprire
  dopo di essere a 400 kcal dal bersaglio vuol dire tornare indietro e
  rifare; vederlo salire mentre tocchi vuol dire fermarsi al punto giusto.

  I componenti della fascia stanno in cima, gli altri dietro «tutto il
  resto»: il pollo a colazione è strano ma non è vietato, e un selettore che
  te lo nasconde ti costringe a mentire al database.
-->
<script lang="ts">
  import Icona from "$lib/ui/Icona.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import { tocco } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { GRUPPI_COMPONENTI, componentiPerFascia, pasto } from "$condivisi/pasti/dati.js";
  import { MACRO, kcal } from "./comune";

  let {
    scelti = $bindable<string[]>([]),
    fascia,
    /** Il bersaglio del giorno: serve alle barre, non a giudicare. */
    bersaglio = null,
  }: {
    scelti: string[];
    fascia: string;
    bersaglio?: { kcal: number; p: number; c: number; g: number } | null;
  } = $props();

  let tutto = $state(false);

  const catalogo = $derived.by(() => {
    dati.versione;
    const { dentro, fuori } = componentiPerFascia(fascia) as { dentro: any[]; fuori: any[] };
    const elenco = tutto ? [...dentro, ...fuori] : dentro;
    return GRUPPI_COMPONENTI
      .map((g) => ({ ...g, voci: elenco.filter((c) => c.gruppo === g.id) }))
      .filter((g) => g.voci.length);
  });

  // Le voci scelte, nell'ordine in cui le hai toccate: è l'ordine in cui
  // racconteresti il piatto, e quindi quello giusto per leggerlo.
  const voci = $derived.by(() => {
    dati.versione;
    return scelti.map((id) => pasto(id)).filter(Boolean) as any[];
  });

  const totale = $derived(voci.reduce(
    (t, v) => ({ kcal: t.kcal + v.kcal, p: t.p + v.p, c: t.c + v.c, g: t.g + v.g }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  ));

  function alterna(id: string) {
    tocco(6);
    scelti = scelti.includes(id) ? scelti.filter((x) => x !== id) : [...scelti, id];
  }
</script>

<div class="scelta">
  <!-- IL PIATTO CHE STAI COSTRUENDO. Vuoto dice cosa fare; pieno dice cosa
       hai messo e quanto pesa, e ogni pezzo si toglie da lì. -->
  <div class="piatto" class:vuoto={!voci.length}>
    {#if voci.length}
      <div class="messi">
        {#each voci as v (v.id)}
          <button type="button" class="pezzo" onclick={() => alterna(v.id)}>
            <span class="nome-pezzo">{v.nome}</span>
            {#if v.porzione}<span class="porzione text-caption2">{v.porzione}</span>{/if}
            <span class="via"><Icona nome="chiudi" misura={12} tratto={2.6} /></span>
          </button>
        {/each}
      </div>
      <div class="conto">
        <span class="somma cifre">{kcal(totale.kcal)}<i>kcal</i></span>
        <span class="macro-riga text-caption1 secondario">
          {#each MACRO as m (m.k)}
            <span><b class="cifre">{Math.round(totale[m.k as "p" | "c" | "g"])}</b>g {m.breve}</span>
          {/each}
        </span>
      </div>
      {#if bersaglio?.kcal}
        <Traccia valore={totale.kcal / bersaglio.kcal} colore="var(--accento)" altezza={5} etichetta="Sul giorno" />
      {/if}
    {:else}
      <span class="text-subheadline secondario">Tocca quello che c'è nel piatto. Il conto si fa da sé.</span>
    {/if}
  </div>

  {#each catalogo as g (g.id)}
    <div class="gruppo">
      <span class="capo text-footnote semibold secondario"><span class="emo">{g.emoji}</span>{g.nome}</span>
      <div class="pillole">
        {#each g.voci as c (c.id)}
          <button type="button" class="pillola" class:presa={scelti.includes(c.id)} onclick={() => alterna(c.id)}>
            <span class="testo">{c.nome}</span>
            <span class="sotto text-caption2">{c.porzione ? `${c.porzione} · ` : ""}{kcal(c.kcal)} kcal</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <button type="button" class="tutto text-subheadline" onclick={() => (tutto = !tutto)}>
    {tutto ? "Mostra solo quelli di questa fascia" : "Mostra tutto il resto"}
  </button>
</div>

<style>
  .scelta { display: flex; flex-direction: column; gap: var(--space-5); }

  .piatto {
    display: flex; flex-direction: column; gap: var(--space-3);
    padding: var(--space-4); border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--accento) 10%, transparent);
  }
  .piatto.vuoto {
    background: none; box-shadow: inset 0 0 0 1.5px var(--separator);
    align-items: center; text-align: center; padding: var(--space-5) var(--space-4);
  }
  .messi { display: flex; flex-wrap: wrap; gap: 6px; }
  .pezzo {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 8px 5px 11px; border-radius: var(--radius-full);
    background: var(--accento); color: #fff;
    font-size: var(--text-subheadline); font-weight: var(--weight-medium);
  }
  .pezzo:active { opacity: 0.7; }
  .porzione { opacity: 0.75; }
  .via { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: rgba(255, 255, 255, 0.28); }

  .conto { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .somma { font-family: var(--font-display); font-size: 26px; font-weight: var(--weight-bold); }
  .somma i { font-style: normal; font-size: var(--text-caption1); font-weight: var(--weight-regular); color: var(--label-tertiary); margin-left: 4px; }
  .macro-riga { display: flex; gap: var(--space-3); }

  .gruppo { display: flex; flex-direction: column; gap: var(--space-2); }
  .capo { display: flex; align-items: center; gap: 6px; }
  .emo { font-family: var(--font-emoji); font-size: 14px; line-height: 1; }

  .pillole { display: flex; flex-wrap: wrap; gap: 8px; }
  .pillola {
    display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
    padding: 8px 13px; border-radius: var(--radius-lg);
    background: var(--fill-tertiary); color: var(--label-primary);
    text-align: left;
    transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-fast) var(--ease-default);
  }
  .pillola:active { transform: scale(0.96); }
  .pillola .testo { font-size: var(--text-subheadline); font-weight: var(--weight-medium); }
  .pillola .sotto { color: var(--label-tertiary); }
  /* Una presa è presa: colore pieno, non un bordino. Con venti pillole in
     schermo un segno discreto non si trova più. */
  .pillola.presa { background: var(--accento); color: #fff; }
  .pillola.presa .sotto { color: rgba(255, 255, 255, 0.75); }

  .tutto { align-self: flex-start; color: var(--accento); font-weight: var(--weight-medium); }
</style>
