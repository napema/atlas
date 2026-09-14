// moduli/allenamenti/fit.js — scrive un allenamento nel formato .FIT.
//
// PERCHÉ ESISTE QUESTO FILE. Garmin Connect non ha nessun modo di ricevere
// un allenamento da un link o da un testo: l'unica porta d'ingresso è un
// file `.FIT`, che è binario e va costruito byte per byte. Niente libreria —
// regola 8 alla radice — quindi sta tutto qui: un centinaio di righe, di cui
// la metà sono le tabelle del formato.
//
// STRUTTURA DEL FILE
//
//   intestazione  14 byte, con il suo CRC
//   record        una DEFINIZIONE che descrive i campi, poi i DATI
//   CRC finale    2 byte su tutto quello che c'è prima
//
// Il CRC non è una formalità: con un CRC sbagliato Garmin rifiuta il file
// senza dire perché, e non c'è modo di capirlo guardando i byte.
//
// I MESSAGGI CHE SERVONO sono tre soli: `file_id` (che tipo di file è),
// `workout` (nome e sport), e un `workout_step` per ogni passo.

/* ============================================================== il CRC == */

const TAB_CRC = [
  0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
  0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
];

/** Il CRC-16 del formato FIT: mezzo byte alla volta, tabella sua. */
export function crc16(byte) {
  let crc = 0;
  for (const b of byte) {
    let t = TAB_CRC[crc & 0xF];
    crc = ((crc >> 4) & 0x0FFF) ^ t ^ TAB_CRC[b & 0xF];
    t = TAB_CRC[crc & 0xF];
    crc = ((crc >> 4) & 0x0FFF) ^ t ^ TAB_CRC[(b >> 4) & 0xF];
  }
  return crc & 0xFFFF;
}

/* ========================================================== lo scrittore = */

class Nastro {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 0xFF); return this; }
  u16(v) { this.b.push(v & 0xFF, (v >> 8) & 0xFF); return this; }
  u32(v) { this.b.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); return this; }
  /** Una stringa FIT è UTF-8 con lo zero in fondo, tagliata alla misura. */
  str(s, n) {
    const byte = new TextEncoder().encode(String(s ?? ""));
    for (let i = 0; i < n - 1; i++) this.b.push(i < byte.length ? byte[i] : 0);
    this.b.push(0);
    return this;
  }
  get array() { return Uint8Array.from(this.b); }
}

// I tipi base del formato. Il bit alto dice «numero», e serve al lettore per
// sapere che l'ordine dei byte conta.
const T = { enum: 0x00, uint8: 0x02, uint16: 0x84, uint32: 0x86, string: 0x07, uint32z: 0x8C };

const NOME_MAX = 32;        // byte, zero finale compreso

/** Il tempo FIT parte dal 31 dicembre 1989, non dal 1970. */
const ORIGINE_FIT = Date.UTC(1989, 11, 31) / 1000;
const oraFit = (d = new Date()) => Math.floor(d.getTime() / 1000) - ORIGINE_FIT;

/* ---------------------------------------------- le tabelle del profilo -- */

const DURATA = { tempo: 0, distanza: 1, aperto: 5, ripeti: 6 };
const INTENSITA = { active: 0, rest: 1, warmup: 2, cooldown: 3, recovery: 4, interval: 5, other: 6 };
const BERSAGLIO = { aperto: 2, velocita: 0 };

/** Da secondi al km a millimetri al secondo, che è l'unità del formato. */
const mmSec = (secPerKm) => Math.round((1000 / secPerKm) * 1000);

/* ============================================== i passi, appiattiti ===== */

/**
 * I passi annidati diventano una sequenza piatta con i passi di RIPETIZIONE
 * in mezzo, che è l'unico modo in cui il formato sa esprimere un ciclo:
 * un passo speciale che dice «torna all'indice N, ancora M volte».
 */
function appiattisci(passi) {
  const fuori = [];
  for (const p of passi) {
    if (p.tipo !== "ripeti") { fuori.push(p); continue; }
    const daQui = fuori.length;
    for (const dentro of p.passi) fuori.push(dentro);
    fuori.push({ tipo: "ripeti", daIndice: daQui, volte: p.volte });
  }
  return fuori;
}

/* ================================================= il file, finalmente == */

/**
 * Costruisce il file .FIT di un allenamento di corsa.
 *
 * @param {string} nome   il nome che comparirà sull'orologio
 * @param {Array}  passi  quelli di passi.js
 * @returns {Uint8Array}
 */
