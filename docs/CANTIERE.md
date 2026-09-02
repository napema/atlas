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
più la scelta manuale. Tutto scritto in `docs/DESIGN.md`.

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
  `docs/DESIGN.md`. Restano le due lezioni che valevano: contrasto misurato e
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
