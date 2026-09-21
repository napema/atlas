<!--
  Un'abitudine nella lista del giorno.

  A sinistra la spunta, al centro nome e piano (toccarli apre il dettaglio),
  a destra la serie e «oggi no». Sotto, se ci sono, le PARTI raccolte per
  fascia: la skincare sono due routine a quattordici ore di distanza, e in
  una lista piatta si mescolavano.
-->
<script lang="ts">
  import Spunta from "$lib/ui/Spunta.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { tinta } from "$lib/core/tinte";
  import { tocco } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import {
    eSaltata, alterna, alternaSaltata, partiDi, parteFatta, alternaParte, gruppiParti,
  } from "$condivisi/abitudini/dati.js";
  import { fattaIl, serie, etichettaPiano } from "$condivisi/abitudini/calcolo.js";

  let {
    h,
    giorno,
    spenta = false,
    onapri,
  }: { h: any; giorno: string; spenta?: boolean; onapri: (id: string) => void } = $props();

  const stato = $derived.by(() => {
    dati.versione;
    const parti = partiDi(h);
    const gruppi = parti.length
      ? gruppiParti(h).map((g: any) => ({
          ...g,
          parti: g.parti.map((p: any) => ({ ...p, fatta: parteFatta(h.id, p.id, giorno) })),
        }))
      : [];
    const quante = gruppi.reduce((n: number, g: any) => n + g.parti.filter((p: any) => p.fatta).length, 0);
    return {
      parti,
      gruppi,
      fatta: fattaIl(h, giorno),
      saltata: eSaltata(h.id, giorno),
      serie: serie(h),
      frazione: parti.length ? quante / parti.length : 0,
    };
  });

  function spunta() {
    // Con le parti la spunta del genitore non si tocca a mano: è vera quando
    // sono vere tutte le parti. Spuntare «integratori» in blocco alle undici
    // di sera è esattamente quello che le parti servono a impedire.
    if (stato.parti.length) return;
    tocco(stato.fatta ? 6 : 12);
    alterna(h.id, giorno);
  }

  function salta() {
    tocco(6);
    alternaSaltata(h.id, giorno);
  }

  function parte(id: string, era: boolean) {
    tocco(era ? 6 : 12);
    alternaParte(h.id, id, giorno);
  }
</script>

<div class="abitudine" class:spenta class:saltata={stato.saltata} style:--tinta={tinta(h.tint)}>
  <div class="testa">
    <Spunta
      fatta={stato.fatta}
      parziale={stato.frazione}
      finta={stato.parti.length > 0}
      etichetta={stato.fatta ? `Togli ${h.name}` : `Segna ${h.name}`}
      onclick={spunta}
    />
    <button type="button" class="corpo" onclick={() => onapri(h.id)}>
      <span class="simbolo emoji" aria-hidden="true">{h.emoji || "⭐️"}</span>
      <span class="testi">
        <span class="nome" class:fatta={stato.fatta}>{h.name}</span>
        <span class="text-subheadline secondario">
          {stato.saltata ? "Oggi no" : etichettaPiano(h)}
        </span>
      </span>
    </button>
    {#if stato.serie > 0}
      <span class="serie cifre" title="{stato.serie} di fila">
        <Icona nome="fiamma" misura={14} tratto={2} />{stato.serie}
      </span>
    {/if}
    {#if !stato.parti.length && !stato.fatta}
      <!-- «Oggi no»: il terzo stato. Per le abitudini in negativo, quelle che
           si tengono NON facendo qualcosa: spuntarla sarebbe una bugia, e
           lasciarla aperta fino a mezzanotte un promemoria inutile. -->
      <button
        type="button"
        class="salta"
        class:attiva={stato.saltata}
        aria-pressed={stato.saltata}
        aria-label={stato.saltata ? `Riapri ${h.name}` : `Segna ${h.name} come saltata oggi`}
        title={stato.saltata ? "Riaprila" : "Oggi no"}
        onclick={salta}
      ><Icona nome="chiudi" misura={14} tratto={2.4} /></button>
    {/if}
  </div>

  {#if stato.gruppi.length}
    <div class="gruppi">
      {#each stato.gruppi as g (g.fascia)}
        {@const fatte = g.parti.filter((p: any) => p.fatta).length}
        <div class="gruppo" class:completo={fatte === g.parti.length}>
          <div class="gruppo-testa text-footnote">
            <span class="gruppo-nome">{g.nome}</span>
            {#if g.ora}<span class="ora secondario"><Icona nome="campanella" misura={11} tratto={2} />{g.ora}</span>{/if}
            <span class="conta cifre secondario">{fatte}/{g.parti.length}</span>
          </div>
          <ul class="parti">
            {#each g.parti as p, i (p.id)}
              <li>
                <button type="button" class="parte" class:fatta={p.fatta} aria-pressed={p.fatta} onclick={() => parte(p.id, p.fatta)}>
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
  .abitudine { position: relative; padding: 10px var(--space-4); }
  :global(* + .abitudine)::before {
    content: ""; position: absolute; top: 0; right: 0; left: calc(var(--space-4) + 28px + var(--space-3));
    border-top: 0.5px solid var(--separator);
  }
  .spenta { opacity: 0.55; }
  .saltata .nome { color: var(--label-secondary); }

  .testa { display: flex; align-items: center; gap: var(--space-3); min-height: 44px; }
  .corpo { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--space-3); text-align: left; }
  .corpo:active { opacity: 0.6; }
  .simbolo {
    flex: none; display: grid; place-items: center;
    width: 36px; height: 36px; border-radius: 10px; font-size: 20px;
    background: color-mix(in srgb, var(--tinta) 22%, transparent);
  }
  .testi { min-width: 0; display: flex; flex-direction: column; }
  .nome { overflow-wrap: anywhere; transition: color var(--duration-fast); }
  .nome.fatta { color: var(--label-secondary); }

  .serie {
    flex: none; display: inline-flex; align-items: center; gap: 3px;
    color: var(--color-orange); font-size: var(--text-subheadline); font-weight: var(--weight-semibold);
  }
  .salta {
    flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
    color: var(--label-tertiary); background: var(--fill-quaternary);
    position: relative;
  }
  .salta::after { content: ""; position: absolute; inset: -7px; }
  .salta.attiva { color: #fff; background: var(--label-secondary); }

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
