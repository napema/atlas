<!--
  «Ho mangiato…»: il percorso che deve costare UN tocco. Se costa una
  ricerca nutrizionale non lo farà mai, e allora tanto vale non averlo.

  In cima le TENDENZE — quello che hai già segnato più volte a quest'ora,
  che è di gran lunga il caso più probabile — poi i tuoi pasti, poi i
  comuni. In fondo, per quello che non è in nessuna lista, il campo libero.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, plurale } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { pastiVivi, registraScostamento, eliminaScostamento } from "$condivisi/pasti/dati.js";
  import { tendenze } from "$condivisi/pasti/calcolo.js";
  import { propostePerFascia, scostamentoDaTesto } from "$condivisi/pasti/importa.js";
  import { FASCE_T, fasciaDallOra, oraAdesso, kcal } from "./comune";

  let {
    aperto = $bindable(false),
    iso,
    fascia = null,
    tipo = "aggiunta",
  }: { aperto: boolean; iso: string; fascia?: string | null; tipo?: "aggiunta" | "cambio" } = $props();

  let scelta = $state<string>(fasciaDallOra());
  let libero = $state({ nome: "", kcal: "", p: "", c: "", g: "" });
  let errore = $state("");

  // All'apertura: la fascia che arriva da fuori o quella dell'ora, e un
  // campo libero pulito.
  $effect(() => {
    if (!aperto) return;
    scelta = fascia || fasciaDallOra();
    libero = { nome: "", kcal: "", p: "", c: "", g: "" };
    errore = "";
  });

  const proposte = $derived.by(() => {
    dati.versione;
    return propostePerFascia(scelta, { tendenze: tendenze(), pasti: pastiVivi() }).slice(0, 14);
  });

  function segna(v: { nome: string; kcal: number; p: number; c: number; g: number; pastoId?: string | null }) {
    const r = registraScostamento({
      tipo, data: iso, ora: oraAdesso(), fascia: scelta,
      nome: v.nome, kcal: v.kcal, p: v.p, c: v.c, g: v.g, pastoId: v.pastoId ?? null,
    });
    aperto = false;
    avviso("Segnato.", { azione: r ? { etichetta: "Annulla", fai: () => eliminaScostamento(r.id) } : undefined });
  }

  // Se nella riga ha scritto anche i numeri («panino 300 kcal 18p»), si
  // prendono da lì — ma senza sovrascrivere quello che ha già messo a mano.
  function leggiNome() {
    const letto = scostamentoDaTesto(libero.nome);
    if (letto?.completo && !libero.kcal) {
      libero = { nome: letto.nome, kcal: String(letto.kcal), p: String(letto.p || ""), c: String(letto.c || ""), g: String(letto.g || "") };
    }
  }

  function segnaLibero() {
    const n = (x: string) => Number(String(x).replace(",", ".")) || 0;
    if (!libero.nome.trim()) { errore = "Manca il nome."; return; }
    // Le calorie NON si inventano: un bilancio che sembra preciso e non lo
    // è è peggio di uno che dichiara di non sapere.
    if (!n(libero.kcal)) { errore = "Mancano le calorie: senza, il conto della giornata direbbe una bugia."; return; }
    segna({ nome: libero.nome.trim(), kcal: n(libero.kcal), p: n(libero.p), c: n(libero.c), g: n(libero.g) });
  }
</script>

<Foglio bind:aperto titolo={tipo === "cambio" ? "Al posto di…" : "Ho mangiato"}>
  {#if !fascia}
    <Pillole
      opzioni={FASCE_T.map((f) => ({ id: f.id, testo: f.nome }))}
      scelte={[scelta]}
      oncambio={(v) => (scelta = v[0])}
      etichetta="Quando"
    />
  {/if}

  {#if proposte.length}
    <Sezione>
      {#each proposte as v (v.nome)}
        <Riga
          titolo={v.nome}
          sottotitolo={v.origine === "tendenza" ? `lo fai spesso · ${plurale(v.volte, "volta", "volte")}` : `${v.p} g di proteine`}
          valore="{kcal(v.kcal)} kcal"
          onclick={() => segna(v)}
        />
      {/each}
    </Sezione>
  {/if}

  <Sezione titolo="Non è in lista" piede={errore || "Scrivi pure tutto in una riga: «panino 300 kcal 18p»."}>
    <Campo etichetta="Cosa" bind:valore={libero.nome} segnaposto="pizzetta, panino…" oninvio={leggiNome} />
    <div class="macro">
      <Campo etichetta="kcal" bind:valore={libero.kcal} modo="decimal" allinea="destra" />
      <Campo etichetta="Proteine" bind:valore={libero.p} modo="decimal" allinea="destra" unita="g" />
      <Campo etichetta="Carboidrati" bind:valore={libero.c} modo="decimal" allinea="destra" unita="g" />
      <Campo etichetta="Grassi" bind:valore={libero.g} modo="decimal" allinea="destra" unita="g" />
    </div>
  </Sezione>
  <Pulsante variante="pieno" larga onclick={() => { leggiNome(); segnaLibero(); }}>Segna</Pulsante>
</Foglio>

<style>
  .macro { position: relative; }
  .macro::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
</style>
