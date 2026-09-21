<!--
  Il player della sessione, a schermo intero.

  Il motore (tempo, bip, schermo sempre acceso) è `engine.js` della app di
  partenza, e le regole dei dati — quali esercizi, lo streak, lo storico,
  il punto dove riprendere — sono funzioni di `sessione.js`. Qui c'è solo
  la faccia: una schermata sola che cambia contenuto, come l'allenamento
  in corso di Fitness.

  Si guarda da un metro e mezzo, per terra, con le mani occupate: il numero
  dei secondi è enorme, il bottone è largo quanto lo schermo, e cosa fare
  si legge in una riga.
-->
<script lang="ts">
  import { onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { avviso } from "$lib/core/ui";
  import { annuncia } from "$lib/core/bus";
  import { RADICE_SITO } from "$lib/core/config";
  import { getState, updateState } from "$condivisi/mobilita/ponte.js";
  import { FollowAlongEngine } from "$condivisi/mobilita/engine.js";
  import { CLIP } from "$condivisi/mobilita/clip.js";
  import { G1 } from "$condivisi/mobilita/esercizi.js";
  import {
    costruisciSessione, conPreparazione, registraCompletamento, salvaPunto, oggiISO,
  } from "$condivisi/mobilita/sessione.js";

  let { aperto = $bindable(false), tipo = "quotidiano" }: { aperto: boolean; tipo?: string } = $props();

  type Fase = "vuota" | "ripresa" | "collo" | "corso" | "fine";
  let fase = $state<Fase>("vuota");
  let passiLavoro = $state.raw<any[]>([]);
  let totale = $state(0);
  let step = $state<any>(null);
  let residui = $state(0);
  let inPausa = $state(false);
  let avanzamento = $state(0);
  let ripresa = $state<any>(null);
  let esito = $state<{ minuti: number; streak: number } | null>(null);
  let engine: any = null;
  let dialogo: HTMLDialogElement | undefined = $state();

  const nomeLato = (l: string) => (l === "dx" ? "destro" : "sinistro");

  $effect(() => {
    if (!dialogo) return;
    if (aperto && !dialogo.open) { dialogo.showModal(); prepara(); }
    else if (!aperto && dialogo.open) dialogo.close();
  });

  function prepara() {
    const state = getState();
    passiLavoro = costruisciSessione(state, tipo).passi;
    totale = passiLavoro.length;
    esito = null;
    if (!totale) { fase = "vuota"; return; }
    // Lasciata a metà oggi, dello stesso tipo: si offre di riprendere.
    const p = state.sessioneInCorso;
    if (p && p.tipo === tipo && p.data === oggiISO() && p.indice > 0) { ripresa = p; fase = "ripresa"; return; }
    if (!state.programma.avvisoColloMostrato && passiLavoro.some((x) => x.gruppo === "G1")) { fase = "collo"; return; }
    avvia();
  }

  function avvia(da: any = null) {
    const visti = getState().programma.videoVistiObbligatori || [];
    const passi = conPreparazione(passiLavoro, visti);
    engine = new FollowAlongEngine({
      onTick: (r: number) => { residui = Math.max(r, 0); misura(); },
      onStepChange: (s: any) => { step = s; residui = s.durataSec; misura(); },
      onFine: fine,
    });
    engine.carica(passi);
    if (da && da.indice > 0 && da.indice < passi.length) {
      engine.indiceCorrente = da.indice;
      engine.secondiResidui = passi[da.indice].durataSec;
      step = passi[da.indice];
      residui = step.durataSec;
    }
    fase = "corso";
    inPausa = false;
    engine.avvia();
    misura();
  }

  function misura() {
    if (!engine) return;
    const tot = engine.steps.reduce((t: number, s: any) => t + s.durataSec, 0);
    const resto = engine.steps.slice(engine.indiceCorrente + 1).reduce((t: number, s: any) => t + s.durataSec, 0)
      + Math.max(engine.secondiResidui, 0);
    avanzamento = tot ? (tot - resto) / tot : 0;
  }

  function fine() {
    const r = registraCompletamento(passiLavoro, tipo);
    esito = r;
    // L'annuncio che fa spuntare da sé l'abitudine «Mobilità»: nella app
    // nuova non c'è `modulo.js` a ritrasmetterlo dal document al bus.
    annuncia("mobilita:sessione-completata", { data: oggiISO(), tipo, durataMin: r.minuti });
    avviso("Sessione registrata.");
    engine = null;
    fase = "fine";
  }

  function pausa() {
    if (!engine) return;
    if (engine.inPausa) { engine.avvia(); inPausa = false; }
    else { engine.pausa(); inPausa = true; }
  }

  /** Uscire non butta via il lavoro: il punto si salva e la volta dopo si riprende. */
  function chiudi() {
    if (engine && engine.steps.length) { salvaPunto(engine, tipo); engine.ferma(); }
    engine = null;
    step = null;
    aperto = false;
  }

  // Uscire dalla schermata con il player acceso (una notifica, un'altra
  // scheda): il timer non deve restare a girare, e il punto va salvato.
  onDestroy(() => { if (engine?.steps.length) { salvaPunto(engine, tipo); engine.ferma(); } });

  const d = $derived(step ? (step.tipo === "prep" ? step.rif : step) : null);
  const inPrep = $derived(step?.tipo === "prep");
  const stato = $derived(!d ? "" : inPrep ? "Preparati"
    : d.faseRipetuta === "pausa" ? "Rilascia"
    : d.faseRipetuta === "lavoro" ? "Spingi"
    : "Tieni la posizione");
  const clip = $derived(d?.idEsercizio && CLIP.has(d.idEsercizio) ? `${RADICE_SITO}moduli/mobilita/clip/${d.idEsercizio}.mp4` : null);

  const chip = $derived.by(() => {
    if (!d) return [];
    const c: { testo: string; tono?: string }[] = [];
    if (d.fonte) c.push({ testo: d.fonte, tono: "menta" });
    const tag = ({ M: ["Attivo", "menta"], S: ["Passivo", "blu"], R: ["Rilascio", "arancio"] } as Record<string, string[]>)[d.tag];
    if (tag) c.push({ testo: tag[0], tono: tag[1] });
    if (d.badgeExtra) c.push({ testo: d.badgeExtra, tono: "arancio" });
    if (d.lato) c.push({ testo: `Lato ${nomeLato(d.lato)}${d.extra ? " · extra" : ""}`, tono: "blu" });
    if (d.carico) c.push({ testo: `${d.carico} kg`, tono: "arancio" });
    if (d.ripetizioni) c.push({ testo: d.ripetizioni, tono: "arancio" });
    if (d.serve) c.push({ testo: d.serve });
    for (const m of d.muscoli || []) c.push({ testo: m });
    return c;
  });

  let video: HTMLVideoElement | undefined = $state();
  // Su iOS `autoplay` non basta quando il video cambia a schermo acceso: il
  // play va chiesto, e se viene rifiutato resta il primo fotogramma, che è
  // comunque la posizione dell'esercizio.
  $effect(() => { clip; video?.play?.().catch(() => {}); });
</script>

<dialog bind:this={dialogo} class="player" class:prep={inPrep} oncancel={(e) => { e.preventDefault(); chiudi(); }}>
  <div class="testa">
    <Pulsante variante="vetro" misura="media" tondo icona="chiudi" etichetta="Esci" onclick={chiudi} />
    <span class="text-subheadline semibold cifre">{fase === "corso" && d ? `${d.numero} di ${totale}` : ""}</span>
    {#if fase === "corso"}
      <Pulsante variante="vetro" misura="media" tondo icona={inPausa ? "play" : "pausa"} etichetta={inPausa ? "Riprendi" : "Pausa"} onclick={pausa} />
    {:else}
      <span class="vuoto"></span>
    {/if}
  </div>
  {#if fase === "corso"}
    <div class="avanzamento"><i style:width="{avanzamento * 100}%"></i></div>
  {/if}

  {#if fase === "vuota"}
    <div class="centro">
      <p class="text-title3">Nessun esercizio per questa sessione.</p>
    </div>
  {:else if fase === "ripresa"}
    <div class="centro" in:fade>
      <span class="segno blu"><Icona nome="orologio" misura={34} tratto={1.8} /></span>
      <h2 class="text-title1">Avevi lasciato a metà</h2>
      <p class="text-body secondario">Eri all'esercizio <b>{Math.min(ripresa.numero || 1, totale)} di {totale}</b>: {passiLavoro[Math.min((ripresa.numero || 1) - 1, totale - 1)]?.nome}.</p>
    </div>
    <div class="piede">
      <Pulsante variante="pieno" larga onclick={() => avvia(ripresa)}>Riprendi da qui</Pulsante>
      <Pulsante variante="grigio" larga onclick={() => { updateState((s: any) => { s.sessioneInCorso = null; }); avvia(); }}>Ricomincia da capo</Pulsante>
    </div>
  {:else if fase === "collo"}
    <div class="centro" in:fade>
      <span class="segno arancio"><Icona nome="avviso" misura={34} tratto={1.8} /></span>
      <h2 class="text-title1">Prima del modulo collo</h2>
      <p class="text-body">{G1.avviso}</p>
      <p class="text-footnote secondario">Intensità {G1.intensita}. Compare una sola volta.</p>
    </div>
    <div class="piede">
      <Pulsante variante="pieno" larga onclick={() => { updateState((s: any) => { s.programma.avvisoColloMostrato = true; }); avvia(); }}>Ho capito, continua</Pulsante>
    </div>
  {:else if fase === "fine" && esito}
    <div class="centro" in:fade>
      <span class="segno verde"><Icona nome="spunta" misura={38} tratto={2.6} /></span>
      <h2 class="text-large-title">Fatta</h2>
      <p class="text-body secondario">{esito.minuti} minuti · {esito.streak} {esito.streak === 1 ? "giorno" : "giorni"} di fila.</p>
      <p class="text-footnote secondario">Due buchi a settimana sono dentro il piano.</p>
    </div>
    <div class="piede"><Pulsante variante="pieno" larga onclick={() => (aperto = false)}>Chiudi</Pulsante></div>
  {:else if fase === "corso" && d}
    <div class="scorre">
      {#if clip}
        <div class="media">
          {#key clip}
            <!-- muted + playsinline: su iOS un video parte da solo SOLO così.
                 loop: sono clip da dieci secondi su tenute da quaranta. -->
            <video bind:this={video} src={clip} muted loop playsinline autoplay preload="auto" disablepictureinpicture
              onerror={(e) => ((e.currentTarget as HTMLElement).style.display = "none")}></video>
          {/key}
        </div>
      {/if}

      <div class="timer">
        <div class="titoli">
          <span class="stato text-footnote semibold">{stato}</span>
          <h2 class="text-title2">{d.nome}{d.lato ? ` — ${nomeLato(d.lato)}` : ""}</h2>
        </div>
        <span class="secondi cifre">{residui}</span>
      </div>

      {#if step.cambioLato}
        <div class="cambio text-subheadline"><Icona nome="freccia" misura={18} tratto={2.2} />Cambia lato: ora il {nomeLato(d.lato)}</div>
      {/if}

      {#if chip.length}
        <div class="chip">
          {#each chip as c, i (i)}<span class="pastiglia text-footnote" data-tono={c.tono}>{c.testo}</span>{/each}
        </div>
      {/if}

      {#if d.passi?.length}
        <ol class="passi text-body">
          {#each d.passi as t, i (i)}<li>{t}</li>{/each}
        </ol>
      {/if}
      {#if d.nota}<p class="text-footnote secondario">{d.nota}</p>{/if}
    </div>
    <div class="piede">
      <Pulsante variante="pieno" larga onclick={() => engine?.avanti()}>{inPrep ? "Sono pronto" : "Avanti"}</Pulsante>
    </div>
  {/if}
</dialog>

<style>
  .player {
    position: fixed; inset: 0; width: 100%; height: 100dvh; max-width: none; max-height: none;
    margin: 0; padding: env(safe-area-inset-top, 0px) 0 0; border: 0;
    background: var(--bg-grouped-primary); color: var(--label-primary);
    --colore-fase: var(--accento);
  }
  .player[open] { display: flex; flex-direction: column; }
  .player.prep { --colore-fase: var(--color-orange); }
  .player::backdrop { background: #000; }

  .testa {
    flex: none; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center;
    padding: var(--space-2) var(--content-inset); text-align: center;
    max-width: var(--readable-width); width: 100%; margin: 0 auto;
  }
  .vuoto { width: 44px; }
  .avanzamento { flex: none; height: 3px; background: var(--fill-tertiary); }
  .avanzamento i { display: block; height: 100%; background: var(--colore-fase); transition: width 1s linear, background-color var(--duration-normal); }

  .scorre, .centro {
    flex: 1; min-height: 0; overflow-y: auto;
    width: 100%; max-width: var(--readable-width); margin: 0 auto;
    padding: var(--space-4) var(--content-inset);
    display: flex; flex-direction: column; gap: var(--space-4);
  }
  .centro { justify-content: center; align-items: center; text-align: center; gap: var(--space-3); }
  .segno { display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; margin-bottom: var(--space-2); }
  .segno.verde { color: #fff; background: var(--color-green); }
  .segno.blu { color: var(--color-blue); background: color-mix(in srgb, var(--color-blue) 16%, transparent); }
  .segno.arancio { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent); }

  /* Nessun ritaglio: un video ritagliato in verticale taglia i piedi, e i
     piedi sono metà degli esercizi. */
  .media { background: #000; border-radius: var(--radius-xxl); overflow: hidden; aspect-ratio: 16 / 10; }
  video { width: 100%; height: 100%; object-fit: contain; display: block; }

  .timer { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-4); }
  .titoli { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .stato { color: var(--colore-fase); text-transform: uppercase; letter-spacing: 0.4px; }
  .secondi {
    flex: none; font-family: var(--font-display); font-weight: var(--weight-bold);
    font-size: 84px; line-height: 80px; letter-spacing: -2px; color: var(--colore-fase);
    font-variant-numeric: tabular-nums;
  }
  .cambio {
    display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-xl); font-weight: var(--weight-semibold);
    color: var(--color-blue); background: color-mix(in srgb, var(--color-blue) 14%, transparent);
  }
  .chip { display: flex; flex-wrap: wrap; gap: 6px; }
  .pastiglia { padding: 4px 10px; border-radius: var(--radius-full); background: var(--fill-tertiary); color: var(--label-secondary); font-weight: var(--weight-medium); }
  .pastiglia[data-tono="menta"] { color: var(--color-mint); background: color-mix(in srgb, var(--color-mint) 16%, transparent); }
  .pastiglia[data-tono="blu"] { color: var(--color-blue); background: color-mix(in srgb, var(--color-blue) 16%, transparent); }
  .pastiglia[data-tono="arancio"] { color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent); }
  .passi { padding-left: 22px; list-style: decimal; display: flex; flex-direction: column; gap: var(--space-2); }

  .piede {
    flex: none; width: 100%; max-width: var(--readable-width); margin: 0 auto;
    padding: var(--space-3) var(--content-inset) calc(env(safe-area-inset-bottom, 0px) + var(--space-4));
    display: flex; flex-direction: column; gap: var(--space-2);
  }
</style>
