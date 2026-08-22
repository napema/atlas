# Modulo Mobilità — briefing

Istruzioni per la chat che porta Mobilità dentro ATLAS. Valgono **in aggiunta**
al `CLAUDE.md` alla radice, che va letto per primo.

## Il tuo perimetro

Possiedi `moduli/mobilita/` e **nient'altro**. Non toccare `core/`, `styles/`,
`index.html`, `sw.js`, né `core/registro.js`. Se ti serve qualcosa da lì,
scrivilo in `docs/CANTIERE.md` sotto "Richieste a core".

Committa con il prefisso `mobilita:`.

## Il tuo lavoro è diverso dagli altri due

Finanze e Abitudini sono monoliti da spezzare. **Tu no.** L'app di partenza è
già modulare — `js/engine.js`, `js/esercizi.js`, `js/assessment.js`,
`js/progressi.js`, `js/sessione.js` — e passa quasi intatta.

Il lavoro è un **innesto**, non una riscrittura: si tolgono il suo `storage.js`
e il suo `sync.js`, si attacca il resto a `core/`. Resisti alla tentazione di
migliorare mentre porti: sono due lavori diversi e mescolarli rende impossibile
capire cosa ha rotto cosa.

## Da dove parti

- **Sorgente**: `legacy/mobilita/` — il codice completo, più `SPEC-mobilita.md`
  (la specifica originale del programma), `CATALOGO-blocco-0-1.md`,
  `PROGRAMMA-v3.md`, `GOWOD-videos.tsv`.
- **Schema dei dati**: `docs/SCHEMI.md`, sezione Mobilità.
- **App ancora viva**: https://napema.github.io/mobility-blueprint/

`SPEC-mobilita.md` era il `CLAUDE.md` del repo di partenza. Rinominato perché
qui dentro verrebbe caricato come istruzioni di progetto — ma **va letto**:
contiene il perché di quasi ogni scelta del programma.

## Il pezzo delicato: la salvaguardia dell'assessment

In `legacy/mobilita/js/sync.js` c'è questa regola:

> un assessment completato non viene mai perso a favore di uno vuoto,
> qualunque cosa dicano i timestamp

**Non è una precauzione teorica: è nata da una perdita di dati vera.** Un
dispositivo con stato vuoto (primo avvio, cache svuotata) ha sovrascritto il
repo e cancellato un assessment intero.

`core/sync.js` ha già la metà generale della difesa — chi non ha ancora LETTO
non può SCRIVERE. La parte specifica dell'assessment, con la sfumatura del
`localeMaiScritto`, la devi portare tu dentro il tuo `applica`. Leggi
l'originale prima di riscriverla: ogni condizione lì dentro ha una ragione.

## Le altre due trappole

1. **`volumePerGruppo` ha per chiave il nome del gruppo in italiano**
   ("Trapezio superiore"), non un id. Cambiare una stringa nel catalogo esercizi
   spezza lo storico **in silenzio**: i vecchi record restano sotto la vecchia
   chiave e smettono di sommarsi. Se rinomini, migra anche i record.
2. **`assessment.completato` è `true` ma quasi tutto dentro è `null`.** Solo
   `latoLateralizzato: "dx"`. È uno stato reale: il programma è partito con la
   sola lateralizzazione. Il modulo deve reggerlo senza pretendere i campi
   mancanti — non è un dato corrotto da riparare.

E un campo morto: `programma.oraPromemoria` (21:15) duplica
`programma.notifiche.principale` (21:00) con un valore diverso. Alla migrazione
si tiene `notifiche.principale` e si butta l'altro.

## L'ordine

1. **Porta il catalogo** (`esercizi.js`) e il **motore del follow-along**
   (`engine.js`, `sessione.js`) così come sono. Sono la parte che funziona.
2. **Sostituisci `storage.js`** con una casella di `core/storage.js`.
3. **Sostituisci `sync.js`** con un canale su `mobilita.json`, conservando la
   salvaguardia. Pattern in `docs/MIGRAZIONE.md` §4.
