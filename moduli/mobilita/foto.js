// moduli/mobilita/foto.js — le foto dei bersagli dell'assessment.
//
// Sostituisce `foto-sync.js` dell'app di partenza, che era l'unico file del
// riferimento impossibile da copiare così com'era: parlava da solo con
// api.github.com, e la prima regola ferma di ATLAS dice che il motore di
// sync è uno e nessun modulo lo scavalca.
//
// Le firme però sono identiche a quelle di là — `aggiungiFoto(bersaglioId,
// blob)` e `leggiFotoBlob(id)` — perché `assessment.js` e `progressi.js`
// arrivano dal riferimento senza modifiche e devono continuare a compilare.
//
// La compressione è copiata parola per parola: 1400px di lato massimo e
// qualità 0,82 sono numeri già tarati su foto di corpo intero fatte col
// telefono, e rifarli a occhio sarebbe solo un modo di sbagliarli.
//
// DOVE FINISCONO. Il file binario va in IndexedDB (core/blobs.js), il
// riferimento nel JSON del modulo — quindi la scheda «quale foto esiste» si
// sincronizza fra i dispositivi, il pixel no. Caricare i binari nel repo
// richiede un canale per file non-JSON in core/sync.js: è annotato in
// docs/CANTIERE.md e finché non c'è le foto restano sul dispositivo che le
// ha scattate.

import * as blobs from "../../core/blobs.js";
import { updateState } from "./ponte.js";

const MAX_LATO = 1400;
const QUALITA = 0.82;

function comprimi(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const scala = Math.min(1, MAX_LATO / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scala);
      canvas.height = Math.round(img.height * scala);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => resolve(b || blob), "image/jpeg", QUALITA);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

/** Comprime, salva in IndexedDB, registra il riferimento nello stato. */
export async function aggiungiFoto(bersaglioId, blobOriginale) {
  const compressa = await comprimi(blobOriginale);
  const id = `${bersaglioId}-${Date.now()}`;
  const dataISO = new Date().toISOString();

  await blobs.salva(id, "mobilita", compressa, { bersaglioId, data: dataISO });
  updateState((s) => {
    s.foto = s.foto || [];
    s.foto.push({ id, up: Date.now(), bersaglioId, data: dataISO, path: `foto/${id}.jpg`, caricata: false });
    s.assessment.baselineTest3.bersagli[bersaglioId].fotoData = dataISO;
    s.metaUp = Date.now();
  });

  // L'originale restituiva anche `caricamento`, la promessa della salita nel
  // repo. Qui non c'è ancora: chi chiama la ignorava già.
  return { id, blob: compressa };
}

export const leggiFotoBlob = (id) => blobs.leggi(id);
