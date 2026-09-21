<!--
  La misura del progresso, su tre piani diversi:
    1. costanza — l'unica metrica che il programma considera di successo
    2. volume per gruppo muscolare contro la soglia dei 5 minuti a settimana
    3. i cinque bersagli, con la baseline e la prossima foto
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Traccia from "$lib/ui/Traccia.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { dataUmana } from "$lib/core/ui";
  import { getState } from "$condivisi/mobilita/ponte.js";
  import { leggiFotoBlob } from "$condivisi/mobilita/foto.js";
  import { oggiISO, addGiorni, giorniTra } from "$condivisi/mobilita/sessione.js";

  let { parte }: { parte: "lato" | "resto" } = $props();

  const SOGLIA_SEC = 300;           // 5 minuti per gruppo muscolare
  const GIORNI_TRA_LE_FOTO = 21;    // protocollo foto: ogni 3 settimane

  const NOMI_GRUPPI: Record<string, string> = {
    gluteo: "Glutei", "anca-laterale": "Anca laterale", quadricipite: "Quadricipiti", obliqui: "Obliqui",
    adduttori: "Adduttori", femorali: "Femorali", caviglia: "Caviglia", "caviglia-anca": "Caviglia e anca",
    soleo: "Soleo", addominali: "Addominali", dorsali: "Dorsali", spalle: "Spalle", "gran-dorsale": "Gran dorsale",
    "rotatori-anca": "Rotatori d'anca", "piriforme-gluteo": "Piriforme e gluteo",
    "collo-laterale": "Collo (laterale)", "collo-scaleno": "Collo (scaleni)",
  };

  const BERSAGLI = [
    { id: "deep-squat", nome: "Deep squat" },
    { id: "pike", nome: "Pike / forward fold" },
    { id: "overhead-shoulder", nome: "Overhead shoulder" },
    { id: "farfalla", nome: "Simmetria farfalla" },
    { id: "collo", nome: "Simmetria collo" },
  ];

  function descrivi(id: string, m: any): string | null {
    const v = (x: unknown) => (x === null || x === undefined ? null : x);
    if (id === "deep-squat") {
      const p = v(m.profonditaLivello) as string | null;
      if (!p) return null;
      const e: Record<string, string> = { "sopra-parallelo": "Sopra il parallelo", parallelo: "Al parallelo", "sotto-parallelo": "Sotto il parallelo" };
      return `${e[p] || p}${m.talloniATerra === true ? " · talloni a terra" : m.talloniATerra === false ? " · talloni sollevati" : ""}`;
    }
    if (id === "pike") return v(m.distanzaDitaPavimentoCm) === null ? null : `${m.distanzaDitaPavimentoCm} cm dal pavimento`;
    if (id === "overhead-shoulder") {
      if (v(m.distanzaPolsoMuroCm) === null) return null;
      return `${m.distanzaPolsoMuroCm} cm dal muro${m.lombarePiatta === true ? " · lombare piatta" : ""}`;
    }
    if (id === "farfalla") {
      if (v(m.altezzaGinocchioSxCm) === null || v(m.altezzaGinocchioDxCm) === null) return null;
      return `Sx ${m.altezzaGinocchioSxCm} cm · Dx ${m.altezzaGinocchioDxCm} cm · differenza ${Math.abs(m.altezzaGinocchioSxCm - m.altezzaGinocchioDxCm)} cm`;
    }
    if (id === "collo") {
      if (v(m.angoloDxGradi) === null || v(m.angoloSxGradi) === null) return null;
      return `Dx ${m.angoloDxGradi}° · Sx ${m.angoloSxGradi}°`;
    }
    return null;
  }

  const d = $derived.by(() => {
    dati.versione;
    const state = getState();
    const oggi = oggiISO();
    const fatte = new Set(state.storicoSessioni.map((s: any) => s.data));
    const finestra = new Set(Array.from({ length: 7 }, (_, i) => addGiorni(oggi, -i)));
    const volumi: Record<string, number> = {};
    for (const s of state.storicoSessioni) {
      if (!finestra.has(s.data)) continue;
      for (const [g, sec] of Object.entries(s.volumePerGruppo || {})) volumi[g] = (volumi[g] || 0) + (sec as number);
    }
    const gruppi = Object.entries(volumi).sort((a, b) => b[1] - a[1]);
    const bersagli = state.assessment?.baselineTest3?.bersagli || {};
    let ultimaFoto: string | null = null;
    for (const b of BERSAGLI) {
      const f = bersagli[b.id]?.fotoData;
      if (f && (!ultimaFoto || f > ultimaFoto)) ultimaFoto = f;
    }
    return {
      oggi,
      streak: state.streak.giorniConsecutivi,
      totali: state.storicoSessioni.length,
      griglia: Array.from({ length: 28 }, (_, i) => { const iso = addGiorni(oggi, -(27 - i)); return { iso, fatta: fatte.has(iso) }; }),
      gruppi,
      sotto: gruppi.filter(([, s]) => s < SOGLIA_SEC).length,
      bersagli: BERSAGLI.map((b) => ({ ...b, testo: descrivi(b.id, bersagli[b.id]?.misure || {}) })),
      ultimaFoto,
      foto: state.foto || [],
    };
  });

  const notaFoto = $derived.by(() => {
    if (!d.ultimaFoto) return "Aggiungi le foto baseline dall'assessment: sono il termine di paragone per capire se stai migliorando.";
    const passati = giorniTra(d.ultimaFoto.slice(0, 10), d.oggi);
    const mancano = GIORNI_TRA_LE_FOTO - passati;
    return mancano > 0
      ? `Prossimo controllo fotografico tra ${mancano} giorni. Stessa posa, stessa distanza, stessa luce.`
      : `È ora di rifare le foto: sono passati ${passati} giorni. Stessa posa, stessa distanza, stessa luce.`;
  });

  // Le anteprime: la più recente per bersaglio. Gli URL si liberano quando
  // cambiano, altrimenti ogni ridisegno lascia un blob in memoria.
  let anteprime = $state<Record<string, string>>({});
  $effect(() => {
    const foto = d.foto;
    let vivo = true;
    const creati: string[] = [];
    (async () => {
      const out: Record<string, string> = {};
      for (const b of BERSAGLI) {
        const rec = foto.filter((f: any) => !f.del && f.bersaglioId === b.id).sort((a: any, x: any) => (a.up || 0) - (x.up || 0));
        if (!rec.length) continue;
        const blob = await leggiFotoBlob(rec[rec.length - 1].id);
        if (!blob || !vivo) continue;
        const u = URL.createObjectURL(blob);
        creati.push(u);
        out[b.id] = u;
      }
      if (vivo) anteprime = out;
    })();
    return () => { vivo = false; creati.forEach((u) => URL.revokeObjectURL(u)); };
  });
