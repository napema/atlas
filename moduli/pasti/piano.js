// moduli/pasti/piano.js — il generatore della settimana.
//
// Qui dentro non c'è intelligenza artificiale, e non serve. Il piano della
// settimana non è un problema di creatività: è un giro di `for` su una lista
// di pasti con tre vincoli sopra. La chat di Claude serve a POPOLARE il
// database, ogni tanto; la settimana la fa l'app, da sola, anche offline.
//
// ------------------------------------------------------------------------
// LA COSA PIÙ IMPORTANTE DI QUESTO FILE: È DETERMINISTICO.
//
// Il piano si genera in locale, su iPhone e su PC, potenzialmente nello
// stesso minuto. Con `Math.random()` i due dispositivi produrrebbero due
// menù diversi per la STESSA settimana: stesso id di record, contenuti
// diversi, e la fusione ne sceglierebbe uno a caso. In pratica l'utente
// vedrebbe la cena di giovedì cambiare da sola passando dal telefono al
// computer, senza aver toccato niente.
//
// Quindi: generatore pseudocasuale seminato con l'id della settimana. Stessa
// settimana, stesso database, stesso piano, su qualunque dispositivo.
//
// Resta un caso scoperto e vale la pena saperlo: se un dispositivo ha già
// sincronizzato un pasto nuovo e l'altro no, i due database sono diversi e i
// piani possono divergere. L'id del record però è lo stesso, quindi non
// nascono doppioni — vince il più recente e i due convergono al giro dopo.
// ------------------------------------------------------------------------

import {
  FASCE, ID_FASCE,
  profilo, pastiPerFascia, pasto, pianoSettimana, salvaPiano,
  lunediDi, giorniSettimana, regimeDi, idPiano,
} from "./dati.js";
import { bersagli, macroDi } from "./calcolo.js";
import { oggiISO } from "../../core/ui.js";

/* Quanti giorni devono passare prima di rivedere lo stesso piatto. Tre è il
   punto in cui la varietà smette di costare: con quindici cene disponibili
   un vincolo più largo comincia a escludere i piatti migliori. */
export const MIN_GIORNI = 3;

/* =========================================================================
   IL CASO — seminato, quindi riproducibile
   ========================================================================= */

