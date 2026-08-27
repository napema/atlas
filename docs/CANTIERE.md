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
