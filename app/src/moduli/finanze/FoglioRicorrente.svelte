<!--
  Un ricorrente (fisso o stimato, con cadenza e pocket) o un pagamento
  previsto (una tantum con una data). Due forme dello stesso gesto:
  dichiarare una spesa prima che arrivi, perché «In arrivo» la veda.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, centesimi, dataUmana, euro, nuovoId, oggiISO, MESI_BREVI } from "$lib/core/ui";
  import { stato, salvaRicorrente, eliminaRicorrente, salvaPrevisto, eliminaPrevisto } from "$condivisi/finanze/dati.js";
  import { coperturaDi } from "$condivisi/finanze/calcolo.js";
  import { CADENZE, testoDa, nomePocket } from "./comune";

  let {
    aperto = $bindable(false),
    genere,
    esistente = null,
  }: { aperto: boolean; genere: "ricorrente" | "previsto"; esistente?: any } = $props();

  let b = $state<any>({});
  let imp = $state(""), min = $state(""), max = $state("");
  let sicuro = $state(false);
  let preparato = false;
  $effect(() => {
    if (!aperto) { preparato = false; return; }
    if (preparato) return;
    preparato = true;
    sicuro = false;
    b = esistente ? { ...esistente }
      : genere === "ricorrente"
        ? { id: nuovoId("r"), nome: "", imp: 0, cat: "fisse", pocket: "fisse", tipo: "fissa", cadenza: "mensile", giorno: 1, mese: 1, da: null, pagato: null, stimaMin: 0, stimaMax: 0, attivo: true }
        : { id: nuovoId("p"), nome: "", imp: 0, quando: oggiISO(), pocket: "ing", cat: "fisse", nota: "", pagatoIl: null };
    imp = testoDa(b.imp); min = testoDa(b.stimaMin || 0); max = testoDa(b.stimaMax || 0);
  });

  const pockets = $derived(((stato().pockets || []) as any[]).map((p) => ({ id: p.id, testo: p.nome })));
  const cats = $derived(((stato().cats || []) as any[]).map((c) => ({ id: c.id, testo: c.nome })));
  const cop = $derived(genere === "previsto" && centesimi(imp) ? coperturaDi({ ...b, imp: centesimi(imp) }) : null);

  function salva() {
    if (!String(b.nome || "").trim()) { avviso("Serve un nome.", { tipo: "errore" }); return false; }
    const x = {
      ...$state.snapshot(b), nome: b.nome.trim(),
      imp: centesimi(imp) ?? 0, stimaMin: centesimi(min) ?? 0, stimaMax: centesimi(max) ?? 0,
      ...(genere === "ricorrente" ? { giorno: Math.min(31, Math.max(1, Number(b.giorno) || 1)), da: b.da || null } : { quando: b.quando || oggiISO() }),
    };
    if (genere === "previsto") {
      if (!x.imp) { avviso("Serve un importo.", { tipo: "errore" }); return false; }
      salvaPrevisto(x);
    } else {
      salvaRicorrente(x);
    }
    avviso("Salvato.");
  }

  function elimina() {
    if (!sicuro) { sicuro = true; setTimeout(() => (sicuro = false), 3000); return; }
    if (genere === "previsto") eliminaPrevisto(b.id); else eliminaRicorrente(b.id);
    aperto = false;
    avviso("Eliminato.");
  }
</script>

