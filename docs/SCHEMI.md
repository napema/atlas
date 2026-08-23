# I tre schemi di partenza

Letti dai dati veri il 21 agosto 2026, non dedotti dal codice. È il documento
che tutte e quattro le chat devono avere in testa: è qui che si vede cosa un
modulo tiene per sé e cosa deve finire sulla lavagna condivisa.

## La buona notizia

**Tutte e tre hanno già `id`, `up` e le lapidi `del`.** Il passo che temevo di
più della migrazione — dare identità stabile e timestamp a record che non li
hanno — è in gran parte già fatto. `core/sync.js` li accetta quasi così come
sono, perché il modello di fusione è lo stesso da cui sono nati.

Resta da fare la parte di forma, non quella di sostanza.

---

## Finanze — `finance-tracker/registro.json` → `atlas-dati/finanze.json`

29,6 KB, `v: 3`. È il file più grosso e il più maturo.

```jsonc
{
  "v": 3,
  "movs": [{
    "id":   "msas8j16wl6me0",     // stabile
    "up":   1785613604442,        // ultima modifica
    "ts":   1785613604442,        // creazione. NON è `up`: non fonderli
    "data": "2026-06-30",         // il giorno del movimento, non della scrittura
    "tipo": "out",                // "out" | "in"
    "imp":  660,                  // CENTESIMI. 660 = 6,60 €
    "nota": "Bar Poligono",
    "cat":  "cibo",               // id di meta.cats
    "sub":  "Bar e colazioni",    // stringa, non id: sta dentro cats[].sub
    "rif":  null,
    "ecc":  false                 // "eccezionale": fuori budget ordinario
    // "del": true  →  lapide
  }],
  "meta": {
    "cats": [{ "id": "cibo", "nome": "Cibo fuori", "sub": ["Ristorante", "…"] }],
    "profili": {
      "ago": { "nome": "Agosto", "b": { "cibo": 150, … }, "cassa": 90,
               "cassaCats": ["spesa","cibo","personale"], "dal": 1, "al": 31 },
      "reg": { "nome": "Regime", … }
    },
    "rules": { "coca cola": ["cibo", "Bar e colazioni"] },   // autocategorizzazione
    "config": { "casaBase": 870, "affitto": 600, "entrate": 2100 },
    "up": 1787308430099
  }
}
```

**Le trappole:**

- **`imp` è in centesimi.** Un modulo che lo tratta come euro sbaglia di due
  ordini di grandezza e il bug non si vede finché non guardi un totale.
- **`ts` non è `up`.** `ts` è quando il movimento è stato creato, `up` quando è
  stato toccato l'ultima volta. Fonderli perde la storia; usare `ts` per la
  fusione rompe il sync.
- **`data` non è la data di scrittura.** Si registra oggi una spesa di ieri.
  Tutto ciò che raggruppa per giorno deve usare `data`, mai `ts`.
- **`sub` è una stringa libera**, non un id. Rinominare una sottocategoria in
  `meta.cats` lascia orfani i movimenti. Va gestito, non scoperto dopo.
- `rules` è la mappa testo → categoria dell'autocategorizzazione: chiavi in
  minuscolo, confronto per sottostringa sulla nota.

---

## Abitudini — `abitudini-dati/abitudini.json` → `atlas-dati/abitudini.json`

2,5 KB, `v: 1`. Il più piccolo, e l'unico che porta con sé le notifiche.

