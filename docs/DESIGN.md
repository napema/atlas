# Il linguaggio visivo di ATLAS — «NEROFUMO»

Da leggere **prima di aggiungere una schermata**. Riscritto il 20 settembre
2026 insieme a `styles/tokens.css` e `styles/base.css`.

Il criterio sta in una riga, e da quella discende tutto il resto:

> **il nero porta, il grigio spiega, il colore indica — e il colore è poco.**

---

## 1. Da dove nasce

L'app aveva un sistema precedente, caldo: fondo marrone scurissimo, tinte
gessose, titoli compressi da un asse variabile. Funzionava sulla carta e
non funzionava sullo schermo. Aperta la mattina, la home mostrava quattro
carte con quattro bordi colorati, cinque righe con un filo ambra ciascuna,
cerchietti verdi gialli e ciano scelti dal modulo di provenienza, e un
titolo schiacciato all'82% della sua larghezza.

Nessuna di quelle scelte era sbagliata da sola. Insieme facevano una
schermata in cui **niente era in primo piano perché tutto lo era**.

Il redesign non ritara quei valori: cambia la domanda. Non «di che colore è
questo modulo», ma «che cosa ha il diritto di attirare l'occhio».

---

## 2. I token

Tutto sta in `styles/tokens.css`. **Nessun modulo inventa un valore**, e in
particolare nessun modulo scrive un colore letterale: è la regola 7 del
contratto.

I nomi sono rimasti quelli della prima stesura anche dove suonano strani
(`--incavo` su un fondo nero SALE invece di scendere, perché più scuro del
nero non c'è). Rinominarli vorrebbe dire riscrivere sette moduli insieme e
tenere l'app rotta per giorni: il ponte di alias in fondo al file esiste per
questo, e si toglie un modulo alla volta.

### Superfici

Cinque piani in dodici punti di luminanza. Sembra poco ed è voluto: su nero
bastano due punti per leggere un bordo.

| token | scuro | a cosa serve |
|---|---|---|
| `--fondo` | `#000000` | la pagina |
| `--rilievo` | `#0c0c0e` | la scheda |
| `--rilievo-2` | `#151518` | scheda dentro scheda, riga premuta |
| `--rilievo-3` | `#1f1f24` | riempimento dei controlli |
| `--incavo` | `#131316` | binari, pozzetti, fondo delle tracce |

**Su nero la scheda si disegna col filo, non col tono.** Dodici punti di
luminanza al buio sono invisibili: quello che rende la scheda un oggetto è
il contorno da 1px (`--riga-fine`). È l'opposto della stesura precedente,
dove il contorno era vietato.

L'ombra (`--ombra`) è di un componente solo: il foglio modale. È l'unico che
sta davvero *sopra* gli altri.

### Inchiostro

Quattro livelli. I contrasti sono misurati sulla **scheda** (`#0c0c0e`), che
è la superficie peggiore delle due.

| token | contrasto | a cosa serve |
|---|---|---|
| `--inchiostro` | 17,9:1 | titoli, cifre |
| `--inchiostro-2` | 7,6:1 | testo corrente |
| `--inchiostro-3` | 4,8:1 | etichette, note — **il minimo** |
| `--inchiostro-4` | 2,8:1 | **non è testo leggibile** |

Il quarto sta sotto la soglia di proposito e non porta mai informazione:
separatori, segnaposto, icone spente, disabilitato. Se ti serve per dire
qualcosa, hai scelto il livello sbagliato.

### I due insiemi di colore

Sono separati e non si mescolano. A distinguerli non è solo la tinta: è il
**trattamento**.

| insieme | risponde a | come appare |
|---|---|---|
| **tinte** (14) | *quale?* — quale modulo, categoria, fetta | un punto da 8px, un'icona da 17, un segmento di grafico con legenda |
| **stati** (3) | *quanto va bene?* | una targhetta tinta, una cifra, un anello, una parola |
| **segnale** (1) | *tocca qui* | `--segnale`, e nient'altro in tutta l'app |

Ora **ogni `--t-<nome>` è davvero il suo colore**. Nella stesura precedente
`--t-viola` era un blu e `--t-blu` un verde acqua: chi leggeva il CSS di un
modulo non poteva fidarsi di quello che c'era scritto.

`--t-verde` è giallo-verde e non erba, apposta: libera il verde pieno per
`--ok`, che è l'unica cosa autorizzata a dire «fatto».

### Tipografia

Undici corpi, da 12 a 64. **`font-stretch` non compare da nessuna parte**:
i titoli non si stringono più. A corpo grande la personalità la porta il
peso e la crenatura negativa, che cresce col corpo come su iOS.

Archivo è uscito dalla pila: il file variabile non è mai entrato nel repo,
quindi la famiglia era dichiarata e mai servita. Si usa SF Pro, self-hosted.

### Forma e movimento

Tre raggi soltanto: `--r-alto` 20px (la scheda), `--r-basso` 12px
(controlli, pulsanti), `--r-tondo`. Il raggio alto è una promessa — *questo
si preme* — e ciò che non si preme sta sul fondo, diviso da un filo.

Tre durate, due curve, e tutte corte. Un'app che si apre venti volte al
giorno non deve mai far aspettare.

---

## 3. Il colore non riempie mai, indica

È la regola che ha cambiato più righe di codice, e quella che si viola più
facilmente. In pratica:

**Vietato**
- fondi tinti sotto il testo (sono stati tolti quattro veli sfumati dietro
  le cifre grandi: finanze, abitudini ×2, mobilità);
- barre laterali colorate (ne sono state tolte dieci);
- bordi colorati a tutta larghezza in cima a una scheda;
- pulsanti riempiti di una tinta di modulo;
- un colore diverso per riga in una lista.

**Permesso**
- un punto da 8px accanto a un'etichetta grigia (`.punto` in base.css è
  fatto per questo);
