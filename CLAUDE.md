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

**La app è Svelte 5 + TypeScript, compilata con Vite** (settembre 2026).
Prima era JavaScript scritto a mano che costruiva il DOM, e ogni schermata
chiamava `disegna()` dopo ogni scrittura: ogni posto dimenticato era una
schermata ferma sui numeri vecchi. Adesso le viste si aggiornano da sole.

```
app/                    LA APP — questa si pubblica
  index.html            la pagina
  public/sw.js          offline + notifiche push; la VERSIONE la timbra la build
  public/manifest.webmanifest
  src/
    main.ts             avvio: guscio → sync → service worker
    App.svelte          la schermata della rotta, la barra delle schede
    lib/core/           IL NUCLEO, in TypeScript
      registro.ts       ELENCO DEI MODULI. Unico file da toccare per aggiungerne uno
      router.svelte.ts  navigazione a hash (le rotte delle notifiche restano quelle)
      storage.ts        una casella localStorage per modulo, isolate fra loro
      sync.ts           IL motore di sincronizzazione. Uno solo, mai copiato
      bus.ts            annunci fra moduli
      contesto.ts       la lavagna del giorno
      notifiche.ts      iscrizioni push e orari (canale notifiche.json)
      credenziali.ts    il token, solo su questo dispositivo
      reattivo.svelte.ts  il ponte fra le caselle e Svelte: `dati.versione`
    lib/ui/             il kit iOS 27: Pagina, Sezione, Riga, Foglio, …
    lib/stili/          tokens.css (i valori misurati) + app.css (il minimo globale)
    moduli/<id>/        LE VISTE di ogni modulo, in Svelte
moduli/<id>/            LA LOGICA di ogni modulo, JavaScript, condivisa:
  dati.js calcolo.js …  schema, conti, scritture — nessun DOM
  contratto.js          canale di sync, lavagna, `oggi()` per la home
core/ styles/ index.html sw.js   la app di prima, pubblicata come riserva in v1.html
docs/  legacy/
```

**Un nucleo solo.** La logica condivisa importa `../../core/storage.js`: il
plugin «nucleo unico» in `app/vite.config.ts` gira ogni import che punta in
`core/` sul file TypeScript omonimo di `app/src/lib/core/`. Senza, nella
app ci sarebbero due `apriCasella` con due copie degli stessi dati.

### Il contratto di un modulo

Un modulo ha tre parti, e il registro le carica pigramente:

| parte | dove | cosa |
|---|---|---|
| `vista` | `app/src/moduli/<id>/Vista.svelte` | la schermata; riceve `resto` (i pezzi di rotta dopo il nome) |
| `contratto` | `moduli/<id>/contratto.js` | `avviaSync()`, `pubblicaSullaLavagna()`, `oggi()`, e le azioni che la home può chiedere |
| `impostazioni` | `app/src/moduli/<id>/Impostazioni.svelte` | la sua pagina in Impostazioni |

`id`, `nome`, `icona` e `accento` **non** li dichiara il modulo: stanno in
`registro.ts`. Un modulo non può spostarsi nella barra da solo.

**Le viste leggono i dati dentro un `$derived` che tocca `dati.versione`**:
cresce a ogni scrittura in qualunque casella, a ogni cambio di giorno e una
volta al minuto. È grossolano di proposito — ricalcolare costa microsecondi,
sbagliare segnale costa una schermata che mente.

**`oggi()`** è sincrona e senza effetti collaterali. Restituisce
`{ titolo, valore, dettaglio, urgente, azione: { rotta } }` oppure `null`.

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
7. **Nessun colore letterale nei moduli.** Solo token, e l'accento del modulo
   lo sceglie il registro, non il modulo. Un colore vuol dire **una cosa
   sola**: verde è "fatto" e rosso è uno stato negativo, quindi nessun modulo
   e nessuna categoria può prenderseli. Il resto in `docs/DESIGN.md`.
8. **Niente dipendenze esterne a runtime.** La build c'è (Vite, in CI: non
   serve niente installato sul PC) ma quello che arriva al telefono è tutto
   nel pacchetto. Nessun CDN: offline non
   c'è. Se serve una libreria pesante (3D, grafici), sta in un solo modulo
   e si carica pigramente.
9. **17px minimo sui campi di testo.** Sotto, iOS zooma al focus e non
   torna indietro.
10. **La versione del service worker la scrive la build.** Nella app di
    prima andava alzata a mano ed era la regola che si dimenticava: ora
    `vite.config.ts` timbra `__VERSIONE__` in `sw.js` a ogni compilazione.
11. **I binari non stanno in `localStorage`.** Vanno in `core/blobs.js`.
12. **Nessun modulo importa un altro modulo.** Solo bus e lavagna. Un import
    diretto li salda insieme: niente più caricamento pigro, niente più
    portarne uno senza toccare l'altro.
13. **Chi ascolta si stacca.** In Svelte: `$effect(() => ascolta(…))` — la
    funzione che `ascolta` restituisce è la pulizia dell'effetto. Senza, ogni
    visita alla schermata lascia dietro una copia dell'ascoltatore: un
    ridisegno, poi due, poi quattro.

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
7. ~~La app riscritta in Svelte + TypeScript e pubblicata alla radice~~ ✅
   (la precedente resta in `v1.html` finché non la si toglie)

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
| **ATLAS** | `app/` tranne `app/src/moduli/<id>/`, `core/` `styles/` `index.html` `sw.js` `docs/` `.github/` | `core:` |
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
| `docs/DESIGN.md` | il linguaggio visivo: iOS 27, token misurati. **Da leggere prima di aggiungere una schermata** |
| `docs/SYNC.md` | come è configurato il sync e i guasti da cui nascono le sue regole |

## 7. Note per chi scrive il codice

- **Italiano** per nomi di dominio e commenti, come nelle app di partenza.
  I termini tecnici consolidati (`sync`, `push`, `blob`, `sha`) restano.
- I commenti spiegano **perché**, non cosa. Un commento che ripete il codice
  è rumore; uno che racconta la perdita di dati da cui nasce una regola vale
  mezz'ora di indagine.
- Prima di riscrivere un pezzo delle app di partenza, leggilo: quasi ogni
  stranezza che ci trovi è una cicatrice, non una svista.
