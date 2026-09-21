// La logica dei moduli condivisa con la app di prima (`moduli/<id>/*.js`) è
// JavaScript senza tipi. Lasciarla leggere a TypeScript vuol dire fargli
// INDOVINARE i tipi dai valori predefiniti — `pastoId = null` diventa «solo
// null», `tendenze = []` diventa «array di niente» — e poi bocciare le
// chiamate giuste. Meglio dichiararla per quello che è: non tipizzata.
// Si tipizzerà quando la app di prima sarà spenta e la logica potrà
// diventare TypeScript senza doversi sdoppiare.
declare module "$condivisi/*";
