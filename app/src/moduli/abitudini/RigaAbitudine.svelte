<!--
  Un'abitudine nella lista del giorno.

  A sinistra la spunta, al centro nome e piano (toccarli apre il dettaglio),
  a destra «oggi no». Sotto, se ci sono, le PARTI raccolte per fascia: la
  skincare sono due routine a quattordici ore di distanza, e in una lista
  piatta si mescolavano.

  Con `fascia` la riga mostra solo le parti di quella fascia: la lista del
  giorno è divisa per momenti, e la skincare della sera non ha niente da
  fare nel blocco della mattina. La spunta in testa, allora, dice come sta
  QUEL pezzo — tre passaggi del mattino fatti sono un pezzo finito, anche se
  la sera è ancora da fare.
-->
<script lang="ts">
  import Spunta from "$lib/ui/Spunta.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { tinta } from "$lib/core/tinte";
  import { tocco } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import {
    eSaltata, alterna, partiDi, parteFatta, alternaParte, gruppiParti,
  } from "$condivisi/abitudini/dati.js";
  import { fattaIl, etichettaPiano, pianoDi } from "$condivisi/abitudini/calcolo.js";

  let {
    h,
    giorno,
    spenta = false,
    compatta = false,
    bloccata = false,
    fascia = null,
    sfida = false,
    onapri,
  }: {
    h: any; giorno: string; spenta?: boolean; compatta?: boolean;
    /** Giorno chiuso: si legge e non si tocca. Vedi `chiudi()` in p50.js. */
    bloccata?: boolean;
    /** Solo le parti di questa fascia (la lista per momenti). */
    fascia?: string | null;
    /** È una delle otto di Project 50: porta il segno della sfida. */
    sfida?: boolean;
    onapri: (id: string) => void;
  } = $props();

  const stato = $derived.by(() => {
    dati.versione;
    const parti = partiDi(h);
    const gruppi = parti.length
      ? gruppiParti(h)
          .filter((g: any) => !fascia || g.fascia === fascia)
          .map((g: any) => ({
            ...g,
            parti: g.parti.map((p: any) => ({ ...p, fatta: parteFatta(h.id, p.id, giorno) })),
          }))
      : [];
    const mie = gruppi.reduce((n: number, g: any) => n + g.parti.length, 0);
    const quante = gruppi.reduce((n: number, g: any) => n + g.parti.filter((p: any) => p.fatta).length, 0);
    return {
      parti,
      gruppi,
      // Con una fascia sola la spunta in testa è quella del pezzo, non
      // dell'abitudine intera: vedi il commento in cima.
      fatta: fascia && parti.length ? mie > 0 && quante === mie : fattaIl(h, giorno),
      saltata: eSaltata(h.id, giorno),
      frazione: mie ? quante / mie : 0,
      // Il nome della fascia non si ripete: sta già nel titolo del momento.
      // Resta l'ora, se c'è, che è l'informazione che il titolo non dà.
      unGruppo: gruppi.length === 1,
    };
  });

  /* LA RIGA SOTTO IL NOME, solo quando dice qualcosa. Scriveva «Ogni
     giorno» sotto undici voci su undici, in una lista che per definizione è
     quella di oggi: undici volte la stessa parola che non informa. */
  const sotto = $derived.by(() => {
    if (stato.saltata) return "Oggi no";
    if (fascia && stato.unGruppo) {
      const g = stato.gruppi[0];
      const fatte = g.parti.filter((p: any) => p.fatta).length;
      return [g.ora, `${fatte} di ${g.parti.length}`].filter(Boolean).join(" · ");
    }
    if (pianoDi(h).type !== "daily" && pianoDi(h).type) return etichettaPiano(h);
    return h.remind && !stato.parti.length ? `alle ${h.remind}` : "";
  });

  function spunta() {
    // Con le parti la spunta del genitore non si tocca a mano: è vera quando
    // sono vere tutte le parti. Spuntare «integratori» in blocco alle undici
    // di sera è esattamente quello che le parti servono a impedire.
    if (stato.parti.length || bloccata) return;
    tocco(stato.fatta ? 6 : 12);
    alterna(h.id, giorno);
  }


  function parte(id: string, era: boolean) {
    if (bloccata) return;
    tocco(era ? 6 : 12);
    alternaParte(h.id, id, giorno);
  }
</script>