4. **Le foto dei progressi** vanno su `core/blobs.js`: i riferimenti nel JSON,
   i file in `atlas-dati/foto/<id>.jpg`. `legacy/mobilita/js/foto-sync.js` fa
   già esattamente questo — è da adattare, non da inventare.
5. **Il tema.** L'app di partenza è chiara in stile Apple, le altre due scure.
   I token di ATLAS reggono entrambi e la scelta è dell'utente in Impostazioni:
   il tuo compito è non scrivere colori letterali, mai.

## Cosa scrivi sulla lavagna

```js
scriviFatto("mobilita", "sessione", "quotidiano");   // o "post-corsa", "minima"
scriviFatto("mobilita", "durata-min", 14);
annuncia("mobilita:sessione-completata", { tipo, durataMin });
```

L'annuncio serve ad Abitudini per spuntare da sé l'abitudine "Mobilità" senza
che l'utente rifaccia il gesto. **È il caso concreto per cui esiste la lavagna**,
e va coordinato con la chat Abitudini: il nome del fatto è nella tabella in
fondo a `docs/SCHEMI.md`, e se lo cambi va cambiato in tutti e due i posti più
`core/registro.js` (che modifica solo la chat ATLAS).

## Le notifiche: non farle adesso

`legacy/mobilita/js/notifiche.js` e `scripts/push.mjs` funzionano. Vanno
unificati con quelli di Abitudini **dopo** che i tre moduli sono dentro: oggi
ci sono due coppie VAPID e diventeranno una sola.

## `oggi()`

Non definirla finché il modulo non è pronto: la home distingue "non c'è ancora"
da "oggi niente da dire". Quando ci sarà: la sessione del giorno, la serie in
corso, e `urgente: true` quando la serale manca e si sta facendo tardi.

## Quando hai finito

Lista di controllo in `docs/MIGRAZIONE.md`. Poi aggiorna `docs/CANTIERE.md`.

---

## Aggiornamento (22 agosto 2026) — il porting è stato rifatto

La prima versione **aveva riscritto Mobilità invece di innestarla**, contro
quanto dice questo stesso file, e per strada aveva perso:

- i **video** degli esercizi (l'iframe non c'era proprio, gli id sì);
- l'**assessment** intero — 484 righe, tre test, mai portate;
- le **pillole** del player (fonte, tipo di lavoro, lato, carico, attrezzo);
- le schermate di **preparazione**, di **ripresa** e l'**avviso collo**;
- metà dei **progressi**.

Adesso `oggi.js`, `sessione.js`, `progressi.js` e `assessment.js` sono i file
di `mobility_to_consider/js/` **copiati come sono**, classi CSS comprese.
Chi li deve aggiornare li ricopia di là e rifà solo questi tre passaggi:

1. `./storage.js` → `./ponte.js`, `./icone.js` → `../../core/icone.js`,
   `./foto-sync.js` → `./foto.js`;
2. `pillola` → `mo-chip` (l'unica classe rinominata: in ATLAS `.pillola` è
   già il filtro di base.css, e i due si sovrascrivevano);
3. niente altro.

### I due innesti

- **`ponte.js`** espone `getState`/`updateState` con la forma piatta che quei
  file si aspettano (`assessment`, `programma`, `streak`, `storicoSessioni`
  alla radice), mentre sotto vivono in `meta` e `records` della casella.
- **`foto.js`** sostituisce `foto-sync.js`, che era l'unico file impossibile
  da copiare: parlava da solo con `api.github.com` e la regola 1 lo vieta. La
  compressione è identica; i binari vanno in `core/blobs.js`.

### Cosa resta aperto

Le foto dei bersagli si scattano e si vedono, ma **restano sul dispositivo**:
caricarle nel repo richiede un canale per file non-JSON in `core/sync.js`, che
non c'è. I riferimenti nel JSON si sincronizzano già. Annotato in
`docs/CANTIERE.md`.
