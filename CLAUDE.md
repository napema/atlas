# ATLAS

Un'app sola al posto di tre. Finanze, Mobilità, Abitudini — e quello che
verrà — dentro un unico guscio installato sull'iPhone e aperto sul PC.

Questo file è il contratto: chi lavora su ATLAS lo legge prima di toccare
qualsiasi cosa.

---

## 0. Perché ATLAS esiste

Non è un problema di funzionalità: le tre app funzionano già. È un problema
di **frizione e di duplicazione**.

1. Tre icone sulla home dell'iPhone, tre gesti per sapere come va la
   giornata. Nessuna delle tre sa niente delle altre.
2. Il motore di sincronizzazione è **scritto tre volte**, con tre bug
   diversi corretti in momenti diversi. Una lezione imparata in Mobilità
   (per esempio: chi non ha ancora letto non può scrivere) non è mai
   arrivata alle altre due.
3. Due coppie VAPID, due workflow di notifica, due `config.js`.
4. Due delle tre app sono un `index.html` da centomila caratteri con CSS e
   JS dentro. Sono al limite di quanto si può modificare senza rompere.

**La misura del successo di ATLAS è una sola: la schermata Oggi.** Se aprire
ATLAS al mattino non dice più di quanto dicevano tre app aperte in fila,
ATLAS non è servito a niente ed è solo un refactoring.

---

## 1. Da dove si parte

| Modulo | App di partenza | Repo dati oggi | Forma |
|---|---|---|---|
| Finanze | `napema/budget-tracker-webpage` | `finance-tracker` · `registro.json` | monolitico, 118 KB |
| Mobilità | `napema/mobility-blueprint` | `mobilita-dati` · `dati.json` | già modulare, con push |
| Abitudini | `napema/habit-tracker-webapp` | `abitudini-dati` · `abitudini.json` | monolitico, 73 KB, con push |

I sorgenti di partenza sono in `legacy/`. Non vengono pubblicati e non
vengono eseguiti: sono lì da leggere mentre si porta il codice.

**Le app di partenza restano vive finché il modulo corrispondente non è
finito.** Non si spegne niente in anticipo: se ATLAS ha un problema, il dato
del giorno deve poter essere inserito lo stesso.

---

## 2. Architettura

```
index.html          guscio: barra, contenitore, nient'altro
config.js           owner/repo/token/VAPID — dati, non codice
sw.js               offline del guscio + notifiche push
core/
  app.js            avvio: barra → router → sync → service worker
  registro.js       ELENCO DEI MODULI e contratto. Unico file da toccare
                    per aggiungerne uno
  router.js         navigazione a hash, caricamento pigro, `posizione`
  storage.js        una casella localStorage per modulo, isolate fra loro
  sync.js           IL motore di sincronizzazione. Uno solo, mai copiato
  bus.js            annunci fra moduli. Nessun modulo importa un altro
  contesto.js       la lavagna del giorno + chi decide che giorno è
  blobs.js          IndexedDB per foto e allegati
  ui.js             mattoni condivisi + formati italiani
  icone.js          SVG inline
styles/
  tokens.css        i colori, i corpi, gli spazi. Nessun modulo ne inventa
  base.css          reset, shell, componenti condivisi
moduli/<id>/
  modulo.js         export default che rispetta il contratto
docs/               architettura, sync, migrazione
legacy/             sorgenti di partenza, da leggere
```

### Il contratto di un modulo

`moduli/<id>/modulo.js` esporta di default:

```js
export default {
  async monta(contenitore, posizione) {},  // disegna dentro il contenitore
  smonta() {},                              // stacca ascoltatori, ferma timer
  oggi() { return null; },                  // la scheda per la home
  avviaSync() {},                           // apre il proprio canale
};
```

`id`, `nome`, `icona` e `accento` **non** li dichiara il modulo: stanno in
`core/registro.js`. Un modulo non può spostarsi nella barra da solo.

**`posizione`** è come un modulo sa dove si trova. Contiene `resto` (i pezzi
di rotta dopo il suo nome), `link(...)` per stare in casa propria,
`linkA(altro, ...)` per uscire, `vaiA`, `indietro`, `inRadice`. Un modulo non
scrive mai un URL a mano: così rinominarlo non rompe i suoi collegamenti.

**`oggi()`** è sincrona e senza effetti collaterali. Restituisce
`{ titolo, valore, dettaglio, urgente, azione: { rotta } }` oppure `null`.

Attenzione alla differenza, perché la home la mostra:

