# Il linguaggio visivo di ATLAS

Questo file descrive **come è fatto** ATLAS. È il riferimento per chi aggiunge
una schermata: se una cosa non è qui dentro, probabilmente non va inventata.

Sostituisce `docs/APPLE.md`. Il tentativo di fare ATLAS in stile Apple puro è
stato abbandonato: `liquid-glass`, i materiali traslucidi e le tinte di sistema
davano una schermata piatta, tutta dello stesso grigio, in cui la cifra che
conta pesava quanto l'etichetta accanto. Quello che è rimasto di quel giro sono
le due lezioni che valgono ancora — **contrasto misurato, non a occhio** e
**44px di bersaglio** — e le trovi qui sotto come regole.

---

## 1. Da dove nasce

Nero pieno, tinte sature, una cifra enorme per schermata, e blocchi con angoli
larghi. L'idea è che ogni schermata risponda a **una domanda sola**, e che la
risposta si legga da un metro di distanza senza mettere a fuoco.

Concretamente, tre cose:

1. **Un eroe per schermata.** La cifra che decide la giornata sta in cima, in
   48–66px, sul fondo nudo o su una scheda con un velo dell'accento. Tutto il
   resto è più piccolo di lei, sempre.
2. **Le tessere al posto degli elenchi.** Nove righe di testo si leggono una
   per una; nove tessere colorate si scorrono con l'occhio e ci si ferma su
   quella messa peggio. Dove c'era un elenco con le barrette ora c'è
   `griglia-tessere`.
3. **Il colore vuol dire una cosa sola.** Vedi §3.

---

## 2. I token

Stanno in `styles/tokens.css` e **nessun modulo ne inventa altri**. Un colore
letterale in un modulo è un errore, senza eccezioni.

### Fondi

| token | scuro | a cosa serve |
|---|---|---|
| `--fondo` | `#000000` | la pagina |
| `--fondo-alto` | `#0b0b0d` | la barra |
| `--scheda` | `#141416` | la superficie normale |
| `--scheda-alta` | `#1e1e22` | dentro una scheda |
| `--scheda-viva` | `#292930` | premuto, selezionato |
| `--traccia` | `#2b2b31` | il binario di una barra |

### Testo

Quattro livelli, e sono **misurati**: ognuno sta sopra 4,5:1 sul fondo più
chiaro su cui può capitare (`--scheda-viva`). Il terziario a `#74747c` faceva
3,97:1 e le etichette minuscole sparivano; ora è `#90909a`.

`--testo-4` è **decorativo** — righelli, segnaposto — e sta sopra 3:1. Non ci
va testo da leggere.

### Tinte

`--rosa --blu --giallo --arancio --viola --verde --menta --rosso --indaco
--pesca --ciano --lime --grigio`

Nel tema chiaro si scuriscono tutte quel tanto che basta a stare sopra 4,5:1 sul
bianco. Stessa identità, leggibili anche lì.

### Stati

`--ok --avviso --male` sono un insieme **separato** dalle tinte, anche quando il
valore coincide. Se il verde di «tutto bene» fosse anche il verde di una
categoria, non si capirebbe più quale dei due sta parlando.

### Angoli

`--r-scheda: 20px` · `--r-interno: 14px` · `--r-btn: 16px` · `--r-pillola: 999px`

---

## 3. Il colore vuol dire una cosa sola

Questa è la regola che ha fatto cambiare più codice.

- **Verde = fatto.** Non è la tinta di nessun modulo. Finanze era verde ed è
  diventata `--lime` proprio per questo.
- **Rosso = stato negativo.** Non è la tinta di nessuna categoria. «Cibo fuori»
  era rosso ed è diventato `--rosa`.
- **Ogni modulo ha la sua tinta, e sono tutte diverse**: Oggi `--pesca`,
  Finanze `--lime`, Mobilità `--ciano`, Abitudini `--viola`, Impostazioni
  `--grigio`. Prima Oggi e Mobilità erano tutte e due blu.

La tinta del modulo la dichiara **`core/registro.js`**, non il modulo. Il router
la mette su `<html>` come `--accento`, e da lì in giù ogni componente condiviso
diventa del colore giusto senza una riga di codice nel modulo.

---

## 4. I componenti

Stanno in `styles/base.css` e si costruiscono con le funzioni di `core/ui.js`.

