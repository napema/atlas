// engine.js — motore del follow-along: timer, audio, wake lock.
// Opera su una lista di "step" generica, indipendente dal catalogo esercizi,
// così da poter essere testato con dati finti prima che il catalogo esista.

// Forma di uno step, a titolo di riferimento:
// { titolo: "", durataSec: 30 }

/* ============================================================= il suono ==
   I BIP PASSANO DA UN <audio>, NON DAL WEB AUDIO. È la ragione per cui
   prima non si sentiva niente sull'iPhone.

   Su iOS i due percorsi finiscono in due sessioni audio diverse: il Web
   Audio sta nella categoria "ambient", che l'interruttore Silenzioso
   azzittisce, mentre un elemento <audio> sta in "playback", che lo
   ignora — è il motivo per cui un video in Safari si sente anche con la
   suoneria spenta. Un AudioContext perfettamente sbloccato, dentro il
   gesto giusto, con lo stato "running", resta comunque muto se hai la
   levetta su silenzioso. E la levetta, durante una sessione di mobilità
   la mattina presto, è su silenzioso.

   Le clip non sono file: sono cinque WAV generati qui, una volta, e
   tenuti come data URI. Un asset esterno avrebbe voluto dire una fetch
   che offline può fallire, e cinque file da versionare nel guscio.

   Restano due cose della versione precedente, e servono tutte e due:
     · il Web Audio come RIPIEGO, se il browser rifiuta il play();
     · lo sblocco dentro un gesto dell'utente. Vale anche per gli
       <audio>: il primo play() deve partire da un tocco, se no ogni
       play() successivo viene rifiutato. Qui lo si arma al primo tocco
       sulla pagina, non all'avvio della sessione, così è già fatto molto
       prima che serva.
   ========================================================================= */

// Le cinque voci del motore. Frequenza, durata, volume.
const VOCI = {
  inizio: [1180, 0.12, 0.22],
  fine:   [760,  0.18, 0.22],
  meno3:  [560,  0.09, 0.10],
  meno2:  [700,  0.09, 0.15],
  meno1:  [880,  0.09, 0.22],
};

/**
 * Un tono come file WAV, in un data URI.
 *
 * L'inviluppo non è un vezzo: un'onda che parte e si ferma di colpo fa
 * "click", ed è quel click che si sente al posto della nota.
 */
function wav(freq, durata, guadagno, sr = 22050) {
  const n = Math.round(sr * durata);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const testo = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  testo(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); testo(8, "WAVE");
  testo(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  testo(36, "data"); v.setUint32(40, n * 2, true);

  const attacco = Math.min(0.012 * sr, n / 4);
  const rilascio = Math.min(0.05 * sr, n / 2);
  for (let i = 0; i < n; i++) {
    let a = guadagno;
    if (i < attacco) a *= i / attacco;
    else if (i > n - rilascio) a *= (n - i) / rilascio;
    v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * freq * i / sr) * a * 32767, true);
  }
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return `data:audio/wav;base64,${btoa(s)}`;
}

const banco = {};
let bancoCreato = false;
let bancoArmato = false;

/** play() e stop immediato: è il gesto che dà a QUEL nodo il permesso di
 *  suonare più tardi da un timer. Il permesso su iOS è per elemento, non per
 *  pagina: vanno toccati tutti e cinque. */
function arma(a, muto) {
  try {
    a.muted = muto;
    const p = a.play();
    const spegni = () => {
      try { a.pause(); a.currentTime = 0; } catch { /* non ancora pronto */ }
      a.muted = false;
    };
    // Muto: si lascia partire e si ferma quando il browser conferma, tanto
    // non si sente. Non muto: si ferma SUBITO, senza aspettare la conferma —
    // che arriva decine di millisecondi dopo, e in quelle decine di
    // millisecondi si sentirebbero cinque note in faccia al tocco su
    // «Inizia». Il permesso lo dà la CHIAMATA a play() dentro il gesto, non
    // il fatto che la nota arrivi in fondo.
    if (muto && p?.then) p.then(spegni).catch(() => { a.muted = false; });
    else { spegni(); p?.catch?.(() => {}); }
  } catch { a.muted = false; }
}

