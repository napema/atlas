# Cantiere — chi sta facendo cosa

Quattro chat lavorano sulla stessa cartella. Questo file è il modo in cui si
accorgono l'una dell'altra: il filesystem è condiviso, il contesto no.

**Chi finisce un pezzo lo scrive qui, prima di chiudere la chat.**

---

## Le quattro chat

| chat | possiede | non tocca mai |
|---|---|---|
| **ATLAS** | `core/` `styles/` `index.html` `sw.js` `manifest` `config.js` `docs/` `.github/` `moduli/oggi/` `moduli/impostazioni/` | `moduli/finanze/` `moduli/mobilita/` `moduli/abitudini/` |
| **Finanze** | `moduli/finanze/` | tutto il resto |
| **Mobilità** | `moduli/mobilita/` | tutto il resto |
| **Abitudini** | `moduli/abitudini/` | tutto il resto |

`core/registro.js` è l'eccezione che conta: **lo modifica solo ATLAS.** Un
modulo che ha bisogno di un accento diverso o di dichiarare un evento nuovo
lo chiede qui sotto.

Prefisso obbligatorio sui commit — `core:` `finanze:` `mobilita:`
`abitudini:` — così `git log --oneline` si legge come un diario.

Chi apre una chat comincia da `git log --oneline -20` e da questo file.

---

## Stato

### ✅ La app in Svelte + TypeScript (21 settembre 2026)

Tutta la app è stata riscritta in `app/` — Svelte 5, TypeScript 6, Vite 8 —
e pubblicata alla RADICE del sito. La precedente resta come riserva in
`/atlas/v1.html` (usa lo stesso service worker nuovo, quindi funziona
online).

Cosa NON è cambiato, di proposito:

- **i dati**: stesse caselle `atlas.<id>.v1`, stesso token in
  `atlas-credenziali.v1`, stessi file nel repo `atlas-dati`;
- **il sync**: `sync.ts` è `sync.js` riga per riga, tipi a parte (letto e
  confrontato col diff prima del passaggio);
- **la logica dei moduli**: resta JavaScript in `moduli/<id>/`, condivisa.
  Sync, lavagna e `oggi()` di ogni modulo sono usciti da `modulo.js` in
  `contratto.js`, che usano tutte e due le app;
- **le rotte**: `#/mobilita/inizia`, `#/abitudini/nuova`, `#/finanze/ricarica`
  aprono le stesse cose — sono gli indirizzi delle notifiche;
- **il service worker**: stesso URL (`/atlas/sw.js`), quindi stessa
  registrazione e stessa iscrizione push. La cache dei video
  (`atlas-pesanti-v1`) è la stessa: i clip già scaricati restano.

Da fare, nell'ordine:

1. Provare sull'iPhone INSTALLATO: notifica di prova, una spunta, una spesa,
   una sessione con i video offline.
2. Quando la app nuova regge da una settimana: togliere `v1.html`, `core/`,
   `styles/`, `moduli/*/modulo.js` e `viste.js`, `stile.css` (la logica in
   `dati.js`/`calcolo.js`/`contratto.js` resta).
3. Poi la logica dei moduli può diventare TypeScript senza sdoppiarsi.

### ✅ Guscio

Shell, router con `posizione`, registro, caselle di storage isolate, motore
di sync unico con coda delle scritture, bus degli annunci, lavagna del
giorno con lapidi per fatto, blob su IndexedDB. Home a tre riquadri,
impostazioni con diagnostica.

### ✅ Sistema di stile

Rifatto da capo: nero pieno, tinte sature, un eroe per schermata, tessere al
posto degli elenchi. Il tentativo in stile Apple è stato abbandonato — dava
una schermata piatta in cui la cifra che conta pesava quanto l'etichetta di
fianco. Token in `styles/tokens.css`, componenti in `styles/base.css`, un
`stile.css` per modulo caricato dal router insieme al modulo. Chiaro e scuro,
più la scelta manuale. (Il documento del linguaggio visivo non esiste
più: lo stile è stato azzerato il 20 settembre.)

### ✅ I tre moduli

| modulo | forma | note |
|---|---|---|
| Finanze | `dati` `calcolo` `viste` `modulo` `stile` | riscritto dal monolite; motore di calcolo conservato |
| Abitudini | `dati` `calcolo` `viste` `modulo` `stile` | schema invariato; il tipo `weekly` ha bisogno della finestra settimanale |
| Mobilità | `+ esercizi` `+ engine` | innesto: catalogo e motore passati identici |

Dati veri migrati in `atlas-dati` il 21 agosto: 162 movimenti, 6 sessioni,
2 abitudini con 5 spunte.

### ✅ Notifiche

Una coppia VAPID al posto di due, un workflow al posto di due. Il mittente
è `notifiche.js` dentro `atlas-dati`, con `promemoria.yml` che lo lancia
ogni dieci minuti. Chiave pubblica in `config.js`, privata nei secret di
`atlas-dati`.

**Resta da fare una cosa sola, e la può fare solo l'utente:** aprire ATLAS
sull'iPhone *installata dalla schermata Home* e toccare "Attiva le
notifiche" in Impostazioni. Le iscrizioni delle vecchie app non si possono
riusare — una subscription è legata all'origine e allo scope del service
worker.

### ✅ La home come cruscotto (23 ago)

Rifatta sullo sketch dell'utente. Tre colonne che si stirano alla stessa
altezza più una striscia sotto: `align-items: stretch` sulla griglia è la
riga che fa la differenza fra un cruscotto e tre ritagli affiancati.

Due regole nuove, che valgono anche per chi aggiunge una carta dopo:

- **Nella checklist ci va solo quello che ha un'ora.** `prioritarie()` in
  `moduli/oggi/modulo.js` tiene ciò che è in ritardo, ciò che tocca in
  questa fascia e le sessioni; le abitudini senza fascia oraria restano in
  Abitudini fino alle 20. Impilarle tutte faceva nove righe, e nove righe
  non sono una priorità: sono un elenco, e un elenco lo si smette di
  leggere.
- **Da telefono la prima schermata basta.** Misurato su 375×812: testa,
  «Adesso» e Finanze stanno dentro il primo scorrimento. Le misure compatte
  sono il caso base di `stile.css`, ed è il media query da 1000px ad
  aggiungere aria — non il contrario.

### ✅ Il check giornaliero di Finanze (23 ago)

Il gesto quotidiano del modulo: quattro voci (ritmo di oggi, la settimana,
cosa esce, cosa è in sospeso), un verdetto in due parole, e una conferma che
non è «i conti tornano» ma «ho segnato tutto» — l'unica cosa che il calcolo
non può sapere da solo.

