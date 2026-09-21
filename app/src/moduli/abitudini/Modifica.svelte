<!--
  Nuova abitudine, o modifica di una che c'è.

  Si lavora su una BOZZA: niente arriva nell'archivio finché non tocchi la
  spunta. Chiudere il foglio butta via la bozza, ed è il comportamento che
  ci si aspetta da un «annulla».
-->
<script lang="ts">
  import { untrack } from "svelte";
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import SceltaEmoji from "./SceltaEmoji.svelte";
  import { tinta } from "$lib/core/tinte";
  import { avviso, nuovoId, GIORNI_INIZIALI } from "$lib/core/ui";
  import {
    abitudinePerId, salvaAbitudine, eliminaAbitudine, TINTE, FASCE, fasceUsate,
  } from "$condivisi/abitudini/dati.js";
  import { pianoDi } from "$condivisi/abitudini/calcolo.js";

  let {
    aperto = $bindable(false),
    id,
  }: { aperto: boolean; /** null = nuova */ id: string | null } = $props();

  type Parte = { id: string; nome: string; fascia: string };
  type Bozza = {
    id: string; name: string; emoji: string; tint: string;
    sched: { type: "daily" | "days" | "weekly"; days: number[]; times: number };
    remind: string; archived: boolean; sequenza?: boolean;
    parti: Parte[]; orari: Record<string, string>;
    [k: string]: any;
  };

  let bozza = $state<Bozza | null>(null);
  let esistente = $state(false);
  let sicuro = $state(false);          // il secondo tocco su «Elimina»
  let timerSicuro: ReturnType<typeof setTimeout> | undefined;

  // La bozza nasce all'apertura, non prima: aprire due volte di fila la
  // stessa abitudine deve ripartire da quello che c'è nell'archivio.
  $effect(() => {
    if (!aperto) { bozza = null; sicuro = false; return; }
    if (untrack(() => bozza)) return;
    const h = id ? untrack(() => abitudinePerId(id)) : null;
    esistente = Boolean(h);
    bozza = h
      ? {
          ...structuredClone(h),
          sched: { ...pianoDi(h), days: [...(pianoDi(h).days || [])] },
          parti: (h.parti || []).map((p: Parte) => ({ ...p })),
          orari: { ...(h.orari || {}) },
          remind: h.remind || "",
        }
      : {
          id: nuovoId("h"), name: "", emoji: "⭐️", tint: "blue",
          sched: { type: "daily", days: [1, 2, 3, 4, 5, 6, 0], times: 3 },
          remind: "", archived: false, parti: [], orari: {},
        };
  });

  // Le pillole si mostrano da lunedì, ma il VALORE resta alla JavaScript
  // (0 = domenica): è quello che sta nei dati, e convertirlo qui vorrebbe
  // dire riconvertirlo al salvataggio. Il bug dei giorni sfasati nasce così.
  const GIORNI = [1, 2, 3, 4, 5, 6, 0].map((d, i) => ({ id: d, testo: GIORNI_INIZIALI[i] }));
  const VOLTE = [1, 2, 3, 4, 5, 6].map((n) => ({ id: n, testo: `${n}×` }));
  const NOMI_FASCE = FASCE as Record<string, { nome: string }>;
  const OPZIONI_FASCE = Object.entries(NOMI_FASCE).map(([k, f]) => ({ id: k, testo: f.nome }));

  const fasce = $derived(bozza ? (fasceUsate(bozza) as string[]) : []);

  function salva() {
    if (!bozza) return false;
    if (!bozza.name.trim()) { avviso("Serve un nome.", { tipo: "errore" }); return false; }
    // Le parti senza nome si buttano: una riga vuota è qualcuno che ha
    // toccato «aggiungi» e ci ha ripensato.
    const parti = bozza.parti.filter((p) => p.nome.trim()).map((p) => ({ ...p, nome: p.nome.trim() }));
    salvaAbitudine({ ...$state.snapshot(bozza), name: bozza.name.trim(), parti });
    avviso(esistente ? "Modificata." : "Aggiunta.");
  }

  function sposta(da: number, a: number) {
    if (!bozza || a < 0 || a >= bozza.parti.length) return;
    const [p] = bozza.parti.splice(da, 1);
    bozza.parti.splice(a, 0, p);
  }

  function elimina() {
    // Niente `confirm()`: in PWA su iOS blocca il thread e a volte non si
    // chiude. Doppio tocco sullo stesso pulsante.
    if (!sicuro) {
      sicuro = true;
      clearTimeout(timerSicuro);
      timerSicuro = setTimeout(() => (sicuro = false), 3000);
      return;
    }
    if (bozza) eliminaAbitudine(bozza.id);
    aperto = false;
    avviso("Eliminata.");
  }