```jsonc
{
  "v": 1,
  "habits": [{
    "id": "msnpry7ugxqqg4q",
    "name": "Meditazione", "emoji": "🧠", "tint": "purple",
    "sched": { "type": "daily", "days": [1,2,3,4,5,6,0], "times": 3 },
    //  type "daily"  → ogni giorno; `days` e `times` ignorati
    //  type "days"   → solo nei giorni di `days` (0 = domenica)
    //  type "weekly" → `times` VOLTE A SETTIMANA, giorno libero
    "remind": "09:24",          // "" = nessun promemoria
    "archived": false,
    "created": 1786395532026,
    "order": 10,                // a passi di 10: c'è spazio per infilare in mezzo
    "up": 1786433136966
  }],
  "logs": [{
    "id": "msnpry7ugxqqg4q|2026-08-10",   // habitId|data — deterministico
    "h":  "msnpry7ugxqqg4q",
    "d":  "2026-08-10",
    "up": 1786431343436
    // "del": true  →  spunta tolta
  }],
  "subs": [{ "id": "sub_mgcbvz", "endpoint": "https://web.push.apple.com/…",
             "p256dh": "…", "auth": "…", "ua": "…", "up": … }],
  "meta": { "theme": "auto", "weekStart": 1 },
  "metaUp": 0
}
```

**Le trappole:**

- **`sched.days` usa la convenzione JavaScript**: 0 = domenica. `core/contesto.js`
  usa 0 = lunedì, perché è così che si conta in italiano. **Vanno convertiti.**
  È lo scambio che produce il bug più insidioso: funziona sei giorni su sette.
- **`times` è a SETTIMANA, e solo con `type: "weekly"`.** Nel record qui sopra
  `type` è `"daily"`, quindi quel `times: 3` non vuol dire niente: è residuo di
  quando l'abitudine era di un altro tipo. Leggerlo come "3 volte al giorno"
  è l'errore facile, e produce una schermata che chiede tre spunte quando ne
  serve una.
  Conseguenza per il calcolo: con `"weekly"` la domanda "è attesa oggi?" non
  ha risposta — si contano i log della settimana e si guarda se sono meno di
  `times`. È l'unico dei tre tipi che non si risolve guardando il solo giorno.
- **L'id del log è deterministico** (`habitId|data`), quindi due dispositivi
  che spuntano la stessa abitudine lo stesso giorno producono lo stesso record
  e non si duplicano. È fatto bene: conservarlo.
- **`subs` sono le iscrizioni push, e sono credenziali.** Chi le ha può mandare
  notifiche a quel telefono. Restano nel repo dati privato e non si stampano
  mai da nessuna parte.
- `metaUp: 0` mentre `meta` ha contenuto: il timestamp non è mai stato scritto.
  Alla migrazione va inizializzato, altrimenti il primo sync considera `meta`
  più vecchio di qualsiasi cosa.

---

## Mobilità — `mobilita-dati/dati.json` → `atlas-dati/mobilita.json`

4,4 KB. Già modulare nel codice, già nella forma giusta nei dati.

```jsonc
{
  "records": [{
    "id": "2026-08-20|quotidiano",     // data|tipo — deterministico
    "up": 1787258271501,
    "data": "2026-08-20",
    "tipo": "quotidiano",              // "quotidiano" | "post-corsa" | "minima"
    "durataSec": 840,
    "esercizi": ["g3-ham-att", "g5-9090", …],   // id dal catalogo
    "volumePerGruppo": { "Femorali": 210, "Piriforme": 150, … }  // secondi
  }],
  "foto": [{ "id": "farfalla-1786793046126", "up": …, "del": true }],
  "meta": {
    "assessment": { "completato": true, "esitoTest1": {…}, "esitoTest2": {…},
                    "baselineTest3": {…} },
    "programma": { "blocco": 0, "settimana": 0, "inizioProgramma": "2026-08-16",
                   "giornoPalestra": 2, "notifiche": {…}, … },
    "streak": { "giorniConsecutivi": 1, "ultimaDataCompletata": "2026-08-20" }
  },
  "metaUp": 1787258271502
}
```

**Le trappole:**

- **`volumePerGruppo` ha per chiave il NOME del gruppo in italiano**
  ("Trapezio superiore"), non un id. Cambiare una stringa nel catalogo esercizi
  spezza lo storico del volume, in silenzio: i vecchi record continuano a
  esistere sotto la vecchia chiave e non si sommano più.