- un'icona a 17–20px;
- una cifra o una parola;
- una targhetta tinta (`--pillola-tinta`), dove il colore lo porta il testo;
- un segmento di grafico, **se ha una legenda che lo nomina**.

Il caso limite: due intensità della stessa tinta in un grafico
(`.al-barra-piano` al 25% contro `.al-barra-fatto` pieno) sono codifica di
dati, non decorazione. Vanno bene.

### Selezionato si dice col contrasto, non con la tinta

Un elemento scelto in un gruppo si **riempie di bianco** e prende il testo
nero (`.pillola[aria-pressed="true"]`, `.im-sezione.attiva`,
`.choose button.is-active`). Non prende l'accento del modulo: con l'accento,
«No» in Mobilità diventava una pastiglia turchese larga mezza schermata, e
il colore più forte della pagina finiva su una risposta che non è né buona
né cattiva.

Stessa ragione per cui **la voce attiva della barra è bianca e non blu**: il
blu vuol dire «tocca qui», e dove sei già non c'è niente da toccare.

---

## 4. La gerarchia la fa lo spazio

Fra un blocco e il successivo c'è più aria di quanta sembri necessaria. Su
nero il vuoto non costa niente — non c'è una superficie che lo riempie — ed
è l'unica cosa che distingue una schermata curata da una densa.

Corollario pratico: **una cosa sola è grande per schermata.** Il numero, e
il resto gli sta intorno.

---

## 5. Le regole che non si discutono

1. **17px minimo sui campi di testo.** Sotto, iOS zooma al focus e non torna
   indietro. È un baco di sistema, non una preferenza.
2. **44px minimo su qualunque cosa si tocchi.** Il segno visibile può essere
   più piccolo: l'area la allarga il padding, non il `min-height`.
3. **Nessun colore letterale nei moduli.** Solo token.
4. **Verde è «fatto», rosso è uno stato negativo.** Nessun modulo e nessuna
   categoria può prenderseli.
5. **Un componente, un nome.** Il CSS è globale anche dentro un modulo:
   `grep -oE '^\.[a-z][a-z0-9_-]*' styles/base.css | sort -u`
6. **Niente CDN, niente build, niente dipendenze.** Offline non c'è rete.
7. **Lo stato vuoto non nasconde il contenitore**: cambia il contenuto, mai
   l'ingombro. Una schermata che cambia forma non si impara a leggere.
8. **Il maiuscoletto è per etichette di due parole**, non per frasi. In
   maiuscolo e con la crenatura larga, «da far bastare fino al 20 set»
   diventa una riga di grida che si legge prima della cifra che spiega.

---

## 6. La home

È la misura del successo dell'app: se aprirla al mattino non dice più di
quanto dicevano tre app aperte in fila, non è servita a niente.

- **Tutte le carte sono la stessa carta**: stesso fondo, stesso filo, stesso
  raggio, stessa intestazione (icona tinta + nome + valore a destra).
- **I riquadri ci sono sempre**, anche vuoti.
- **Niente emoji.** Erano quattro disegni di quattro autori diversi, e a
  20px quattro macchie colorate. Le emoji restano dove sono un *dato*
  dell'utente: quelle che ha scelto per le sue abitudini.
- L'intestazione è **allineata a sinistra**, con l'ingranaggio nell'angolo
  in alto a destra. Centrata, su 375px, il bersaglio da 44px
  dell'ingranaggio e il testo della data occupavano lo stesso posto.

---

## 7. Da scrivania

La barra scende dal fondo e diventa una colonna da 96px. Da 1120px la
colonna dei contenuti si allarga a 1180, ma **le liste no**: una riga di
testo lunga 1100px non si legge, si insegue.

---

## 8. Sviluppo

In locale il service worker **non si registra** e disinstalla quello che
trova (guardia in cima a `registraServiceWorker()` in `core/app.js`). La sua
cache sta davanti alla rete e ignora `Cache-Control`: senza quella guardia si
guarda la schermata di dieci minuti fa convinti che la modifica non sia
arrivata.

Il server di sviluppo è `.claude/serve-dev.py` (aggiunge `no-store`, e
**deve** essere a thread: ATLAS carica una ventina di moduli in parallelo).

In produzione non cambia niente, e `VERSIONE` in `sw.js` va comunque alzata a
ogni rilascio.
