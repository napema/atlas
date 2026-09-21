<!--
  Mobilità, oggi. Non chiede quale programma seguire: lo decide. L'unica
  domanda è «hai corso oggi?», perché è l'unica cosa che l'app non può
  sapere da sola.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { daISO, GIORNI_INIZIALI } from "$lib/core/ui";
  import { getState, updateState } from "$condivisi/mobilita/ponte.js";
  import {
    oggiISO, addGiorni, costruisciSessione, riepilogoModuli, settimanaEffettiva,
    tipoDelGiorno, streakAncoraValida, giornoSettimana,
  } from "$condivisi/mobilita/sessione.js";
  import { fasePerSettimana, rotazionePerSettimana, GRUPPI, PROGRESSIONE } from "$condivisi/mobilita/esercizi.js";

  let { oninizia }: { oninizia: (tipo: string) => void } = $props();

  const NOMI_TIPO: Record<string, { nome: string; perche: string }> = {
    "post-corsa": { nome: "Post-corsa", perche: "Hai corso: questa sostituisce il quotidiano, non si somma." },
    quotidiano: { nome: "Quotidiano", perche: "Sul tappeto, la sera. Non deve farti sudare." },
    loaded: { nome: "Loaded mobility", perche: "È il giorno di palestra. È allenamento vero: mai il giorno dopo le gambe." },
    minima: { nome: "Dose minima", perche: "Per i giorni storti. Meglio due minuti che zero." },
  };
  const minuti = (sec: number) => Math.max(1, Math.round(sec / 60));

  const d = $derived.by(() => {
    dati.versione;
    const state = getState();
    const oggi = oggiISO();
    const gc = state.giornoCorrente?.data === oggi ? state.giornoCorrente : null;
    const haCorso = Boolean(gc?.haCorso);
    const tipo = gc?.forza || tipoDelGiorno(state, haCorso);
    const { passi } = costruisciSessione(state, tipo);
    const settimana = settimanaEffettiva(state);
    const fase = fasePerSettimana(settimana);
    const inizio = addGiorni(oggi, -giornoSettimana(oggi));
    const fatte = new Set(state.storicoSessioni.map((s: any) => s.data));
    const giornoPalestra = state.programma.giornoPalestra ?? 2;
    return {
      oggi, haCorso, tipo, passi, settimana, fase,
      moduli: riepilogoModuli(passi),
      durata: passi.reduce((t: number, p: any) => t + p.durataSec, 0),
      fattaOggi: fatte.has(oggi),
      giorni: Array.from({ length: 7 }, (_, i) => {
        const iso = addGiorni(inizio, i);
        return { iso, fatta: fatte.has(iso), futuro: iso > oggi, palestra: i === giornoPalestra };
      }),
      streakValida: streakAncoraValida(state),
      gruppi: rotazionePerSettimana(settimana).gruppi.map((g: string) => GRUPPI[g]?.nome).filter(Boolean).join(" · "),
    };
  });

  const nFatte = $derived(d.giorni.filter((g) => g.fatta).length);

  function corso(v: string) {
    updateState((s: any) => { s.giornoCorrente = { data: d.oggi, haCorso: v === "si", forza: null }; });
  }
  function minima() {
    updateState((s: any) => { s.giornoCorrente = { data: d.oggi, haCorso: d.haCorso, forza: "minima" }; });
  }
</script>

