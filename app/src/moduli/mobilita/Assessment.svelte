<!--
  L'assessment della settimana 0: tre test.
    1  nervo o muscolo — la flessione in tre versioni
    2  lateralizzazione — sette test, voto a maggioranza, doppio twist
    3  i cinque bersagli — misure e foto di riferimento

  Ogni risposta si scrive subito: chiudere a metà non perde niente, e dalle
  impostazioni si rientra dove si era. La logica dei test è quella della
  app di partenza, invariata.
-->
<script lang="ts">
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Pillole from "$lib/ui/Pillole.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { avviso } from "$lib/core/ui";
  import { dati } from "$lib/core/reattivo.svelte";
  import { getState, updateState } from "$condivisi/mobilita/ponte.js";
  import { aggiungiFoto, leggiFotoBlob } from "$condivisi/mobilita/foto.js";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  let dialogo: HTMLDialogElement | undefined = $state();
  let parte = $state<"t1" | "t2" | "t3">("t1");
  $effect(() => {
    if (!dialogo) return;
    if (aperto && !dialogo.open) { dialogo.showModal(); parte = "t1"; }
    else if (!aperto && dialogo.open) dialogo.close();
  });

  const a = $derived.by(() => { dati.versione; return getState().assessment; });
  const numero = (v: string) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

  /* --------------------------------------------- 1 · nervo o muscolo -- */
  // Soglia oltre la quale il peggioramento con mento al petto e caviglie in
  // dorsiflessione è «netto», cioè indica tensione neurale.
  const SOGLIA_CM = 2;
  function scriviT1(campo: "variante1Cm" | "variante2Cm" | "variante3Cm", v: string) {
    const t = { ...a.esitoTest1, [campo]: numero(v) };
    let esito = null;
    if (t.variante1Cm !== null && t.variante2Cm !== null && t.variante3Cm !== null) {
      esito = t.variante2Cm - t.variante1Cm >= SOGLIA_CM && t.variante3Cm - t.variante1Cm >= SOGLIA_CM ? "neurale" : "muscolare";
    }
    updateState((s: any) => { s.assessment.esitoTest1 = { variante1Cm: t.variante1Cm, variante2Cm: t.variante2Cm, variante3Cm: t.variante3Cm, esito }; });
  }

  /* ----------------------------------------- 2 · lateralizzazione ------ */
  const TEST = [
    { n: "01", yt: "gQXcV3_JQdU", zone: "low", pol: "toward", nome: "Rotazione interna d'anca", q: "Su quale lato l'anca ruota di più verso l'interno?", perche: "La rotazione interna è la posizione dell'appoggio medio. È migliore dove stai piantato." },
    { n: "02", yt: "gQXcV3_JQdU", zone: "low", pol: "away", nome: "Rotazione esterna d'anca", q: "Su quale lato l'anca ruota di più verso l'esterno?", perche: "La rotazione esterna appartiene alla fase di volo. È migliore sul lato che eviti." },
    { n: "03", yt: "O9nkFMg65QE", zone: "low", pol: "toward", nome: "Straight leg raise", q: "Da supino, quale gamba tesa sale più in alto?", perche: "Oltre i 45° circa, alzare la gamba tesa è di fatto rotazione interna d'anca." },
    { n: "04", yt: "9S10ShpPKto", zone: "low", pol: "away", nome: "Flessione d'anca", q: "Quale ginocchio arriva più vicino al petto?", perche: "La flessione profonda d'anca esprime rotazione esterna: è migliore sul lato da cui scappi." },
    { n: "05", yt: "yodnktUmDLk", zone: "up", pol: "away", nome: "Rotazione interna di spalla", q: "Quale spalla ruota di più verso l'interno?", perche: "Il tronco è ruotato: la rotazione interna di spalla è migliore sul lato da cui scappi." },
    { n: "06", yt: "00Yc2iLr1C8", zone: "up", pol: "toward", nome: "Rotazione esterna di spalla", q: "Quale spalla ruota di più verso l'esterno?", perche: "Speculare al test 05: la rotazione esterna è migliore sul lato lateralizzato." },
    { n: "07", yt: "xoI7lEcBspU", zone: "up", pol: "toward", nome: "Abduzione di spalla", q: "Quale braccio sale più in alto lateralmente?", perche: "L'abduzione misura quanto bene il tronco riesce a girarsi verso quel lato." },
  ];
  const altro = (l: string) => (l === "sx" ? "dx" : "sx");

  const verdetto = $derived.by(() => {
    const r = a.esitoTest2?.risposte || [];
    let sx = 0, dx = 0, upSx = 0, upDx = 0, lowSx = 0, lowDx = 0, fatti = 0;
    TEST.forEach((t, i) => {
      if (!r[i]) return;
      const voto = t.pol === "toward" ? r[i] : altro(r[i]);
      fatti++;
      if (voto === "sx") { sx++; t.zone === "up" ? upSx++ : lowSx++; } else { dx++; t.zone === "up" ? upDx++ : lowDx++; }
    });
    if (fatti < TEST.length) return { completo: false as const, mancano: TEST.length - fatti };
    const lato = dx >= sx ? "dx" : "sx";
    const up = upSx === 3 ? "sx" : upDx === 3 ? "dx" : null;
    const low = lowSx >= 3 ? "sx" : lowDx >= 3 ? "dx" : null;
    return { completo: true as const, lato, punteggio: lato === "dx" ? dx : sx, doppio: Boolean(up && low && up !== low), up, low };
  });

  function rispondi(i: number, v: string) {
    const r = [...(a.esitoTest2?.risposte || [])];
    r[i] = r[i] === v ? null : v;
    // Il verdetto si ricalcola sulle risposte NUOVE, qui, e si scrive insieme
    // a loro: sono una cosa sola.
    let sx = 0, dx = 0, upSx = 0, upDx = 0, lowSx = 0, lowDx = 0, fatti = 0;
    TEST.forEach((t, k) => {
      if (!r[k]) return;
      const voto = t.pol === "toward" ? r[k] : altro(r[k]);
      fatti++;
      if (voto === "sx") { sx++; t.zone === "up" ? upSx++ : lowSx++; } else { dx++; t.zone === "up" ? upDx++ : lowDx++; }
    });
    updateState((s: any) => {
      if (fatti < TEST.length) {
        s.assessment.esitoTest2 = { risposte: r, latoLateralizzato: null, punteggio: null, doppioTwist: false, latoSopra: null, latoSotto: null };
        return;
      }
      const lato = dx >= sx ? "dx" : "sx";
      const up = upSx === 3 ? "sx" : upDx === 3 ? "dx" : null;
      const low = lowSx >= 3 ? "sx" : lowDx >= 3 ? "dx" : null;
      const doppio = Boolean(up && low && up !== low);
      s.assessment.esitoTest2 = { risposte: r, latoLateralizzato: lato, punteggio: lato === "dx" ? dx : sx, doppioTwist: doppio, latoSopra: doppio ? up : null, latoSotto: doppio ? low : null };
    });
  }

  /* ------------------------------------------------ 3 · i bersagli ----- */
  const BERSAGLI = [
    { id: "deep-squat", nome: "Deep squat", posa: "Profilo" },
    { id: "pike", nome: "Pike / forward fold", posa: "Profilo" },
    { id: "overhead-shoulder", nome: "Overhead shoulder flexion", posa: "Profilo" },
    { id: "farfalla", nome: "Simmetria ER anca (farfalla)", posa: "Frontale" },
    { id: "collo", nome: "Simmetria flessione laterale collo", posa: "Frontale" },
  ];
  const misure = (id: string) => a.baselineTest3?.bersagli?.[id]?.misure || {};
  function scriviMisura(id: string, campo: string, v: unknown) {
    updateState((s: any) => { s.assessment.baselineTest3.bersagli[id].misure[campo] = v; });
  }

  // Comodità: se il Test 1 ha già la misura «normale» e il pike è vuoto, la
  // propone — stessa misura, stesso gesto.
  $effect(() => {
    if (parte !== "t3") return;
    const v1 = a.esitoTest1?.variante1Cm;
    if (misure("pike").distanzaDitaPavimentoCm == null && v1 != null) scriviMisura("pike", "distanzaDitaPavimentoCm", v1);
  });

  let anteprime = $state<Record<string, string>>({});
  $effect(() => {
    if (parte !== "t3") return;
    let vivo = true;
    const creati: string[] = [];
    (async () => {
      for (const b of BERSAGLI) {
        const rec = (getState().foto || []).filter((f: any) => !f.del && f.bersaglioId === b.id).sort((x: any, y: any) => (x.up || 0) - (y.up || 0));
        if (!rec.length) continue;
        const blob = await leggiFotoBlob(rec[rec.length - 1].id);
        if (!blob || !vivo) continue;
        const u = URL.createObjectURL(blob);
        creati.push(u);
        anteprime = { ...anteprime, [b.id]: u };
      }
    })();
    return () => { vivo = false; creati.forEach((u) => URL.revokeObjectURL(u)); };
  });

  async function foto(id: string, e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    // Compressa, salvata in locale, messa in coda per il repo.
    const { blob } = await aggiungiFoto(id, f);
    anteprime = { ...anteprime, [id]: URL.createObjectURL(blob) };
    avviso("Foto salvata.");
  }

  function completa() {
    updateState((s: any) => { s.assessment.completato = true; s.metaUp = Date.now(); });
    aperto = false;
    avviso("Assessment completato.");
  }
