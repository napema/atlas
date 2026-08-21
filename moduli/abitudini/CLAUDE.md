# Modulo Abitudini — briefing

Istruzioni per la chat che porta Abitudini dentro ATLAS. Valgono **in aggiunta**
al `CLAUDE.md` alla radice, che va letto per primo.

## Il tuo perimetro

Possiedi `moduli/abitudini/` e **nient'altro**. Non toccare `core/`, `styles/`,
`index.html`, `sw.js`, né `core/registro.js`. Se ti serve qualcosa da lì,
scrivilo in `docs/CANTIERE.md` sotto "Richieste a core".

Committa con il prefisso `abitudini:`.

## Da dove parti

- **Sorgente**: `legacy/abitudini/index.html` (73 KB monolitici) più
  `legacy/abitudini/notify.js` e `notify.yml` — le notifiche push, già
  funzionanti, che sono la parte più preziosa di questo modulo.
- **Schema dei dati**: `docs/SCHEMI.md`, sezione Abitudini. Leggilo prima.
- **App ancora viva**: https://napema.github.io/habit-tracker-webapp/

## Le tre cose che ti faranno perdere tempo se non le sai

1. **`sched.days` usa la convenzione JavaScript: 0 = domenica.**
   `core/contesto.js` usa 0 = lunedì, perché è così che si conta in italiano.
   **Vanno convertiti.** È lo scambio che produce il bug più insidioso di tutti:
   funziona sei giorni su sette e sbaglia la domenica.
2. **`times` è a SETTIMANA, non al giorno**, e conta solo con
   `type: "weekly"`. Con `"daily"` un `times: 3` è residuo e va ignorato:
   leggerlo come "tre volte al giorno" produce una schermata che chiede tre
   spunte quando ne serve una.
   Conseguenza per `calcolo.js`: con `"weekly"` la domanda "è attesa oggi?"
   non si risolve guardando il giorno — si contano i log della settimana e si
   confrontano con `times`. È l'unico dei tre tipi che ha bisogno di una
   finestra, e va progettato così dall'inizio.
3. **`metaUp` è `0` mentre `meta` ha contenuto.** Alla migrazione va
   inizializzato, altrimenti il primo sync considera `meta` più vecchio di
   qualunque cosa e lo sovrascrive.

## Quello che è già fatto bene: non rifarlo

L'id del log è `habitId|data`, cioè **deterministico**. Due dispositivi che
spuntano la stessa abitudine lo stesso giorno producono lo stesso record e non
si duplicano. Conservalo esattamente com'è.

Stessa cosa per le lapidi: togliere una spunta scrive `del: true`, non cancella.
È già il modello di `core/sync.js`.

## L'ordine

1. **`dati.js`** — schema e valori predefiniti. `habits`, `logs`, `subs`, `meta`.
2. **`calcolo.js`** — puro: quali abitudini sono attese oggi (qui la conversione
   dei giorni), quali sono spuntate, le serie in corso. Nessun DOM.
3. **`modulo.js`** — canale su `abitudini.json`. Pattern in
   `docs/MIGRAZIONE.md` §4.
4. **`viste.js` + `stile.css`** — per ultimi, con i token.

## Il pezzo che giustifica tutto ATLAS

Se esiste un'abitudine "Mobilità", **non deve chiedere all'utente di spuntarla**
quando la sessione è già stata fatta. Questo è il caso concreto per cui esiste
la lavagna condivisa.

```js
import { leggiFatto } from "../../core/contesto.js";
import { ascolta } from "../../core/bus.js";

// alla lettura: la sessione di oggi vale come spunta
const fatta = leggiFatto("mobilita", "sessione");

// e in diretta, se succede mentre sei aperto
const stacca = ascolta("mobilita:sessione-completata", () => { … });
```

**`stacca` va chiamata in `smonta()`.** Senza, ogni visita alla schermata lascia
dietro una copia dell'ascoltatore: un ridisegno, poi due, poi quattro.

Coordinati con la chat Mobilità sul nome esatto del fatto — la tabella
concordata è in `docs/SCHEMI.md`, in fondo.

## Cosa scrivi sulla lavagna

```js
scriviFatto("abitudini", "spuntate", n);
scriviFatto("abitudini", "attese", m);   // distingue "3 di 3" da "3 di 7"
```

## Le notifiche: non farle adesso

`legacy/abitudini/notify.js` e `notify.yml` funzionano e vanno portati, ma
**dopo** che i tre moduli sono dentro. Oggi ci sono due coppie VAPID (tua e di
Mobilità) e diventeranno una sola: rifarle ora significherebbe rifarle due volte.

Quando sarà il momento: `sw.js` è già pronto a ricevere i push, e legge il campo
`modulo` del messaggio per decidere dove aprire.

**`subs` sono credenziali.** Chi le ha può mandare notifiche a quel telefono.
Restano nel repo dati privato e non si stampano da nessuna parte — né in log,
né in schermate di diagnostica.

## `oggi()`

Non definirla finché il modulo non è pronto: la home distingue "non c'è ancora"
da "oggi niente da dire". Quando ci sarà: le abitudini non ancora spuntate e la
serie più lunga in corso.

## Quando hai finito

Lista di controllo in `docs/MIGRAZIONE.md`. Poi aggiorna `docs/CANTIERE.md`.
