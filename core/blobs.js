// blobs.js — archivio dei file binari (foto dei progressi, ricevute, allegati).
//
// localStorage NON è il posto giusto: ha un tetto di pochi megabyte e
// costringe a passare per base64, che gonfia del 33%. Qui c'è IndexedDB,
// che regge centinaia di megabyte e conserva i Blob così come sono.
//
// I blob NON viaggiano nel JSON del sync. Nel JSON viaggia solo il
// riferimento (id, modulo, quando, tipo); il file vero sale nel repo dati
// come file a sé, e chi lo trova mancante lo riscarica. È lo stesso schema
// che l'app Mobilità usa già per le foto dei progressi.

const DB = "atlas";
const VERSIONE = 1;
const DEPOSITO = "blob";

let apertura = null;

function apri() {
  if (apertura) return apertura;
  apertura = new Promise((risolvi, rifiuta) => {
    const req = indexedDB.open(DB, VERSIONE);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DEPOSITO)) {
        const deposito = db.createObjectStore(DEPOSITO, { keyPath: "id" });
        // Serve a cancellare in blocco quando si azzera un modulo.
        deposito.createIndex("modulo", "modulo", { unique: false });
      }
    };
    req.onsuccess = () => risolvi(req.result);
    req.onerror = () => rifiuta(req.error);
  });
  return apertura;
}

function transazione(modo) {
  return apri().then((db) => db.transaction(DEPOSITO, modo).objectStore(DEPOSITO));
}

function attendi(req) {
  return new Promise((risolvi, rifiuta) => {
    req.onsuccess = () => risolvi(req.result);
    req.onerror = () => rifiuta(req.error);
  });
}

/**
 * Salva un file. L'id lo decide il chiamante, così resta uguale fra
 * dispositivi ed è lo stesso che finisce nel JSON sincronizzato.
 */
export async function salva(id, modulo, blob, extra = {}) {
  const deposito = await transazione("readwrite");
  const record = { id, modulo, blob, tipo: blob.type, byte: blob.size, quando: Date.now(), ...extra };
  await attendi(deposito.put(record));
  return record;
}

/** Il Blob, o null se questo dispositivo non ce l'ha (ancora). */
export async function leggi(id) {
  const deposito = await transazione("readonly");
  const r = await attendi(deposito.get(id));
  return r ? r.blob : null;
}

/** URL temporaneo per un tag <img>. Va revocato con `liberaURL` quando basta. */
export async function urlDi(id) {
  const b = await leggi(id);
  return b ? URL.createObjectURL(b) : null;
}

export const liberaURL = (url) => { if (url) URL.revokeObjectURL(url); };

export async function elimina(id) {
  const deposito = await transazione("readwrite");
  await attendi(deposito.delete(id));
}

/** Gli id presenti su questo dispositivo per un modulo. Serve a capire cosa manca. */
export async function idDelModulo(modulo) {
  const deposito = await transazione("readonly");
  const indice = deposito.index("modulo");
  return attendi(indice.getAllKeys(IDBKeyRange.only(modulo)));
}

/** Quanto spazio stiamo occupando, e quanto ce n'è. Per la schermata impostazioni. */
export async function spazio() {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usati: usage, totali: quota };
}

/**
 * Chiede al browser di non buttare via i dati sotto pressione di spazio.
 * Su iOS, senza questa richiesta, i dati di un sito non usato per settimane
 * possono sparire. Va chiamata dopo un gesto dell'utente, non all'avvio.
 */
export async function chiediPersistenza() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