</script>

<Foglio bind:aperto titolo={esistente ? "Modifica" : "Nuova abitudine"} conferma={{ fai: salva, etichetta: "Salva" }}>
  {#if bozza}
    <div class="anteprima" style:--tinta={tinta(bozza.tint)}>
      <span class="simbolo emoji">{bozza.emoji || "⭐️"}</span>
    </div>

    <Sezione>
      <Campo bind:valore={bozza.name} segnaposto="Nome dell'abitudine" autofocus={!esistente} />
    </Sezione>

    <Sezione titolo="Colore">
      <div class="tinte">
        {#each TINTE as t (t)}
          <button
            type="button"
            class="tinta"
            class:scelta={t === bozza.tint}
            style:--c={tinta(t)}
            aria-label={t}
            aria-pressed={t === bozza.tint}
            onclick={() => { if (bozza) bozza.tint = t; }}
          ></button>
        {/each}
      </div>
    </Sezione>

    <Sezione titolo="Simbolo">
      <SceltaEmoji bind:valore={bozza.emoji} />
    </Sezione>

    <Sezione titolo="Quando">
      <div class="blocco">
        <Segmenti
          opzioni={[{ id: "daily", testo: "Ogni giorno" }, { id: "days", testo: "Certi giorni" }, { id: "weekly", testo: "A settimana" }]}
          bind:valore={bozza.sched.type}
        />
        {#if bozza.sched.type === "days"}
          <Pillole opzioni={GIORNI} multiplo bind:scelte={bozza.sched.days} etichetta="Giorni" />
        {:else if bozza.sched.type === "weekly"}
          <Pillole
            opzioni={VOLTE}
            scelte={[bozza.sched.times || 3]}
            oncambio={(v) => { if (bozza) bozza.sched.times = v[0]; }}
            etichetta="Volte a settimana"
          />
          <p class="text-footnote secondario">Il giorno lo scegli tu. L'app la chiede solo quando saltarla ti farebbe mancare la quota.</p>
        {/if}
      </div>
    </Sezione>

    <!-- LE PARTI: gli integratori sono quattro pastiglie in tre momenti. Con
         una casella unica la spunti la sera per tutte e quattro; con le parti
         la home sa dire «prendi il magnesio» alle dieci di sera. -->
    <Sezione
      titolo="Parti"
      piede={bozza.parti.length
        ? "Ognuna si spunta da sé, e la home ricorda solo quella della fascia in corso."
        : "Facoltative. Servono quando una spunta sola nasconde più cose in momenti diversi della giornata."}
    >
      {#each bozza.parti as p, i (p.id)}
        <div class="parte">
          <div class="parte-testa">
            <input class="parte-nome" bind:value={p.nome} placeholder="Cleanser" aria-label="Nome della parte" />
            <!-- Frecce e non trascinamento: dentro un foglio che scorre, il
                 dito che trascina e quello che scorre fanno lo stesso gesto. -->
            <Pulsante variante="grigio" misura="piccola" tondo icona="su" etichetta="Sposta su" disabled={i === 0} onclick={() => sposta(i, i - 1)} />
            <Pulsante variante="grigio" misura="piccola" tondo icona="giu" etichetta="Sposta giù" disabled={i === bozza.parti.length - 1} onclick={() => sposta(i, i + 1)} />
            <Pulsante variante="grigio" misura="piccola" tondo distruttivo icona="cestino" etichetta="Togli" onclick={() => bozza?.parti.splice(i, 1)} />
          </div>
          <Pillole
            opzioni={OPZIONI_FASCE}
            scelte={[p.fascia || "qualsiasi"]}
            oncambio={(v) => { p.fascia = v[0]; }}
            etichetta="Momento della giornata"
          />
        </div>
      {/each}
      <Riga
        titolo="Aggiungi una parte"
        accento
        onclick={() => bozza?.parti.push({ id: nuovoId("pt"), nome: "", fascia: "qualsiasi" })}
      >
        {#snippet inizio()}<span class="piu"><Icona nome="piu" misura={16} tratto={2.4} /></span>{/snippet}
      </Riga>
    </Sezione>

    <!-- I PROMEMORIA: senza parti uno solo; con le parti uno per ogni fascia
         che le parti usano davvero — cinque orari di cui tre inutili sono un
         modo lento di nascondere i due che contano. -->
    <Sezione
      titolo="Promemoria"
      piede={fasce.length
        ? "Uno per momento. Arriva solo se a quel momento resta qualcosa di aperto."
        : "Vuoto = nessuna notifica. Arriva solo se non l'hai ancora segnata."}
    >
      {#if !fasce.length}
        <Campo etichetta="Ora" tipo="time" bind:valore={bozza.remind} />
      {:else}
        {#each fasce as f (f)}
          <Campo etichetta={NOMI_FASCE[f]?.nome ?? f} tipo="time" bind:valore={bozza.orari[f]} />
        {/each}
        <Riga titolo="L'ordine conta" sottotitolo="Numera i passaggi, come in una ricetta.">
          {#snippet fine()}
            <Interruttore acceso={Boolean(bozza?.sequenza)} oncambio={(v) => { if (bozza) bozza.sequenza = v; }} etichetta="L'ordine conta" />
          {/snippet}
        </Riga>
      {/if}
    </Sezione>

    {#if esistente}
      <Sezione piede="Archiviata sparisce dal giorno ma tiene lo storico: riattivandola riparte da dov'era.">
        <Riga titolo="Archiviata">
          {#snippet fine()}
            <Interruttore acceso={Boolean(bozza?.archived)} oncambio={(v) => { if (bozza) bozza.archived = v; }} etichetta="Archiviata" />
          {/snippet}
        </Riga>
      </Sezione>
      <Pulsante variante="tinto" distruttivo larga onclick={elimina}>
        {sicuro ? "Tocca di nuovo per eliminare" : "Elimina abitudine"}
      </Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .anteprima { display: flex; justify-content: center; }
  .simbolo {
    display: grid; place-items: center; width: 84px; height: 84px; border-radius: 24px; font-size: 44px;
    background: color-mix(in srgb, var(--tinta) 24%, transparent);
    transition: background-color var(--duration-normal) var(--ease-default);
  }
  .tinte { display: flex; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-4); justify-content: space-between; }
  .tinta {
    width: 32px; height: 32px; border-radius: 50%; background: var(--c);
    transition: transform var(--duration-fast) var(--ease-spring);
  }
  .tinta.scelta { box-shadow: 0 0 0 3px var(--bg-grouped-secondary), 0 0 0 5px var(--c); transform: scale(1.05); }
  .blocco { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4); }

  .parte { position: relative; display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3) var(--space-4) var(--space-4); }
  .parte + .parte::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .parte-testa { display: flex; align-items: center; gap: var(--space-2); }
  .parte-nome { flex: 1; min-width: 0; height: 40px; font-size: 17px; outline: none; }
  .parte-nome::placeholder { color: var(--label-tertiary); }
  .piu {
    display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
    background: var(--accento); color: #fff;
  }
</style>