export function fileAllenamento(nome, passi) {
  const piatti = appiattisci(passi);
  const rec = new Nastro();

  /* --- file_id: dice che questo è un allenamento e non un'attività --- */
  rec.u8(0x40).u8(0).u8(0).u16(0).u8(5)
    .u8(0).u8(1).u8(T.enum)        // type
    .u8(1).u8(2).u8(T.uint16)      // manufacturer
    .u8(2).u8(2).u8(T.uint16)      // product
    .u8(3).u8(4).u8(T.uint32z)     // serial_number
    .u8(4).u8(4).u8(T.uint32);     // time_created
  rec.u8(0x00).u8(5)               // 5 = workout
    .u16(255)                      // 255 = «development», che è quello che siamo
    .u16(0)
    .u32(0x41544C53)               // "ATLS", un seriale che non è zero
    .u32(oraFit());

  /* --- workout: nome, sport, quanti passi --- */
  rec.u8(0x41).u8(0).u8(0).u16(26).u8(4)
    .u8(8).u8(NOME_MAX).u8(T.string)   // wkt_name
    .u8(4).u8(1).u8(T.enum)            // sport
    .u8(5).u8(4).u8(T.uint32z)         // capabilities
    .u8(6).u8(2).u8(T.uint16);         // num_valid_steps
  rec.u8(0x01).str(nome, NOME_MAX)
    .u8(1)                             // 1 = corsa
    .u32(0)
    .u16(piatti.length);

  /* --- workout_step: uno per passo ---
     NOVE campi, e il numero va contato a mano ogni volta che se ne tocca
     uno. Qui c'era scritto otto: il lettore si fermava all'ottavo, prendeva
     i tre byte del nono per l'inizio del record successivo e da lì in poi
     leggeva spazzatura. Garmin avrebbe rifiutato il file senza dire perché —
     ed è esattamente il motivo per cui questo file si prova rileggendolo. */
  rec.u8(0x42).u8(0).u8(0).u16(27).u8(9)
    .u8(254).u8(2).u8(T.uint16)   // message_index
    .u8(0).u8(NOME_MAX).u8(T.string)   // wkt_step_name
    .u8(1).u8(1).u8(T.enum)       // duration_type
    .u8(2).u8(4).u8(T.uint32)     // duration_value
    .u8(3).u8(1).u8(T.enum)       // target_type
    .u8(4).u8(4).u8(T.uint32)     // target_value
    .u8(5).u8(4).u8(T.uint32)     // custom_target_value_low
    .u8(6).u8(4).u8(T.uint32)     // custom_target_value_high
    .u8(7).u8(1).u8(T.enum);      // intensity

  piatti.forEach((p, i) => {
    rec.u8(0x02).u16(i);

    if (p.tipo === "ripeti") {
      // Il passo di ripetizione: `duration_value` è l'indice a cui tornare e
      // `target_value` quante volte in tutto. Non ha un'intensità sua.
      rec.str("Ripeti", NOME_MAX)
        .u8(DURATA.ripeti).u32(p.daIndice)
        .u8(BERSAGLIO.aperto).u32(p.volte)
        .u32(0).u32(0)
        .u8(INTENSITA.other);
      return;
    }

    rec.str(p.nome || nomeAutomatico(p), NOME_MAX);

    if (p.tipo === "tempo") rec.u8(DURATA.tempo).u32(p.secondi * 1000);   // millisecondi
    else if (p.tipo === "distanza") rec.u8(DURATA.distanza).u32(p.metri * 100);  // centimetri
    else rec.u8(DURATA.aperto).u32(0);

    if (p.passoSec) {
      // Il bersaglio è una FINESTRA, non un valore: correre esattamente a
      // 4:30/km non lo fa nessuno, e un orologio che bippa a ogni scarto di
      // un secondo si spegne. Dieci secondi al km per lato sono la tolleranza
      // con cui si corre davvero.
      rec.u8(BERSAGLIO.velocita).u32(0)
        .u32(mmSec(p.passoSec + 10))
        .u32(mmSec(p.passoSec - 10));
    } else {
      rec.u8(BERSAGLIO.aperto).u32(0).u32(0).u32(0);
    }

    rec.u8(INTENSITA[p.intensita] ?? INTENSITA.active);
  });

  /* --- l'intestazione, che deve sapere quanto pesano i record --- */
  const dati = rec.array;
  const testa = new Nastro();
  testa.u8(14).u8(0x20).u16(2140).u32(dati.length).u8(0x2E).u8(0x46).u8(0x49).u8(0x54);
  const crcTesta = crc16(testa.array);
  testa.u16(crcTesta);

  const tutto = new Uint8Array(14 + dati.length + 2);
  tutto.set(testa.array, 0);
  tutto.set(dati, 14);
  const finale = crc16(tutto.subarray(0, 14 + dati.length));
  tutto[14 + dati.length] = finale & 0xFF;
  tutto[15 + dati.length] = (finale >> 8) & 0xFF;
  return tutto;
}

const nomeAutomatico = (p) =>
  p.tipo === "distanza" ? (p.metri >= 1000 ? `${p.metri / 1000} km` : `${p.metri} m`)
  : p.tipo === "tempo" ? (p.secondi % 60 === 0 ? `${p.secondi / 60} min` : `${p.secondi} s`)
  : "Corri";

/**
 * Consegna il file al telefono.
 *
 * Il salvataggio parte da un gesto e finisce in File; da lì il foglio di
 * condivisione di iOS offre Garmin Connect. NON è un caricamento diretto, e
 * non può esserlo: Garmin non ha un'API aperta per gli allenamenti.
 */
export function scarica(nomeFile, byte) {
  const url = URL.createObjectURL(new Blob([byte], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFile;
  document.body.append(a);
  a.click();
  a.remove();
  // Un istante prima di revocare: su Safari revocare subito annulla il
  // salvataggio, perché il download non è ancora partito davvero.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