/** Hash a 32 bit di una stringa. Serve solo a dare un seme al generatore. */
function seme(testo) {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: piccolo, veloce, e soprattutto sempre uguale a sé stesso. */
function caso(s) {
  let a = s >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================================================================
   LA GENERAZIONE
   ========================================================================= */

const tagPrincipale = (p) => (p?.tag || [])[0] || "";

/**
 * Costruisce il piano di una settimana. Non scrive niente: restituisce e basta.
 *
 * Il criterio, in ordine di peso:
 *
 *  1. NON RIPETERE lo stesso piatto entro tre giorni. È il vincolo che pesa
 *     di più perché è quello che l'utente nota: due volte la stessa cena in
 *     quattro giorni fa sembrare che l'app non stia facendo niente.
 *  2. NON DUE GIORNI DI FILA la stessa proteina principale. Manzo lunedì e
 *     manzo martedì rispettano il primo vincolo e sbagliano lo stesso.
 *  3. AVVICINARSI ALLE PROTEINE del giorno. Le calorie si sistemano con gli
 *     spuntini; le proteine no, e in massa sono il numero che conta.
 */
export function generaSettimana(lunedi = lunediDi(), { b = bersagli() } = {}) {
  const rnd = caso(seme(idPiano(lunedi)));
  const p = profilo();
  const giorni = {};

  // Quando ogni piatto è stato usato l'ultima volta, in indice di giorno.
  const ultimoUso = new Map();
  let tagIeri = new Set();

  giorniSettimana(lunedi).forEach((iso, indice) => {
    const daRiempire = ID_FASCE.filter((f) => regimeDi(iso, f) === "casa");
    if (!daRiempire.length) { giorni[iso] = {}; tagIeri = new Set(); return; }

    // Le proteine che devono venire da casa: il bersaglio meno quello che
    // arriva comunque dalle fasce mangiate fuori.
    let restaProt = b.p;
    for (const f of ID_FASCE) {
      if (regimeDi(iso, f) === "fuori") restaProt -= macroDi(p.stimeFuori?.[f]).p;
    }

    const scelte = {};
    const tagOggi = new Set();
    daRiempire.forEach((fascia, i) => {
      const quota = restaProt / (daRiempire.length - i);
      const candidati = pastiPerFascia(fascia).filter((c) => !(p.veti || []).includes(c.id));
      if (!candidati.length) { scelte[fascia] = null; return; }

      let migliore = null, punteggioMigliore = -Infinity;
      for (const c of candidati) {
        const distanza = ultimoUso.has(c.id) ? indice - ultimoUso.get(c.id) : 99;
        let punti = 0;
        if (distanza < MIN_GIORNI) punti -= 100 * (MIN_GIORNI - distanza);
        if (tagIeri.has(tagPrincipale(c))) punti -= 25;
        if (tagOggi.has(tagPrincipale(c))) punti -= 40;   // nemmeno due volte in un giorno
        punti -= Math.abs(quota - c.p) / 8;
        punti += rnd() * 6;                                // rompe i pareggi, sempre allo stesso modo
        if (punti > punteggioMigliore) { punteggioMigliore = punti; migliore = c; }
      }

      scelte[fascia] = migliore?.id || null;
      if (migliore) {
        ultimoUso.set(migliore.id, indice);
        tagOggi.add(tagPrincipale(migliore));
        restaProt -= migliore.p;
      }
    });

    giorni[iso] = scelte;
    tagIeri = tagOggi;
  });

  return giorni;
}

/* =========================================================================
   LA SCRITTURA
   ========================================================================= */

/**
 * Genera e salva il piano di una settimana, se serve.
 *
 * ⚠️ NON CHIAMARLA PRIMA CHE IL CANALE ABBIA LETTO. È una scrittura che
 * parte da sé, cioè la categoria che in ATLAS ha già resuscitato dati
 * cancellati due volte. Un telefono appena installato che genera la
 * settimana prima di aver letto il repo sovrascrive il piano che sull'altro
 * dispositivo era già stato sistemato a mano. Il guardiano sta in
 * `modulo.js`, sopra la chiamata:
 *
 *     if (canale.letturaFatta || canale.stato === "off") assicuraPiano();
 *
 * Non tocca un piano `bloccato`: appena l'utente cambia un pasto a mano,
 * quella settimana è sua e il generatore non ci torna più sopra.
 */
export function assicuraPiano(lunedi = lunediDi(), { forza = false } = {}) {
  const esistente = pianoSettimana(lunedi);
  if (esistente && !forza) return { creato: false, motivo: "c'era già" };
  if (esistente?.bloccato && !forza) return { creato: false, motivo: "modificato a mano" };

  const giorni = generaSettimana(lunedi);
  const quanti = Object.values(giorni).reduce((t, g) => t + Object.values(g).filter(Boolean).length, 0);
  if (!quanti) return { creato: false, motivo: "nessun pasto disponibile" };

  salvaPiano(lunedi, giorni);
  return { creato: true, pasti: quanti };
}

/**
 * La domenica pianifica la settimana dopo, non solo quella corrente.
 *
 * È il gesto che l'utente ha chiesto — «ogni domenica plannare la settimana»
 * — e l'unico momento in cui guardare avanti ha senso: di martedì, il piano
 * della settimana prossima è solo rumore.
 */
export function assicuraPianiUtili(oggi = oggiISO()) {
  const esiti = [{ lunedi: lunediDi(oggi), ...assicuraPiano(lunediDi(oggi)) }];
  const d = new Date(`${oggi}T12:00:00`);
  if (d.getDay() === 0) {                       // domenica
    const prossimo = new Date(d.getTime() + 86400000).toISOString().slice(0, 10);
    esiti.push({ lunedi: prossimo, ...assicuraPiano(prossimo) });
  }
  return esiti;
}

/** Rigenera una settimana buttando via quella che c'era. Sempre su richiesta. */
export const rigenera = (lunedi) => assicuraPiano(lunedi, { forza: true });