<Foglio bind:aperto titolo={genere === "previsto" ? (esistente ? "Pagamento previsto" : "Nuovo pagamento") : (esistente ? "Ricorrente" : "Nuovo ricorrente")} conferma={{ fai: salva, etichetta: "Salva" }}>
  {#if b.id}
    <Sezione>
      <Campo etichetta="Nome" bind:valore={b.nome} segnaposto={genere === "previsto" ? "Maxi rata affitto" : "Rata prestito"} />
    </Sezione>

    {#if genere === "ricorrente"}
      <Sezione titolo="Importo" piede={b.tipo === "variabile" ? "Nelle proiezioni vale il massimo: una bolletta sottostimata è esattamente il caso in cui il pocket non basta." : undefined}>
        <div class="blocco"><Segmenti opzioni={[{ id: "fissa", testo: "Certo" }, { id: "variabile", testo: "Stimato" }]} bind:valore={b.tipo} /></div>
        {#if b.tipo === "fissa"}
          <Campo etichetta="Importo" bind:valore={imp} modo="decimal" allinea="destra" unita="€" />
        {:else}
          <Campo etichetta="Minimo" bind:valore={min} modo="decimal" allinea="destra" unita="€" />
          <Campo etichetta="Massimo" bind:valore={max} modo="decimal" allinea="destra" unita="€" />
        {/if}
      </Sezione>

      <Sezione titolo="Ogni quanto" piede={b.da ? "Prima della prima scadenza il ricorrente non esiste, e la cadenza conta da lì." : "Senza prima scadenza vale da subito."}>
        <div class="blocco"><Pillole opzioni={CADENZE.map(([k, t]) => ({ id: k, testo: t }))} scelte={[b.cadenza]} oncambio={(v) => (b.cadenza = v[0])} /></div>
        <Campo etichetta="Giorno del mese" bind:valore={b.giorno} modo="numeric" allinea="destra" />
        <!-- LA PRIMA SCADENZA, con la data intera: le utenze partono a
             settembre ma la prima bolletta arriva a fine ottobre. -->
        <Campo etichetta="Prima scadenza" tipo="date" bind:valore={b.da} />
        {#if b.cadenza !== "mensile" && !b.da}
          <div class="blocco"><Pillole opzioni={MESI_BREVI.map((m, i) => ({ id: i + 1, testo: m }))} scelte={[b.mese || 1]} oncambio={(v) => (b.mese = v[0])} etichetta="Mese di riferimento" /></div>
        {/if}
        {#if b.pagato}
          <!-- Una scadenza saldata si vede e si può annullare: un «Paga» dato
               per sbaglio non deve restare senza rimedio. -->
          <Riga titolo="Ultima saldata" valore={dataUmana(b.pagato)}>
            {#snippet fine()}<Pulsante variante="testo" misura="piccola" onclick={() => (b.pagato = null)}>Annulla</Pulsante>{/snippet}
          </Riga>
        {/if}
      </Sezione>
    {:else}
      <Sezione>
        <Campo etichetta="Importo" bind:valore={imp} modo="decimal" allinea="destra" unita="€" />
        <Campo etichetta="Quando esce" tipo="date" bind:valore={b.quando} />
      </Sezione>
    {/if}

    <Sezione titolo="Da quale pocket esce">
      <div class="blocco"><Pillole opzioni={pockets} scelte={[b.pocket]} oncambio={(v) => (b.pocket = v[0])} /></div>
    </Sezione>
    {#if cop}
      <p class="copertura text-subheadline" class:male={!cop.coperto}>{cop.coperto ? "I soldi ci sono" : `Mancano ${euro(cop.manca, { tondo: true })}`} · {nomePocket(cop.pocket)}: {euro(cop.saldo)} disponibili</p>
    {/if}

    <Sezione titolo="Categoria">
      <div class="blocco"><Pillole opzioni={cats} scelte={[b.cat]} oncambio={(v) => (b.cat = v[0])} /></div>
    </Sezione>

    {#if genere === "ricorrente"}
      <Sezione piede="Un ricorrente sospeso resta configurato ma sparisce da «In arrivo».">
        <Riga titolo="Attivo">
          {#snippet fine()}<Interruttore acceso={Boolean(b.attivo)} oncambio={(v) => (b.attivo = v)} etichetta="Attivo" />{/snippet}
        </Riga>
      </Sezione>
    {:else}
      <Sezione><Campo etichetta="Nota" bind:valore={b.nota} segnaposto="facoltativa" /></Sezione>
    {/if}

    {#if esistente}
      <Pulsante variante="tinto" distruttivo larga onclick={elimina}>{sicuro ? "Tocca di nuovo per eliminare" : "Elimina"}</Pulsante>
    {/if}
  {/if}
</Foglio>

<style>
  .blocco { padding: var(--space-3) var(--space-4); }
  .copertura { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); color: var(--color-green); background: color-mix(in srgb, var(--color-green) 12%, transparent); }
  .copertura.male { color: var(--color-red); background: color-mix(in srgb, var(--color-red) 12%, transparent); }
</style>
