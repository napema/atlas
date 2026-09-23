<!--
  «Ho mangiato…»: il percorso che deve costare UN tocco. Se costa una
  ricerca nutrizionale non lo farà mai, e allora tanto vale non averlo.

  In cima le TENDENZE — quello che hai già segnato più volte a quest'ora,
  che è di gran lunga il caso più probabile. Sotto, i COMPONENTI: lo stesso
  selettore della pianificazione, perché «ho mangiato un panino col pollo»
  è pane più pollo, e tenere due vocabolari diversi — combinazioni qui,
  pezzi là — vorrebbe dire che la stessa cena conta due valori a seconda di
  dove la segni. In fondo, per quello che non è in nessuna lista, il campo
  libero.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import SceltaComponenti from "./SceltaComponenti.svelte";
  import { avviso, plurale } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { pastiVivi, pasto, registraScostamento, eliminaScostamento } from "$condivisi/pasti/dati.js";
  import { tendenze, bersagli } from "$condivisi/pasti/calcolo.js";
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
  let pezzi = $state<string[]>([]);

  // All'apertura: la fascia che arriva da fuori o quella dell'ora, e un
  // campo libero pulito.
  $effect(() => {
    if (!aperto) return;
    scelta = fascia || fasciaDallOra();
    libero = { nome: "", kcal: "", p: "", c: "", g: "" };
    errore = "";
    pezzi = [];
  });

  const b = $derived.by(() => { dati.versione; return bersagli(); });

  /* I pezzi scelti diventano UN scostamento, non quattro. Quattro righe da
     «Pane», «Pollo», «Insalata» nel registro sarebbero la stessa cena
     raccontata tre volte, e in «In più, oggi» diventerebbero tre cose da
     togliere una per una per annullare un gesto solo. */
  function segnaPezzi() {
    const voci = pezzi.map((id) => pasto(id)).filter(Boolean) as any[];
    if (!voci.length) return;
    segna({
      nome: voci.map((v) => v.nome).join(" + "),
      kcal: voci.reduce((t, v) => t + v.kcal, 0),
      p: voci.reduce((t, v) => t + v.p, 0),
      c: voci.reduce((t, v) => t + v.c, 0),
      g: voci.reduce((t, v) => t + v.g, 0),
      pastoId: voci.length === 1 ? voci[0].id : null,
    });
  }

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
    <Sezione titolo="Lo fai spesso">
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

  <Sezione titolo="Mettilo insieme">
    <div class="componi">
      <SceltaComponenti bind:scelti={pezzi} fascia={scelta} bersaglio={b} />
    </div>
  </Sezione>
  {#if pezzi.length}
    <Pulsante variante="pieno" larga onclick={segnaPezzi}>Segna quello che hai messo</Pulsante>
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
  .componi { padding: var(--space-4); }
  .macro { position: relative; }
  .macro::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
</style>