`esitoCheck()` in `calcolo.js`, lo stato in `config.checks` come mappa
`iso → ts` (nessuna lapide: due dispositivi che dicono che il 23 il check
c'è stato non hanno un conflitto). La conferma chiama `celebra()` di
`core/ui.js` — patina e spunta che si disegna, riusabile da chiunque abbia
un'abitudine quotidiana da chiudere. Niente coriandoli: una cosa che
festeggia troppo la prima volta imbarazza la decima.

---

## Richieste a core

Un modulo che ha bisogno di qualcosa dal guscio scrive qui invece di
metterci le mani. La chat ATLAS legge, fa, e sposta la riga in "fatte".

_(nessuna)_

### Fatte

_(nessuna)_

---

## Decisioni chiuse

- **`sched` delle abitudini** (21 ago) — tre tipi. `"daily"` ogni giorno,
  `days` e `times` ignorati. `"days"` solo nei giorni elencati. `"weekly"`
  un numero di volte **a settimana**, giorno libero. Non esiste il "3 volte
  al giorno": `times` è settimanale.
- **Token nel repo pubblico** (21 ago) — resta com'era nelle tre app. È
  fine-grained su un solo repo privato di dati personali e si revoca in un
  clic. Cambia solo se i dati diventano sensibili o gli utenti più di uno.
- **Un file di dati per modulo** (21 ago) — non un JSON unico. Gli sha
  restano indipendenti. Le PUT però passano da una coda: i file sono
  separati, il branch no.
- **Le iscrizioni push sono di core** (21 ago) — stavano in
  `abitudini.json`. Tenerle in un modulo avrebbe riportato la duplicazione
  che ATLAS elimina.
- **Via lo stile Apple** (22 ago) — `liquid-glass`, i materiali traslucidi e
  le tinte di sistema davano una schermata piatta, tutta dello stesso grigio.
  Al suo posto: nero pieno, tinte sature, un eroe per schermata, tessere al
  posto degli elenchi. `docs/APPLE.md` è stato sostituito da
  un documento che non esiste più. Restano le due lezioni che valevano: contrasto misurato e
  44px di bersaglio.
- **Una tinta per modulo, tutte diverse** (22 ago) — Oggi e Mobilità erano
  tutte e due blu. Ora Oggi è pesca, Finanze lime, Mobilità ciano, Abitudini
  viola. Finanze ha lasciato il verde perché il verde vuol dire "fatto" e un
  colore che significa due cose non ne significa nessuna.
- **Un'icona può essere un bitmap in maschera** (23 ago) — la figura in
  allungo di Mobilità viene da icons8 (`parakeet-line`, col permesso
  dell'utente) e l'ho ricalcata a mano tre volte prendendo tre cose diverse.
  Sta in `MASCHERE` dentro `core/icone.js` come PNG in base64, usato come
  maschera CSS sopra un fondo di `currentColor`. Regge le due regole che
  contano: non arriva dalla rete, ed eredita il colore come tutte le altre.
  Vale solo per le icone che arrivano da fuori già disegnate — le nostre
  restano tracciati sulla griglia 24×24.
- **Serie e Costanza erano una carta sola** (23 ago) — «3 giorni di fila» e
  «3 giorni su 7» rispondono alla stessa domanda con lo stesso numero. Due
  riquadri che dicono la stessa cosa non la dicono più forte: chi legge si
  chiede in che cosa differiscono. Fuse: il numero è la serie, la striscia
  è la settimana e spiega il numero.
- **Il tasto tondo unico: provato e ritirato** (22 ago) — le tre azioni
  principali in un solo pulsante fisso in basso a destra. Non funziona: un
  tondo solo non può rappresentare due gesti diversi. In Finanze "uscita" la
  registri dieci volte a settimana e "entrata" due volte al mese, e dietro lo
  stesso simbolo costano un tocco e un dubbio ogni volta; in Mobilità il tondo
  duplicava il tasto "Inizia" già presente nella scheda. Tornate le tre azioni
  dell'app di partenza (Uscita · Entrata · ⋯), il "+" in intestazione ad
  Abitudini, e "Inizia" dentro la scheda di Mobilità.

---

## Decisioni aperte

- **Spegnimento delle app di partenza.** Una alla volta, e solo dopo che i
  due dispositivi mostrano gli stessi numeri per qualche giorno. I repo dati
  vecchi non si cancellano: costano nulla e sono l'unica rete di sicurezza
  rimasta.
- **Le foto dei bersagli restano sul dispositivo.** Dal ri-porting di
  Mobilità (22 ago) l'interfaccia per scattarle c'è — è dentro l'assessment,
  parte 3 — e i binari vanno in `core/blobs.js`. Quello che manca è la salita
  nel repo: `core/sync.js` sa fare canali JSON, non file binari. I
  riferimenti nel JSON si sincronizzano già, quindi l'altro dispositivo sa
  che una foto esiste ma non la vede.
- **`legacy/`.** Si cancella quando le tre app di partenza sono spente e i
  moduli hanno retto un mese.

---

## ✅ Notifiche dei pagamenti — fatte da tutte e due i lati (23 ago)

Il lato client: `orari.finanze` in `notifiche.json` porta `pagamenti`,
`pagamentiOra` e `pagamentiGiorni: [3, 1, 0]`, con l'interruttore in
Impostazioni → Notifiche.

Il lato mittente: `notifiche.js` dentro `atlas-dati` ha la sezione
**FINANZE · PAGAMENTI IN ARRIVO**. Legge `ricorrenti[]` e `previsti[]`
(con ripiego su `meta.ricorrenti` per i file scritti da un dispositivo
vecchio), ricalcola la prossima scadenza con la stessa aritmetica di
`prossimaScadenza()`, e per ogni voce a 3, 1 o 0 giorni manda un avviso.

Due dettagli che sembrano minuzie e non lo sono:

- la **chiave** finisce con la data di scadenza — `fi:pag:<anticipo>:<id>:<data>`
  — perché la potatura dello storico in `stato-notifiche.json` riconosce
  le chiavi dall'ultimo segmento. Con l'anticipo in fondo non si
  sarebbero mai pulite;
- il **tag** invece identifica il pagamento e basta (`fi:pag:<id>`), così
  l'avviso del giorno prima SOSTITUISCE quello di tre giorni prima sullo
  schermo invece di affiancarglisi. È lo stesso conto.

A tre giorni il testo dice anche se il pocket copre: è l'unica delle tre
occasioni in cui c'è ancora tempo per rimediare, e dirlo il giorno stesso
servirebbe solo a far sentire in colpa.

Il workflow non è stato toccato: `promemoria.yml` legge già tutti i file
dei moduli e gira ogni dieci minuti.

---

## ✅ I saldi calcolati e la ricarica del lunedì (27 ago)

**I saldi non si scrivono più.** `saldo = ancora + Σ movimenti dalla data
dell'ancora`, con l'ancora **per pocket**. Non esiste un campo «saldo
corrente», e la prova che sia davvero derivato è che cancellando dei
movimenti i quattro saldi tornano al centesimo ai valori di partenza.

«Correggi i saldi» non scrive un saldo: chiama `riancoraPocket()`, che
sposta l'ancora a oggi.

ING resta a parte: le spese non lo attraversano, lo muovono **solo** i
travasi espliciti. E lo sforamento ha due estremi (`pocket: ing` →
`pocketTo: principale`): prima ne aveva uno, quindi i soldi comparivano nel
Principale senza sparire dalla riserva.

**La ricarica del lunedì** è in `#/finanze/ricarica`, e la notifica ci
atterra sopra diretta. Il mittente in `atlas-dati` manda il promemoria il
giorno scelto (`config.ricarica`) e **una volta sola** il giorno dopo se non
hai confermato. Lo stato sta in `config.ricariche`, con chiave il **lunedì**
della settimana e non il giorno della conferma — altrimenti ricaricare in
ritardo martedì farebbe ricomparire l'avviso il lunedì successivo.

La regola era: l'avanzo **non si azzera**. Chi arriva a domenica con 40 €
lunedì ne ha 170. Azzerare premierebbe chi spende tutto entro sabato.

**Tolta la regola del costo casa** e `risparmioReale()` che la usava.

---

## 27 agosto — lo stallo a `up` pari (finanze)

Sintomo: sull'iPhone una scadenza già pagata continuava a comparire, su
Windows no. Sembrava «l'iPhone non sincronizza». Non lo era.

`segnaScadenzaPagata` scriveva `pagato` dentro il record **senza alzare
`up`**. Premere «Paga» fa due cose — il movimento e la spunta — e solo la
prima viaggiava: il movimento nasce con il suo `up`, la spunta no.

Da lì il guasto vero, che non è una perdita di dato ma un **conflitto
perpetuo**: `fondiRecord` a parità di `up` dà ragione al locale, quindi ogni
dispositivo teneva la propria versione e la rimandava indietro al giro dopo.
Nella storia di `atlas-dati` si vede a occhio — `pagato` che alterna `null`
e la data ogni pochi secondi, con l'`up` del record **costante**.

È il modo di guardare che conta: *un campo che alterna mentre il suo `up`
non si muove* è sempre questo guasto.

Lo stesso schema c'era sui pocket, per via del backfill di `ancoraDa` nella
migrazione a v6. Lì però `up` **non** va alzato, ed è scritto nel codice: il
backfill è una supposizione locale che su un dispositivo senza `pocketDa`
vale `null`, e alzandogli `up` quel `null` vincerebbe sull'ancora vera.
Deve perdere. Si esce con un tocco su «Salva i saldi», che riancora davvero.

**Regola:** chi scrive dentro un record che si fonde per `up` deve alzarlo.
Il modello è `salvaRicorrente`. Le eccezioni vanno motivate sul posto.

## 27 agosto — la riga di OGGI (finanze)

La scheda diceva solo la settimana, e la settimana si legge troppo tardi:
«restano 171,84 € e 4 giorni» è vero anche il giovedì sera dopo aver
bruciato metà budget. Sotto al numero c'è ora la giornata: quanto è uscito
oggi dal Principale e quanto poteva uscirne.

**La quota di oggi non si calcola su quello che resta ora.** Dividendo il
saldo attuale per i giorni che restano, la quota scende insieme al saldo
mentre spendi: spesi 100 €, si riabbassa da sé e resti sempre «in pari».
Un metro che si accorcia mentre lo usi non misura niente. Si rimettono
indietro le uscite del giorno, così il dividendo sta fermo dalla mattina
alla sera.

Indietro vanno **solo le uscite**, non l'effetto netto: la ricarica del
lunedì arriva oggi, e togliendo anche le entrate il lunedì la quota
risultava zero — «non spendere altro» nel giorno in cui hai appena
ricaricato. Provato: lunedì con 130 appena arrivati dà 18,57 €.

Prende il posto della vecchia riga del ritmo invece di aggiungersi. Due
numeri «al giorno» sulla stessa scheda, calcolati su basi diverse, sono il
modo più rapido per rendere illeggibile la cosa che dovrebbe chiarire.

Ambra e non rosso quando sei oltre: sforare di un giorno si recupera, e il
rosso resta alla settimana, dove il guaio è vero.

**Aperta:** «% consumato» si calcola come `budget − resta`, quindi con
l'avanzo della settimana prima riportato sul Principale dice `0%` anche in
un giorno da 108 €. Non è falso — quei soldi non sono i 130 di questa
settimana — ma accanto alla riga di oggi si legge come una contraddizione.

## 27 agosto — la Costanza diceva il contrario della verità

La carta annunciava «5 giorni di fila» e «7/7» su una settimana in cui le
abitudini erano state quasi tutte dichiarate «non la faccio». Due difetti,
e nessuno dei due nel modulo Abitudini: `fattaIl()` è sempre stato corretto.

1. Il numero grande era `Math.max` fra le serie di **tutti** i moduli: la
   striscia di Mobilità si travestiva da costanza delle abitudini.
2. Le sette caselle si accendevano se la lavagna di quel giorno aveva un
   fatto QUALSIASI. Lunedì 24, zero abitudini su sei, era verde pieno
   perché quel giorno era stata segnata una spesa.

Adesso la carta legge `abitudini.spuntate` e `abitudini.attese` dalla
lavagna — le abitudini sono le uniche con un **denominatore**, ed è il
denominatore a rendere misurabile la costanza. Senza, «ho fatto qualcosa»
è vero tutti i giorni e non vuol dire niente.

Quattro stati per giorno invece di due: pieno, parziale (riempimento
proporzionale: 1 su 6 si vede che è un sesto), vuoto, e riposo — un giorno
senza niente in programma non è un fallimento e non spezza la serie.

La serie conta i giorni con **almeno una spunta**, perché non tutte le
giornate saranno piene e un contatore che si azzera al primo giorno
parziale si smette di guardare. Ma un giorno a zero la spezza: dichiarare
«non lo faccio» non è farlo. Oggi non spezza mai — alle otto di mattina non
hai ancora mancato niente.

Se la serie è fatta di sole giornate parziali il numero è grigio e la frase
lo dice («3 giorni di fila, ma nessuno completo»): i complimenti arrivano
solo quando sono guadagnati. In alto a destra il rapporto vero della
settimana, spuntate su attese — con i dati veri, 14/36 invece di 7/7.

---

## 21 settembre — il sistema visivo e' iOS 27 (chat ATLAS)

Lo stile di ATLAS e' stato azzerato (6.041 righe) e ricostruito da zero su
**iOS 27**, prendendo i token da
[`seunghan91/ios27-design-system`](https://github.com/seunghan91/ios27-design-system)
(MIT). Il documento del linguaggio e' `docs/DESIGN.md`, da rileggere prima
di aggiungere una schermata.

**Perche' quel repo e non un'imitazione a occhio.** I valori sono
MISURATI: colori e metriche dallo UI Kit 27.0.2 con il nodo Figma annotato
token per token, il materiale Liquid Glass ricavato fotografando un
pannello `.glassEffect()` sul simulatore e adattando il profilo del bordo a
una funzione d'errore, le metriche dei componenti lette a runtime via
UIKit.

Il repo distribuisce npm; ATLAS non ha build (regola 8), quindi i token
sono **riscritti a mano** in `styles/tokens.css` dai sorgenti JSON. Chi
aggiorna riparte da `packages/tokens/src/*.json`.

### Cosa cambia per le chat dei moduli

- **I nomi dei token NON sono cambiati.** Il ponte in fondo a `tokens.css`
  regge tutto il vocabolario di prima (`--scheda`, `--testo-2`, `--s3`,
  `--t-17`, `--r-scheda`...). I valori sotto pero' sono quelli di Apple.
- **Gli accenti dei moduli** sono i dodici di sistema: Oggi blu, Finanze
  arancio, Pasti rosa, Mobilita' menta, Training rosso, Abitudini indaco,
  Impostazioni blu.
- **`scheda(titolo, corpo, { ico })`** disegna da se' il chip d'icona nella
  testata — il quadratino pieno delle Impostazioni di iOS.
- **`.sett`** e' la striscia della settimana condivisa (home, Abitudini,
  Corpo): sette tondi come il Calendario di iOS.
- **Un pulsante porta sempre l'accento del modulo.** Non c'e' un secondo
  colore per le azioni.

### Debito noto

`moduli/mobilita/oggi.js` non e' piu' ricopiabile da
`mobility_to_consider/js/` con i tre passaggi meccanici del suo briefing:
usa i componenti condivisi. Quella strategia e un sistema visivo unico sono
incompatibili — o il file resta una copia dell'app vecchia, o Corpo
somiglia al resto.

---

## 2 settembre — la home: l'avanzo ha un posto suo (chat ATLAS)

`moduli/oggi/`. Il difetto per cui «ogni volta che cambia la roba nelle
carte si sminchia» non era una serie di sviste: era che la colonna di
sinistra aveva **una carta sola**.

Le due colonne hanno contenuto indipendente e variabile. Misurato su sei
scenari di contenuto, lo scarto fra le loro altezze va da 26 a 319px **e
cambia segno**. Con una carta sola a sinistra quell'avanzo poteva solo
finire dentro Finanze o sotto Finanze, cioè nei due punti in cui si legge
come un guasto — e infatti in quattro tentativi si è solo spostato.

Adesso: **due colonne di due carte**, `I moduli` scende da sotto la griglia
dentro la colonna di sinistra, e in mezzo a ogni colonna c'è una **molla**
che si allunga fino a 76px. Lo spazio fra due carte è spazio che ci si
aspetta di trovare. Oltre il tetto, il resto torna a essere uno scalino in
fondo alla colonna più corta, che però non ha più la striscia sotto a
fargli da riga.

Due cose emerse strada facendo, utili anche altrove:

- **la striscia a tre celle non sta in mezza colonna.** A 1000px di finestra
  le celle scendono a 110px e il *nome* del modulo viene compresso a zero:
  restava il valore senza sapere di che cosa. Ora sono tessere col valore a
  capo, e la carta passa da 239 a 158px.
- **gli `order` del telefono restavano attivi da scrivania.** Rimetterli a 0
  con `.og-col > *` non basta: pesa meno di `.og-col-dx > .og-resta` e
  perde. Stanno in un `max-width`.

Verificato su 6 scenari x 3 larghezze: colonne sempre allineate in cima,
sotto l'ultimo contenuto di ogni carta sempre e solo i 20px del padding,
scalino residuo fra 0 e 137px.

## 2 settembre — i bip di Mobilità (chat ATLAS, **fuori perimetro**)

⚠️ Ho toccato `moduli/mobilita/engine.js`, che è della chat Mobilità. Su
richiesta diretta dell'utente («i suoni per mobilità non funzionano, fix
permanente»). Nessun altro file di Mobilità è stato toccato, e `engine.js`
non è fra quelli che il briefing dice di ricopiare da
`mobility_to_consider/js/`, quindi la modifica non è a rischio di essere
sovrascritta da un ricopiaggio.

**Il commento nel file diceva il vero e la causa era un'altra.** Il percorso
del gesto era corretto (`avvia()` parte dentro il click su «Inizia»,
`AudioContext` in stato `running`), ma su iOS il Web Audio sta nella
categoria audio "ambient", che **l'interruttore Silenzioso azzittisce**. Un
contesto perfettamente sbloccato resta muto con la levetta su silenzioso —
ed è così che si tiene il telefono mentre si fa mobilità.

I bip passano da elementi `<audio>`, che stanno in "playback" e ignorano la
levetta. Le clip sono cinque WAV **generati in JS** e tenuti come data URI
(32 KB in tutto): un asset esterno voleva dire una fetch che offline può
fallire e cinque file da versionare nel guscio. Il Web Audio resta come
ripiego se il browser rifiuta il `play()`.

Lo sblocco è in due passaggi perché il permesso su iOS è **per elemento**:
al primo tocco sulla pagina le clip si armano **mute**, e al tocco su
«Inizia» si riarmano non mute fermandole nello stesso istante — se si
aspettasse la conferma del browser si sentirebbero cinque note in faccia.

Non ho potuto provare su iPhone da qui. Verificato: i WAV si decodificano
alle durate esatte, e in una sequenza 3-2-1-via partono 5 `play()` su 5,
non muti, da timer.

## 2 settembre, sera — una migrazione ha riportato indietro `meta` (chat ATLAS)

**Il guasto peggiore finora, e l'ho causato io.** Alzando la soglia della
migrazione a `v < 7` (commit 72fe67f) ho fatto **rieseguire l'intero blocco
di `migra()` su ogni dispositivo**. Su uno dei due lo stato locale di `meta`
era in gran parte quello di fabbrica, e nella fusione ha vinto lui.

La firma è inequivocabile: `profili.ago.cassaCats` è tornata **esattamente**
ai tre valori di `CATEGORIE_CASSA`, e `rules` a zero. Sono i valori di
`PREDEFINITO`, non un troncamento casuale.

Perso fra le 19:52 e le 20:52: 17 regole apprese, 6 check giornalieri,
`cassaCats` da 9 a 3, `pocketDa` dal 27 ago a oggi, e `previsti[0].pagatoIl`
(la maxi rata, che è ricomparsa in «In arrivo»). **Non** perso: 191
movimenti, 10 lapidi, 10 ricorrenti, i quattro saldi e le quattro ancore —
identici da ieri sera.

Ripristinato con una scrittura chirurgica su `finanze.json` (commit
`adf69d7d` in atlas-dati): presi da `29e9e02d` i cinque campi persi, tenuto
tutto il resto della versione corrente, `meta.up` portato ad adesso perché
vinca su entrambi i dispositivi alla prima lettura. Riletto dal repo e
verificato campo per campo.

### Le due lezioni, che valgono per tutte le chat

1. **Una migrazione che riscrive lo stato condiviso non si spedisce senza
   aver prima letto il repo dati.** Il codice di `migra()` è idempotente
   campo per campo, ma *rieseguirlo* riapre la porta alla fusione di `meta`,
   e `meta` si fonde a blocchi.
2. **`meta` resta il punto debole.** `cats`, `profili`, `rules`, `config` e
   `soglie` si fondono sul confronto di un solo `metaUp`: un dispositivo con
   lo stato di fabbrica e un `metaUp` fresco cancella il lavoro dell'altro.
   Movimenti, ricorrenti, previsti e pocket sono già usciti da lì e si
   fondono per record. **Vanno portati fuori anche gli altri cinque**, o
   almeno `rules` e `config.checks`, che sono quelli che si accumulano nel
   tempo e che perderli fa più male. → richiesta aperta per la chat Finanze.

## 2 settembre, tarda sera — «Questo mese» non era un mese (chat ATLAS)

La carta delle categorie si intitolava «Questo mese» e mostrava il **ciclo
dello stipendio** (21 → 20), mentre la carta subito sotto chiamava la stessa
finestra «questo ciclo». Due nomi per la stessa cosa, e chi legge non ha modo
di sapere quale sta guardando.

Il 2 settembre la differenza non è un dettaglio: nel ciclo aperto il 21
agosto ci sono **26 uscite su 27 datate agosto** (656,59 €) e una sola di
settembre (12,46 €). «Questo mese: 168 € di cibo fuori» era agosto.

Adesso la carta si chiama «Le categorie» e ha due viste, **Ciclo** (default)
e **Mese solare**, con sotto la riga che dice quale conta e perché — più il
nome del profilo di budget, che spiega da dove escono numeri come «50 €» su
Casa e utenze. Aggiunte `categorieTra()` e `categorieDelMese()` in
calcolo.js; `categorieDelCiclo()` è ora un involucro della prima.

**Il profilo NON si tocca.** Il ciclo 21 ago–20 set usa il profilo Agosto
perché `chiaveProfilo` guarda il mese d'inizio, e sembrava sbagliato — due
terzi del ciclo sono settembre. Verificato sui dati veri: le spese di quel
ciclo stanno quasi tutte negli undici giorni di agosto, cioè dove il profilo
ferie ha senso. Passare a Regime avrebbe portato Auto da 238/300 a 238/120.
Era una correzione plausibile e sbagliata, ed è la seconda della giornata
che i dati veri hanno fermato prima che partisse.

Spedito dentro il commit 20b8cd8 insieme al lavoro sull'icona: era da tenere
separato, prefisso `finanze:`.

## 3 settembre — la gara che il ripristino perdeva sempre (chat ATLAS)

Il ripristino del 2 sera (`adf69d7d`) è stato cancellato di nuovo dopo
diciotto minuti. La sequenza, leggibile nei commit di atlas-dati:

| ora (UTC) | cosa |
|---|---|
| 21:17 | ripristino: il repo ha 17 regole e 6 check |
| 21:22–21:24 | il telefono salva i saldi → `metaUp` LOCALE sale, prima di leggere |
| 21:24 | legge, e rifiuta il blocco remoto perché «vecchio» |
| 21:35 | rispedisce il suo, che di regole ne ha zero |

Non era sfortuna: **è una gara che chi ha i dati buoni perde sempre**,
perché qualunque scrittura locale — perfino salvare i saldi — alza
`metaUp` e chiude il cancello in faccia al blocco remoto.

Risolto alla radice: `rules` e `config.checks` **si uniscono sempre, fuori
dal cancello**. Sono storia, non impostazioni: si aggiungono e non si
tolgono mai, e l'unione non può far perdere una chiave. Un dispositivo con
la memoria vuota adesso al massimo non aggiunge.

Ripristino rifatto sopra lo stato corrente (`d760ef65`), così i saldi
riancorati il 2 set restano: Principale 109,22 · Cassa 190,71 · Fisse 0 ·
ING 1169,59, tutti ancorati al 2026-09-02.

**Resta aperto `profili`.** È ancora un blocco unico dietro `metaUp`, ed è
il motivo per cui `cassaCats` è passata da 9 a 3 due volte. Stessa cura dei
ricorrenti: farne record con `up` proprio. → richiesta per la chat Finanze.

## 5 settembre — la maxi rata che ricompariva (chat ATLAS)

Quattro volte in tre giorni. Le prime tre le ho attribuite ad altro — alla
migrazione v7, poi alla gara su `metaUp` — ed erano guasti veri, ma non
questo. La causa vera è una riga in `previstiIniziali()`:

```js
up: Date.now(),   // era così
up: 0,            // è così adesso
```

Quel record è un valore di FABBRICA: lo scrive la migrazione quando
`st.previsti` non è un array, cioè su ogni dispositivo che riparte con la
memoria vuota. Timbrato con l'ora di adesso vince **sempre** la fusione, e
riporta `pagatoIl: null` sopra il «pagata il 30 agosto» che stava nel repo.
Non è un dato che torna: è un dato che ogni volta vince.

La regola era già scritta due volte nello stesso file — per i ricorrenti
(«`up` a zero e non a `Date.now()`: un record senza timestamp è un record
che non ha mai vinto un confronto») e per i pocket. Su `previsti` mancava.

**Lezione per tutte le chat: qualunque valore di fabbrica va scritto con
`up: 0`.** Se un default può battere una scrittura dell'utente, prima o poi
la batte.

### Cosa resta rotto, in ordine di rischio

1. **`profili` è ancora un blocco dietro `metaUp`.** `cassaCats` è passata
   da 9 a 3 tre volte. Va spezzato in record con `up` proprio, come i
   ricorrenti.
2. **`aggiustamenti2608` fa `st.metaUp = Date.now()`.** Gira su ogni
   dispositivo dove `config.mig2608` manca — cioè proprio su quello con la
   configurazione più povera — e gli regala il cancello. Oggi è dormiente
   (`mig2608` è true nel repo) ma è una mina.
3. **A monte c'è un dispositivo che perde la memoria locale** e riparte dai
   default. Finché succede, ogni valore di fabbrica è un candidato a
   sovrascrivere il dato vero: è il motivo per cui il punto 1 e il punto 2
   contano davvero.

## 6 settembre — i contanti sono un pocket (chat ATLAS, fuori perimetro)

Richiesta: «aggiungi come metodo di pagamento anche contanti». Fatto come
**pocket**, non come metodo, ed è la stessa distinzione dei pocket: i soldi
non li paghi «in contanti», li paghi CON i contanti che hai in tasca, e
quelli sono un posto dove il denaro sta. Prelevare è un giroconto
Principale → Contanti, spendere è un'uscita dai Contanti. Così il Principale
cala il giorno del prelievo — quando quei soldi smettono di essere
disponibili per altro — e non due settimane dopo.

`tipo: "spendibile"` come il Principale, e la settimana e la giornata adesso
sommano **tutte** le tasche spendibili invece del solo Principale
(`pocketSpendibili()` legge dal tipo, non da un elenco di id). Con più ancore
vale la più recente.

Verificato:
- senza movimenti in contanti i numeri non cambiano di un centesimo —
  «resta questa settimana» era e resta 109,22 €;
- prelievo 50 + spesa 12 in contanti → Principale 59,22, Contanti 38,00,
  somma 97,22, `speso` 12,00, e l'invariante `resta + speso = disponibile`
  tiene (97,22 + 12 = 109,22).

**Il pocket si aggiunge FUORI dal blocco di `migra()`**, con una guardia sua
(«esiste?») e `up: 0`. Alzare la soglia della migrazione è quello che il 2
settembre ha cancellato regole e check: un campo nuovo si aggiunge da solo
senza svegliare il resto. Nota: `migra()` aveva un `return` anticipato che
saltava tutto ciò che veniva dopo — è diventato un `if`, ma gli
`aggiustamenti2608` restano legati a `serve` esattamente com'erano, perché
lì dentro ci sono importi di fabbrica che a `up` pari batterebbero i veri.

## 11 settembre — le notifiche erano spente da un valore di fabbrica (chat ATLAS)

**Quarta volta che si ripete lo stesso schema.** Le notifiche non arrivavano
dal **1° settembre alle 10:09** — l'ultimo invio registrato in
`stato-notifiche.json`. Il workflow `promemoria.yml` in atlas-dati gira
regolarmente ogni dieci minuti: non aveva niente da mandare.

In `notifiche.json` le tre levette erano **tutte spente**, con `up: 0`. La
cronologia del file le mostra rimbalzare fra acceso e spento dal 25 agosto,
e fermarsi su spento il 2 settembre alle 20:52 — lo stesso minuto in cui il
dispositivo con lo stato di fabbrica ha appiattito anche `finanze.json`.

Due difetti, tutti e due in `core/notifiche.js`:

1. **`scriviOrari()` non alzava `up`.** Accendere una levetta cambiava
   `orari` e lasciava il timestamp dov'era — zero, su un dispositivo che non
   l'aveva mai avuto. La scelta dell'utente non poteva vincere un confronto,
   e il valore di fabbrica la sostituiva al primo giro.
2. **`applica()` adottava gli orari remoti senza prenderne il `up`.** Il
   dispositivo si teneva i valori buoni ma restava convinto di avere
   `up: 0`, quindi li rispediva marcati «mai scritti da nessuno».

La regola, per la quarta volta: **un valore di fabbrica va scritto con
`up: 0`, e una scelta dell'utente va SEMPRE timbrata.** Se una delle due
manca, prima o poi la fabbrica vince.

Restano da controllare con lo stesso metro gli altri moduli: ovunque ci sia
un blocco che si fonde su un `up` solo, verificare che chi lo modifica lo
alzi e chi lo adotta se lo prenda.

## 11 settembre, sera — l'orizzonte, e il numero che mentiva pur essendo giusto

«Questa settimana · 137,40 € · restano · 3 giorni a lunedì». Il numero era
esatto — 67,40 sul Principale più 70,00 in Contanti — ma l'etichetta lo
faceva leggere al contrario, e il «al giorno» era **45,80**.

Il difetto vero non era il testo: era il **denominatore**. La quota si
calcolava sui giorni che mancano a lunedì, come se lunedì arrivassero soldi.
Non arrivano: la ricarica settimanale esce dalla Cassa, e nella Cassa c'erano
72 centesimi. Quei 137,40 dovevano bastare fino al **20**, cioè dieci giorni,
cioè **13,74 al giorno**. L'app ne autorizzava più del triplo.

`orizzonte(iso)` in calcolo.js: fine del ciclo dello stipendio, giorni che
mancano, somma delle tasche spendibili, quanto fa al giorno, e il rapporto
con il ritmo che il piano prevedeva (`cassaSettimanale / 7`). Da lì escono
**sia** il numero grande **sia** la quota di `giornata()` — prima uscivano da
due conti diversi e potevano contraddirsi sulla stessa scheda.

Il colore segue il rapporto: sotto il piano ambra, sotto il 60% rosso, e una
riga che dice di quanto sei sotto. Sopra il piano non si scrive niente.

Sui dati veri dell'11 settembre: 137,40 € · fino al 20 set · 10 giorni ·
13,74 al giorno · piano 18,57 · rapporto 0,74 → **stretto**. E la giornata:
speso 60,84 su una quota di 19,82 → **grave**, 3,1 giorni bruciati in uno.

**Da sistemare, ed è suo:** `config.giornoStipendio` vale 21, ma lui dice che
lo stipendio arriva il 23. Finché resta 21 l'orizzonte è corto di due giorni.
Si cambia in Impostazioni → Finanze.

---

## 12 settembre — la skincare, e il mittente che non sapeva delle parti (chat ATLAS, perimetro Abitudini)

Sei passaggi in due momenti: **Cleanser · Idratante · SPF** la mattina,
**Cleanser · Benzac 5% · Idratante** la sera. Le parti c'erano già — sono
nate per gli integratori — ma reggevano un elenco di pastiglie, non una
routine. Mancavano tre cose.

**Un promemoria per fascia.** `remind` era uno solo per abitudine. La
skincare ne vuole due, a quattordici ore di distanza, e gli integratori tre.
Ora sta in `h.orari = { mattina: "08:00", sera: "22:30" }`, e l'editor mostra
un campo per ogni momento **che le parti usano davvero**: cinque orari di cui
tre inutili sono un modo lento di nascondere i due che contano.

**`h.sequenza`.** L'ordine è una regola solo per certe routine: il detergente
prima di tutto e la protezione solare per ultima è chimica, mentre fra
magnesio e creatina un ordine non c'è. Chi lo dichiara si prende i numeri dei
passaggi; gli altri no, perché numerarli inventerebbe una precedenza falsa.

**Le parti raccolte per momento**, con l'ora e il conto nell'intestazione.
«2/3» dice a colpo d'occhio che una routine è cominciata e non finita, che è
lo stato in cui si sbaglia. Vale anche per gli integratori.

### Il guasto nel mittente, che era latente e non lo sarebbe rimasto

`notifiche.js` in atlas-dati costruisce `fatte` dai log del giorno per `l.h`.
Una parte però scrive il log sotto **`<habitId>#<parteId>`**: l'id nudo del
genitore non compare mai. Quindi `fatte.has(h.id)` era **falso anche a
routine completata**, e il primo `remind` messo su un'abitudine con parti
avrebbe suonato ogni sera anche dopo averle fatte tutte. Nessuno l'aveva
ancora visto solo perché nessuna abitudine con parti aveva un `remind`.

Adesso chi ha le parti guarda **le parti**, una notifica per fascia con
dentro i nomi di quello che manca — «Benzac 5%» si fa stando fermi dieci
secondi, «2 cose da fare» va aperta per sapere cosa sono — e il `remind` del
genitore non si guarda affatto. Chiave `ab:<id>:<fascia>:<data>` con la data
in fondo, che è quello che la potatura riconosce; tag `ab:<id>:<fascia>`,
perché la sera non deve sostituire sullo schermo il mattino ancora aperto.

### La semina, e perché ha due lucchetti

Sei passaggi da scrivere a dito sono mezz'ora per una cosa che si sa già,
quindi l'app compone la routine. **Una volta.**

`semi` è l'elenco di quello che è già stato composto e si fonde per
**unione**, fuori dal cancello di `metaUp`: un insieme che cresce e basta non
può perdere un confronto, mentre tutto ciò che sta dentro `meta` lo perde in
blocco appena arriva un dispositivo di fabbrica — è il guasto del 2
settembre. Il secondo lucchetto è l'**id fisso**: se l'abitudine c'è, viva o
con la lapide sopra, non si ricrea. Cancellarla resta una decisione.

E si semina **dopo la prima lettura**, mai all'avvio. Seminare prima di aver
letto è lo stesso identico errore dello scrivere prima di aver letto, e
produce lo stesso danno: il telefono appena installato rimette in vita
l'abitudine cancellata dall'altro, con un `up` più fresco della lapide.

**Da fare, ed è suo:** aprire ATLAS una volta perché la routine arrivi in
`abitudini.json`. Prima che ci arrivi, il mittente non ha niente da mandare.

**Resta aperto:** Mobilità non è mai stata passata al setaccio del «valore di
fabbrica / `up`», e in Abitudini `meta` (tema e inizio settimana) sta ancora
dietro il cancello di `metaUp`. Sono due voci, il danno possibile è piccolo,
ma è lo stesso schema che ha già colpito quattro volte.

---

## 12 settembre, sera — le notifiche non arrivano perché il cron non gira (chat ATLAS)

Il mittente è sano: un `workflow_dispatch` a mano ha consegnato «Mobilità» e
«Due minuti bastano» a **2 dispositivi su 2**. VAPID, iscrizioni, service
worker, la logica nuova delle parti: tutto funziona.

**Il guasto è lo `schedule` di GitHub.** `promemoria.yml` chiedeva
`*/10 * * * *`, cioè 144 giri al giorno. Ne arrivavano **sei**. I divari
misurati fra un giro e l'altro, l'11 e il 12 settembre:

```
122 · 274 · 267 · 267 · 217 · 154 · 152 · 127 · 270 · 255 · 219 · 194 · 138 · 116   (minuti)
```

La finestra d'invio è **180 minuti** (`ora.minuti - n.quando > 180` →
scartato). Sette di quei quattordici divari la superano: un promemoria che
cade dentro uno di quelli non viene mandato **mai**, e nessuno se ne accorge
perché il giro dopo lo considera già vecchio. Non è un ritardo, è una
consegna persa — ed è la spiegazione di «a volte arrivano, a volte no».

