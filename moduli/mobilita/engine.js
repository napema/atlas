// engine.js — motore del follow-along: timer, audio, wake lock.
// Opera su una lista di "step" generica, indipendente dal catalogo esercizi,
// così da poter essere testato con dati finti prima che il catalogo esista.

// Forma di uno step, a titolo di riferimento:
// { titolo: "", durataSec: 30 }

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
    // PRIMA di ogni altra cosa: `avvia()` parte dal tocco su «Inizia», ed
    // è l'unico momento in cui il browser lascia sbloccare l'audio. Farlo
    // dopo, o dentro il beep, vuol dire non farlo.
    this._sbloccaAudio();
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

  /* ============================================================= il suono ==
     UN SOLO AudioContext, creato al primo tocco dell'utente.

     Prima se ne creava uno nuovo dentro `_beep()`, a ogni segnale, e per
     questo non si è mai sentito niente. Un AudioContext nato fuori da un
     gesto dell'utente parte `suspended` — su iOS sempre, su Chrome quasi
     sempre — e resta muto: il beep scade da un timer, non da un tocco,
     quindi ogni contesto nasceva già zittito. Si aprivano decine di
     contesti muti uno dopo l'altro, e il browser ne consente pochi: dopo
     un po' fallivano anche di creare, in silenzio, dentro il `catch`.

     Adesso il contesto è uno solo e viene SBLOCCATO da `avvia()`, che parte
     dal tocco su «Inizia». Da lì in poi suona, anche a schermo bloccato.
     ========================================================================= */

  _sbloccaAudio() {
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

  /**
   * Un tono. `guadagno` è il volume — è quello che rende i tre conteggi
   * finali diversi fra loro anche a occhi chiusi.
   */
  _tono(frequenza, ritardo, durata, guadagno = 0.22) {
    const ctx = this.audio;
    if (!ctx || ctx.state === "closed") return;
    const t = ctx.currentTime + ritardo;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(frequenza, t);
    // Attacco e rilascio brevi invece di un gradino secco: un'onda che parte
    // e si ferma di colpo fa "click", ed è quel click che si sente al posto
    // della nota.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(guadagno, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    osc.start(t);
    osc.stop(t + durata + 0.02);
  }

  _beep(tipo = "fine") {
    this._sbloccaAudio();
    if (tipo === "inizio") {
      this._tono(1180, 0, 0.12);
      this._tono(1180, 0.18, 0.12);
    } else {
      this._tono(760, 0, 0.18);
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
    const scala = { 3: [560, 0.10], 2: [700, 0.15], 1: [880, 0.22] }[n];
    if (scala) this._tono(scala[0], 0, 0.09, scala[1]);
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
