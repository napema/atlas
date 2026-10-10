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

### ✅ 8 ottobre — Finanze: torna l'Analisi (per ciclo), e il fondo dice cosa fare *(chat ATLAS, su richiesta diretta)*

Fuori dal perimetro della chat ATLAS, ma chiesto esplicitamente: «la view
Cicli non aiuta, il vecchio Analisi andava più o meno bene, il problema è
che non lo controllavo» e «cosa vuol dire Naso? cosa ci devo fare, ci butto
io i soldi?».

- **Analisi al posto di Cicli.** Le domande della vecchia Analisi, ma sul
  CICLO, sfogliabile con le frecce (indietro fino al primo ciclo con dati:
  niente più cicli vuoti con lo zero verde). La cosa nuova è la gerarchia:
  in cima **Da tenere d'occhio** — ritmo della Vita, fuori piano,
  categorie, prelievi da ING, versamento al fondo — ordinati dall'esito
  (rosso, arancio, verde), il peggiore più grande. Sotto: andamento,
  categorie contro budget (sforate in cima), le voci fuori piano, confronto
  allo stesso giorno del ciclo prima, numeri, ultimi cicli, ripartizione,
  voci più care, giorni della settimana. I conti stanno in
  `moduli/finanze/analisi.js`; `#/finanze/cicli` apre l'Analisi.
- **Il fondo dell'obiettivo.** Il blocco in home ha ora il PROSSIMO PASSO
  (`passoObiettivo()` in `piano.js`): «prossimo versamento 156 € · ven 23
  ott», poi «Da fare: sposta 156 € su Fondo naso» (tocca → giorno di paga),
  poi «fatto». Il foglio Obiettivo spiega in tre righe come funziona, ha il
  grafico e i prossimi versamenti (spostati da Cicli) e «Versa un extra».
- **Bug:** `FoglioCategoria` e `FoglioSub` ignoravano il ciclo da cui si
  arrivava e mostravano sempre quello di oggi.

### ✅ 2 ottobre — Finanze non sincronizzava più: «Maximum call stack size exceeded»

Non era Finanze, era il nucleo. `b64enc` in `sync.ts` (e in `core/sync.js`
per `v1.html`) faceva `String.fromCharCode(...byte)`: un argomento per ogni
byte del file. Safari su iPhone ne regge circa 65 mila, e finanze.json —
il file più grosso — ha passato i 64 KB. L'errore scattava PRIMA della PUT:
nessun dato perso né in locale né sul repo, solo le modifiche di Finanze
ferme sul telefono. Ora si codifica a pezzi da 8 KB; il base64 che esce è
identico byte per byte a quello di prima (provato fino a 70 KB, e a 3 MB
dove il vecchio esplodeva anche su Chrome). Il canale ora stampa in console
l'errore intero, con lo stack: la riga in Impostazioni da sola non bastava a
capire dove.

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