Lo `schedule` di GitHub non è una sveglia. La documentazione lo dice: gli
eventi programmati vengono ritardati sotto carico e **possono essere
scartati**, e più fitto è il cron più vengono scartati. In più 144 giri al
giorno su un repo privato sono ~4300 minuti al mese contro i 2000 gratuiti:
anche se fossero stati concessi, sarebbero finiti a metà mese.

**Mitigazione applicata** (non risolutiva): il cron ora chiede poco ma nelle
ore che contano — `*/10 5-8,18-21` in UTC, che copre Roma 07–11 e 20–24 sia
con l'ora legale sia con quella solare, più una rete larga ogni due ore nel
resto della giornata. 56 giri al giorno invece di 144: dentro il piano
gratuito, e meno roba da scartare. **Alle 20:44 UTC, dentro la fascia, il
giro delle 20:40 non era comunque arrivato.**

**La correzione vera è un orologio esterno.** Un servizio di cron gratuito
(cron-job.org e simili) che chiama
`POST /repos/napema/atlas-dati/actions/workflows/promemoria.yml/dispatches`
ogni dieci minuti nelle fasce utili. Preciso al minuto, indipendente da
GitHub, e serve **un token fine-grained con il solo permesso «Actions: read
and write» su atlas-dati** — che non può leggere nessun dato.