</script>

{#if parte === "lato"}
<Sezione titolo="Costanza" piede="È la metrica che conta davvero: il programma riesce se i giorni si accumulano, non se guadagni gradi in fretta.">
  <div class="costanza">
    <div class="numeri">
      <div><span class="cifra cifre">{d.streak}</span><span class="text-footnote secondario">giorni di fila</span></div>
      <div><span class="cifra cifre">{d.totali}</span><span class="text-footnote secondario">sessioni totali</span></div>
    </div>
    <div class="griglia" aria-label="Ultime quattro settimane">
      {#each d.griglia as c (c.iso)}
        <span class="cella" class:fatta={c.fatta} class:oggi={c.iso === d.oggi} title={dataUmana(c.iso)}></span>
      {/each}
    </div>
    <span class="text-caption1 secondario">Ultime quattro settimane</span>
  </div>
</Sezione>

{:else}
<Sezione
  titolo="Volume, ultimi 7 giorni"
  piede={d.gruppi.length
    ? `Soglia di adattamento: 5 minuti a settimana per gruppo. ${d.sotto ? `${d.sotto} ${d.sotto === 1 ? "gruppo è" : "gruppi sono"} sotto soglia — normale nei primi giorni, si riempie con la costanza.` : "Tutti i gruppi sono sopra soglia."}`
    : "Nessuna sessione negli ultimi 7 giorni: qui comparirà quanto lavoro ha ricevuto ogni gruppo muscolare."}
>
  {#if d.gruppi.length}
    <div class="volumi">
      {#each d.gruppi as [g, sec] (g)}
        <div class="volume">
          <div class="riga-v text-subheadline">
            <span>{NOMI_GRUPPI[g] || g}</span>
            <span class="cifre secondario">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")} / 5:00</span>
          </div>
          <Traccia valore={sec / SOGLIA_SEC} colore={sec < SOGLIA_SEC ? "var(--color-orange)" : "var(--accento)"} altezza={6} />
        </div>
      {/each}
    </div>
  {/if}
</Sezione>

<Sezione titolo="I cinque bersagli" piede={notaFoto}>
  {#each d.bersagli as b (b.id)}
    <Riga titolo={b.nome} sottotitolo={b.testo || "Baseline non ancora inserita"}>
      {#snippet inizio()}
        {#if anteprime[b.id]}
          <img class="foto" src={anteprime[b.id]} alt="" />
        {:else}
          <span class="foto vuota"><Icona nome="fotocamera" misura={16} tratto={1.9} /></span>
        {/if}
      {/snippet}
    </Riga>
  {/each}
</Sezione>
{/if}

<style>
  .costanza { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .numeri { display: flex; gap: var(--space-8); }
  .numeri div { display: flex; flex-direction: column; }
  .cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); }
  .griglia { display: grid; grid-template-columns: repeat(14, 1fr); gap: 4px; }
  .cella { aspect-ratio: 1; border-radius: 4px; background: var(--fill-tertiary); }
  .cella.fatta { background: var(--color-green); }
  .cella.oggi { box-shadow: inset 0 0 0 2px var(--accento); }
  .volumi { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .volume { display: flex; flex-direction: column; gap: 6px; }
  .riga-v { display: flex; justify-content: space-between; }
  .foto { width: 30px; height: 30px; border-radius: 8px; object-fit: cover; }
  .foto.vuota { display: grid; place-items: center; background: var(--fill-tertiary); color: var(--label-secondary); }
</style>