<div class="abitudine" class:spenta class:compatta class:saltata={stato.saltata} class:bloccata style:--tinta={tinta(h.tint)}>
  <div class="testa">
    <!-- A giorno chiuso la spunta diventa `finta`: resta il disegno e
         sparisce il bottone. Un bottone che non fa niente si tocca lo
         stesso, due o tre volte, prima di credere che sia davvero finita. -->
    <Spunta
      fatta={stato.fatta}
      parziale={stato.frazione}
      finta={stato.parti.length > 0 || bloccata}
      etichetta={stato.fatta ? `Togli ${h.name}` : `Segna ${h.name}`}
      onclick={spunta}
    />
    <button type="button" class="corpo" onclick={() => onapri(h.id)}>
      <span class="simbolo emoji" aria-hidden="true">{h.emoji || "⭐️"}</span>
      <span class="testi">
        <span class="nome-riga">
          <span class="nome" class:fatta={stato.fatta}>{h.name}</span>
          <!-- Il segno della sfida: è l'unica cosa che distingue le otto dal
               resto, adesso che stanno nella stessa lista. Piccolo e fermo,
               accanto al nome: si legge prima di leggere la riga. -->
          {#if sfida}<span class="sigla cifre" title="Project 50: non negoziabile">50</span>{/if}
        </span>
        {#if sotto}<span class="text-subheadline secondario">{sotto}</span>{/if}
      </span>
    </button>
  </div>

  {#if stato.gruppi.length}
    <div class="gruppi">
      {#each stato.gruppi as g (g.fascia)}
        {@const fatte = g.parti.filter((p: any) => p.fatta).length}
        <div class="gruppo" class:completo={fatte === g.parti.length}>
          <!-- Con un pezzo solo la testata del gruppo ripeteva il momento,
               che sta già nel titolo del blocco: ora e conto salgono nella
               riga sotto il nome, e la riga costa trenta punti in meno. -->
          {#if !stato.unGruppo || !fascia}<div class="gruppo-testa text-footnote">
            <span class="gruppo-nome">{g.nome}</span>
            {#if g.ora}<span class="ora secondario"><Icona nome="campanella" misura={11} tratto={2} />{g.ora}</span>{/if}
            <span class="conta cifre secondario">{fatte}/{g.parti.length}</span>
          </div>{/if}
          <ul class="parti">
            {#each g.parti as p, i (p.id)}
              <li>
                <button type="button" class="parte" class:fatta={p.fatta} aria-pressed={p.fatta} disabled={bloccata} onclick={() => parte(p.id, p.fatta)}>
                  <Spunta finta fatta={p.fatta} misura={22} />
                  <!-- Il numero solo se l'ordine è una regola (la skincare), non
                       una preferenza (gli integratori). -->
                  {#if h.sequenza}<span class="numero cifre">{i + 1}</span>{/if}
                  <span class="parte-nome">{p.nome}</span>
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .abitudine { position: relative; padding: 6px var(--space-4); }
  :global(* + .abitudine)::before {
    content: ""; position: absolute; top: 0; right: 0; left: calc(var(--space-4) + 28px + var(--space-3));
    border-top: 0.5px solid var(--separator);
  }
  .spenta { opacity: 0.55; }
  /* Chiuso: non spento. Resta leggibile — è il risultato del giorno, la
     cosa che si va a rivedere — ma niente di qui dentro si tocca più. */
  .bloccata .corpo:active { opacity: 1; }
  .saltata .nome { color: var(--label-secondary); }

  /* 52 di minimo, come le righe di sistema. Era 56 più dieci sopra e dieci
     sotto: 76 punti per una riga di una parola, e otto righe così erano
     una schermata e mezza di telefono per dire otto cose. */
  .testa { display: flex; align-items: center; gap: var(--space-3); min-height: 52px; }
  .nome { font-size: 17px; font-weight: var(--weight-medium); }
  /* `compatta` è per quello che oggi non è previsto: si legge, pesa meno. */
  .compatta .testa { min-height: 44px; }
  .compatta .nome { font-size: 15px; font-weight: var(--weight-regular); }
  .compatta { opacity: 0.78; }
  .corpo { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3); text-align: left; }
  .corpo:active { opacity: 0.6; }
  .simbolo {
    flex: none; display: grid; place-items: center;
    width: 36px; height: 36px; border-radius: 10px; font-size: 20px;
    background: color-mix(in srgb, var(--tinta) 22%, transparent);
  }
  .testi { min-width: 0; display: flex; flex-direction: column; }
  .nome-riga { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .sigla {
    flex: none; padding: 1px 6px; border-radius: var(--radius-full);
    font-size: 11px; line-height: 16px; font-weight: var(--weight-bold); letter-spacing: 0.2px;
    color: var(--accento); background: color-mix(in srgb, var(--accento) 18%, transparent);
  }
  .nome { overflow-wrap: anywhere; transition: color var(--duration-fast); }
  .nome.fatta { color: var(--label-secondary); }


  .gruppi { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0 var(--space-1) calc(28px + var(--space-3)); }
  .gruppo-testa { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px; }
  .gruppo-nome { font-weight: var(--weight-semibold); color: var(--label-secondary); text-transform: uppercase; letter-spacing: 0.3px; font-size: var(--text-caption1); }
  .completo .gruppo-nome { color: var(--color-green); }
  .ora { display: inline-flex; align-items: center; gap: 3px; }
  .conta { margin-left: auto; }
  .parti { display: flex; flex-direction: column; }
  .parte { width: 100%; display: flex; align-items: center; gap: var(--space-3); min-height: 40px; text-align: left; }
  .parte:active { opacity: 0.6; }
  .numero {
    flex: none; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%;
    font-size: 11px; font-weight: var(--weight-bold); background: var(--fill-tertiary); color: var(--label-secondary);
  }
  .parte.fatta .parte-nome { color: var(--label-secondary); }
</style>