Scartate, e perché:

- **Una routine di Claude sul desktop**: gira solo mentre l'app è aperta sul
  PC. Per una sveglia alle 08:00 è peggio di GitHub.
- **Un job lungo che dorme** dentro Actions: su repo privato i minuti sono
  contati (2000/mese), e un job che veglia 24 ore ne brucia 1440 al giorno.
  Sul repo pubblico i minuti sono illimitati, ma il mittente andrebbe
  spostato lì insieme alla chiave VAPID privata.
- **Notifiche locali dal service worker**: su iOS non esistono. Senza push
  da un server non c'è sveglia.

## ⚠️ Il token di atlas-dati è pubblico, e non per errore

`config.js` è **tracciato** nel repo `napema/atlas`, che è pubblico. Il token
si legge senza autenticazione da `raw.githubusercontent.com` e da
`napema.github.io/atlas/config.js` (HTTP 200 tutti e due).

Non è una svista: una PWA statica senza backend deve avere la credenziale nel
browser per parlare con l'API, e l'intestazione di `config.js` lo dice già.
Ma il baratto è stato accettato quando i dati erano di prova. Oggi
`atlas-dati` contiene stipendio, saldi, spese e **le iscrizioni push** — chi
ha quel token legge le une e può mandare notifiche al telefono con le altre.

