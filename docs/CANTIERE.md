# Cantiere — chi sta facendo cosa

Quattro chat lavorano sulla stessa cartella. Questo file è il modo in cui si
accorgono l'una dell'altra: il filesystem è condiviso, il contesto no.

**Chi finisce un pezzo lo scrive qui, prima di chiudere la chat.**

---

## Le quattro chat

| chat | possiede | non tocca mai |
|---|---|---|
| **ATLAS** (questa) | `core/` `styles/` `index.html` `sw.js` `manifest` `config.js` `docs/` `.github/` `moduli/oggi/` `moduli/impostazioni/` | `moduli/finanze/` `moduli/mobilita/` `moduli/abitudini/` |
| **Finanze** | `moduli/finanze/` | tutto il resto |
| **Mobilità** | `moduli/mobilita/` | tutto il resto |
| **Abitudini** | `moduli/abitudini/` | tutto il resto |

`core/registro.js` è l'unica eccezione che conta: **lo modifica solo ATLAS.**
Un modulo che ha bisogno di comparire con un accento diverso, o di dichiarare
un evento nuovo, lo chiede qui sotto.

### Perché la divisione è così netta

Non è burocrazia. Due chat che modificano lo stesso file nella stessa cartella
si sovrascrivono senza accorgersene: nessuna delle due vede la modifica
dell'altra, perché ognuna ha in memoria la versione che ha letto lei. Con i
confini sopra, questo non può succedere — e tutto il resto del coordinamento
diventa facoltativo.

### Come si committa

Prefisso obbligatorio, così `git log --oneline` si legge come un diario:

```
core:      il router passa la posizione ai moduli
finanze:   schema dei movimenti, con gli importi in centesimi
abitudini: la griglia dei sette giorni
mobilita:  il motore del follow-along, innestato su core
```

Chi apre una chat comincia da `git log --oneline -20` e da questo file.

---

## Stato

### Guscio — ✅ fatto (chat ATLAS)

- shell, router con `posizione`, registro dei moduli, caricamento pigro
- `core/storage.js` — una casella per modulo, isolate
- `core/sync.js` — un motore solo, un file per modulo su `atlas-dati`
- `core/bus.js` — annunci fra moduli, nessun import diretto
- `core/contesto.js` — la lavagna del giorno, con lapidi per fatto
- `core/blobs.js` — IndexedDB per foto e allegati
- home con i tre riquadri fissi, impostazioni con la diagnostica
- online su https://napema.github.io/atlas/, sync verificato sul campo

### I tre moduli — da fare

Vedi `docs/SCHEMI.md` per gli schemi veri, e il `CLAUDE.md` dentro ogni
cartella di modulo per il briefing specifico.

| modulo | stato | note |
|---|---|---|
| Finanze | cantiere | il più grosso: 118 KB monolitici da spezzare |
| Mobilità | cantiere | già modulare: è quasi solo un innesto |
| Abitudini | cantiere | il più piccolo, porta con sé le notifiche |

### Notifiche — dopo i moduli

Oggi ci sono **due** coppie VAPID (Mobilità e Abitudini) e due workflow. In
ATLAS diventano una coppia e un workflow, con il campo `modulo` del messaggio
a dire chi ha parlato. `sw.js` è già pronto a riceverli.
`config.js → vapidPublic` è ancora vuoto: si riempie in quel momento.

---

## Richieste a core

Un modulo che ha bisogno di qualcosa dal guscio scrive qui invece di
metterci le mani. La chat ATLAS legge, fa, e sposta la riga in "fatte".

_(nessuna, per ora)_

### Fatte

_(nessuna, per ora)_

---

## Decisioni chiuse

- **`sched` delle abitudini** (21 ago) — tre tipi, non uno ambiguo.
  `"daily"` = ogni giorno, `days` e `times` ignorati. `"days"` = solo nei giorni
  elencati in `days`. `"weekly"` = `times` volte **a settimana**, giorno libero.
  Cadeva il dubbio sul "3 volte al giorno": non esiste, `times` è settimanale.
  Dettagli e conseguenze sul calcolo in `docs/SCHEMI.md`.

---

## Decisioni aperte

Cose che vanno decise una volta per tutte e valgono per tutti. Chi ne apre una,
la scrive qui invece di risolverla dentro il suo modulo.

- **Il tema** — Mobilità nasce chiara in stile Apple, Finanze e Abitudini scure.
  I token reggono entrambi e la scelta è in Impostazioni. Da verificare a
  occhio, sui tre moduli portati, che nessuno dei due estremi sia illeggibile.
- **Spegnimento delle app di partenza** — una alla volta, e solo dopo che i due
  dispositivi mostrano gli stessi numeri. I repo dati vecchi non si cancellano:
  costano nulla e sono l'unica rete di sicurezza rimasta.