<Sezione titolo="Questa settimana" piede="Il puntino segna il giorno di palestra.{d.streakValida ? '' : ' Più di 3 giorni fermi: lo streak riparte, il programma no.'}">
  {#snippet coda()}<span class="text-subheadline secondario cifre">{nFatte} di 7</span>{/snippet}
  <ol class="settimana">
    {#each d.giorni as g, i (g.iso)}
      <li class:oggi={g.iso === d.oggi} class:fatta={g.fatta} class:futuro={g.futuro}>
        <span class="lettera">{GIORNI_INIZIALI[i]}</span>
        <span class="cerchio cifre">
          {#if g.fatta}<Icona nome="spunta" misura={16} tratto={2.8} />{:else}{daISO(g.iso).getDate()}{/if}
        </span>
        <span class="segno" class:visibile={g.palestra}></span>
      </li>
    {/each}
  </ol>
</Sezione>

<Sezione titolo="Hai corso oggi?" piede="È l'unica cosa che devi dirmi: il resto lo decido io.">
  <div class="blocco">
    <Segmenti
      opzioni={[{ id: "no", testo: "No" }, { id: "si", testo: "Sì, ho corso" }]}
      valore={d.haCorso ? "si" : "no"}
      onscelta={corso}
      etichetta="Hai corso oggi?"
    />
  </div>
</Sezione>

<Sezione titolo={NOMI_TIPO[d.tipo]?.nome ?? "Sessione"}>
  <div class="eroe">
    <div class="cifra-riga">
      <span class="cifra cifre">{minuti(d.durata)}</span><span class="text-title3 secondario">min</span>
    </div>
    <span class="text-subheadline secondario">{d.passi.length} esercizi{d.fattaOggi ? " · già fatta oggi" : ""}</span>
    <p class="text-subheadline perche">{NOMI_TIPO[d.tipo]?.perche}</p>
  </div>
  {#each d.moduli as m (m.nome)}
    <Riga titolo={m.nome} sottotitolo={m.muscoli.slice(0, 4).join(" · ")} valore="{minuti(m.durataSec)} min" />
  {/each}
</Sezione>

<div class="azioni">
  <Pulsante variante="pieno" larga icona="play" onclick={() => oninizia(d.tipo)}>{d.fattaOggi ? "Rifai" : "Inizia"}</Pulsante>
  {#if d.tipo !== "minima"}
    <Pulsante variante="grigio" larga onclick={minima}>Non ce la faccio — 2 minuti</Pulsante>
  {/if}
</div>

<Sezione
  titolo="Il programma nel tempo"
  piede="Il tempo sale solo se la settimana precedente è stata fatta almeno al 70%. Adesso: {d.fase.minuti} minuti, gruppi sopra soglia collo · {d.gruppi}."
>
  {#each PROGRESSIONE as f (f.settimane[0])}
    {@const ora = f === d.fase}
    <div class="fase avvolge" class:ora class:passata={d.settimana > f.settimane[1]}>
      <Riga>
        {#snippet inizio()}
          <span class="sett cifre">{f.settimane[1] === 99 ? `${f.settimane[0]}+` : `${f.settimane[0]}–${f.settimane[1]}`}</span>
        {/snippet}
        <span class="text-subheadline">{f.note}</span>
        {#snippet fine()}<span class="cifre min">{f.minuti} min</span>{/snippet}
      </Riga>
    </div>
  {/each}
</Sezione>

<style>
  .settimana { display: grid; grid-template-columns: repeat(7, 1fr); padding: var(--space-4) var(--space-2); }
  .settimana li { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .lettera { font-size: var(--text-caption2); font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .oggi .lettera { color: var(--label-primary); }
  .cerchio {
    display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
    background: var(--fill-quaternary); font-size: var(--text-subheadline); font-weight: var(--weight-semibold);
  }
  .fatta .cerchio { background: var(--color-green); color: #fff; }
  .futuro .cerchio { background: none; color: var(--label-tertiary); }
  .oggi:not(.fatta) .cerchio { box-shadow: inset 0 0 0 2px var(--accento); }
  .segno { width: 5px; height: 5px; border-radius: 50%; background: transparent; }
  .segno.visibile { background: var(--accento); }

  .blocco { padding: var(--space-4); }
  .eroe { padding: var(--space-4); display: flex; flex-direction: column; gap: 2px; border-bottom: 0.5px solid var(--separator); }
  .cifra-riga { display: flex; align-items: baseline; gap: var(--space-2); }
  .cifra { font-family: var(--font-display); font-size: 56px; line-height: 60px; font-weight: var(--weight-bold); color: var(--accento); }
  .perche { margin-top: var(--space-2); color: var(--label-secondary); }
  .azioni { display: flex; flex-direction: column; gap: var(--space-2); margin-top: calc(-1 * var(--space-2)); }

  .fase { --inizio-l: 44px; }
  .sett { font-size: var(--text-footnote); font-weight: var(--weight-semibold); color: var(--label-secondary); }
  .min { color: var(--label-secondary); }
  .ora .sett, .ora .min { color: var(--accento); }
  .passata { opacity: 0.45; }
</style>