Va deciso, non lasciato lì. Le strade vere sono tre: tenerlo così
sapendolo, mettere un piccolo proxy davanti (Cloudflare Worker gratuito) che
tenga il token e parli lui con GitHub, oppure rendere privato anche il repo
dell'app — che però richiede Pages su repo privato, cioè un piano a pagamento.

### Risolto la sera stessa — l'orologio è uscito da GitHub

La sveglia non è più `schedule`. Un cron esterno (cron-job.org, fuso
Europe/Rome) chiama `workflow_dispatch` con
`0,10,20,30,40,50 7-9,20-23 * * *`: 42 chiamate al giorno, dieci minuti di
precisione nelle due fasce che contengono tutti i promemoria — skincare 08:00
e 22:30, pagamenti 08:30, meditazione 09:24, mobilità 21:00, finanze 21:30,
recupero 22:15.

Verificato dai due capi: la risposta del test dice `204 No Content` alle
`21:01:47 GMT`, e su GitHub c'è un run `workflow_dispatch` partito a
`2026-09-12T21:01:47Z`. Stesso secondo.

Il token è un fine-grained con **`actions=write` e nient'altro**: legge
`finanze.json` → **403**, lancia il workflow → **204**. Il primo tentativo
aveva per sbaglio `contents` invece di `actions` — leggeva i dati e non
sapeva lanciare niente — ed è stato revocato (→ 401).

Lo `schedule` dentro atlas-dati è sceso a **quattro giri al giorno**
(`30 6,7,19,20 * * *` UTC, dentro le fasce con entrambe le ore legali). Non è
più l'orologio: è la rete che evita il buio totale se la sveglia esterna
muore. È anche una questione di conto — 2000 minuti gratuiti al mese, ogni
giro fatturato come un minuto intero: il cron esterno ne consuma ~1260, la
rete ~120, e lasciare qui una frequenza alta avrebbe sforato il piano a metà
mese, spegnendo le notifiche da sole.

**E adesso il silenzio si fa sentire.** Su cron-job.org è acceso l'avviso di
fallimento dopo due tentativi: la ragione per cui questo guasto è durato
giorni è che quando la sveglia smette non lo dice nessuno — nessun errore,
nessun log, solo notifiche che non arrivano mentre tu pensi di aver già fatto
tutto.

Nota per il futuro: GitHub risponde con `Deprecation: 10 Mar 2026` e
`Sunset: 10 Mar 2028` sulla versione d'API `2022-11-28` scelta in automatico.
Non è urgente, ma è la prossima cosa che romperà questa catena in silenzio.

---