- **`assessment.completato` è `true` ma quasi tutto dentro è `null`.** Solo
  `esitoTest2.latoLateralizzato: "dx"` è stato risposto. È uno stato reale, non
  un errore: il programma è partito con la sola lateralizzazione. Il modulo
  deve reggerlo senza pretendere i campi mancanti.
- **La salvaguardia dell'assessment** in `legacy/mobilita/js/sync.js` va portata
  intatta: un assessment completato non deve mai perdere contro uno vuoto,
  qualunque cosa dicano i timestamp. È nata da una perdita di dati vera.
- `programma.oraPromemoria` duplica `programma.notifiche.principale` con un
  valore diverso (21:15 contro 21:00). È un campo morto di una versione
  precedente: alla migrazione si tiene `notifiche.principale` e si butta l'altro.

---

## Cosa va sulla lavagna condivisa

Solo ciò che un ALTRO modulo deve poter leggere. Il resto resta nel modulo:
la lavagna non è un archivio, ed è potata a 14 giorni.

| chi scrive | chiave | valore | perché ci sta |
|---|---|---|---|
| `mobilita` | `sessione` | `"quotidiano"` \| `"post-corsa"` \| `"minima"` | Abitudini spunta da sé l'abitudine corrispondente |
| `mobilita` | `durata-min` | numero | la home la mostra senza caricare il modulo |
| `abitudini` | `spuntate` | numero | la home |
| `abitudini` | `attese` | numero | la home, e distingue "3 di 3" da "3 di 7" |
| `finanze` | `movimenti` | numero | permette un'abitudine "segnare le spese" |
| `finanze` | `speso` | centesimi | la home |

**La regola:** un fatto sulla lavagna è piccolo e serve a qualcun altro. Se
nessuno lo legge, non ci va — sta nell'archivio del modulo.

Il caso che giustifica tutto il meccanismo: la sessione serale di mobilità è
anche un'abitudine da spuntare. Senza lavagna, l'utente fa due gesti per un
fatto solo e i due archivi si contraddicono.

---

## Finanze v5 — `da`, `pagato`, e i previsti (23 ago 2026)

Tre aggiunte allo schema dei ricorrenti e una lista nuova accanto.

| campo | dove | cosa dice |
|---|---|---|
| `da` | ricorrente | ISO. Prima di questa data il ricorrente **non esiste**. Per le cadenze non mensili fa anche da **ancora**: bimestrale da ottobre = ott, dic, feb — non gen, mar, mag. Quando c'è, `mese` non si usa. |
| `pagato` | ricorrente | ISO dell'ultima scadenza saldata. `prossimaScadenza()` riparte dal giorno dopo. È quello che fa sparire da «In arrivo» una rata pagata in anticipo. |
| `previsti[]` | radice | Una tantum futuri: `{ id, nome, imp, quando, pocket, cat, nota, pagatoIl, up, del? }`. |

**Perché i previsti non sono movimenti**: non sono ancora usciti, e metterli
fra i movimenti falserebbe ogni totale del mese.
**Perché non sono ricorrenti**: non tornano, e un ricorrente «una volta sola»
è una cadenza inventata che poi qualcuno deve ricordarsi di spegnere.

`pocket` su un previsto non è decorativo: è l'unica informazione che permette
di rispondere alla domanda vera prima di una spesa grossa già decisa — quando
arriva, i soldi ci sono? Il conto lo fa `coperturaDi()`, pocket per pocket.

### La trappola trovata scrivendolo

`prossimaScadenza()` scandiva i mesi ma confrontava il candidato con `iso` —
il parametro — invece che con la partenza calcolata. Con una scadenza appena
saldata la partenza si spostava al giorno dopo, il candidato tornava quello di
ieri, e passava lo stesso perché era comunque successivo a *oggi*. La rata
pagata restava in «In arrivo» come se niente fosse.
