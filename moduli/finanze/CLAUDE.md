# Modulo Finanze — briefing

Istruzioni per la chat che porta Finanze dentro ATLAS. Valgono **in aggiunta**
al `CLAUDE.md` alla radice, che va letto per primo: lì c'è il contratto dei
moduli e le regole ferme.

## Il tuo perimetro

Possiedi `moduli/finanze/` e **nient'altro**. Non toccare `core/`, `styles/`,
`index.html`, `sw.js`, né `core/registro.js`. Se ti serve qualcosa da lì,
scrivilo in `docs/CANTIERE.md` sotto "Richieste a core" e chiedi alla chat ATLAS.

Non è burocrazia: quattro chat sulla stessa cartella si sovrascrivono senza
accorgersene, perché ognuna ha in memoria la versione che ha letto lei.

Committa con il prefisso `finanze:`.

## Da dove parti

- **Sorgente**: `legacy/finanze/index.html` — 118 KB, CSS e JS dentro. È il
  modulo che va davvero riscritto, non innestato.
- **Schema dei dati**: `docs/SCHEMI.md`, sezione Finanze. **Leggilo prima di
  scrivere codice**: contiene le trappole trovate nei dati veri.
- **App ancora viva**: https://napema.github.io/budget-tracker-webpage/ — resta
  la copia buona finché non hai finito. Non spegnerla.

## Le tre cose che ti faranno perdere tempo se non le sai

1. **`imp` è in centesimi.** `660` è 6,60 €. Trattarlo come euro sbaglia di due
   ordini di grandezza e il bug non si vede finché non guardi un totale.
2. **`ts` non è `up`.** `ts` è la creazione, `up` l'ultima modifica. Il sync usa
   `up`. Confonderli rompe la fusione.
3. **`data` non è `ts`.** Si registra oggi una spesa di ieri. Qualunque
   raggruppamento per giorno usa `data`.

## L'ordine

Non partire dalle viste. Le viste si rifanno volentieri, gli schemi no.

1. **`dati.js`** — lo schema e i valori predefiniti, così come stanno nel file
   vero. I movimenti hanno già `id`, `up` e le lapidi `del`: non reinventarli.
2. **`calcolo.js`** — funzioni pure: stato → numeri. Saldi, totali per
   categoria, sforamenti sui profili di budget, autocategorizzazione con
   `meta.rules`. **Nessun DOM, nessun localStorage.** È questa purezza che
   rende possibile `oggi()`, perché la home ha bisogno dei numeri senza
   montare l'interfaccia.
3. **`modulo.js`** — `monta`, `oggi`, `avviaSync`. Il canale va su
   `finanze.json`; il pattern esatto è in `docs/MIGRAZIONE.md` §4, con la nota
   sul `tocca: false` che evita il ping-pong fra dispositivi.
4. **`viste.js` + `stile.css`** — solo alla fine, e con i token. Nessun colore
   letterale: l'accento del modulo è già impostato dal router.

## Cosa scrivi sulla lavagna

Solo ciò che serve a un altro modulo (`core/contesto.js`):

```js
scriviFatto("finanze", "movimenti", n);      // quanti movimenti oggi
scriviFatto("finanze", "speso", centesimi);  // quanto speso oggi
```

Serve perché un'abitudine "segnare le spese" possa spuntarsi da sé. Tutto il
resto resta nel tuo archivio: la lavagna è potata a 14 giorni.

## `oggi()`

Sincrona, senza effetti collaterali, chiamata a ogni apertura della home.

```js
oggi() {
  return { titolo: "Finanze", valore: "1.240 €", dettaglio: "restano 12 giorni",
           urgente: sforato, azione: { rotta: "#/finanze" } };
}
```

Restituisci `null` se oggi non c'è niente da dire. **Non definirla affatto**
finché il modulo non è pronto: la home distingue "non c'è ancora" da "oggi
niente", e sono due cose diverse.

## Quando hai finito

`docs/MIGRAZIONE.md` ha la lista di controllo. I due punti che si saltano
sempre: provare **offline vero** (modalità aereo, non DevTools) e provare
sull'iPhone **installato**, non in Safari.

Poi aggiorna `docs/CANTIERE.md`.

---

## v3 (7 ottobre 2026) — come è fatto adesso

`dati.js` e `calcolo.js` sono rimasti dove erano; quello che è nuovo sta in
quattro file accanto, e la divisione non è per comodità ma per domanda:

| file | a cosa risponde |
|---|---|
| `piano.js` | *dove sto andando* (obiettivo), *quanto posso spendere oggi* (quota), *cosa ho fatto fuori dal piano*, l'effetto di una voce in lista d'attesa, il minimo previsto di ING, la tabella dei cicli |
| `paga.js` | i quattro travasi del giorno di paga e il fabbisogno delle Fisse |
| `chiusura.js` | la domenica sera: applica l'estratto, pagella, report, ricarica |
| `revolut.js` | legge il CSV e **riconcilia** (non importa: dice anche cosa c'è nell'app e non c'è nell'estratto) |
| `analisi.js` | *cosa tenere d'occhio in questo ciclo* (i segnali, dal peggiore), e tutti i conti della schermata Analisi, un ciclo per volta |

`importa.js` resta per le banche che non sono Revolut e per le righe
incollate a mano.

### Le quattro cose che ti faranno perdere tempo se non le sai

Oltre alle tre di sopra (centesimi, `ts`/`up`, `data`/`ts`):

4. **`giornoStipendio` non basta.** La data vera la dà
   `dataStipendio(anno, mese)`: sposta il fine settimana al venerdì prima,
   legge `config.stipendiManuali` per dicembre, e se esiste un'entrata
   marcata `stip` entro sei giorni vince quella. Non confrontare mai una
   data col numero 23.
5. **La quota si divide sul saldo di INIZIO GIORNATA.** `quotaDi()` usa
   `deltaPocketTra(id, ancora, iso)`. Dividendo il saldo di adesso, il
   numero scende insieme a quello che spendi e non arriva mai a zero.
6. **`m.fuoriPiano` è un override, non il valore.** Il valore lo calcola
   `eFuoriPiano(m)`. Leggere il campo direttamente dà `undefined` su tutti i
   movimenti che non hai corretto a mano.
7. **Le ancore si scrivono sul disponibile e con la data di DOMANI.** Vedi
   `applicaEstratto()`: la differenza col saldo completato sono i movimenti
   in sospeso, e la data di oggi farebbe sottrarre due volte le spese di
   oggi.

### Provare i conti senza Node

Non serve la CI per sapere se un numero torna:

```
deno run --location http://localhost/ --allow-read moduli/finanze/prova.js
```

`prova.js` semina un archivio, fa girare la migrazione e controlla sessanta
numeri — quelli del documento di v3 — in due secondi. Se cambi una formula,
aggiorna lì il valore atteso **con la ragione accanto**: due dei sessanta
non coincidono col documento e il commento spiega perché (il ciclo del 23
ottobre è di 31 giorni; in italiano 3500 non si raggruppa).

`--location` dà a Deno un `localStorage` vero. Gli import sono dinamici
perché `core/ui.js` tocca il `document` appena viene valutato: il tappo si
mette prima, quindi si importa dopo.