| componente | funzione | cos'è |
|---|---|---|
| `.tessera` | `tessera({…})` | il mattone della griglia: simbolo, nome, cifra, e la barra col cursore in fondo |
| `.barra-cursore` | (dentro `tessera`) | il binario con la punta triangolare che dice a che punto sei |
| `.griglia-tessere` | — | due colonne su telefono, tre da 900px |
| `.spezzata` | `spezzata(voci)` | una barra sola divisa in segmenti colorati |
| `.gettone` | `gettone(simbolo, tinta)` | il quadratino col simbolo davanti a una riga |
| `.selettore` | `selettore(voci, …)` | la pillola col menu a tendina |
| `.cifra-xl/l/m/s` | — | la scala delle cifre |
| `.val` `.cts` | `euroGrande(cent)` | l'euro piccolo e i centesimi piccoli attorno alla cifra grande |
| `.micro` | — | l'etichetta maiuscoletta sopra un numero, con `.ok/.avviso/.male` |
| `.azione-tonda` | `azionePrincipale()` | il tondo bianco fisso in basso a destra |

### Il tasto tondo

Ogni modulo dichiara la sua azione con `azionePrincipale()`:

```js
azionePrincipale: () => ({ icona: "piu", etichetta: "Nuovo movimento", fai: () => … }),
```

Registrare una spesa, iniziare la sessione, aggiungere un'abitudine: sono le
tre cose per cui apri l'app, e stanno tutte sotto lo stesso pollice. **Un
modulo senza un'azione ovvia restituisce `null`** e il tondo non compare — un
pulsante generico che non sai cosa fa è peggio di nessun pulsante.

Da quando c'è, il «+» nell'intestazione è sparito da Finanze e Abitudini: era
lo stesso gesto in cima allo schermo, dove il pollice non arriva.

---

## 5. Le regole che non si discutono

1. **Nessun colore letterale in un modulo.** Solo token.
2. **Contrasto misurato, non a occhio.** Ogni testo sta sopra 4,5:1 (3:1 sopra
   i 24px, o 18,7px in grassetto). Chi cambia un grigio lo rimisura — e chi
   scrive lo strumento di misura lo **calibra prima** su un caso noto: nero su
   bianco deve dare 21,00. Un misuratore sbagliato è peggio di nessun
   misuratore, perché dà fiducia.
3. **44px di bersaglio.** Il disegno può essere più piccolo — la spunta di
   Abitudini è un cerchio da 30px dentro un bottone da 44 — ma l'area toccabile
   no.
4. **17px minimo sui campi di testo.** Sotto, iOS zooma al focus e non torna
   indietro.
5. **Niente `var()` negli attributi di presentazione SVG.** `fill="var(--x)"`
   non si risolve: i colori e i font degli SVG passano da
   `.style.setProperty`. Da qui la firma doppia di `tag()` in
   `moduli/finanze/grafici.js`.
6. **Niente `requestAnimationFrame` per far comparire qualcosa.** In una scheda
   non visibile — l'app riaperta da una notifica — quel frame non arriva mai, e
   il foglio resta trasparente sopra la schermata: invisibile e cliccabile. Si
   forza un reflow (`void nodo.offsetHeight`) e si aggiunge la classe subito.
7. **I tre riquadri della home ci sono sempre**, anche vuoti. Una home che
   nasconde ciò che non ha dati cambia forma ogni giorno, e una cosa che cambia
   forma non si impara a leggere con la coda dell'occhio.

---

## 6. La home

È l'unica schermata con un compito diverso dalle altre: non mostra dati,
**dice cosa devi sapere**. Nell'ordine:

1. **Il saluto**, minuscolo e grande, con il punto colorato. È una persona che
   parla, non un'insegna.
2. **Il briefing**: una frase — «Ti manca mobilità. Si sta facendo tardi.» — e
   sotto i due o tre numeri del giorno presi dalla **lavagna**, non dai moduli.
3. **Una carta larga**, e una sola: la cosa da fare più urgente, con l'invito
   esplicito. Prima la carta mostrava *tutte* le cose da fare e la griglia
   sotto le rimostrava una per una: la stessa frase due volte nella stessa
   schermata, che è il modo più veloce per far smettere di leggere.
4. **Le tessere** degli altri moduli.
5. **Gli ultimi sette giorni**: non dice cosa hai fatto, dice se ci sei stato.

---

## 7. Desktop

Da 900px la barra in basso diventa una colonna fissa a sinistra da 244px e
`#app` prende `padding-left: 244px`.

**Non è una griglia**, ed è deliberato: con `display: grid` l'auto-placement
metteva la barra e il contenuto su due righe, e il risultato era la barra a
metà pagina con mille pixel di nero sotto. La barra è `position: fixed`, il
contenuto ha un padding, e non c'è modo di sbagliare.

Il centro dell'area dei contenuti non è il centro della finestra: gli avvisi
stanno a `calc(50% + 122px)`, i fogli a `calc(50% + 122px)`.