</script>

<dialog bind:this={dialogo} class="assess" oncancel={(e) => { e.preventDefault(); aperto = false; }}>
  <div class="testa">
    <Pulsante variante="vetro" misura="media" tondo icona="chiudi" etichetta="Chiudi" onclick={() => (aperto = false)} />
    <span class="text-headline">Assessment</span>
    <span class="vuoto"></span>
  </div>
  <div class="scorre">
    <Segmenti opzioni={[{ id: "t1", testo: "1 · Nervo" }, { id: "t2", testo: "2 · Lato" }, { id: "t3", testo: "3 · Bersagli" }]} bind:valore={parte} />

    {#if parte === "t1"}
      <p class="text-subheadline secondario">Flessione in avanti in tre versioni consecutive, a freddo. In ciascuna misura la distanza fra le dita e il pavimento, in centimetri (0 o negativo se lo tocchi o lo superi).</p>
      <Sezione>
        {#each [["variante1Cm", "1 — Normale, mento neutro"], ["variante2Cm", "2 — Mento al petto"], ["variante3Cm", "3 — Mento al petto + caviglie flesse"]] as [k, et] (k)}
          <label class="misura">
            <span>{et}</span>
            <input type="number" step="0.5" inputmode="decimal" value={a.esitoTest1?.[k] ?? ""} oninput={(e) => scriviT1(k as any, e.currentTarget.value)} />
            <span class="secondario">cm</span>
          </label>
        {/each}
      </Sezione>
      <div class="esito" class:attesa={!a.esitoTest1?.esito}>
        {#if a.esitoTest1?.esito === "neurale"}
          <b>Tensione neurale</b><span>Il range peggiora nettamente in 2 e 3. Il modulo posteriore userà nerve flossing dello sciatico, non allungamento prolungato dei femorali.</span>
        {:else if a.esitoTest1?.esito === "muscolare"}
          <b>Lunghezza muscolare</b><span>Il range resta sostanzialmente uguale. Modulo posteriore standard: statico 30" più attivo.</span>
        {:else}
          <span>Compila tutte e tre le misure per vedere l'esito.</span>
        {/if}
      </div>

    {:else if parte === "t2"}
      <p class="text-subheadline secondario">Guarda il video, misura tutti e due i lati e segna quello migliore — con più escursione, non quello che fa male. A freddo, non dopo l'allenamento.</p>
      {#each TEST as t, i (t.n)}
        <div class="test">
          <span class="text-caption1 secondario semibold">TEST {t.n}</span>
          <a class="video" href="https://www.youtube.com/watch?v={t.yt}" target="_blank" rel="noopener">
            <img loading="lazy" src="https://i.ytimg.com/vi/{t.yt}/hqdefault.jpg" alt="" />
            <span class="text-subheadline"><Icona nome="play" misura={14} tratto={2.4} />{t.nome}</span>
          </a>
          <b class="text-headline">{t.q}</b>
          <span class="text-footnote secondario">{t.perche}</span>
          <Pillole opzioni={[{ id: "sx", testo: "Sinistro" }, { id: "dx", testo: "Destro" }]} scelte={a.esitoTest2?.risposte?.[i] ? [a.esitoTest2.risposte[i]] : []} oncambio={(v) => rispondi(i, v[0])} />
        </div>
      {/each}
      <div class="esito" class:attesa={!verdetto.completo}>
        {#if verdetto.completo}
          <b>Sei lateralizzato a {verdetto.lato === "dx" ? "DESTRA" : "SINISTRA"}</b>
          <span>{verdetto.punteggio} test su {TEST.length} puntano al lato {verdetto.lato === "dx" ? "destro" : "sinistro"}: incastrato in appoggio su quel lato, scappi dall'altro.
            {#if verdetto.punteggio === 4} 4 su 7 è il minimo leggibile: vale la pena rimisurare i test in disaccordo.{/if}
            {#if verdetto.doppio} Doppio twist: spalle a {verdetto.up === "dx" ? "destra" : "sinistra"}, anche a {verdetto.low === "dx" ? "destra" : "sinistra"}.{/if}
          </span>
        {:else}
          <b>In attesa dei sette test</b><span>Ne mancano {verdetto.mancano} su {TEST.length}.</span>
        {/if}
      </div>

    {:else}
      <p class="text-subheadline secondario">Stessa posa, stessa distanza, stessa luce: sarà il riferimento per il confronto ogni tre settimane.</p>
      {#each BERSAGLI as b (b.id)}
        {@const m = misure(b.id)}
        <Sezione titolo={b.nome} piede={b.posa}>
          {#if b.id === "deep-squat"}
            <div class="scelta"><span>Profondità</span><Pillole opzioni={[{ id: "sopra-parallelo", testo: "Sopra" }, { id: "parallelo", testo: "Al parallelo" }, { id: "sotto-parallelo", testo: "Sotto" }]} scelte={m.profonditaLivello ? [m.profonditaLivello] : []} oncambio={(v) => scriviMisura(b.id, "profonditaLivello", v[0])} /></div>
            <div class="scelta"><span>Talloni a terra</span><Pillole opzioni={[{ id: "true", testo: "Sì" }, { id: "false", testo: "No" }]} scelte={m.talloniATerra == null ? [] : [String(m.talloniATerra)]} oncambio={(v) => scriviMisura(b.id, "talloniATerra", v[0] === "true")} /></div>
          {:else if b.id === "pike"}
            <label class="misura"><span>Dita-pavimento</span><input type="number" step="0.5" inputmode="decimal" value={m.distanzaDitaPavimentoCm ?? ""} oninput={(e) => scriviMisura(b.id, "distanzaDitaPavimentoCm", numero(e.currentTarget.value))} /><span class="secondario">cm</span></label>
          {:else if b.id === "overhead-shoulder"}
            <label class="misura"><span>Polso-muro</span><input type="number" step="0.5" inputmode="decimal" value={m.distanzaPolsoMuroCm ?? ""} oninput={(e) => scriviMisura(b.id, "distanzaPolsoMuroCm", numero(e.currentTarget.value))} /><span class="secondario">cm</span></label>
            <div class="scelta"><span>Lombare piatta al muro</span><Pillole opzioni={[{ id: "true", testo: "Sì" }, { id: "false", testo: "No" }]} scelte={m.lombarePiatta == null ? [] : [String(m.lombarePiatta)]} oncambio={(v) => scriviMisura(b.id, "lombarePiatta", v[0] === "true")} /></div>
          {:else if b.id === "farfalla"}
            <label class="misura"><span>Ginocchio sinistro</span><input type="number" step="0.5" inputmode="decimal" value={m.altezzaGinocchioSxCm ?? ""} oninput={(e) => scriviMisura(b.id, "altezzaGinocchioSxCm", numero(e.currentTarget.value))} /><span class="secondario">cm</span></label>
            <label class="misura"><span>Ginocchio destro</span><input type="number" step="0.5" inputmode="decimal" value={m.altezzaGinocchioDxCm ?? ""} oninput={(e) => scriviMisura(b.id, "altezzaGinocchioDxCm", numero(e.currentTarget.value))} /><span class="secondario">cm</span></label>
          {:else if b.id === "collo"}
            <p class="text-footnote secondario nota">Se compaiono vertigini, formicolii alle braccia, cefalea o dolore, fermati.</p>
            <label class="misura"><span>Orecchio-spalla destro</span><input type="number" step="1" inputmode="decimal" value={m.angoloDxGradi ?? ""} oninput={(e) => scriviMisura(b.id, "angoloDxGradi", numero(e.currentTarget.value))} /><span class="secondario">°</span></label>
            <label class="misura"><span>Orecchio-spalla sinistro</span><input type="number" step="1" inputmode="decimal" value={m.angoloSxGradi ?? ""} oninput={(e) => scriviMisura(b.id, "angoloSxGradi", numero(e.currentTarget.value))} /><span class="secondario">°</span></label>
          {/if}
          <label class="foto">
            {#if anteprime[b.id]}<img src={anteprime[b.id]} alt="" />{:else}<span class="vuota"><Icona nome="fotocamera" misura={20} tratto={1.8} /></span>{/if}
            <span class="accento">{anteprime[b.id] ? "Sostituisci la foto" : "Aggiungi la foto"}</span>
            <input type="file" accept="image/*" capture="environment" onchange={(e) => foto(b.id, e)} />
          </label>
        </Sezione>
      {/each}
    {/if}
  </div>
  <div class="piede">
    <Pulsante variante="pieno" larga onclick={completa}>Completa l'assessment</Pulsante>
    <p class="text-footnote secondario">Si può tornare qui in qualsiasi momento: i valori già inseriti restano.</p>
  </div>
</dialog>

<style>
  .assess { position: fixed; inset: 0; width: 100%; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: env(safe-area-inset-top, 0px) 0 0; border: 0; background: var(--bg-grouped-primary); color: var(--label-primary); }
  .assess[open] { display: flex; flex-direction: column; }
  .testa { flex: none; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; text-align: center; padding: var(--space-2) var(--content-inset); max-width: var(--readable-width); width: 100%; margin: 0 auto; }
  .vuoto { width: 44px; }
  .scorre { flex: 1; min-height: 0; overflow-y: auto; width: 100%; max-width: var(--readable-width); margin: 0 auto; padding: var(--space-2) var(--content-inset) var(--space-6); display: flex; flex-direction: column; gap: var(--space-5); }
  .scorre > :global(*) { flex-shrink: 0; }
  .misura { position: relative; display: flex; align-items: center; gap: var(--space-3); min-height: var(--list-row-height); padding: 0 var(--space-4); }
  .misura + .misura::before, :global(* + .misura)::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .misura span:first-child { flex: 1; }
  .misura input { width: 80px; text-align: right; font-size: 17px; background: none; outline: none; color: var(--accento); }
  .esito { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4); border-radius: var(--radius-xxl); background: color-mix(in srgb, var(--accento) 14%, transparent); }
  .esito.attesa { background: var(--bg-grouped-secondary); color: var(--label-secondary); }
  .test { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); border-radius: var(--radius-xxxl); background: var(--bg-grouped-secondary); }
  .video { position: relative; display: block; border-radius: var(--radius-xl); overflow: hidden; aspect-ratio: 16 / 9; background: #000; }
  .video img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
  .video span { position: absolute; left: 10px; bottom: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: var(--radius-full); color: #fff; background: rgba(0, 0, 0, 0.55); }
  .scelta { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
  .nota { padding: var(--space-3) var(--space-4) 0; }
  .foto { position: relative; display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); cursor: pointer; }
  .foto img, .foto .vuota { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; }
  .foto .vuota { display: grid; place-items: center; background: var(--fill-tertiary); color: var(--label-secondary); }
  .foto input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .accento { color: var(--accento); }
  .piede { flex: none; width: 100%; max-width: var(--readable-width); margin: 0 auto; padding: var(--space-3) var(--content-inset) calc(env(safe-area-inset-bottom, 0px) + var(--space-3)); display: flex; flex-direction: column; gap: var(--space-2); text-align: center; border-top: 0.5px solid var(--separator); }
</style>