## 13 settembre — il quinto modulo: Allenamenti (chat ATLAS)

Tredici settimane verso i **5 km sotto i venti minuti**, dal piano del
personal trainer. Parte **lunedì 14 settembre**, non il 15 che c'era sul
foglio: il 15 era un martedì, e far partire la settimana 1 di martedì
avrebbe spezzato in due ogni conteggio settimanale per tre mesi. Dal 14 le
tredici settimane sono lunedì→domenica pulite e finiscono domenica 13
dicembre, con il test dentro l'ultima.

`core/registro.js` ha una voce in più: `allenamenti`, tinta `--arancio`,
icona `bersaglio`. Non `corpo`, che è di Mobilità: quello dice «il tuo
corpo», questo dice «un numero da colpire entro dicembre».

### Il piano è codice, non dati

Le tredici settimane stanno in `dati.js` come costante. **Non si seminano
nell'archivio e non si sincronizzano.** È la scelta che rende questo modulo
immune alla classe di guasti che ha morso ATLAS quattro volte: un valore di
fabbrica con un `up` fresco che batte la scrittura vera qui non può nemmeno
presentarsi, perché non esiste nessun valore di fabbrica da sincronizzare.
Nell'archivio ci va solo quello che succede — spunte, giorni scelti, corse.

Gli accessori di palestra non cambiano in tredici settimane: cambia il
carico del lift principale. Sono tenuti una volta sola, e per settimana c'è
solo `carichi`. Non è compattezza: è la forma che rende visibile la
progressione, che è l'unica cosa che si muove.

### Gli slot non hanno un giorno

Il piano dice «3 corse + 3 palestre a settimana, **giorni liberi**: domenica
pianifichi la settimana e piazzi i 6 slot». Quindi niente griglia
lunedì-domenica, e la domanda della schermata non è «cosa tocca oggi» — che
sarebbe una cosa che l'app si inventa — ma **quanti slot restano e quanti
giorni ho per piazzarli**. Il numero grande è quello, e diventa ambra quando
gli slot aperti sono più dei giorni rimasti. Non è pessimismo, è aritmetica.

### Gli id deterministici, di nuovo

Uno slot è `s03-qualita`, una corsa è `c-2026-09-15-6210` (data + metri).
Reimportare lo stesso export di Garmin **non raddoppia i km**, che sono
l'unico numero per cui questo modulo esiste. È la lezione dei log di
Abitudini (`habitId|data`) applicata qui.

### L'import

Due direzioni, e sono cose diverse. Le **corse fatte** entrano dal CSV di
Garmin Connect: il lettore riconosce le intestazioni in italiano e in
inglese, scarta bici e nuoto, e legge `6,21` e `1.234,5` senza confondere le
migliaia con i decimali — sbagliare lì significa importare 1,2 km invece di
1234 metri e non accorgersene mai. Gli **allenamenti** entrano da un CSV a
quattro colonne (`settimana,slot,testo,km`) che la chat di fitness sa
produrre; il formato da incollare nella chat si copia da dentro l'app.

Gli allenamenti importati **coprono** il piano, non lo cancellano: lo
scostamento sta nello stesso record della spunta e si toglie da ogni slot.

### Cosa NON fa ancora, e perché è scritto sul pulsante

«Copia per Garmin» **copia**, non carica. Garmin Connect vuole un `.FIT`
costruito byte per byte, Hevy la sua API a pagamento. Sono fattibili tutti e
due ma sono un lavoro a sé, e un pulsante che promette un caricamento e fa
una copia è peggio di uno onesto.

### Provato

Cinquantatré controlli su una copia isolata senza `config.js`: i confini
delle settimane, la progressione dei carichi, la settimana del test con
quattro slot e niente gambe, il CSV di Garmin in italiano, il reimport che
non raddoppia, il tetto del +10%, e la proiezione di Riegel (5,2 km in 33:20
→ 31:59 sui 5 km, che è il numero giusto).

**Un difetto trovato guardando, non provando:** la barra del piano era
`--scheda-viva` sul binario `--traccia`, cioè un grigio su un altro grigio.
La legenda prometteva tre colori e sullo schermo se ne vedevano due, e le
settimane non ancora corse sembravano vuote invece che programmate. Ora è
l'accento al 25%.

**Aperto:** la barra in basso ha sei schede. Su iPhone ci stanno, ma è il
limite — il prossimo modulo obbliga a ripensarla.

---

## 14 settembre — la sveglia esterna funziona davvero (chat ATLAS)

Ventiquattro ore dopo, la prova che mancava. In `stato-notifiche.json`:

```
ab:h_skincare:mattina:2026-09-13
ab:h_skincare:sera:2026-09-13
ab:msnpry7ugxqqg4q:2026-09-13        (Meditazione)
mo:sessione:2026-09-13
ab:h_skincare:mattina:2026-09-14     ← la prima mattina vera
fi:ric:1:2026-09-14                  (la ricarica del lunedì)
```

E i giri del workflow di stamattina, tutti `workflow_dispatch`:

```
05:30 · 05:40 · 05:50 · 06:00 · 06:10 · 06:20   UTC
```

Cioè **07:30–08:20 di Roma, uno ogni dieci minuti esatti**, che è la finestra
configurata su cron-job.org. Da sei giri al giorno con divari fino a 274
minuti a una cadenza puntuale: il guasto è chiuso, e lo dice il file dei dati
invece di una supposizione.

---

## 14 settembre — la passata di UX su Allenamenti, e due difetti miei

**La barra torna a cinque.** Impostazioni esce e diventa un ingranaggio in
alto a destra in Oggi. Il guasto che l'aveva portata nella barra — le
impostazioni dei moduli sparse DENTRO i moduli — l'ha risolto l'averle
radunate in una schermata sola, non l'averle messe fra le schede. E
l'ingranaggio adesso è un ingranaggio: prima erano tre cursori con le
manopole, che è l'icona dei «filtri».

**Due difetti miei, tutti e due invisibili dove li avevo provati.**

1. L'ingranaggio, appoggiato con `position:absolute` in alto a destra,
   finiva **sopra** «Domenica 13 Settembre». Da telefono quell'angolo è
   vuoto; da scrivania è esattamente dove il media query da 900px manda
   `.og-meta`. Il primo rimedio — terza voce della riga — toglieva la
   sovrapposizione e ne creava un'altra: la colonna di destra è stretta e
   mandava a capo tre volte. Ora sta in un gruppo insieme allo stato del
   sync: se vanno a capo, ci vanno in due.
2. La striscia delle settimane restava a sinistra con mezzo schermo vuoto.
   Ora `justify-content: safe center` — e `safe` è la parola che conta:
   senza, centrare un contenuto più largo del contenitore taglia la PRIMA
   settimana e non la si raggiunge più scorrendo, cioè romperebbe proprio il
   telefono.

Provato **misurando i riquadri** a 1200 e a 390 invece di guardarli: nessuna
sovrapposizione fra ingranaggio, data e stato; la striscia scorre solo dove
serve; il centro del numero cade a 22px su una zona utile alta 44.

**Altro nella stessa passata:** i pallini nei riquadri delle settimane
diventano una barra (tredici settimane facevano settantotto puntini, cioè
rumore); le schede smettono di essere una pastiglia di accento a tutta
larghezza e diventano un binario con la pastiglia in rilievo, uguale in
Abitudini; l'icona dell'import non è più una nuvola, perché la nuvola vuol
dire sincronizzazione e lì si fa entrare un file.

**E il piano adesso lo conosce l'app.** «Mai palestra gambe il giorno prima
della qualità» era una riga su un foglio, cioè una cosa da ricordarsi il
martedì sera. ATLAS sa cosa hai spuntato e quando, quindi lo dice quando
serve — compreso che la lunga si può fare lo stesso, perché il piano precisa
che tollera le gambe stanche. La riga compare SOLO quando sa qualcosa che
l'elenco degli slot non mostra da sé: una riga che c'è sempre diventa
arredamento.