| | significato | come appare |
|---|---|---|
| `oggi()` assente | il modulo non c'è ancora | riquadro *in migrazione* |
| `oggi()` → `null` | c'è, e oggi non ha niente da dire | riquadro *tutto a posto* |
| `oggi()` → oggetto | ha qualcosa da mostrare | il numero |

I tre riquadri della home **ci sono sempre**, anche vuoti. Una home che
nasconde ciò che non ha dati cambia forma ogni giorno, e una cosa che cambia
forma non si impara a leggere con la coda dell'occhio.

### Come i moduli si parlano

Un modulo **non importa mai** un altro modulo. Ci sono due canali, e bastano.

**`core/bus.js` — gli annunci.** Chi fa qualcosa lo annuncia, chi è
interessato ascolta, nessuno dei due sa se l'altro esiste.

```js
annuncia("mobilita:sessione-completata", { durataMin: 22 });
const stacca = ascolta("mobilita:sessione-completata", (d) => { … });
```

I nomi sono sempre `<modulo>:<fatto>`, **al passato**: l'evento racconta
qualcosa che è successo, non chiede un'azione. Chiedere a un altro modulo di
fare qualcosa è esattamente l'accoppiamento che stiamo evitando. Chi ascolta
**deve** staccarsi in `smonta()`.

**`core/contesto.js` — la lavagna del giorno.** Risolve il problema che nasce
nel momento in cui tre app diventano una: *la stessa cosa raccontata due
volte*. La sessione serale di mobilità è anche un'abitudine da spuntare.

```js
scriviFatto("mobilita", "sessione-serale", true);   // solo Mobilità può
leggiFatto("mobilita", "sessione-serale");          // chiunque può
```

Ognuno è proprietario della sua area: nessuno può scrivere i fatti di un
altro, quindi nessuno può romperli. La lavagna si sincronizza da sé e si
pota dopo 14 giorni — non è un archivio, quelli stanno nei moduli.

Cosa c'è sulla lavagna e chi si è annunciato si vede in `#/impostazioni`,
senza aprire la console.

---

## 3. Regole ferme

Queste non si discutono senza una ragione scritta.

1. **Un solo motore di sync.** Se serve un comportamento nuovo, si estende
   `core/sync.js`. Nessun modulo parla con `api.github.com` da solo.
2. **Nessun modulo tocca `localStorage` direttamente.** Chiede una casella
   ad `apriCasella(id, default)` e vive dentro quella.
3. **Un file di dati per modulo**, non uno unico. Gli sha restano
   indipendenti: due moduli che salvano nello stesso istante non si
   annullano a vicenda.
4. **Chi non ha ancora LETTO non può SCRIVERE.** In una delle app di
   partenza questa regola mancava e uno stato locale vuoto ha cancellato un
   assessment intero dal repo. È già in `core/sync.js`: non toglierla.
5. **Ogni record ha `id` stabile e `up`.** Le cancellazioni sono lapidi
   (`del: true`), non rimozioni. Senza lapide, l'altro dispositivo
   resuscita il record.
6. **Il sync non ridisegna sotto le dita.** Se l'utente sta scrivendo o ha
   una modale aperta, il ridisegno aspetta. I dati arrivano comunque.
7. **Nessun colore letterale nei moduli.** Solo token. L'unica cosa che un
   modulo sceglie è il proprio `--accento`, e lo sceglie nel registro.
8. **Niente dipendenze esterne, niente build.** Nessun CDN: offline non
   c'è. Se serve una libreria pesante (3D, grafici), sta in un solo modulo
   e si carica pigramente.
9. **17px minimo sui campi di testo.** Sotto, iOS zooma al focus e non
   torna indietro.
10. **`VERSIONE` in `sw.js` va alzata a ogni rilascio.** Altrimenti il
    guscio vecchio resta appiccicato sui dispositivi.
11. **I binari non stanno in `localStorage`.** Vanno in `core/blobs.js`.
12. **Nessun modulo importa un altro modulo.** Solo bus e lavagna. Un import
    diretto li salda insieme: niente più caricamento pigro, niente più
    portarne uno senza toccare l'altro.
13. **Chi ascolta si stacca in `smonta()`.** Senza, ogni visita alla
    schermata lascia dietro una copia dell'ascoltatore: un ridisegno, poi
    due, poi quattro.

---

## 4. Cosa ATLAS non fa

- **Non è un backend.** Non c'è un server, non c'è un database, non c'è
  autenticazione. Un utente solo, due dispositivi, un repo privato.