/**
 * Prepara le clip e le arma. Da chiamare dentro un gesto dell'utente.
 *
 * Due passaggi, e servono tutti e due. Il primo tocco sulla pagina arma le
 * clip MUTE — a quel punto stai toccando un'altra cosa, e un bip a caso
 * sarebbe un difetto peggiore di quello che stiamo togliendo. Il tocco su
 * «Inizia» le riarma senza muto: se il muto bastasse saremmo a posto già
 * prima, se non basta questo è il gesto giusto per farlo, e non si sente
 * niente lo stesso perché la nota parte da zero e viene fermata subito.
 */
function sbloccaBanco(forte = false) {
  if (!bancoCreato) {
    bancoCreato = true;
    try {
      for (const [nome, [f, d, g]] of Object.entries(VOCI)) {
        const a = new Audio(wav(f, d, g));
        a.preload = "auto";
        banco[nome] = a;
        arma(a, true);
      }
    } catch { /* niente clip: resta il ripiego Web Audio */ }
  }
  if (forte && !bancoArmato) {
    bancoArmato = true;
    for (const a of Object.values(banco)) arma(a, false);
  }
}

// Al primo tocco sulla pagina, ovunque sia. Non all'avvio della sessione:
// così quando serve è già fatto da un pezzo, e non dipende da quale
// pulsante è stato premuto per arrivare fin qui.
for (const evento of ["pointerdown", "touchend", "keydown"]) {
  document.addEventListener(evento, () => sbloccaBanco(false), { once: true, capture: true, passive: true });
}

class FollowAlongEngine {
  constructor({ onTick, onStepChange, onFine } = {}) {
    this.steps = [];
    this.indiceCorrente = 0;
    this.secondiResidui = 0;
    this.inPausa = true;
    this.intervalId = null;
    this.wakeLock = null;
    this.audio = null;

    this.onTick = onTick ?? (() => {});
    this.onStepChange = onStepChange ?? (() => {});
    this.onFine = onFine ?? (() => {});
  }

  carica(steps) {
    this.ferma();
    this.steps = steps;
    this.indiceCorrente = 0;
    this.secondiResidui = steps[0]?.durataSec ?? 0;
    this.onStepChange(this.stepCorrente(), this.indiceCorrente, this.steps.length);
  }

  stepCorrente() {
    return this.steps[this.indiceCorrente] ?? null;
  }

  async avvia() {
    if (this.steps.length === 0) return;
    // PRIMA di ogni altra cosa: `avvia()` parte dal tocco su «Inizia», ed è
    // il gesto migliore che avremo per sbloccare l'audio — da qui in poi i
    // bip scadono da un timer, e un timer non è un gesto. Da cui il `true`.
    this._sbloccaAudio(true);
    this.inPausa = false;
    await this._richiediWakeLock();
    this._tick();
    this.intervalId = setInterval(() => this._tick(), 1000);
  }

  pausa() {
    this.inPausa = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._rilasciaWakeLock();
  }

  ferma() {
    this.pausa();
    this.indiceCorrente = 0;
    this.secondiResidui = 0;
  }

  // Salta al passo successivo senza aspettare il timer (pulsante "Sono pronto").
  avanti() {
    if (this.steps.length === 0) return;
    this._prossimoStep();
  }

  _tick() {
    if (this.inPausa) return;
    this.secondiResidui -= 1;
    this.onTick(this.secondiResidui, this.stepCorrente());

    // 3, 2, 1 — prima del segnale di fine, non insieme.
    if (this.secondiResidui > 0 && this.secondiResidui <= 3) {
      this._contoAllaRovescia(this.secondiResidui);
    }

    if (this.secondiResidui <= 0) {
      // Il suono dipende da cosa sta per iniziare: doppio acuto quando parte
      // la tenuta vera (è il segnale di "vai"), singolo quando finisce.
      this._beep(this.stepCorrente()?.beep === "inizio" ? "inizio" : "fine");
      this._prossimoStep();
    }
  }