**Resta aperto:** `.FIT` per Garmin (lavoro una tantum, ma l'import resta a
tre tocchi perché Garmin non ha un'API aperta per gli allenamenti) e l'API di
Hevy, che invece permetterebbe la creazione vera a un tocco con un
abbonamento Pro. Oggi i pulsanti copiano, e lo dicono.

---

## 14 settembre — Garmin e Hevy: due strade, e non sono la stessa (chat ATLAS)

### Hevy si crea davvero

API aperta, chiave in un header `api-key`, e — la cosa che andava verificata
PRIMA di scrivere una riga — `Access-Control-Allow-Origin: *` con `api-key`
fra gli header ammessi. Senza CORS permissivo la funzione non esisteva:
ATLAS non ha un backend dietro cui nascondersi.

`hevy.js` scarica il catalogo (454 esercizi, una volta e basta), traduce i
nomi del piano e crea la routine. Il vocabolario italiano→inglese elenca i
candidati **in ordine di preferenza** perché Hevy chiama la stessa cosa in
modi diversi a seconda dell'attrezzo: tutti e 19 gli esercizi del blocco
trovano un titolo vero.

```
Stacco    → Deadlift (Barbell)        Squat      → Squat (Barbell)
Polpacci  → Standing Calf Raise (M.)  Lat machine→ Lat Pulldown (Cable)
Tibialis  → Tibialis Raise            Dip        → Triceps Dip
```

**Provata sul serio:** creata «Lower · Settimana 1» sull'account vero.
Dentro c'era Deadlift 5×3 @ 60 kg, Hack Squat 4×8, Seated Leg Curl 3×12,
Lunge 3×12, Standing Calf Raise 4×15, Tibialis Raise 3×20 — cioè il piano,
esatto, zero esercizi persi.

**LA CHIAVE NON SI SINCRONIZZA.** Sta in una casella locale che nessun
`impacchetta` tocca. atlas-dati si legge col token dentro `config.js`, e
`config.js` lo serve GitHub Pages: sincronizzare la chiave di Hevy vorrebbe
dire pubblicarla. Si scrive una volta per dispositivo.

### Garmin no, e non è pigrizia

Non esiste nessuna porta d'ingresso per un allenamento Garmin che non sia un
file `.FIT` binario. Quindi `fit.js` lo costruisce byte per byte — niente
libreria, regola 8 — e il pulsante lo salva; da File lo mandi a Garmin
Connect col foglio di condivisione. Tre tocchi invece di uno, e nessuna app
può fare meglio.

`passi.js` traduce prima il testo del piano in passi strutturati: «15' risc +
5×1000 @ 4:30/km rec 90" + 10' defat» diventa riscaldamento, ripeti 5 volte
(1000 m a 4:30 · recupero 90"), defaticamento. **Tutte e 39 le corse del
blocco vengono lette senza buchi.** Quando non capisce NON inventa: un passo
aperto col testo originale, e la vista lo dice — un orologio che impone dieci
ripetute che non erano nel piano è molto peggio di uno che dice «corri».

Il bersaglio di ritmo è una FINESTRA di ±10 s/km, non un valore: correre
esattamente a 4:30/km non lo fa nessuno e un orologio che bippa a ogni
secondo di scarto si spegne.

### Il bug che ha giustificato il decodificatore

Il `.FIT` si prova **rileggendolo con un lettore indipendente**, scritto da
zero nel banco di prova. È servito subito: la definizione di `workout_step`
dichiarava **otto** campi e ne scriveva **nove**. Il lettore si fermava
all'ottavo, prendeva i tre byte del nono per l'inizio del record successivo,
e da lì leggeva spazzatura. Garmin avrebbe rifiutato il file senza dire
perché, e guardando i byte non si capiva niente.

Dopo la correzione: CRC dell'intestazione e del file giusti, lunghezze
combacianti, cinque passi con gli indici 0..4, il passo RIPETI che torna
all'indice 1 cinque volte, le intensità warmup/interval/recovery/cooldown al
loro posto. Trenta controlli in tutto.

**Resta aperto:** l'import da PDF (servirebbe pdf.js, pesante — se si fa, va
caricato pigramente e solo dentro questo modulo).

---

## 14 settembre, sera — Garmin Connect non importa allenamenti (chat ATLAS)

Il `.FIT` caricato su Connect è diventato un **percorso**. Non è il file a
essere sbagliato: il cookbook FIT di Garmin conferma la struttura — `file_id`
type 5, `workout` con `num_valid_steps`, `workout_step` con indice zero-based,
il passo di ripetizione con `repeatFrom` e `repetitions`, sport Running e
sub-sport **omesso**. Tutto come scritto.

È che **quella porta non esiste**: l'importazione di Garmin Connect sa fare
solo attività e percorsi. La stessa pagina del cookbook dice qual è la porta
vera, e non passa da Connect:

> Plug the device into computer using the USB cable → Garmin folder →
> **NewFiles** folder → place file(s) to be imported in the NewFiles folder.

Quindi due strade, tutte e due dichiarate per quello che sono:

- **dal telefono** — «Copia i passi per Connect»: i passi numerati negli
  appunti, nell'ordine in cui li chiede l'editor (Allenamenti e
  pianificazione → Allenamenti → Crea allenamento). È la strada di nove
  volte su dieci;
- **dal PC** — «Scarica il .FIT per l'orologio»: col cavo, in
  `GARMIN/NewFiles`. Con l'avvertenza esplicita di **non** caricarlo su
  Connect, che è esattamente l'errore che l'ha fatto diventare un percorso.

Nessuna app può fare meglio senza essere partner del programma sviluppatori
di Garmin. Meglio dirlo sul pulsante che lasciarlo scoprire dopo.

### L'ingranaggio, terza e ultima posizione

In alto a destra finiva sopra la data. Dentro la riga della data la
stringeva, e a 18px in mezzo al testo si leggeva come una macchia. Adesso sta
in **colonna 1 della griglia della testata** — la casella che era vuota,
diametralmente opposta a quella della data e sulla stessa riga.

Il punto non è la posizione ma il METODO: l'allineamento lo fa
`align-items: center` della griglia, non un `top` calcolato a mano che va
rifatto ogni volta che cambia un padding. Fuori dalla griglia i due si
allineavano solo per caso aritmetico — ed è lo stesso difetto che quel blocco
aveva già corretto una volta, per la data contro il saluto.

Misurato: **scarto zero** fra il centro dell'ingranaggio e il centro della
riga della data, in tutte e due le disposizioni, e nessuna sovrapposizione.
Su un dito (`pointer: coarse`) il bersaglio sale a 50px e il segno a 25.

### …e come ci si arriva davvero: il JSON, non il .FIT

Il `.FIT` resta giusto e resta utile — è la strada per l'orologio via USB —
ma **dentro Connect non entra nessun file**. Gli allenamenti ci entrano come
JSON, su un'API interna:

```
POST /gc-api/workout-service/workout
connect-csrf-token: <meta name="csrf-token">
x-requested-with: XMLHttpRequest      credentials: include
```

È la stessa porta che usa l'editor di Connect quando premi «Salva». Lo
schema — `workoutSegments`, `ExecutableStepDTO`, `RepeatGroupDTO`,
`endCondition`, `targetType: pace.zone` in m/s — è ricavato da
un'implementazione che funziona, non indovinato.

**ATLAS non può chiamarla da sé**, e non è una scelta: sta su un altro
dominio, quell'API vuole i cookie di sessione e un token letto dalla pagina,
e il browser blocca tutte e tre le cose. L'unica alternativa sarebbe la
password di Garmin, che non si chiede.

Quindi: da ATLAS esce il JSON negli appunti, e a portarlo dentro è un
**segnalibro `javascript:`** che gira DENTRO connect.garmin.com con la
sessione già aperta. Si salva una volta e vale per tutto il blocco. Nessuna
credenziale passa da qui.

Se Garmin rifiuta, il segnalibro mostra **il messaggio del server** invece di
un «errore» generico: su un'API non documentata la risposta è l'unica
diagnosi che esista.

**Non provato fino in fondo, e va detto:** il POST vero non l'ho potuto fare
— non ho la sessione di Garmin e la password non si chiede. Ventuno controlli
verificano la forma del JSON; il verdetto lo dà il primo tocco sul
segnalibro.

---

## 19 settembre — due guasti: notifiche mute e giroconti a metà (chat ATLAS)

### Le notifiche partivano e non arrivavano

Il mittente consegnava tutti i giorni — skincare, riepilogo, sessione,
recupero, meditazione, sempre `2/2` accettati da Apple — e sul telefono non
arrivava niente. Le due iscrizioni in `notifiche.json` erano **dello stesso
iPhone**, del 22 agosto e del 12 settembre.

La causa era in ATLAS. L'app chiedeva «il browser ha un'iscrizione?» e se sì
scriveva «questo dispositivo è iscritto» — senza mai chiedersi se fosse
QUELLA che aveva il server. L'unico momento in cui la scriveva sul server era
il tocco su «Attiva», che una volta iscritti non compariva più. iOS rigenera
le iscrizioni dopo un aggiornamento o una reinstallazione: da lì in poi il
mittente sparava all'endpoint vecchio, Apple accettava e buttava via.

**`riallinea()`** gira a ogni avvio e a ogni ritorno sull'app: se l'iscrizione
del telefono non è fra quelle del server, o c'è con chiavi diverse, la
scrive. Non chiede permessi. La schermata delle notifiche ora dice se il
server conosce QUESTO telefono, e offre «Tieni solo questo dispositivo» per
mettere la lapide alle iscrizioni vecchie — a mano, perché dal telefono non
si può sapere se un'altra iscrizione è un telefono morto o un secondo
dispositivo vivo.

**Le email di GitHub** venivano da due mittenti delle app di partenza ancora
accesi: `mobility-blueprint/push.yml` (fallisce con 410, iscrizione morta) e
`abitudini-dati/notify.yml`. Vanno disattivati — non da qui: sono in repo
diversi e la modifica è stata fermata come risorsa condivisa.

### I giroconti da ING uscivano e non entravano

Nei dati: `extra` del 16 (22 €) e del 18 (60 €), `pocket: ing`,
**`pocketTo: null`**. Uscivano da ING e non entravano da nessuna parte; il
Principale restava a −49,30 dopo il prelievo che doveva riportarlo sopra lo
zero.

Due difetti incastrati nel modulo di inserimento:

1. aprendo direttamente uno sforamento i pocket di partenza erano scritti a
   parte e sbagliati (`principale → niente`); quelli giusti li metteva solo il
   cambio di tipo, che in quel caso non avviene;
2. la pillola mostrava `b.pocketTo || "principale"`: il Principale risultava
   selezionato anche con la destinazione vuota. **Lo schermo diceva una cosa
   e i dati un'altra.**

Ora: una funzione sola per i pocket predefiniti; il ripiego si SCRIVE nella
bozza prima di disegnare, così quello che vedi acceso è quello che salvi; e
un travaso con un estremo solo non si salva.

`completaTravasi()` ripara quelli già salvati — solo i record oggettivamente
rotti, con l'unica destinazione possibile — e gira **dopo la prima lettura**,
non in `migra()`: riparare prima di leggere resusciterebbe un movimento
cancellato sull'altro dispositivo.

Sul caso ricostruito: Principale −49,30 → **10,70 €**. Pesa solo il prelievo
del 18; quello del 16 cade prima dell'ancora ed era già dentro il saldo letto
quel giorno.

**Sulla data:** un movimento datato prima dell'ancora del suo pocket non
cambia il saldo, di proposito — il saldo di quel giorno è stato corretto a
mano e lo contiene già. Retrodatare il giroconto non poteva aiutare.

---

## 20 settembre 2026 — il token esce dal repo pubblico *(core)*

**Riguarda tutte e quattro le chat.** `config.js` non contiene più il token:
`t1`/`t2`/`t3` sono spariti. Chi legge codice vecchio o scrive documentazione
non li rimetta.

Il file lo serviva GitHub Pages da un repo pubblico:
`napema.github.io/atlas/config.js` rispondeva `200` a chiunque, con dentro
lettura e scrittura su `atlas-dati`. Lo stesso valeva per le tre app di
partenza — quattro token, non uno. Lo split in base64 non era un'attenuante
ma il difetto peggiore: serviva a non farsi riconoscere dal secret scanner di
GitHub, cioè a spegnere l'unico allarme che avrebbe revocato il token da
solo.

Ora il token vive in `core/credenziali.js` (`localStorage`, chiave
`atlas-credenziali.v1`) e si incolla in **Impostazioni → Sincronizzazione**,
una volta per dispositivo. `sync.js` lo rilegge a ogni chiamata invece di
fotografarlo all'avvio, e riparte da solo quando arriva a pagina già aperta.

**Due vincoli che valgono per i moduli:**

1. La casella del token sta **fuori** dal prefisso `atlas.` di `storage.js`,
   perché `esportaTutto()` raccoglie tutto ciò che comincia per `atlas.` e un
   backup scaricato col token dentro sarebbe la stessa fuga da un'altra
   porta. Non spostatela dentro `apriCasella` per uniformità.
2. **In questo repo non entra nessun segreto.** Vale per la chiave Hevy
   (già local-only in `moduli/allenamenti/hevy.js`) e per qualunque cosa
   venga dopo. Regressioni si cercano con
   `curl -s https://napema.github.io/atlas/config.js | grep -E 'github_pat|ghp_'`.

Le tre app di partenza hanno avuto lo stesso trattamento e non sincronizzano
più: restano leggibili in locale, e i loro repo dati (`mobilita-dati`,
`abitudini-dati`, `finance-tracker`) non sono stati toccati.

---

## 20 settembre 2026 — nasce Pasti *(architettura, non ancora in barra)*

Nuovo modulo `moduli/pasti/`: database dei pasti, piano settimanale
generato in casa, e il conto di quanto si mangia davvero. Obiettivo
dichiarato la massa. Briefing completo in `moduli/pasti/CLAUDE.md`.

Per ora ci sono **solo il briefing e `dati.js`** — lo schema, le costanti,
le scritture. Niente `modulo.js`, quindi **non è registrato in
`core/registro.js`**: registrarlo senza il modulo significherebbe una
scheda nella barra che non si apre.

**La decisione che regge tutto: il piano È il registro.** L'utente non
loggherà, quindi l'assunzione predefinita è che abbia mangiato quello che
c'era nel piano, e l'archivio tiene solo gli scostamenti — `aggiunta`,
`cambio`, `salto`. Stessa forma di Finanze: un'àncora e i movimenti che la
spostano.

**La barra: risolta.** Mobilità e Allenamenti sono diventati un **gruppo**
(`corpo`) con una scheda sola e un interruttore al posto del titolo, quindi
Pasti entra restando a cinque. Il gruppo è solo un fatto della barra: archivi,
canali, `oggi()` e rotte restano separati. Vedi `GRUPPI` in
`core/registro.js`.

**Il primo database è seminato.** 21 pasti dichiarati dall'utente, in
`SEMI` dentro `moduli/pasti/dati.js`, con `semina()` e il marcatore `semi`
unito per unione. `modulo.js`, quando esisterà, deve chiamarla **solo** dopo
`canale.letturaFatta`.

**Pasti è in piedi** e sta nella barra fra Finanze e Corpo. 30 pasti nel
database, bersagli 2975 kcal / 138 P / 419 C / 83 G, piano settimanale
generato in casa.

**Due correzioni a core arrivate da qui**, e valgono per tutti i moduli:

1. `assicuraStile()` è ora esportata da `core/router.js`. Impostazioni
   disegna dentro di sé le sezioni di TUTTI i moduli, e quelle usano le
   classi dei moduli — ma il foglio lo caricava solo il router al momento di
   montare quel modulo. Aprendo ATLAS direttamente su `#/impostazioni` la
   sezione di un modulo mai visitato compariva senza stile.
2. La sezione di un modulo in Impostazioni prende il **suo** accento. Senza,
   tutto ciò che si tinge con `var(--accento)` lì dentro diventava grigio.

**Nota di UX rimasta aperta, fuori perimetro:** dentro Mobilità la
sottovista «Oggi» ripete il proprio titolo sotto le pillole che lo dicono
già. Viene dai file portati da `mobility-blueprint`, che si ricopiano tali e
quali quando cambiano di là: si tocca solo se si rinuncia a quella
proprietà.

**Richiesta alla chat Allenamenti:** nei giorni di palestra il fabbisogno
sale. Servirebbe che Allenamenti scrivesse sulla lavagna se oggi è stato
fatto un allenamento e di che tipo (`scriviFatto("allenamenti", …)`).
Pasti lo leggerebbe con `leggiFatto`, mai con un import diretto. Finché non
c'è, il fabbisogno usa il fattore di attività fisso del profilo.

---

## 23 settembre 2026 — il giro del design (chat ATLAS)

Fatto tutto dalla chat ATLAS, quindi **fuori perimetro** su `moduli/pasti/`
e `moduli/allenamenti/`: se quelle chat ripartono, questo è già qui.

**Sul PC la pagina riempie la finestra.** `Pagina.svelte` ha tre zone —
`strumenti` (riga intera), `laterale` (colonna fissa da 380, appiccicata) e
il resto in una griglia `auto-fit` da 420 minimo. `auto-fit` e non
`auto-fill`: con una lastra sola la seconda colonna restava aperta e vuota.

**Le azioni della schermata stanno sulla linea del titolo**, non
nell'angolo della barra. Tornano nella barra quando il titolo grande è
scorso via.

**I fogli non risalgono più dopo essersi chiusi.** `display` e `overlay` in
`allow-discrete` tenevano il `<dialog>` visibile mezzo secondo dopo
`close()`, con la classe `chiudendo` già caduta: si vedeva la maniglia
spuntare da sotto. La discesa la guida il timeout in `chiudi()`.

**Le emoji di Apple anche su Windows.** `assets/fonts/AppleColorEmoji.woff`
(44 MB) era nel repo da agosto e non l'aveva mai caricata nessuno. Ora c'è
una `@font-face` **«ATLAS Emoji»** — il nome diverso è voluto: sta dopo
`Apple Color Emoji` nella pila, quindi iPhone e Mac non scaricano niente.
`unicode-range` stretto alle emoji vere: una freccia non tira giù 44 MB.
Sta in **tutte** le pile di `tokens.css`, non solo in `--font-emoji`.

**L'icona della app** è rifatta: tubo di vetro con bagliore, generata da
`.claude/genera-icona.js` (canvas nel browser → il server di sviluppo
scrive il PNG, vedi `do_POST` in `.claude/serve-dev.py`, solo in locale).

**`moduli/allenamenti/muscoli.js` è nuovo** — chat Allenamenti, è roba
vostra da qui in poi. Legge le righe del piano come sono scritte («Hack
squat 4×8», «Curl+Pushdown») e ne ricava nome, serie e muscoli, con una
mappa per parole chiave. `app/src/moduli/allenamenti/Corpo.svelte` disegna
le due figure con i gruppi accesi.

**Pasti**: la giornata è fatta di schede (emoji della fascia, calorie,
i tre macro con le barre sul bersaglio del giorno) e il bilancio ha tre
tessere al posto di tre frasi.

---

## 25 settembre 2026 — notifiche, Training, calendario (chat ATLAS)

**Le notifiche non arrivavano per due guasti indipendenti.**

1. *L'iscrizione zombie.* iOS rigenera l'endpoint push dopo un aggiornamento
   o una reinstallazione dalla schermata Home. `riallinea()` scriveva quella
   nuova e lasciava viva la vecchia; Apple continua ad accettare l'endpoint
   morto e butta via il messaggio senza rispondere 410, quindi il mittente
   scriveva «1/1 consegnata» a vuoto. Ora la vecchia dello stesso dispositivo
   prende la lapide, riconosciuta dallo user agent.
2. *L'ora «24».* In `notifiche.js` (repo dati) `hour12: false` non fissa il
   ciclo: per «en-CA» su Node resta h24 e a mezzanotte l'ora è «24». Alle
   00:25 il mittente credeva fossero le 24:25 e mandava i promemoria della
   sera — dentro la finestra dei 180 minuti — segnandoli come fatti. Alle
   21:30 vere li saltava. Corretto con `hourCycle: "h23"`.

**Training non è più a caselle fisse.** Una settimana importata SOSTITUISCE
quella del blocco: tre righe fanno tre allenamenti. Il CSV ha `nome` e
`genere` al posto di `slot` (le sei parole restano come scorciatoia), i
generi mostrati sono quelli presenti, e una palestra importata si legge come
esercizi veri — serie, ripetizioni e mappa dei muscoli dal testo separato da
«·». In cima alla settimana c'è «Oggi» in una riga.

**Ogni allenamento ha un'ora**, con predefiniti per genere (corsa 07:00,
palestra 18:00 — la palestra la mattina è chiusa) scavalcabili sul singolo.

**Google Calendar, nei due sensi**, da `calendario.js` nel repo dati.
L'app pubblica `agenda` nel pacchetto del sync (derivata: esce e non
rientra) perché i nomi stanno nel piano, che è codice. Il job crea e
aggiorna gli eventi e riporta indietro solo il QUANDO se sposti a mano.
Serve la configurazione Google: segreti `GCAL_CLIENT_ID`,
`GCAL_CLIENT_SECRET`, `GCAL_REFRESH_TOKEN`, `GCAL_CALENDAR_ID`. Senza, il
passo non fa niente.