- **Non risolve i conflitti in modo intelligente.** Vince il record più
  recente. Per un utente solo su due dispositivi va bene; per due utenti
  no, e allora servirebbe altro.
- **Non sostituisce le app di partenza prima di essere pronto.** Un modulo
  a metà non prende il posto di uno che funziona.
- **Non aggiunge moduli nuovi prima che i tre siano dentro.** Lo scopo è
  fondere, non accumulare.

---

## 5. Ordine di costruzione

1. ~~Guscio: shell, router, registro, storage, sync, token, PWA~~ ✅
2. ~~Home con i tre riquadri fissi, impostazioni, bus, lavagna del giorno~~ ✅
3. ~~Repo dati `atlas-dati` + `config.js` compilato~~ ✅
4. ~~I tre moduli insieme, con i dati veri migrati~~ ✅
5. ~~Notifiche unificate: una coppia VAPID, un workflow~~ ✅
6. **Spegnimento delle tre app di partenza**, una alla volta — vedi
   `docs/CANTIERE.md`

L'ordine dentro il punto 4 era: **schemi → lavagna → calcolo → viste**, e ha
retto. Leggere i tre `.json` fianco a fianco *prima* di scrivere qualsiasi
vista è ciò che ha fatto emergere subito le tre trappole che avrebbero
mangiato una giornata a testa se scoperte dopo (centesimi, `data` contro
`ts`, la convenzione dei giorni della settimana). Sono in `docs/SCHEMI.md`.

### Cosa è cambiato rispetto al piano

- **Le iscrizioni push sono salite in `core/`.** Stavano dentro
  `abitudini.json`. Lasciarle lì avrebbe riportato esattamente la
  duplicazione che ATLAS esiste per eliminare.
- **Le PUT del sync passano da una coda.** I file sono indipendenti, il
  branch no: quattro canali che partivano insieme facevano 409 tre volte su
  quattro. Le GET restano parallele — leggere non crea commit.

---

## 6. Si lavora a quattro chat

Una chat per il guscio e una per modulo, **tutte sulla stessa cartella**. Il
filesystem è condiviso, il contesto no: ogni chat ha in memoria solo i file
che ha letto lei. Da qui la divisione, che non è burocrazia ma l'unica cosa
che impedisce a due chat di sovrascriversi senza accorgersene.

| chat | possiede | prefisso dei commit |
|---|---|---|
| **ATLAS** | `core/` `styles/` `index.html` `sw.js` `manifest` `config.js` `docs/` `.github/` `moduli/oggi/` `moduli/impostazioni/` | `core:` |
| **Finanze** | `moduli/finanze/` | `finanze:` |
| **Mobilità** | `moduli/mobilita/` | `mobilita:` |
| **Abitudini** | `moduli/abitudini/` | `abitudini:` |

Fuori dal proprio perimetro non si tocca niente. `core/registro.js` in
particolare **lo modifica solo ATLAS**: un modulo che ha bisogno di un evento
nuovo o di un accento diverso lo chiede in `docs/CANTIERE.md`.

**Chi apre una chat comincia da `git log --oneline -20` e da
`docs/CANTIERE.md`.** Chi finisce un pezzo aggiorna `docs/CANTIERE.md` prima
di chiudere. È così che la chat ATLAS viene a sapere cosa è successo nelle
altre tre.

Ogni cartella di modulo ha il suo `CLAUDE.md` con il briefing specifico: si
carica da solo quando quella chat lavora lì dentro.

### I documenti condivisi

| file | a cosa serve |
|---|---|
| `docs/SCHEMI.md` | i tre schemi letti dai dati veri, con le trappole. **Da leggere prima di scrivere codice** |
| `docs/CANTIERE.md` | chi sta facendo cosa, richieste a core, decisioni aperte |
| `docs/MIGRAZIONE.md` | la procedura di porting e la lista di controllo |
| `docs/SYNC.md` | come è configurato il sync e i guasti da cui nascono le sue regole |

## 7. Note per chi scrive il codice

- **Italiano** per nomi di dominio e commenti, come nelle app di partenza.
  I termini tecnici consolidati (`sync`, `push`, `blob`, `sha`) restano.
- I commenti spiegano **perché**, non cosa. Un commento che ripete il codice
  è rumore; uno che racconta la perdita di dati da cui nasce una regola vale
  mezz'ora di indagine.
- Prima di riscrivere un pezzo delle app di partenza, leggilo: quasi ogni
  stranezza che ci trovi è una cicatrice, non una svista.