- **Abitudini → core (26 set): un promemoria serale per la chiusura di
  Project 50.** La sfida si gioca sulla chiusura del giorno, che si può
  fare solo dalle 21 e solo quel giorno: se te ne dimentichi, quel giorno
  non conta — né in bene né in male — e il contatore resta fermo. È
  l'unico promemoria della app che, se manca, fa perdere un dato che non
  si può più recuperare.
  Serve un orario in `notifiche.json` (`orari.abitudini.chiusura`, con
  l'interruttore in Impostazioni → Notifiche) e il pezzo corrispondente in
  `notifiche.js` dentro `atlas-dati`: se `p50.attivo` e non c'è una
  chiusura con la data di oggi, manda «Chiudi il giorno n» con rotta
  `#/abitudini`. Il mittente legge già `abitudini.json`, dove ora ci sono
  anche `chiusure` e `p50`.
  Nel frattempo, dalle 21 la scheda della home diventa urgente e dice «da
  chiudere»: copre chi apre ATLAS, non chi se ne dimentica.

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

---

## 26 settembre 2026 — Project 50, dal modello alla revisione (chat Abitudini)

Quattro commit, e le ultime due parti sono di stasera. La sfida
tutto-o-niente non è un ritocco alle abitudini: è **un'altra regola** —
otto voci non negoziabili, e se ne manca una il contatore riparta da uno —
e sta tutta in `moduli/abitudini/p50.js`, fuori dalle funzioni di prima. Il
resto del modulo funziona come sempre per chi la sfida non la fa: si
accende in Impostazioni → Abitudini, e da spenta non si vede.

**Il giorno chiuso è immutabile, ed è la cosa che regge tutto.** Una
chiusura è un record con la data come id: due dispositivi che chiudono lo
stesso giorno convergono, e il numero del giorno si ricava dalle chiusure
invece di stare in un contatore che si incrementa — che sarebbe un numero
che si può solo *perdere* in una fusione. Ogni chiusura si porta dentro il
numero del giorno dopo: le regole cambiano, e una regola che cambia non
deve riscrivere il passato.

**Si chiude solo il giorno in cui sei, e solo dalle 21.** Le spunte di un
giorno passato restano modificabili — è giusto per un'abitudine — quindi
poter chiudere ieri vorrebbe dire completarlo stamattina, e il contatore
misurerebbe quanto ti ricordi di tornare indietro. Il prezzo, dichiarato:
**un giorno non chiuso è perso**, non fa ripartire e nemmeno salire. Nella
striscia della settimana un giorno passato e mai chiuso non è più «in
corso». Da qui la richiesta a core qui sopra.

**Il foglio di chiusura dice la conseguenza, non «sei sicuro?».** Prima di
confermare: il verdetto, i nomi per esteso delle voci mancate, e il salto
del contatore come lo si pensa (12 → 13, oppure 12 → 1). Lo calcola
`esito()`, la stessa funzione che poi scrive il record — copiarla nel
foglio avrebbe fatto due regole che divergono al primo ritocco.

**La home parla la lingua della sfida.** Contava tutte e undici le
abitudini in una frazione sola, ed è il guasto che la schermata aveva già
risolto: due mancanti su undici possono essere la skincare, che non costa
niente, o il journal, che costa il contatore. Ora la scheda è delle otto,
«fatto» vuol dire *chiuso bene* e non otto su otto, e dalle 21 col giorno
aperto è urgente.

**La revisione** (scheda «Sfida», che in sfida prende il posto di «Serie»)
è la griglia dei cinquanta come la lavagna fisica, più tre numeri e i
colpevoli. Il **record** è l'unico che sopravvive a un reset: senza, dopo
la terza ripartenza la schermata direbbe soltanto che sei al giorno 2. I
colpevoli sono l'unica cosa lì che dice cosa fare domani.

### Cosa resta aperto

- **Il promemoria delle 21** — la richiesta a core qui sopra. È l'unico
  pezzo di Project 50 che non si può fare da dentro il modulo.
- **La checklist «Adesso» della home non sa della sfida.** Impila le voci
  per fascia oraria, quindi le otto non negoziabili e le parti della
  skincare pesano uguale. Non l'ho toccata perché è la home, ma in sfida
  le otto dovrebbero venire prima: è il posto dove si vede che manca il
  journal *prima* delle 21.
- **Provato in Chromium a 390×844** (schermata del giorno, revisione,
  foglio di chiusura, home) e con un giro a mano sulle regole: chiusura
  prima delle 21, richiusura, penalità della domenica, blocco delle serate
  a domenica chiusa, morning routine a due terzi che non vale. Sul telefono
  installato, no: quello resta da fare.

---

## 27 settembre 2026 — la versione del guscio non era mai stata timbrata *(core, da una chat di modulo)*

Scoperto pubblicando Project 50, e sistemato perché tocca ogni rilascio.

`vite.config.ts` timbrava `__VERSIONE__` in `sw.js` con `String.replace` e
una stringa, che ne sostituisce **una sola**: la prima del file, cioè quella
dentro il commento in testa. `const VERSIONE` restava col segnaposto, e il
guscio si chiamava `atlas2-guscio-__VERSIONE__` a ogni rilascio — quindi
`activate` non trovava mai una cache vecchia da cancellare.

È il tipo di guasto che non si vede: la app si aggiorna lo stesso, perché
la navigazione va in rete per prima e i file compilati hanno l'impronta nel
nome. A restare indietro era solo la pulizia del guscio. La regola 10 di
CLAUDE.md era rispettata sulla carta — la build timbrava qualcosa — e non
nei fatti.

Ora si sostituiscono tutte le occorrenze, il commento non nomina più il
segnaposto in chiaro (torna a essercene una), e **se il segnaposto non c'è
la build si ferma**: un guscio senza versione non si pubblica per sbaglio.

Fatto da una chat di modulo, fuori perimetro, con la chat ATLAS ferma per
limite di utilizzo. Se ATLAS riparte: è tutto qui, `app/vite.config.ts` e
il commento in testa a `app/public/sw.js`.

---

## 27 settembre 2026 — supporto in parallelo, e Project 50 sulla home *(Abitudini + core)*

**Il supporto non sta più sotto le otto: sta accanto.** Erano una lastra e
una nota a piè di pagina — righe da 44, testo 15 regular, opacità in meno,
trentadue punti di distacco. Quella gerarchia diceva «questa cosa conta meno
di te», e sono due cose in parallelo. Ora sono due lastre pari, due figli
della griglia della pagina: sul PC si affiancano da sé, sul telefono restano
impilate (affiancarle lì sarebbe otto righe larghe mezzo schermo).

Quello che le distingue è rimasto dove serve: **il contatore e il verdetto**.
Solo le otto hanno «3/8» in testa e il bordo che diventa verde. Il guasto di
partenza — in una lista sola non sai se hai perso il contatore o saltato la
skincare — lo risolve la separazione in due lastre, non il rimpicciolire una
delle due. Questo rovescia in parte `2978ad2`, che le aveva messe in colonna:
la colonna era la risposta giusta alla domanda sbagliata.

**Sul telefono**: le serate fuori in una riga sola invece di due, e la
chiusura a tutta larghezza sul PC (come cella della griglia finiva in fondo
alla colonna del supporto).

**`#/abitudini/chiudi`** apre il foglio di chiusura, se il giorno è
chiudibile. Ci arriva la card della home, e ci arriverà il promemoria delle
21 quando core lo farà.

### La home ha una card Project 50 *(fuori perimetro, `moduli/oggi/` e `core/`)*

La sfida si misura in GIORNI, la riga del modulo in spunte: fuse in una
frazione sola non si leggeva più né l'una né l'altra. Ieri notte avevo fatto
la cosa sbagliata — con la sfida accesa la scheda della home DIVENTAVA la
sfida — ed è corretto: `oggi()` è di nuovo la scheda delle abitudini e si
porta dietro `sfida`, `null` quando è spenta.

La home non conosce Abitudini (regola 12): prende `sfida` da qualunque
scheda la porti — il tipo è `SchedaSfida` in `registro.ts` — e se non la
porta nessuno la card non esiste. Una seconda sfida, un domani, si accende
senza toccare `moduli/oggi/`.

La card sta nella colonna di «Adesso», sotto la checklist: prima quello che
si tocca per fare, poi dove sei arrivato. Niente grid-area nuova, che
avrebbe lasciato una riga vuota e il suo spazio in tutte le giornate senza
sfida. Dalle 21 col giorno aperto si accende di arancio e mostra «Chiudi il
giorno».

Provato in Chromium a 390×844 e 1440×1000, con l'orologio del browser
spostato alle 21:30 per vedere lo stato che conta. **Sul telefono
installato, ancora no.**

---

## 27 settembre 2026, notte — il workout segue il piano, e il giro di layout *(tre perimetri)*

### Il workout non lo decide più un calendario scritto a mano *(Allenamenti + Abitudini)*

Era `days: [1,2,3,4,5,6]`, cioè «tutti tranne la domenica». Ma il workout non
è atteso il lunedì perché è lunedì: è atteso quando il piano ha un
allenamento. Con la domenica fissa a riposo, un giorno di scarico
infrasettimanale diventava una voce non negoziabile MANCATA — il contatore
che riparte da 1 per un allenamento che non era in programma.

`moduli/allenamenti/contratto.js` ora pubblica tre fatti nuovi:
`oggi-previsti`, `oggi-fatti`, `giorni-scelti`. I primi due erano ovvi; il
terzo distingue «oggi è riposo» da «al piano non hai ancora dato i giorni»,
e senza di lui un piano senza giorni regalerebbe una voce libera ogni
giorno — un contatore che sale per un dato che manca.

`vocePrevista()` in `p50.js` li legge e, solo se `giorni-scelti` è > 0, si
fida del piano; altrimenti ripiega sul calendario dell'abitudine. Il
riconoscimento della voce è per NOME (`/workout|allenamen|palestra/i`),
grossolano come quello della sessione di Mobilità e per lo stesso motivo:
con un id, Abitudini conoscerebbe Training.

L'allenamento fatto spunta l'abitudine, in una direzione sola. Mobilità
annuncia sul bus, Training scrive numeri sulla lavagna, e il filtro
`d.modulo === "allenamenti"` sull'ascolto di `FATTO_SCRITTO` è ciò che tiene
l'ascolto lontano dai propri stessi fatti — spuntare scrive sulla lavagna.

### Il giro di layout, tutto trovato sul PC

- **Impostazioni → Abitudini stampava due volte le stesse dodici voci**: una
  lista per scegliere il blocco, una per aprirle. Due elenchi identici nella
  stessa schermata sono una funzione e un sosia. Ora la lista è una; il
  blocco è un'etichetta e si cambia dentro il foglio di modifica, che è il
  posto che la regola («non nella schermata di tutti i giorni») descriveva
  già. Via anche il segmento da 168px che troncava «Suppor…».
- **La revisione** lasciava il riepilogo col solo contatore e mezzo schermo
  vuoto: i tre numeri sono saliti lì, e sotto la griglia c'è **Le chiusure**,
  il registro giorno per giorno. Non è riempitivo — è dove «sei ripartito
  quattro volte» si controlla. La griglia ha un tetto di larghezza: senza,
  sul PC le caselle diventavano quadrati da settanta punti.
- **La home** aveva tre colonne che finivano a tre altezze diverse e una
  fascia di nero sotto. Ora `.griglia` e `.griglia.con-sfida` hanno ciascuna
  le proprie `grid-template-areas` (niente area vuota da lasciare quando la
  sfida è spenta), la gerarchia sta nelle dimensioni — «Adesso» e Finanze
  colonne alte, Project 50 e Costanza più strette — e **«I moduli» è una
  striscia a tutta larghezza in fondo**: era la colonna alta e magra che
  bucava la pagina, ed è la parte in cui non si decide niente. Sul telefono
  la striscia sta in due colonne, con nome e valore incolonnati dentro la
  tessera (in riga, a 170px, si leggeva «Fina… 0,00 €»).

### Perimetri

Tre commit su quattro sono fuori da Abitudini: `moduli/allenamenti/`
(cinque righe in `pubblicaSullaLavagna`), `moduli/oggi/` e `core/registro.ts`
(la card e il tipo `SchedaSfida`). Fatto con le chat ATLAS e Allenamenti
ferme per limite di utilizzo, su richiesta esplicita dell'utente. Se quelle
chat ripartono: è tutto qui sopra.

Provato in Chromium a 1900×1050 in scuro (home, giorno, sfida, impostazioni)
e a 390×844. **Sul telefono installato ancora no.**

---

## 27 settembre 2026 — la revisione del design, e Abitudini diventa Project 50 *(più perimetri)*

Un giro su TUTTE le schermate, telefono (390×844) e PC (1180, 1600, 1885),
in scuro e con dati verosimili in ogni modulo, prima di toccare niente. I
problemi erano di sistema più che di schermata, e sono stati corretti lì.

### Il sistema *(core)*

- **I buchi fra le carte sul PC** venivano dalla griglia di `Pagina`: una
  riga di griglia è alta quanto la carta più alta, e sotto le altre
  restava il vuoto — in Home, Finanze, Mobilità, Training, Abitudini. Ora
  `.principale` è una **multicolonna**: le lastre si impilano per colonna, e
  fra due lastre c'è sempre e solo il passo della pagina. Mai una colonna
  vuota (`:has()` limita le colonne al numero di lastre).
- **`stretta`**: le Impostazioni sono una colonna sola da 680 punti,
  centrata. Si spalmavano su tre colonne.
- **DESIGN.md §5.7 è stata riscritta al contrario**: il contenitore prende
  la forma del contenuto. La regola vecchia («lo stato vuoto cambia il
  contenuto, mai l'ingombro») produceva carte grandi che dicevano
  «niente». Resta la metà che contava: niente sparisce e ricompare durante
  il caricamento. Nuova §5bis sull'impaginazione del PC.

### La home *(core)*

Ogni modulo **una volta sola** (carta se ne ha una, altrimenti tessera in
«Anche oggi»); Costanza solo a sfida spenta; «Adesso» diventa «Più tardi» e
mostra la giornata quando adesso non tocca niente; colonne come **pile**
scelte con `MediaQuery` (telefono / PC medio / PC largo).

### Project 50 *(Abitudini — e il nome in `registro.ts`)*

Il modulo si chiama **Project 50**; l'id resta `abitudini` (casella, file
nel repo dati, rotte delle notifiche). **Una lista sola divisa per momento**
— Mattina, In giornata, Sera — al posto delle due liste otto/supporto; le
otto hanno il segno «50» in cima al loro momento; un'abitudine con le parti
finisce in più momenti, un pezzo per fascia. **La sfida in una carta**
(`Eroe50.svelte`): giorno, barra, otto pallini, serate fuori, chiusura; in
«Progressi» record/tenuti/ripartenze. Via `Blocchi`, `Testata50`,
`NumeriSfida`. Segmenti rinominati **Oggi · Progressi**, come Mobilità.

Una correzione di logica trovata strada facendo: la sfida e la home davano
**due risposte diverse** a «il workout è previsto oggi?» (la sfida leggeva
`days` anche su `daily`, la home no). Ora c'è `previstaNellaSfida()` in
`calcolo.js`, usata da entrambe, e la regola di Training sta lì.

### Mobilità *(fuori perimetro)*

La sessione — la cosa che si fa — era nella colonna stretta del riepilogo;
ora è la prima lastra dell'area larga, con «Hai corso oggi?» e la settimana
nel riepilogo. Nessuna riga di logica toccata.

### Cosa NON è stato toccato, e perché

Finanze, Pasti e Training: con la multicolonna reggono, e sono perimetri di
chat ferme. La tipografia, i colori, la barra delle schede: erano giusti.

### Da sapere, se una chat riparte

- Nella schermata vista dall'utente la card Project 50 **non c'era** sulla
  home: con la sfida spenta su quel dispositivo `sfida` è `null` e la card
  non esiste. Da spenta, adesso, la carta del modulo invita a cominciarla.
- **Sul telefono installato non è stato provato niente.** Tutto in Chromium.

---

## La home a bento, e le tessere di vetro *(27 set, chat ATLAS)*

La home era «tre lastre grigie grandi e nient'altro», e le tessere piccole
dei moduli ne erano sparite insieme a Pasti e Mobilità. Rifatte.

**Le tessere sono quadrate, e quadrate davvero.** Stanno in una fascia loro
(`.striscia`), che è una **griglia** e non un flex: con `flex: 1 1 170px`
l'ultima tessera di una riga cresceva a riempire lo spazio rimasto, e sul
telefono la terza diventava un rettangolo largo quanto lo schermo. Con
`repeat(auto-fit, minmax(min(140px, 100%), 1fr))` le celle restano tutte
della stessa misura e quella dispari lascia il posto vuoto dov'è. Misurate:
quattro da 179×179 su 402 punti, `scrollWidth` = `innerWidth`.

La soglia è **140 e non 150**: in mezza riga da 1440 (628 punti) a 150 ci
stavano tre quadrati e il quarto andava a capo da solo con due celle vuote
a fianco.

**Il vetro delle tessere è dipinto, non filtrato.** Niente
`backdrop-filter`: sotto c'è il fondo pieno della pagina, quindi non c'è
niente da sfocare — e su iPhone quel filtro ricampiona il *contenuto*
dell'elemento, cioè sgrana l'icona e il numero. Fondo stratificato, anello
sul bordo, luce in alto, alone del colore del modulo che sale dal basso.

**Nessun verde dentro una tessera colorata.** Il valore di Pasti diventava
verde a pasto fatto, dentro una tessera tinta di rosa: «una cosa che Apple
non farebbe mai», e aveva ragione. Il «fatto» adesso è una **spunta neutra
in alto a destra**; il numero resta del colore del testo. La regola 7 vale
anche dentro un contenitore che ha già un accento suo.

**In 179 punti non ci sta un menu.** Il valore di Pasti è il nome del
pasto: «Bacon + Pasta + Verdure grigliate + Sugo di pomodoro» a 27px
diventava «Bacon + P…». La home lo spezza sui `+` e mostra `Bacon +3`.

**Il bento si chiude a due righe, e non lascia buchi.** Sopra la carta
grande con la colonna della sfida, sotto Finanze e i quadrati: misurato
845+411 e 628+628 su 1440. Tre fasce a tutta larghezza non sono un bento,
sono strisce. E la carta dentro la tessera si tira fino in fondo
(`.tessera:not(.striscia) > * { flex: 1 }`): senza, una carta corta accanto
a una lunga lasciava il vuoto nella *griglia*, che si legge come una fetta
di pagina mancante invece che come spazio dentro una carta.

### La barra compatta era trasparente

Scorrendo, il titolo piccolo finiva **sopra** la cifra della carta sotto e
si leggevano due testi uno sull'altro: il `::before` aveva solo
`--glass-bg` (alfa 0,7) e la sfocatura. Al 94 per cento una cifra bianca
grande si vedeva ancora. Ora è **opaca**, con la sua riga sottile sotto, e
senza `backdrop-filter`. Il vetro di ATLAS sta nelle carte e nella barra
delle schede, dove dietro c'è davvero qualcosa; lì dietro c'è solo il testo
che la barra esiste per coprire.

### Richiesta a Finanze *(già applicata, da rivedere se serve)*

`inArrivo()` guardava 14 giorni avanti a prescindere; ora si ferma a
`cicloDi(iso).a`, il giorno prima dello stipendio. Con lo stipendio al 21,
la home dice «fino al 20 ott» — corretto.

### Project 50: la carta a sfida spenta

`schedaSfida()` in `moduli/abitudini/contratto.js` tornava `null` con la
sfida spenta, e la home ci metteva la costanza: il posto più grande della
schermata occupato da «0 giorni di fila — 7 giorni senza spuntare niente»,
il giorno prima di cominciare. Ora torna `{ spenta: true, totale, quante,
rotta }` e la home disegna **50 giorni · 8 voci non negoziabili · Comincia**,
con la settimana sotto come contorno. Il quadrato di Abitudini resta finché
la sfida è spenta (la carta dell'invito non dice il conteggio di oggi).

### Non provato

Sempre e solo Chromium a 402 e a 1440. Sul telefono installato, niente.

---

## Una ricetta sola per ogni superficie *(27 set, notte, chat ATLAS)*

Richiesta: «o le metti ovunque o da nessuna parte» — le carte di vetro —
«ma non esagerare coi colori, altrimenti sembra un circo». E: cambiare il
grigio delle carte, che «sa di cosa scrausa».

### Il grigio, e perché non bastava cambiarlo

`#1c1c1e` è il grigio giusto di iOS. Steso piatto su una carta grande
contro il nero fa comunque un rettangolo spento, e il problema non era il
valore: era che **una carta era un colore invece che un materiale**. Due
correzioni, nessuna fuori dalla gamma di Apple:

- il grigio sale di un punto sul blu, `#1c1c20` — quel filo di freddo che
  lo separa dal marroncino (e a cascata `#2c2c31`, i grigi del foglio);
- la carta diventa **`.lastra`**: fondo, luce che cade dall'alto, anello di
  mezzo pixel, ombra. Una classe sola in `app.css`, globale.

La ricetta, le tre eccezioni ammesse e il perché stanno in `docs/DESIGN.md`
§3. **Chi aggiunge una schermata legge quello, non questo.**

Due cose imparate scrivendola:

- **Sul nero l'ombra non fa niente.** Nero su nero. A staccare la carta è
  l'anello, e la leva da girare quando una carta non si stacca è quella.
  L'ombra guadagna il posto dentro un foglio e sul tema chiaro.
- **`--lastra-dentro` è `--fill-quaternary`.** Avevo inventato un valore
  nuovo per «riquadro dentro una carta» quando iOS ha già quel ruolo e
  mezza app lo usava. Due token per lo stesso mestiere sono esattamente
  l'incoerenza che stavamo togliendo: adesso è un alias.

### Il vetro filtrato, dove resta

`backdrop-filter` solo dove dietro scorre davvero qualcosa: barra delle
schede, toast, testate appiccicate. Sulle carte è **dipinto** — su iPhone
quel filtro ricampiona il *contenuto* dell'elemento e sgrana l'icona e il
numero dentro la carta.

La barra compatta in cima è passata a **opaca**: al 94 per cento una cifra
bianca grande si leggeva ancora dietro il titolo piccolo.

### L'allineamento, che era la cosa urgente

Due cause, tutte e due strutturali:

1. La fascia dei quadrati **non era una `Sezione`**, quindi restava fuori dal
   rimedio che `Pagina` ha già (`.testa-vuota`): cominciava 33 punti più in
   alto di Finanze che le sta a fianco. Ora ha il suo titolo, «Moduli».
2. La **testa di una sezione cresceva** col contenuto: una coda con la
   pastiglia («8 in ritardo») è alta 28 punti contro i 25 della riga del
   titolo, e faceva partire la sua carta tre punti più in basso. Adesso è
   alta quanto la riga del titolo, sempre, e la pastiglia è centrata.

Misurato a 1440: riga 1 a 183 e 183, riga 2 a 552 e 552.

### Il resto del giro

- `pasti/Pianifica` era un percorso guidato spalmato su tre colonne, con una
  carta a sinistra e il resto nero: ora `stretta`, 680 punti centrati.
- Carte che si disegnavano il fondo da sole e sono passate alla ricetta:
  l'eroe di Project 50, il check di Finanze, le serate fuori, gli avvisi di
  Finanze, il riquadro «Oggi» di Training. Dove avevano un **anello che dice
  qualcosa** (l'accento = «si tocca», l'arancione = «quota finita») l'anello
  resta: si aggiunge solo l'ombra.
- Nei fogli i riquadri passano a `--lastra-dentro`, e lì `--lastra-ombra` si
  abbassa: il fondo è già grigio e i due piani sono vicini.
- Il velo colorato delle tessere della home: **dal 26 al 14 per cento**.

### Non provato

Chromium a 402 e a 1440, tema scuro. Il tema chiaro solo come valori
calcolati, mai guardato. Sul telefono installato, niente.

### Fuori perimetro, ma bloccava il giorno uno *(chat Abitudini, leggere)*

In `app/src/moduli/abitudini/Vista.svelte`:

```js
const delle8 = (h) => sfida && h.blocco === "p50";   // prima
const delle8 = (h) => h.blocco === "p50";            // adesso
```

Con `sfida &&`, a sfida **spenta** `delle8` era sempre falso e tutte le voci
finivano in `supporto`: la lista si apriva con la riga «Supporto · nessuna
conseguenza» in cima e le otto sotto. Chi guarda la sera prima di
cominciare — cioè stasera — vede le voci che contano marchiate come quelle
che non contano.

Il blocco di una voce è un dato suo e non dipende dallo stato della sfida.
A dipendere dalla sfida resta solo **quando** una voce è attesa.

Due conseguenze in `Lista.svelte`: a sfida spenta le otto prendono
un'intestazione loro (il titolo della sezione lì dice «Oggi»), e «nessuna
conseguenza» compare solo a sfida accesa, perché senza contatore non
corrisponde a niente.

Toccati solo quei due file del modulo. Se la chat Abitudini stava lavorando
lì, questo è il pezzo da rileggere.

### Una trappola nel verificare: il service worker serve il vecchio

Dopo un deploy riuscito, `#/abitudini` continuava a mostrare il testo
vecchio. `sw.js` era già la versione nuova (`VERSIONE = "20260927215451"`)
e il dato locale era giusto — a essere vecchio era il **chunk caricato
pigramente** del modulo, servito dalla cache del service worker.

Navigare di nuovo sulla stessa URL non basta, e nemmeno svuotare le cache
una volta sola. Quello che funziona:

```js
for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
for (const k of await caches.keys()) await caches.delete(k);
// poi navigare con una query diversa: /atlas/?v=9#/rotta
```

Vale la pena saperlo perché la conseguenza è peggio di una perdita di
tempo: si guarda una schermata, si conclude che una correzione «non
funziona» e si va a cercare un guasto che non c'è. È successo stanotte.

---

## La scala dello spendibile e «Posso permettermelo?» *(29 set, chat ATLAS)*

Richiesta sua, su Finanze — **perimetro della chat Finanze**: qui c'è cosa è
cambiato e perché, da rileggere prima di ripartire di là.

### «Da spendere»: un numero, tre gradini

La carta dava **due medie giornaliere** — quella della settimana e quella
del ciclo — una sotto l'altra. Sono due risposte giuste alla stessa domanda,
e due risposte giuste sono peggio di una sbagliata: davanti a una cosa da
venti euro non sai quale stai sforando. Resta la più stretta.

Sotto, i tre serbatoi in ordine di **quanto costa attingerci**: Settimana
(gratis, sono già tuoi), fino al giorno prima dello stipendio (costa la
ricarica di lunedì), Riserva libera (costa il punto più basso dell'anno).

`scala(iso)` in `calcolo.js` monta i tre gradini da roba che c'era già;
l'unico conto nuovo è `riservaLibera()` = ING − impegni entro lo stipendio −
pavimento.

**Il pavimento è `soglie.ingMinimo`, che c'era già e vale 900.** La spec
chiedeva un campo nuovo con default 400: è la stessa domanda, e un secondo
pavimento accanto al primo vuol dire due numeri per lo stesso conto — e
quello scritto nel posto sbagliato non lo scopri finché non ti fidi. Il
valore di fabbrica **non** è stato toccato: riscriverlo avrebbe cambiato di
nascosto i conti di chi non l'ha mai impostato.

### Il simulatore

`simula(prezzo, catId)` prova le fonti in ordine e si ferma alla prima che
basta. Torna **dati**, non frasi: la prima stesura formattava le date in
italiano dentro `calcolo.js` e mi mancavano i formattatori — che era il
segno che stavo mescolando i livelli.

`puntoPiuBasso()` proietta **a eventi**, non a mesi tondi: ogni uscita sulla
riserva quando cade davvero, e il margine del mese quando arriva lo
stipendio. Orizzonte: l'ultimo annuale in calendario. Oltre, un margine
medio per due anni è un'opinione con l'aria di un numero.

### Il guasto che stava per passare

Il verdetto C precompilava un'uscita con `pocket: "ing"`. **Non funziona, e
in silenzio:** `deltaPocket` fa muovere i pocket esterni solo con `giro` ed
`extra`, quindi quell'uscita avrebbe lasciato la riserva dov'era. Il
simulatore prometteva «2524 → 1924» e ING sarebbe rimasto 2524.

Ora sono due movimenti incatenati — ricarica fuori budget ING → Principale,
poi l'uscita — con un `dopo` sul preset che apre il secondo appena il primo
è salvato. **Se tocchi il preset di `FoglioMovimento`, questa è la cosa da
non rompere.**

### Cosa NON è stato fatto, della spec

- **«Ci dormo su» come terzo bottone nel simulatore.** Ci si arriva da
  Registra: sopra `spesaGrossa` (50 €) è `FoglioMovimento` a chiederlo, con
  la frizione che c'era già e scatta alla stessa cifra. Un secondo percorso
  avrebbe voluto dire una seconda bozza da tenere allineata.
- **Il campo «perché» sulla ricarica fuori ciclo.** C'è la nota del
  movimento, non un campo etichettato così.

### Provato

Chromium a 402, con saldi finti seminati in `localStorage` (quell'origine
non ha credenziali, quindi non scrive sul repo). Verdetti A, B, C, D tutti
e quattro. A 45 € torna esattamente l'esempio della spec: «Restano 55 €
fino a dom 4 → 9,16 €/giorno (oggi 16,66)» — 9,16 e non 9,17 perché
`alGiorno` arrotonda per difetto in tutto il modulo, ed è il verso giusto
per un'indennità.

## 29 settembre 2026 — l'iPhone in orizzontale *(core + Mobilità)*

«Appena giro il telefono si bugga tutto.» Tre cause sommate:

- **La Dynamic Island**: con `viewport-fit=cover` la pagina arriva sotto la
  tacca e non c'era un solo `safe-area-inset-left` in tutta la app. Ora
  `--content-inset` è `max(16px, inset sinistro, inset destro)`, e tutti i
  margini orizzontali passano da lì.
- **La pagina** restava una colonna da 672 alta 390: in orizzontale ora ha
  due zone, titolo più basso, riepilogo non appiccicato; la home fa due pile.
  La barra delle schede si abbassa a 44 con icona ed etichetta in riga.
- **Il player di Mobilità** impilava un video alto 400 su uno schermo alto
  390, con il timer sotto, fuori vista: ora video a sinistra e timer a
  destra. L'assessment ha il fondo su una riga.

Verticale e PC **identici al pixel** (catture prima/dopo nello stesso minuto).
Provato su 852×393, 932×430, 667×375 con gli inset simulati; **sul telefono
vero no** — se la Dynamic Island copre ancora qualcosa, è un margine scritto
a mano che non passa da `--content-inset`.

---

## Training riparte: 5 settimane dal 30 settembre *(30 set, chat ATLAS)*

**Perimetro della chat Allenamenti.** Richiesta sua, fatta qui: qui c'è cosa
è cambiato, e soprattutto *perché in quell'ordine*.

Il test dei 5 km è stato anticipato a fine ottobre. Il blocco di 13
settimane partito il 14 settembre è stato cancellato e sostituito: 5
settimane da mercoledì 30 settembre al test di domenica 1 novembre.

### La prima settimana può essere corta

`inizioSettimana(n)` era `INIZIO + (n-1)×7`, blocchi fissi. Con un blocco
che parte di mercoledì o la settimana 1 finisce la domenica — e dura cinque
giorni — o tutte le successive cadono a metà settimana vera, e il lunedì in
cui pianifichi non è più l'inizio di niente. Ora: settimana 1 da `INIZIO`
alla prima domenica compresa, dalla 2 in poi lunedì→domenica.

È stato messo **prima** del cambio di data, in un commit suo, perché su un
blocco che parte di lunedì è un **no-op** — verificato: stesse date, sette
giorni ciascuna. Una modifica strutturale che si può provare mentre non
sposta ancora niente vale il commit in più.

### Il reset, e le due regole che ci sono già costate care

Cambiare il piano da solo **non basta**, e il motivo non è ovvio: gli id
degli slot si **riusano**. `s01-facile` esiste nel blocco vecchio e in
quello nuovo, quindi le spunte del programma morto sarebbero riapparse sul
programma nuovo, su sedute diverse.

1. **Lapidi, non rimozioni.** Un record tolto e basta lo rimette l'altro
   dispositivo alla prima sincronizzazione.
2. **Solo dopo aver letto.** Chiamato all'avvio su un archivio ancora vuoto,
   `resetBlocco()` non troverebbe niente da cancellare, si segnerebbe come
   fatto (`config.blocco`), e poi il sync farebbe entrare i record del blocco
   vecchio — che a quel punto non li cancella più nessuno. Il gancio è
   `canale.letturaFatta`, lo stesso che Abitudini usa per seminare.

`corse` non compare nel reset, apposta: Garmin e Hevy sono quello che hai
fatto davvero e non appartengono al programma.

**E la data sta anche nel config.** `PREDEFINITO.config = { inizio: INIZIO }`
è stato scritto alla prima installazione e da lì si è sincronizzato:
cambiare la costante senza riscrivere `config.inizio` lasciava il blocco
fermo al 14 settembre. È il genere di cosa che si scopre solo guardando chi
legge davvero quel valore.

### Il resto

- `palestra: { lower, upper, total }` sulla settimana del piano: da qui
  cambiano serie e accessori, non solo il carico, e la forma `carichi` +
  accessori fissi sapeva dire solo la progressione del lift principale.
- `nomi: { upper: "Upper B" }` per la settimana 1. Il nome sta lì e non
  dentro il testo perché la vista spezza il testo sui punti mediani per
  contare serie e muscoli: «Upper B» sarebbe stato contato come esercizio.
- L'allenamento **bonus** (commit precedente) resta: `bonus[]` nella casella,
  fuori da `progressoSettimana`, con il «+» giallo in coda al titolo della
  Palestra.

### Da controllare, se qualcosa non torna

Il passo «controllo dei tipi» in `pubblica.yml` ha `continue-on-error: true`:
**non fa fallire la corsa**. Una corsa verde non vuol dire tipi puliti — va
letta la riga `svelte-check found N errors` nel log. Ci sono già cascato una
volta oggi.

---

## 30 settembre 2026 — la pagina scorre solo in verticale *(core + Allenamenti + Mobilità)*

- **Il trascinamento laterale su iPhone**: su `<html>` c'era
  `touch-action: pan-x pan-y`, il permesso esplicito di spostare la pagina
  di lato, e in Training una riga (`.dett`, `nowrap` con tetto 46ch) usciva
  dallo schermo: la pagina era larga 423 su 390. Ora `<html>` ha
  `touch-action: pan-y`, `overflow-x: hidden` e
  `overscroll-behavior-x: none`, e la riga ha tetto `min(46ch, 100%)`. Le
  fasce che scorrono per conto loro (filtri di Finanze, settimane di
  Training) scorrono ancora.
- **Per provarlo in Chromium** lo scorrimento sintetico
  (`Input.synthesizeScrollGesture`) non serve: non scorre niente nemmeno in
  verticale e fa sembrare rotto quello che non lo è. Servono tocchi veri a
  passi con `Input.dispatchTouchEvent`.
- **L'intestazione di Mobilità** era l'unica con la riga sopra il titolo:
  diciotto punti più in basso degli altri moduli. Via; la settimana del
  programma è nella testata di «Questa settimana». La riga del titolo è
  alta 44 anche senza azioni.
- **Le settimane di Training** riempiono la fascia (da 52 fino a 88 punti).

Verticale e PC identici al pixel a `main` tranne le schermate toccate.
Sul telefono vero non provato.

---

## 7 ottobre 2026 — Finanze v3: un obiettivo, un numero al giorno, una lista *(chat Finanze)*

Il modulo registrava bene e non faceva risparmiare niente. Tre guasti
concreti, e nessuno dei tre era un bug:

1. **Non c'era un obiettivo.** Budget e categorie dicono dove sono finiti i
   soldi il mese scorso; non dicono se stai andando dove vuoi andare.
2. **I saldi andavano in deriva.** L'app diceva Principale 103,15 / Cassa
   180,09 / ING 815,66; i saldi veri erano 57,10 / 120,20 / 709,76. Quasi
   trecento euro, accumulati un movimento dimenticato alla volta, e
   rimetterli a posto costava un'ora con due schermi aperti — cioè una cosa
   che si fa due volte e poi mai più.
3. **Le analisi non si leggevano.** Nove barre, tre grafici, «come spendi»:
   tutto vero, nulla che cambiasse una decisione.

### Cosa c'è adesso in home, in quest'ordine

`OBIETTIVO` · `OGGI` · `FUORI PIANO` · `IN ARRIVO` · `POCKET`. Etichette e
numeri, una riga di testo per blocco al massimo, nessuna frase generata.

- **La quota di oggi** è *spendibile a inizio giornata ÷ giorni allo
  stipendio*. «A inizio giornata» non è un dettaglio: dividendo il saldo di
  adesso, la quota scende a ogni spesa insieme al resto e il resto non
  arriva mai a zero — avresti sempre qualche euro di margine, qualunque cosa
  tu abbia fatto. È la stessa lezione del 27 agosto, applicata al numero
  nuovo.
- **Fuori piano** è l'unica voce su cui si può agire, perché è l'unica fatta
  di decisioni e non di addebiti. Quattro condizioni, e servono tutte e
  quattro: sopra soglia (30 €), non legata a un ricorrente, non spesa
  alimentare, non uscita dalla lista d'attesa. Il paragone è il versamento
  mensile al fondo, non una percentuale: «154% del Fondo» dice che
  l'obiettivo si è spostato di un mese e mezzo.
- **ING minimo previsto**: il saldo di ING da solo non dice niente, perché
  sopra ci sono il bollo (31 dic) e l'assicurazione (15 feb). Il punto più
  basso dei prossimi dodici mesi è l'unico numero che risponde a «posso
  attingere»: oggi 215,76 € il 15 febbraio.

### Il ciclo parte dalla data vera dello stipendio

`giornoStipendio` era un numero, ed era il 21 quando lo stipendio arriva il
23. Ma anche col 23 un numero non basta:

- **il fine settimana**: il 23 gennaio 2027 è un sabato, quindi si viene
  pagati venerdì 22. Col giorno fisso il ciclo partiva il 23 e lo stipendio
  cadeva nel ciclo precedente;
- **dicembre**: la tredicesima non arriva il 23 (`config.stipendiManuali`);
- **la realtà**: se la banca paga il 24, il ciclo parte il 24. Si guarda se
  esiste un'entrata marcata `stip` entro sei giorni dalla data teorica.

Da qui `dataStipendio(anno, mese)`, `prossimoStipendio`, `ultimoStipendio`,
`stipendiTra`. **Il flag è `stip`, non la nota**: una nota che contiene
«stipendio» la può avere un rimborso del collega, e un ciclo che si sposta
per una parola in un campo libero è un ciclo che si sposta a caso.

### I quattro travasi del giorno di paga

Fondo 156 → Fisse (calcolato) → Vita 535 in Cassa → ING il resto. Ogni
spunta **crea** il giro: non è una lista di cose da fare su Revolut, è il
gesto che muove i soldi.

Il Fondo per primo. Messo per ultimo prende quello che resta, e quello che
resta è la definizione di risparmio che non ha mai prodotto un risparmio —
il vecchio budget «Risparmio» è stato tolto per la stessa ragione.

Quello che mancava non era l'automatismo, era **sapere quanto**: il
fabbisogno delle Fisse non è un numero fisso, e tenere a mente quali
scadenze cadono prima del prossimo stipendio è esattamente la cosa che non
si fa. Le **quote** delle non-mensili sono il pezzo che si dimentica: 150 €
di bolletta ogni due mesi non si accantonano nel mese in cui arrivano,
perché in quel mese ci sono anche affitto e rata.

Il 23 ottobre è un'eccezione scritta a mano (`config.eccezioni`): la prima
bolletta non è mai stata accantonata e il 1 novembre cade l'ultima rata
AliExpress, quindi Fisse prende 1.329 e a ING restano 21. Dal 23 novembre il
calcolo riproduce da sé la tabella a regime (1.234,97 ≈ 1.235).

### La lista d'attesa al posto di «Posso permettermelo?»

Il simulatore rispondeva a una domanda che si fa davanti alla cassa, cioè
quando la risposta non cambia più niente: la decisione era presa, si cercava
un permesso. E dava un verdetto — «puoi, ma anticipi la Cassa» — a cui la
risposta che arrivava indietro era sempre «non capisco cosa cambia».

Adesso l'ordine è invertito: si scrive, passano ventiquattro ore, si compra.
Ed è l'**unico** modo di comprare sopra soglia senza finire in «Fuori
piano»: la lista non è un promemoria, è il piano. Al posto del verdetto, tre
righe e nessun aggettivo:

```
dalla settimana   → quota da 11,82 a 3,50 €/g
da ING            → minimo previsto da 216 a 91 €
dal fondo         → gap da 640 a 765 €
```

Lo stato `sbloccata` è **calcolato** e non scritto: scriverlo vorrebbe dire
scrivere qualcosa che cambia da sé col passare del tempo, e servirebbe
qualcuno che ci passi sopra a mezzanotte.

### La chiusura settimanale, e la deriva

Quattro passi: estratto, pagella, report, ricarica. Il passo 1 è l'unico che
conta; gli altri tre esistono perché un rito che non restituisce niente non
si fa due volte.

`revolut.js` legge il CSV italiano e **riconcilia** invece di importare: dice
anche cosa c'è nell'app e non c'è nell'estratto, che è il caso del movimento
registrato due volte o mai avvenuto. Senza quella terza lista la deriva
riparte. Due dettagli che costano un pomeriggio se non li sai:

- **i due lati di un giroconto**: un travaso Cassa → Principale nell'estratto
  è due righe (+60 su Attuale, −60 su Deposito, stesso orario). Importarle
  entrambe aggiunge un'entrata e un'uscita che non sono mai esistite. Si
  appaiano per orario e importo, non per descrizione — quella è diversa sui
  due lati.
- **l'ancora si scrive sul DISPONIBILE**, non sul saldo completato: la
  differenza sono i movimenti in sospeso. Il monitor da 105,90 era già
  partito dal conto ma non era «completato», quindi il Saldo dell'estratto
  diceva 166,50 mentre spendibili ce n'erano 57,10. E la data dell'ancora è
  **domani**, perché l'ancora vale «quanto c'era all'inizio di quel giorno»
  e il saldo che si legge è quello di stasera.

Il contatore «settimane chiuse di fila» non è gamification: è l'unica cosa
che ha fatto sopravvivere un rito settimanale.

### Cosa è stato tolto

- Le barre per categoria, «Come spendi», «Sforamenti» come blocco a sé, il
  **check quotidiano**. Il check costava trenta secondi ogni sera per
  guardare quattro pallini, e a fine settimana nessun numero era cambiato.
  Al suo posto la chiusura settimanale, che produce una pagella e un report.
- **Analisi** → **Cicli**: una riga per ciclo, cinque colonne, un grafico
  (il fondo contro la linea dei versamenti). Le categorie stanno nel
  dettaglio di una riga, dove servono a cose fatte.
- Il **tetto settimanale scritto a mano** in Impostazioni. Un numero scritto
  a mano va in deriva: i budget cambiano e lui resta dov'era. Ora è Vita
  diviso i giorni del ciclo, per sette.
- «Correggi i saldi» come gesto abituale: resta solo dentro la chiusura.

### Il blocco della configurazione

Budget, soglie, obiettivo e categorie si cambiano liberamente nelle 48 ore
dopo lo stipendio. Fuori da quella finestra serve un motivo scritto, e lo
sblocco vale **un'ora** — uno sblocco permanente al primo strappo diventa la
condizione normale. Il conteggio finisce nel report settimanale: un report
che non contiene la riga «ho alzato il budget di 80 €» si può fabbricare.

Bollo e assicurazione restano fuori dal blocco: sono stime che l'app non può
sapere, e tenerle ferme vorrebbe dire proiettare ING su un numero che si sa
falso.

### Il sync, e i tre posti dove serviva una riga

Terza e quarta volta che si ripete lo stesso schema del 2 settembre:

- **`lista` viaggia fuori da `meta`**, come ricorrenti, previsti e pocket:
  dentro si fonderebbe a blocchi sotto un solo `metaUp`, e basterebbe un
  dispositivo con la lista vuota che salva qualunque altra cosa per
  portarsela via.
- **`chiusure`, `pagaFatta` e `sblocchi` si uniscono SEMPRE**, fuori dal
  cancello, come `checks` e `rules`. Non sono impostazioni: sono storia. «La
  settimana del 12 l'ho chiusa» non smette di essere vero perché l'altro
  dispositivo non lo sa, e sotto il cancello basterebbe un salvataggio dei
  saldi per azzerare un contatore di nove settimane. `pagaFatta` si unisce
  **per data e per unione degli id**: due dispositivi possono aver spuntato
  due travasi diversi, e nessuno dei due è da disfare.

### La verifica, senza Node

`moduli/finanze/prova.js` gira con Deno e controlla sessanta numeri — tutti
quelli del documento di v3, §11 — in due secondi:

```
deno run --location http://localhost/ --allow-read moduli/finanze/prova.js
```

Due trucchi che lo rendono possibile: `--location` dà a Deno un
`localStorage` vero, quindi `core/storage.js` funziona così com'è; e gli
import sono **dinamici**, perché `core/ui.js` — la versione della app di
prima, quella che il plugin «nucleo unico» sostituisce in build — registra
un ascoltatore sul `document` appena viene valutata. Fuori dal browser quel
`document` non c'è, e gli import statici si risolvono prima della prima riga
di codice: l'unico modo di mettere il tappo prima è importare dopo.

Vale per qualunque chat: **la logica condivisa si può provare in locale**, e
costa meno di un giro di CI.

### Due numeri del documento che il calendario smentisce

- **Vita → Cassa il 23 ottobre: 483,23 e non 481,50.** Il ciclo del 23
  ottobre è di 31 giorni (23 ott → 22 nov), non di 30: la quota di piano è
  17,26 e la prima settimana ne vale 51,77. La formula è quella del
  documento, il calendario è quello vero.
- **«3.500 €» in home si legge «3500,00 €».** In italiano il CLDR non
  raggruppa le migliaia a quattro cifre (`minimumGroupingDigits: 2`): 12.345
  sì, 3500 no. Non è un difetto di `euro()`, è la regola della lingua, e i
  browser fanno lo stesso.

### L'allineamento dei dati (§10) è una migrazione, non un file

`allineaV3()` in `dati.js`, marchio `config.bloccoV3`, gancio
`canale.letturaFatta` in `contratto.js` — lo stesso schema di
`dividiPersonale()`, e per la stessa ragione: una migrazione che scrive
prima di aver letto si segna come fatta su un archivio vuoto, e poi i
duecento movimenti che arrivano dal sync non li rimappa più nessuno. Il
gancio sta in due posti, perché col sync spento `avvia()` esce subito e
`ridisegna` non viene chiamata mai.

Cerca i movimenti **per data, importo e un pezzo di nota, non per id**: gli
id veri non li conosce nessuno da fuori. Quello che non trova lo lascia
stare invece di indovinare.

**Il monitor del 6 ottobre è il caso che ha insegnato qualcosa.** Andava
trasformato da «uscita diretta da ING» in due movimenti (ricarica + uscita
dal Principale). Aggiungere la coppia nuova e mettere la lapide sulla
vecchia sembrava equivalente: non lo era. La firma `data|importo|nota` della
nuova uscita era **identica** a quella della vecchia, quindi veniva scartata
come doppione e la vecchia tombata — e il monitor spariva dal ciclo, con
«Fuori piano» che diceva 3 · 134,64 invece di 4 · 240,54. Un record che
esiste e sta nel posto sbagliato **si corregge sul posto**; si aggiunge solo
quello che manca davvero.

### Richieste a core

- **Finanze → core (7 ott): la notifica della domenica sera.** Serve
  `orari.finanze.chiusura` in `notifiche.json` (con l'interruttore in
  Impostazioni → Notifiche) e il pezzo in `notifiche.js` dentro
  `atlas-dati`: la domenica dalle 20:30, se in `finanze.json`
  `config.chiusure` non ha la data di quella domenica, mandare «Chiudi la
  settimana» con rotta `#/finanze/chiusura` — la rotta c'è già e apre il
  foglio al passo 1. Nel frattempo la voce entra nella checklist della home
  dalle 18, e dopo otto giorni senza chiusura l'etichetta dei Pocket va in
  ambra: copre chi apre ATLAS, non chi se ne dimentica.
- **Finanze → core (7 ott): la notifica del lunedì dica l'importo.** Il
  testo è fisso, e l'importo della ricarica adesso è calcolato
  (`ricaricaLunedi()` in `piano.js`: si porta il Principale a
  `quota × giorni fino a domenica`). Il mittente può leggerlo da
  `finanze.json` facendo lo stesso conto, oppure il testo resta generico e
  l'importo lo mostra il foglio — che è quello che succede ora.

### Cosa resta

- La **mappa carta → pocket** è in sola lettura in Impostazioni: `*8595` =
  ING è l'unica che serve, e un selettore per una riga sola non vale la
  schermata. Si modifica a mano in `config.mappaCarte` se arriva la seconda.
- Il **nuoto** non ha un ricorrente: importo e cadenza da confermare.
- La **rata AliExpress** è la 3/3 del 1 novembre, da confermare sull'app del
  pagamento a rate. Quella del 1 dicembre è stata tombata.
- Sul **telefono vero** non provato.

---

## 8 ottobre 2026 — la scena e il vetro vero *(chat ATLAS, perimetro `app/`)*

### Glass-HQ/liquid-glass: perché non è stato importato

La richiesta era di importare `@glass-sdk/liquid-glass` «ovunque». Letto il
README del pacchetto, non si può, e le ragioni non sono di gusto:

- **WebGPU obbligatorio.** «Rendering requires HTTPS or localhost and an
  available WebGPU adapter.» E gli autori stessi scrivono «Safari has known
  rendering issues» — Safari è esattamente il motore su cui ATLAS gira, da
  installata, su un iPhone.
- **Niente backdrop arbitrario.** Fra le limitazioni: *not supported:
  arbitrary page-backdrop sampling*. Le superfici devono stare dentro una
  `GlassScene` con livelli di contenuto espliciti e **limitati**. «Ovunque»
  in ATLAS vuol dire ogni carta sopra una pagina che scorre: è il caso che
  la libreria dichiara di non coprire.
- **`maxSurfaces` 16, tetto 64.** La sola schermata Oggi ne supera sedici.
- **Niente antenati ruotati o trasformati.** I fogli salgono con
  `translateY`, la barra delle schede e i gesti rapidi con `translate`, la
  pastiglia della scheda scelta scorre con `transform`. Si romperebbero tutti.
- **React 19** per i componenti (c'è un'API `createGlassScene` vanilla, e
  quella si sarebbe potuta usare), e **versione 0.0.1**, con la parità fra i
  motori dichiarata non ancora stabilita.
- E la regola 8: niente dipendenze esterne a runtime. Un renderer WGSL non
  è una libreria che sta in un modulo solo caricato pigramente se lo si usa
  nel guscio.

Quello che si poteva prendere, ed è stato preso, è il **modello**: materiali
`clear`/`regular`, scena e livelli di contenuto espliciti, anello e
speculare, velo progressivo ai bordi, pressione fluida. Non il motore.

### La cosa che mancava non era una ricetta migliore: era qualcosa dietro

Il vetro di ATLAS era **dipinto**, e la decisione era giusta: su una pagina
nera piena `backdrop-filter` costa un filtro a schermo intero per non
mostrare niente, e su iPhone — messo sull'elemento che contiene il testo —
ricampionava anche il contenuto, sgranando icone e cifre dentro la carta.

Quindi prima della ricetta è arrivata **la scena**: un fondo fisso, dietro
tutto, con due pozze di luce molto tenui. La prima è della tinta del modulo
in cui sei (`--accento`, che il guscio imposta): passando da Finanze a
Training l'atmosfera si sposta dall'arancio al rosso. Da lì in poi il vetro
ha qualcosa da rifrangere e può essere vetro davvero.

È anche il marchio. iOS dà i mattoni e le regole, non un'identità: una app
di carte grigie su nero è la schermata Impostazioni di chiunque.

Il fondo non è più `#000000` ma `#08080c` — un filo di blu dentro il nero,
perché il grigio neutro su un OLED vira al verde e tutte le tinte di accento
di iOS sono fredde.

### Il materiale: tre strati, e il filtro non sta mai sul contenuto

```
::before   IL CORPO — qui e SOLO qui sta `backdrop-filter`
::after    L'ANELLO, LA LUCE, LO SPECULARE — solo gradienti e box-shadow
elemento   il CONTENUTO — nessun filtro lo tocca
```

È questa divisione che smonta il guasto di iPhone: il filtro guarda solo
quello che c'è SOTTO la carta, che è l'unica cosa che deve guardare, e il
testo sopra resta nitido. Non è un accorgimento, è la condizione per cui
questo materiale può esistere.

Due classi globali, `.lastra` (la superficie posata) e `.vetro` (quella che
galleggia), più `.dentro` e `.premibile`. **La ricetta era ripetuta
inline in cinque posti** — barra delle schede, toast, festa, menu dei
gruppi, bottone vetro — con gli stessi quattro valori copiati a mano. Adesso
è una.

Tre dettagli che fanno la differenza fra «sfocato» e «di vetro»:

- **L'anello in tre pezzi**: hairline chiara sopra (la luce sullo spessore),
  scura sotto (l'ombra propria dello spessore), anello intero debolissimo a
  chiudere. Un anello uniforme è il bordo di un rettangolo; tre sono un
  oggetto illuminato dall'alto.
- **Lo speculare nell'angolo**: il vetro vero concentra la luce dove la
  superficie curva, cioè sullo spigolo arrotondato.
- **La sfocatura è 20px, non 6.** Il 6 veniva dalla misura del nativo (sigma
  5,4pt) e sul nativo è giusto, perché lì dietro c'è una foto o una lista: il
  dettaglio da sciogliere è fitto. Qui dietro c'è un gradiente larghissimo, e
  sfocare di 6px un gradiente non si vede affatto. Serve un raggio
  dell'ordine della pozza di luce, non del pixel.

### Le tre trappole trovate guardando lo schermo, non il codice

1. **`color-mix()` dentro una custom property si risolve dove la property è
   DEFINITA.** `--scena-pozza: color-mix(…, var(--accento), …)` su `:root`
   prendeva sempre il ripiego blu, perché `--accento` lo mette il guscio più
   in basso. Finanze è arancione e la scena era azzurra. Adesso il token è
   una percentuale e la miscela si fa in `.scena`, che l'accento ce l'ha.
2. **Una lastra non ha più un fondo suo.** `background` e `box-shadow:
   inset` scritti sull'ELEMENTO non si vedono più: li copre il materiale,
   che sta su due pseudo-elementi dietro il contenuto. Ne erano rimasti due
   — l'anello d'allarme di «Serate fuori» e il `:active` della carta
   obiettivo — e sono stati spostati sugli pseudo-elementi e su `.premibile`.
3. **Sul vetro un grigio pieno fa una macchia, e una tinta fa fango.** La
   pastiglia della scheda scelta era stata provata con il colore del modulo:
   l'arancio di Finanze al venti per cento sopra un vetro scuro non è
   arancione. Il colore resta dove ha sempre vissuto, sull'icona e
   sull'etichetta.

### Dove il vetro si è acceso, e dove no

- **Acceso**: carte, barra delle schede, toast, menu dei gruppi, bottoni
  tondi sulla linea del titolo (erano spenti con due ragioni buone, cadute
  entrambe), barra compatta della navigazione, fogli.
- **Spento apposta**: dentro un foglio. Lì sotto non c'è la scena ma il
  fondo del foglio, che è un colore pieno: non c'è niente da sfocare e il
  filtro costerebbe un passaggio di compositing per niente. `--vetro-sfoca:
  0` dentro `.foglio`, e il velo diventa un velo chiaro sopra quel fondo.

Il conto delle superfici filtrate resta basso quasi per caso, ed è una
proprietà da non perdere: `.lastra` sta sul GRUPPO, non sulla riga. Una
lista di venti righe è una superficie, non venti.

### Il velo progressivo sotto la barra

La barra copre i primi 44 punti; il problema era il punto in cui finisce,
dove il contenuto spuntava di netto da sotto una riga sottile. Adesso c'è
una fascia di 20 punti in cui la sfocatura sfuma a zero, con una maschera a
gradiente. È il `GlassScrollEdges` dei kit nativi, in sei righe di CSS.

### Trasparenza ridotta

Chi chiede «Riduci trasparenza» su iOS non chiede un effetto più leggero:
chiede di non averlo. `@media (prefers-reduced-transparency: reduce)` riporta
il vetro **dipinto**, che è la ricetta che ATLAS aveva fino a ieri e che
funzionava. Stessa cosa sotto `@supports not (backdrop-filter: …)`.

### La firma tipografica

Un valore solo: la crenatura del titolo grande passa da +0,4 a **−0,6**. iOS
apre i titoli grandi perché stanno su un fondo piatto e devono respirare; su
vetro, con una pozza di luce dietro, un titolo aperto si sfilaccia. Stretto
diventa un blocco, e un blocco su vetro si legge come un'etichetta incisa.

Effetto collaterale utile e verificato: «Buongiorno, Ema» su iPhone occupava
298 punti nei 283 disponibili e andava a capo. Adesso ne occupa 274.

### Come è stato verificato

`svelte-check found 0 errors and 0 warnings`, e **in locale**: Deno sa
installare le dipendenze di `app/package.json` e far girare `svelte-check`
senza Node. L'unico intoppo è `svelte.config.js`, che importa
`@sveltejs/vite-plugin-svelte` con uno specificatore nudo che Deno rifiuta:
basta spostarlo per la durata del controllo.

```
cd app
mv svelte.config.js svelte.config.js.off
deno run -A --node-modules-dir=auto npm:svelte-check@4.7.6 --tsconfig ./tsconfig.json
mv svelte.config.js.off svelte.config.js
```

E `deno run -A --node-modules-dir=auto npm:vite@8.3.0` fa girare il server di
sviluppo: **le schermate si possono guardare prima di pubblicare**, che è
come sono venute fuori tutte e tre le trappole qui sopra. Vale per ogni chat.

Provato: Oggi, Finanze (Riepilogo, Cicli, lista d'attesa), Training,
Impostazioni; chiaro e scuro; telefono e PC; barra compatta scorrendo; un
foglio aperto sopra la pagina.

**Non provato: l'iPhone vero.** Ed è l'unico posto che conta davvero per due
cose — la resa di `backdrop-filter` su WebKit e il costo in batteria di sei
superfici filtrate in una schermata. Se sgrana o scalda, la via d'uscita è
già scritta e costa una riga: `--vetro-sfoca: 0` su `:root` riporta tutto al
vetro dipinto senza toccare nient'altro.

---

## 8 ottobre 2026, sera — la home: una cosa adesso, la giornata, sei carte *(chat ATLAS)*

La home era quattro carte in due pile: «Adesso» con dentro un elenco,
Project 50, Finanze, e una fascia di quadratini per gli altri moduli. Il
rifacimento viene da un mockup, e le tre idee che porta sono tutte
correzioni di qualcosa che non funzionava.

### «Adesso» non è una carta, è una striscia

Era una carta nella griglia, a pari dignità con Finanze e Pasti, e dentro
aveva un ELENCO. Un elenco in cima alla prima schermata del mattino è una
lista di debiti: si legge come un rimprovero prima di aver preso il caffè.

Ora è una striscia a tutta larghezza con UNA cosa — quella che tocca ora —
e il gesto per farla accanto. Quello che resta della giornata è sceso nella
sua carta, dove si guarda invece di subirlo.

Se c'è un allenamento con un'ora vince lui, ma solo **entro tre ore**: è
l'unica cosa della giornata che ha un appuntamento, e dirlo alle otto di
mattina per le sei di sera è solo un modo di non farti stare tranquillo.

### La Giornata: la forma del giorno, non il debito

Carta nuova. `resta` risponde a «cosa manca» ed è la domanda giusta per una
checklist — le cose fatte spariscono e il resto sale in cima. Ma una lista
in cui le cose fatte non ci sono mai state non dice che sei a metà giornata:
dice che hai ancora tre cose da fare, cioè la stessa frase di stamattina.

Serviva un canale nuovo, e l'ho aggiunto al contratto: **`giornata` in
`oggi()`** — tutto quello che oggi c'è, spuntato o no. Lo riempiono due
moduli:

- **Abitudini** (`giornataOggi()` in `calcolo.js`), che possiede quasi tutta
  la giornata. Separata da `restaOggi` di proposito: un flag `conFatte`
  avrebbe voluto dire ricordarsi di passarlo giusto, e l'ordinamento è
  diverso — lì prima i ritardi, qui l'ora del giorno.
- **Allenamenti**, che è l'unico con un'ORA vera: quando uno slot ha un
  giorno ha anche un orario, quello che finisce in calendario. Senza di lui
  la giornata sarebbe fatta solo di fasce.

La home le mette in fila per orologio: chi ha un'ora la usa, chi ha solo una
fascia usa l'ora in cui quella fascia comincia. È l'unico modo di avere una
giornata sola invece di due liste.

**Una finestra, non l'elenco.** Diciotto voci su un telefono sono un muro:
si smette di vederle e si comincia a vedere una cosa sola, lunga. Due fatte
dietro, quella di adesso, cinque davanti, e due righe che dicono quante ce
ne sono fuori. Due dietro e non zero: senza niente di fatto sopra, la prima
riga sembra l'inizio della giornata anche alle nove di sera.

### Una testata sola per tutte le carte

Pastiglia del colore del modulo, nome, chevron. Era `Sezione titolo`, cioè
un testo grigio: due carte accanto si distinguevano solo leggendole. Il
colore si riconosce da lontano, il nome lo conferma — ed è quello che rende
leggibile a colpo d'occhio una griglia di sei carte invece di sei schede
diverse.

I quadratini dei moduli sono spariti: erano un collegamento travestito da
stato, e adesso ogni modulo ha la sua carta col numero che dice di oggi.

**Il valore non è sempre un numero.** Pasti dice «Macinato di manzo + Riso
basmati + Insalata condita»: a quaranta punti sono quattro righe di display
verde che coprono la carta. Sopra i quattordici caratteri torna al corpo del
testo, con un tetto di tre righe.

### Tre pile, ancora

Stessa ragione di prima: una griglia condivide le righe, la seconda riga
aspetta la carta più alta della prima, e sotto quella corta resta il buco.
Tre pile non hanno righe in comune. La prima è più larga perché porta le due
carte che si LEGGONO — i soldi e la giornata — e le altre due quelle che si
guardano.

`.tessera:empty { display: none }`: lo snippet di un modulo senza dati non
disegna niente, ma il contenitore resta, e in una pila con `gap` un
contenitore vuoto è un buco alto quanto il passo.

### Fuori perimetro

Ho toccato `moduli/abitudini/` e `moduli/allenamenti/` per aggiungere
`giornata` a `oggi()` e `giornataOggi()` a `calcolo.js`. Sono aggiunte, non
modifiche: `resta`, `oggi()` e tutto il resto sono dove erano. Chi riprende
quelle chat lo sappia.

**Manca**: Pasti e Mobilità non riempiono `giornata`, quindi i pasti e la
sessione serale non compaiono nella lista del giorno. Due funzioni come
quella di Abitudini e ci sono.

---

## 8 ottobre 2026, tarda sera — Project 50 in pausa, e un colore per carta *(chat ATLAS)*

### La pausa è un campo, non una cancellazione

`pausa: true` su una voce di `registro.ts`. Il modulo non compare nella
barra, non ha carta in Oggi, non viene interrogato per `oggi()` e non apre
il suo canale di sync. La sua **rotta resta viva** (`#/abitudini` apre
ancora la schermata) e i suoi dati restano in `abitudini.json`.

Non si toglie la riga dal registro: sparirebbe anche la rotta — e un
segnalibro o una notifica vecchia aprirebbero il vuoto — insieme al ricordo
di com'era configurato. In Impostazioni c'è una sezione «In pausa» con una
riga spenta: senza una porta per tornarci, «in pausa» e «cancellato»
sarebbero la stessa cosa.

Si riaccende togliendo quella riga.

### La giornata adesso ha un orologio

Con Project 50 spento la lista del giorno sarebbe rimasta quasi vuota: la
riempiva Abitudini. Hanno preso il suo posto i due moduli che un orario ce
l'hanno davvero:

- **Pasti** — le cinque fasce hanno già `ora` in `dati.js`. «Fatta» qui vuol
  dire «passata», ed è la dottrina del modulo: l'assunzione è che hai
  mangiato quello che c'era nel piano, e l'archivio contiene solo gli
  scostamenti. Chiedere una spunta per ogni pasto sarebbe l'app che lui ha
  detto che non userebbe.
- **Mobilità** — una voce sola, con l'ora della sera (`notifiche.principale`,
  21:00). È una cosa che si fa dopo cena, e nella lista deve stare lì — non
  in cima, fra le cose del mattino, dove per dodici ore si impara a
  scavalcarla.

Con Allenamenti, che già la riempiva, la giornata è ora una vera sequenza:
08:00 colazione · 10:30 spuntino · 13:00 pranzo · 17:00 merenda · 18:30
allenamento · 20:30 cena · 21:00 mobilità.

### Un colore per carta

Il guasto, in una carta sola da cento punti: pastiglia rossa, nome rosso,
numero verde, barra rossa. Sei carte così sono un arlecchino, e il colore
smette di voler dire qualcosa proprio mentre ce n'è di più.

La regola, che è quella di iOS: **la tinta del modulo è l'IDENTITÀ e sta
sulla pastiglia dell'icona; il testo resta del colore del testo; il verde e
il rosso vogliono dire «fatto» e «sforato» e nient'altro.**

In pratica:

- il **nome** del modulo torna `--label-primary` (era la sua tinta);
- il **numero** non si colora più: il «fatto» lo dice una spunta da venti
  punti nella testata, non quaranta punti di cifra ridipinti;
- la **barra** porta la tinta del modulo — dice di chi è — e diventa verde
  solo quando è piena, che è l'unico momento in cui il colore dice *come va*
  e non *di chi è*;
- la **striscia di Adesso** perde l'alone colorato di fondo: sommato alla
  pastiglia e all'occhiello faceva tre volte lo stesso colore;
- nella **giornata**, le spunte fatte passano da disco verde pieno a velo
  verde al 20% — quattro dischi saturi in colonna erano la cosa più accesa
  della schermata, ed erano la parte già passata;
- e il **«sei qui»** prende l'accento della PAGINA, non la tinta della voce:
  con la tinta, la cena faceva cerchio e orario rossi, cioè un allarme.

### Due cose minori trovate per strada

- **«Avvia» su una cena** non vuol dire niente. Il verbo adesso segue la
  cosa: una sessione si avvia, un'abitudine si spunta, un pasto si apre — e
  dove il verbo è «apri» il secondo bottone sparisce, perché farebbe la
  stessa cosa del primo.
- **La barra della navigazione non copriva.** Ha dietro il testo che esiste
  per coprire, e un titolo di quaranta punti si legge attraverso mezzo velo
  anche sfocato. Token suo, `--vetro-barra`, all'82% con trenta di
  sfocatura: resta vetro, e copre. (Scritto, non calcolato con `color-mix`:
  due percentuali che superano il cento vengono normalizzate, e 100+55
  usciva 0,69 invece di 0,82.)

---

## 8 ottobre 2026, notte — la giornata è l'andamento, non un'agenda *(chat ATLAS)*

Tre correzioni, e la prima è la più importante.

### La giornata non è un calendario né una to-do list

Era diventata la lista di tutto quello che oggi succede, e cinque righe su
sette erano **pasti**: diceva «hai mangiato» invece di «com'è fatta oggi».

Serve a una cosa sola: **il profilo del giorno**. Il lavoro, che training c'è
e quale, se c'è la mobilità. Quattro righe, non dodici.

```
08:00 ✓ Lavoro       08:00 – 17:00
08:30 ✓ Facile       Corsa
17:00 ✓ Upper A      Palestra
21:00 ○ Quotidiano   Mobilità · 14 min
```

Il **lavoro** non appartiene a nessun modulo — non è una cosa che si fa
nell'app, è il blocco dentro cui il resto si incastra — quindi sta nella
home, che è l'unica che ha il compito di dire com'è fatta la giornata
(`LAVORO` in `giornata.ts`). È una riga e non uno sfondo: come sfondo
avrebbe voluto dire disegnare una scala oraria vera, cioè un calendario.

I pasti tornano dove si vanno a cercare: nella carta di Pasti, con la cena e
le proteine.

### A sinistra la giornata, e da sola

Prima stava sotto Finanze nella stessa pila: la colonna di sinistra era alta
il doppio delle altre due e a destra restava **mezza schermata vuota**.

Adesso le tre colonne sono tre cose diverse, e non è solo equilibrio di
altezze — è il motivo per cui si capisce dove guardare senza leggere i
titoli:

| | |
|---|---|
| **la giornata** | com'è fatto oggi. Si legge |
| **quello che consumi** | Finanze, Pasti |
| **il corpo** | Training, Mobilità — lo stesso gruppo che hanno già nella barra |

Le colonne finiscono a 568 / 855 / 682 invece di 568 / 635 / 846.

### Lo spacing

Era `gap: 2px` per tutto: testata, numero, dettaglio e bottone attaccati, e
«Inizia ora» incollato alla riga sopra. Un blocco di testo senza respiro.

**Le distanze non sono tutte uguali perché i legami non sono tutti uguali**:
il dettaglio appartiene al numero e gli sta a 4 punti, la testata è un'altra
cosa e sta a 16, l'azione è un'altra cosa ancora e sta a 16 dal resto con
sopra tutto lo spazio che avanza.

E `min-height: 196px` su tutte e tre le tessere di stato, che è l'altezza
della più alta: quattro carte affiancate che vanno da 80 a 200 punti si
leggono come quattro cose diverse, con un fondo comune diventano tre
tessere. La simmetria non è un vezzo — è la differenza fra tre carte e una
colonna.

---

## 9 ottobre 2026 — la cornice di sistema seguiva un colore che non c'era più *(chat ATLAS)*

La barra del titolo della PWA su Windows era nera sopra una pagina che nera
non è più: dal rifacimento dello stile il fondo è `#08080c` — un filo di blu
nel nero, perché il grigio neutro su un OLED vira al verde — e fra le due si
vedeva la riga di stacco.

Il colore di quella cornice (barra del titolo su Windows, barra di stato su
Android, striscia sotto il notch su iOS) non lo decide il CSS: è l'unico
pezzo di interfaccia che sta **fuori dalla pagina**, e lo legge il browser da
`<meta name="theme-color">` e dal manifest. Erano scritti a mano a `#000000`,
ed è bastato cambiare un token perché andassero fuori sincrono.

Riscriverli a mano avrebbe solo spostato la prossima dimenticanza. Adesso
`lib/core/tema.ts` **legge `--scena-fondo`** — il token che dipinge davvero
la pagina — e scrive un `<meta>` suo: se il fondo cambia, cambia anche la
cornice, e non c'è un secondo posto da ricordarsi.

Risolve anche un caso che i due `<meta media="...">` non possono risolvere:
quelli seguono il tema del **sistema**, mentre ATLAS ha anche un tema forzato
(`data-tema`). Con «Chiaro» scelto a mano su un telefono in scuro, la pagina
era chiara e la barra restava nera. Un `MutationObserver` su `data-tema` più
l'ascolto di `prefers-color-scheme` coprono tutti e tre i momenti: all'avvio,
al cambio in Impostazioni, al tramonto.

I due `<meta media>` di `index.html` restano, allineati ai token, e servono
al **primo disegno** — prima che il JavaScript parta. Il manifest passa a
`#08080c` per `theme_color` e `background_color` (la schermata di avvio).

**Nota per chi lo prova:** il `<meta>` vale da subito al ricaricamento, ma la
barra del titolo di una PWA **installata** la dipinge Chrome dal manifest, e
quello lo rilegge quando gli pare — può volerci un giro o una
reinstallazione prima che si veda.

---

## 9 ottobre 2026 — la riga di stacco non era il `theme-color` *(chat ATLAS)*

Allineato il `theme-color` al token, la riga **si vedeva ancora**. Il motivo
è che stavo allineando un colore solo a una pagina che in cima non ne aveva
uno: `.scena` dipingeva sopra `--scena-fondo` una fascia chiara di orizzonte
e il bordo della pozza di luce del modulo, che è colorata e **cambia con il
modulo**. Il colore da raggiungere non era fisso: era blu sulla home, arancio
su Finanze. Nessun valore scritto nel `<meta>` poteva prenderli tutti.

Quindi non si allinea, si costruisce. In cima alla pila dello sfondo c'è ora
`linear-gradient(180deg, var(--scena-fondo), var(--scena-fondo-0) 160px)`: a
zero l'alfa è 1, cioè il primo pixel della pagina **è** `--scena-fondo` per
costruzione, e la luce comincia sotto. L'orizzonte chiaro è sparito — era
proprio lui la fascia — e la grana si tiene fuori dagli stessi 160 punti con
una maschera: all'1,8 % non si vede, ma a contatto con una barra piena
sarebbe l'unica cosa a rendere visibile il punto di contatto.

**`--scena-fondo-0` non è un lusso.** Sfumare verso `transparent` sembra la
stessa cosa e non lo è: `transparent` è *nero* con alfa zero, e la sfumatura
ci passa attraverso il grigio. In scuro non si nota; in chiaro, dove il fondo
è `#eceef4`, si vedeva una fascia sporca dove non doveva esserci niente. Il
token è lo stesso colore con `00` in coda, ed è usato anche dai `velo-bordi`,
che avevano lo stesso difetto.

Provato mettendo una striscia di `--scena-fondo` pieno sopra la metà sinistra
del primo centimetro di pagina: se si vede, la giunzione è sbagliata. In
scuro e in chiaro non si vede.

---

## 9 ottobre 2026 — le righe si guardavano, non si toccavano *(chat ATLAS + Finanze)*

«Non riesco a cliccare e fare tipo "paga", perché è il giorno e l'ho pagata.»
iCloud+ scadeva oggi, la riga lo diceva, e non c'era niente da toccare.

Il foglio **esisteva già** — `FoglioArrivo.svelte`, con «Paga», la correzione
dell'importo e la via di riparazione «era già pagata, non registrare niente».
Era cablato in `Vista.svelte` da settimane. Semplicemente non lo apriva
nessuno: le righe di «In arrivo» erano `<span>` dentro un `<li>` senza
scatola. Una schermata che si legge e basta non si distingue da una
schermata rotta.

**Adesso si apre tutto quello che ha un dentro.** In Finanze: le righe di
«In arrivo» (prima e dopo la paga) aprono il foglio della scadenza, quelle di
«Fuori piano» il movimento, quelle di «Pocket» i saldi, e la riga verde
«GIORNO DI PAGA» i quattro travasi. In home: le due scadenze urgenti della
carta Finanze, il numero grande di ogni carta, e il nome di ogni voce della
giornata.

Tre cose tecniche che valeva la pena risolvere bene:

**`subgrid`.** Le righe stanno su una griglia a colonne perché le cifre a
destra si confrontino con l'occhio. Un bottone con `display: contents` non ha
area di tocco; un bottone normale avrebbe incolonnato per conto suo. Il
bottone è una scatola vera con `grid-template-columns: subgrid`, e le sue
celle restano sulle colonne di sopra. Il padding è solo verticale: uno
orizzontale sposterebbe la subgriglia, cioè romperebbe la cosa per cui è lì.
La quarta colonna è il chevron — senza, una riga che si apre e una che non si
apre hanno lo stesso aspetto, ed è esattamente il guasto di partenza.

**La home non apre un foglio di Finanze, ci naviga.** Nessun modulo ne importa
un altro (regola 12), e il foglio vive dentro la vista del modulo. Quindi
ogni riga si porta dietro la sua rotta — `#/finanze/arrivo/<origine>/<id>/<quando>` —
e Finanze la ricompone con `voceInArrivo()`: lo stesso meccanismo delle
notifiche, che è già provato. L'indirizzo torna `#/finanze` appena il foglio è
aperto, se no «indietro» lo riaprirebbe.

**Guardare e fare sono due rotte diverse.** La carta di Mobilità aveva
testata, corpo e bottone che portavano tutti e tre a `#/mobilita/inizia`: da
nessuna parte si poteva semplicemente guardare il modulo. Ora testata e corpo
vanno alla schermata, il bottone fa la cosa.

Due difetti trovati per strada e corretti: le voci di «In arrivo» **dopo** la
paga non avevano `fra` né `stimato`, e il loro foglio scriveva «fra undefined
giorni» (finché si potevano solo guardare non se n'era accorto nessuno); e
«↓ altre 3» della giornata puntava a `#/abitudini`, che da ieri non c'è più —
adesso apre la giornata intera, che è dove quelle voci stanno davvero.

---

## 10 ottobre 2026 — l'Analisi metteva tutto in un calderone *(chat Finanze)*

«È fatta bene graficamente ma non mi fa capire dove vanno i soldi.» Il
motivo era uno solo: affitto, rata del prestito, Telepass pagato da ING, il
monitor e il caffè finivano negli stessi totali, nelle stesse medie, nelle
stesse proiezioni. «Ritmo +426 €», «media al giorno 98 €», «scontrino medio
50 €», «giorno più caro 875 €»: numeri veri, tutti gonfiati dall'affitto, e
nessuno dei quali dice niente su quello che si può cambiare.

**La regola nuova, e non ha eccezioni:** nessuna media, proiezione,
percentuale o confronto si calcola su un totale che contiene Fisse o spese
da riserva. Si calcola solo su quello che decidi tu.

### I cinque gruppi — `moduli/finanze/gruppi.js`

Ogni uscita finisce in uno e un solo gruppo. L'ordine *è* la definizione, e
ogni riga è lì per un caso vero:

1. **`fuoriPiano: true` scritto a mano** vince su tutto. È una marca, non una
   deduzione: se l'hai messa tu, sai qualcosa che il calcolo non sa. È anche
   il caso del monitor — comprato dal Principale dopo averlo ricaricato da
   ING — che resta una decisione tua, non un prelievo.
2. **Fisse** (tasca Spese fisse, o legate a un ricorrente di categoria
   Fisse), e *prima* della deduzione: un affitto da 850 € inserito a mano
   supererebbe la soglia del fuori piano e si prenderebbe il posto di una
   decisione.
3. **Da riserva** (tasca ING, o legate a un ricorrente/previsto su ING), e
   anche questa prima della deduzione: il Telepass da 368 € passa la soglia
   ma non è una cosa scelta stasera.
4. **Fuori piano dedotto** (`eFuoriPiano`): sopra soglia, non legato a una
   scadenza, non alimentare, non uscito dalla lista d'attesa.
5. **Pianificate**: legate a un previsto, o comprate dalla lista d'attesa.
6. **Quotidiano**: il resto.

Fuori piano + Quotidiano = **«Decise da te»**, le uniche due leve. Le uscite
rimborsate per intero non entrano in nessun gruppo: zero non appartiene a
niente, e metterlo in un gruppo gonfierebbe un conteggio senza spostare un
euro. `controllaCopertura()` esiste per vedere il contrario — un'uscita che
nessuna regola prende — perché il totale continuerebbe a tornare e il buco
non si vedrebbe.

### La schermata

A: la barra impilata e le cinque righe, ognuna apribile sui suoi movimenti.
B: il donut delle sole «decise», per categoria, con **due filtri che non si
parlano** — i gruppi decidono quali soldi entrano, le categorie come si
vedono — e il totale al centro sempre sulla somma del visibile. C: il ritmo
del quotidiano contro la quota del piano, con l'andamento in cui i fuori
piano sono **punti sopra la linea, non sommati** (una decisione presa una
volta non alza il ritmo di tutti i giorni dopo). D: le sottocategorie del
solo quotidiano, col medio accanto al conteggio. E: gli ultimi cicli in
quattro colonne separate, senza totale unico.

Via: i segnali «da tenere d'occhio» (le percentuali di categoria erano
calcolate col fuori piano dentro), le tile media/scontrino/giorno più caro,
«per giorno della settimana», le barre di budget per categoria — i budget
vivono nella legenda del donut, dove servono. Con loro se n'è andato quasi
tutto `analisi.js`, che resta di due funzioni: *quale* ciclo.

### Le correzioni ai dati — `sistemaGruppi()`

Una tantum, marchio `config.bloccoGruppi`, **dopo** la lettura del repo come
tutte le altre. Assegna solo categoria e sottocategoria: non tocca importi,
pocket né date. Un pocket sbagliato sposta dei saldi, e un saldo si corregge
guardando l'estratto, non indovinando.

- le Fisse senza sottocategoria (erano «Altro · Fisse · 7 volte · 1.528 €»,
  il blocco più grosso del ciclo e dentro non c'era scritto niente) →
  Affitto / Prestito / Abbonamenti / Telefono, dedotti dalla nota;
- Telepass da categoria Fisse → **Auto › Pedaggio**;
- «Patente Droni» → **Svago › Corsi**, sottocategoria nuova;
- la rata AliExpress 2/3 → legata a un previsto (`v3-aliexpress-2`, già
  `pagatoIl`), che è l'unica cosa che la distingue da una spesa fissa: esce
  dalla stessa tasca delle bollette, e il pocket da solo mente.

### Verifica

`moduli/finanze/prova-gruppi.js` — 56 controlli, due secondi:

```
deno run --location http://localhost/ --allow-read moduli/finanze/prova-gruppi.js
```

L'archivio della prova non è l'export vero (quello sta sul telefono) ma ha
la stessa forma, e torna ai numeri del documento: Fisse 1.159,97 · Da
riserva 368,05 · Pianificate 79,41 · Fuori piano 240,54 · Quotidiano 426,87
· totale 2.274,84 · decise 667,41 · 23,72 €/g contro un piano di 17,83 ·
+177 € · donut 667,41 che spegnendo «Fuori piano» diventa 426,87.

La riprova che la forma è quella giusta: 1.159,97 (le sei fisse) + 368,05
(il Telepass, che nella schermata vecchia era in categoria Fisse) fa
esattamente 1.528,02 in sette movimenti, cioè la riga «Altro · Fisse» che
c'era prima.

**Resta da verificare sui dati veri**, che qui non ci sono: il PC ha solo
l'archivio di allineamento a otto movimenti.

### Una nota sul punto delle migliaia

Il documento scrive «1.159,97 €», la app scrive «1159,97 €»: `Intl` in
italiano non raggruppa i numeri di quattro cifre (`useGrouping: "min2"`), ed
è la forma che usa tutta la app da sempre. Si cambia in una riga in
`core/ui.js` — ma cambia ogni schermata, quindi è una decisione a sé.

---

## 10 ottobre 2026 — tre numeri che si smentivano *(chat Finanze)*

«Che cazzo mi significa oggi 10,75, speso oggi 46,51, restano −35,76?»

    OGGI  10,75 €
    speso oggi 46,51 € · restano −35,76 €

Tutti e tre esatti. La schermata mentiva lo stesso, perché **il numero
grande era quello sbagliato**: 10,75 € non li puoi spendere, li hai già
spesi. La quota è la *razione* del giorno — un dato di partenza, fermo
dall'alba al tramonto — e sotto la scritta «puoi spendere oggi» ci va
quello che ne avanza. Sono la stessa cosa solo la mattina presto, ed è per
questo che la cosa è passata inosservata per settimane.

Nessun controllo sui valori l'avrebbe presa: nessun valore era sbagliato.
Da qui il terzo file di prove.

### Cosa è cambiato

**La giornata.** Il grande è `resta`, in rosso quando è negativo, con
accanto «ancora oggi» oppure «oltre la quota». Sotto, il conto nell'ordine
in cui lo si fa a mente — «quota del giorno 13,63 € · speso 46,51 €» — e
solo se c'è un conto da fare: a giornata intatta erano lo stesso numero
scritto due volte. Dopo uno sforo compare la riga che mancava, e che è la
domanda vera: *e adesso?* «Hai sforato di 32,88 € · domani la quota scende
a 10,89 €». Il sistema si raddrizza da sé, ma finché non si legge sembra
che lo sforo resti lì per sempre.

Stessa cosa sulla carta in home: il numero è `resta`, e **l'etichetta la
scrive il modulo insieme al numero** (`oggiEti`). Era fissa nella home —
«Puoi spendere oggi» — sopra un numero che può essere negativo.

**L'obiettivo.** Il riquadro diceva, su una riga sola:

    in linea · a questo ritmo arrivi a 2.860 €, mancano 640 €

Due verdetti opposti attaccati da un punto, e nessuno dei due dichiarato.
«In linea» guarda **indietro** (hai versato quello che dovevi) e con zero
stipendi passati è vera per definizione: compariva verde accanto a
«0 € / 3.500 €». «Mancano 640 €» guarda **avanti**, ed è l'unica delle due
che chiede qualcosa. Adesso il verdetto è uno — ci arrivi o no — e sotto ci
sono **le due leve con il loro prezzo**: «+64 € a stipendio per 10 volte»
oppure «5 stipendi in più». Dirne una sola suggerisce che l'unica via sia
stringere, ed è di solito il momento in cui si smette di guardare il
riquadro. Nel foglio dell'obiettivo c'è la terza, «abbassare il traguardo»,
perché il target è dichiarato una stima.

**Il fuori piano contato in due modi.** Il Riepilogo usava `eFuoriPiano()`
nudo, l'Analisi la gerarchia dei cinque gruppi: l'affitto (850 €, sopra
soglia, nessuna scadenza collegata) e il Telepass da ING finivano fra «le
decisioni prese sul momento» su una schermata e al loro posto sull'altra.
La regola è salita in `piano.js`, dove vive il piano, e `gruppi.js` la
ri-esporta: una regola, due schermate, lo stesso elenco.

**I Movimenti andavano a mesi solari** — l'ultima schermata a parlare una
lingua diversa da tutte le altre. Chi cercava la spesa che ha fatto saltare
il ciclo la trovava spezzata in due mesi. Ora anche lei va da stipendio a
stipendio, e il selettore del ciclo è uno solo per le tre schede.

**Lo speso del giorno guardava meno tasche della quota.** La quota divide
Principale + Contanti + Cassa, `spesoDiPiano` contava solo le prime due:
un'uscita presa dalla Cassa spariva dal conto della giornata e ricompariva
il giorno dopo come quota più bassa, senza che niente dicesse perché.

**Parole.** «restano −35,76 €» non è un'informazione, è una sottrazione
lasciata a metà: adesso è «hai sforato di 35,76 €». «= 134% del versamento
mensile al fondo» cominciava con un uguale sospeso: «vale 1,3 versamenti al
fondo». «Pocket 80 €» nel foglio di una categoria era il *budget*, e
«pocket» in questa app è una tasca della banca. «totale 890 € · ciclo 23
set – 22 ott» stava sotto la riga di ING e si leggeva come un suo
dettaglio: «tutto insieme: 890 €». Nella pagella della domenica, «Fondo in
linea» è diventato due righe, perché sono due domande.

### `prova-coerenza.js`

```
deno run --location http://localhost/ --allow-read moduli/finanze/prova-coerenza.js
```

Non controlla che un numero sia giusto — a quello servono `prova.js` e
`prova-gruppi.js`. Controlla che **due numeri mostrati insieme dicano la
stessa cosa**, che è il guasto di oggi. L'archivio rimette l'app in quella
giornata: 139,81 € per 13 giorni, 46,51 € già usciti. Fra i 36 controlli:
il grande è `resta` e non `quota`; la carta in home e la schermata dicono
lo stesso numero; nessuna frase scrive «restano» davanti a un negativo;
Riepilogo e Analisi contano lo stesso fuori piano; l'aumento proposto per
l'obiettivo chiude davvero il buco ed è il più piccolo che basta.

### Una nota di cantiere

`svelte-check` sposta `svelte.config.js` per girare, e Vite se ne accorge e
si riavvia: farlo mentre l'anteprima è aperta l'ha fatta morire con un
watcher su un file temporaneo sparito. Prima il controllo dei tipi, poi
`preview_start` — o fermare l'anteprima.