  _prossimoStep() {
    this.indiceCorrente += 1;
    if (this.indiceCorrente >= this.steps.length) {
      this.pausa();
      this.onFine();
      return;
    }
    this.secondiResidui = this.steps[this.indiceCorrente].durataSec;
    this.onStepChange(this.stepCorrente(), this.indiceCorrente, this.steps.length);
  }

  /* Lo sblocco vero è al primo tocco sulla pagina — vedi `sbloccaBanco()` in
     cima al file. Qui si richiama comunque, perché «Inizia» è un tocco e
     perché il contesto Web Audio del ripiego va riacceso: dopo un ritorno
     dal background lo si ritrova `suspended`. */
  _sbloccaAudio(forte = false) {
    sbloccaBanco(forte);
    if (this.audio) { this.audio.resume?.().catch(() => {}); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audio = new Ctx();
      this.audio.resume?.().catch(() => {});
      // Un campione muto lungo un istante: su iOS è il gesto che "arma"
      // davvero il contesto, e senza il primo suono vero arriva tagliato.
      const s = this.audio.createBufferSource();
      s.buffer = this.audio.createBuffer(1, 1, 22050);
      s.connect(this.audio.destination);
      s.start(0);
    } catch { /* niente audio: il follow-along resta leggibile a schermo */ }
  }

  /** Una delle cinque voci, eventualmente fra qualche istante. */
  _suona(nome, ritardo = 0) {
    if (ritardo > 0) { setTimeout(() => this._suona(nome), ritardo * 1000); return; }
    const clip = banco[nome];
    if (!clip) { this._tonoWebAudio(...VOCI[nome]); return; }
    try {
      clip.currentTime = 0;
      const p = clip.play();
      // Se il browser rifiuta — permesso mai concesso, elemento non pronto —
      // si ripiega sul Web Audio invece di restare zitti.
      p?.catch?.(() => this._tonoWebAudio(...VOCI[nome]));
    } catch {
      this._tonoWebAudio(...VOCI[nome]);
    }
  }

  /**
   * Il ripiego: lo stesso tono, sintetizzato. Su iPhone col Silenzioso
   * inserito non si sente — è esattamente il motivo per cui non è più la
   * strada principale — ma altrove funziona, e meglio di niente.
   */
  _tonoWebAudio(frequenza, durata, guadagno) {
    const ctx = this.audio;
    if (!ctx || ctx.state === "closed") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(frequenza, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(guadagno, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    osc.start(t);
    osc.stop(t + durata + 0.02);
  }

  _beep(tipo = "fine") {
    this._sbloccaAudio();
    if (tipo === "inizio") {
      this._suona("inizio");
      this._suona("inizio", 0.18);
    } else {
      this._suona("fine");
    }
  }

  /**
   * Gli ultimi tre secondi: tre bip che salgono di tono e di volume.
   *
   * Servono perché il segnale di fine arriva quando è già finita, e per
   * arrivare in fondo a una tenuta con la posizione giusta bisogna sapere
   * quanto manca senza guardare lo schermo — che durante metà di questi
   * esercizi è per terra o dietro le spalle. Tre, non uno: uno solo dice
   * «adesso», tre dicono «sta arrivando», ed è un'informazione diversa.
   */
  _contoAllaRovescia(n) {
    this._sbloccaAudio();
    const voce = { 3: "meno3", 2: "meno2", 1: "meno1" }[n];
    if (voce) this._suona(voce);
  }

  async _richiediWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        this.wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      this.wakeLock = null;
    }
  }

  _rilasciaWakeLock() {
    this.wakeLock?.release?.();
    this.wakeLock = null;
  }
}

export { FollowAlongEngine };

/* ---------------------------------------------------------------------
   Portato da napema/mobility-blueprint senza una modifica. Non dipende dal
   catalogo: opera su una lista di passi qualsiasi, ed è per questo che si
   può provare con dati finti.
   --------------------------------------------------------------------- */
