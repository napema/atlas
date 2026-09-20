# Modulo Pasti — briefing

Istruzioni per chi lavora su Pasti. Valgono **in aggiunta** al `CLAUDE.md`
alla radice, che va letto per primo.

## Il tuo perimetro

Possiedi `moduli/pasti/` e **nient'altro**. Committa con il prefisso
`pasti:`.

## Cosa tiene

Un **database di pasti** e un **piano settimanale** che ne esce da solo, più
il conto di quanto si mangia davvero. L'obiettivo dichiarato è la massa:
surplus calorico, proteine alte, e cibo che non fa stare male. Non è un'app
per pesare l'insalata — è un'app che sa già cosa mangi e ti dice se oggi ci
sei o no.

---

## La decisione che regge tutto: il piano È il registro

L'utente **non loggherà**. L'ha detto chiaramente: «tendenzialmente non ti
importo nulla». Un'app che per funzionare ha bisogno che tu apra e confermi
tre pasti al giorno, dopo nove giorni è un'icona morta.

Quindi l'assunzione predefinita è: **hai mangiato quello che c'era nel
piano.** L'archivio non contiene i pasti mangiati, contiene solo gli
**scostamenti**, che sono tre e non uno di più:

| tipo | cosa vuol dire |
|---|---|
| `aggiunta` | qualcosa in più (la pizzetta, il panino delle 10:30) |
| `cambio` | al posto del pasto pianificato ne ho mangiato un altro |
| `salto` | il pasto pianificato non l'ho mangiato |

È la stessa forma di Finanze: un'àncora e i movimenti che la spostano. Ed è
il motivo per cui questa app può stare zitta per una settimana intera e
avere comunque numeri veri.

**Se ti viene voglia di aggiungere un quarto tipo, o un registro completo
"per sicurezza", fermati.** Due fonti di verità per la stessa giornata si
disallineano alla prima fusione, e da lì in poi nessuno dei due numeri è
quello giusto.

---

## Le cinque cose che ti faranno perdere tempo se non le sai

### 1. Il database dei pasti è DATI, non codice

Qui **non** si può fare come Allenamenti, che tiene il `PIANO` come costante
e per questo è immune alla classe di guasti dell'`up`. Lì il piano lo scrive
un allenatore e non cambia mai; qui il database cresce ogni volta che
l'utente scopre che gli piace una cosa nuova.

Quindi i pasti sono record veri: `id` stabile, `up` a ogni scrittura, lapidi
(`del: true`) per le cancellazioni. E vale in pieno la regola che ha morso
ATLAS cinque volte: **un valore di fabbrica non può nascere con un `up`
fresco.** Vedi il punto 3.

### 2. I pasti comuni sono CODICE, e non si sincronizzano

`COMUNI` in `dati.js` è la tabellina della pizzetta, del panino col
prosciutto, della banana, del cornetto. Serve a rendere l'import di uno
scostamento un tocco solo invece di una sessione di ricerca nutrizionale.

Stanno nel codice di proposito: sono cultura generale, non un dato
dell'utente. Nel database personale entrano **solo** quando li tocca lui, e
a quel punto diventano record suoi con il suo `up`.

### 3. La semina aspetta la prima lettura

L'assessment iniziale scrive: profilo, settimana tipo, primo giro di pasti.
Il piano settimanale si genera da sé. Sono tutte **scritture che partono da
sé**, cioè esattamente la categoria che in ATLAS ha già resuscitato dati
cancellati due volte.

Regola, senza eccezioni: **nessuna scrittura automatica prima di
`canale.letturaFatta`** (o `canale.stato === "off"`, cioè sync spento sul
serio). Un telefono appena installato che genera il piano della settimana
prima di aver letto il repo sovrascrive il piano che l'altro dispositivo
aveva già aggiustato a mano.

E il guardiano sta **fuori** dalla scrittura: se non c'è niente da fare si
esce prima di chiamare `casella.aggiorna`, altrimenti si notifica un
cambiamento che non c'è stato e il sync entra in un giro infinito. È
successo con `semina()` in Abitudini.

### 4. Il pianificatore è deterministico, seminato dall'id della settimana

Il piano si genera in locale, su entrambi i dispositivi, potenzialmente nello
stesso minuto. Se il generatore usasse `Math.random()`, iPhone e PC
produrrebbero due piani diversi per la stessa settimana, e la fusione ne
sceglierebbe uno a caso — cioè l'utente vedrebbe il menù cambiare da solo
passando da un dispositivo all'altro.

Quindi: PRNG seminato con l'id della settimana (`w-2026-09-21`) più la
versione del database. Stessi pasti, stessa settimana, stesso piano, su
qualunque dispositivo. È un vincolo di correttezza, non un'eleganza.

Corollario: appena l'utente tocca il piano a mano, `bloccato: true`, e il
generatore non ci ritorna sopra.

### 5. Le tendenze sono DERIVATE, mai salvate

«Se importo tre volte il panino col prosciutto alle 10:30, sai che è una
tendenza» — vero, ed è un calcolo su `registro`, non una lista a parte.

Salvare le abitudini apprese vorrebbe dire una seconda fonte di verità che
si fonde separatamente e diverge dal registro che l'ha prodotta. `calcolo.js`
le ricalcola quando servono, e costano niente: sono qualche centinaio di
record.

---

## Il vocabolario

**Fascia** — il momento del pasto: `colazione`, `spuntino1`, `pranzo`,
`spuntino2`, `cena`. Cinque, fisse, in `dati.js`.

**Settimana tipo** — per ogni giorno e ogni fascia, com'è fatta di solito:

| regime | cosa vuol dire | conta nei numeri? |
|---|---|---|
| `casa` | lo pianifica l'app dal database | sì, col pasto vero |
| `fuori` | mangia fuori, non lo pianifica nessuno | sì, con la **stima** del profilo |
| `salto` | quella fascia non la fa | no |

Il regime dichiarato oggi è: in settimana solo la **cena** è `casa`, il
pranzo è `fuori`; venerdì, sabato e domenica anche il **pranzo** è `casa`.
Ma è un dato del profilo, non una costante: non incastrarlo nel codice.

`fuori` con una stima è il compromesso che tiene in piedi il conto senza
chiedere niente. Un pranzo fuori non tracciato che vale zero calorie
renderebbe il bilancio della giornata una bugia, e con una bugia in mezzo il
surplus non si governa.

**Scostamento** — vedi sopra. `aggiunta`, `cambio`, `salto`.

---

## Gli id

Deterministici, sempre, come in Allenamenti.

| cosa | forma | perché |
|---|---|---|
| pasto | `p-<slug del nome>` | reimportare lo stesso pasto dalla chat non lo duplica |
| piano | `w-<lunedì ISO>` | una settimana, un record, su ogni dispositivo |
| scostamento | `s-<data>-<hhmm>-<slug>` | lo stesso panino registrato due volte resta uno |

Il punto non è l'eleganza: è che due dispositivi che fanno la stessa cosa
devono produrre lo **stesso** record, altrimenti la fusione li somma e il
conto delle calorie raddoppia.

---

## I file

| file | cosa |
|---|---|
| `dati.js` | lo schema, la casella, `COMUNI` e `FASCE` (costanti), le scritture |
| `calcolo.js` | puro: fabbisogno, bilancio del giorno e della settimana, tendenze. Nessun DOM |
| `piano.js` | il generatore settimanale deterministico e i suoi vincoli |
| `importa.js` | JSON dalla chat di Claude (pasti) e scostamenti al volo |
| `viste.js` | assessment, settimana, giornata, database, impostazioni |
| `stile.css` | i token di ATLAS |
| `modulo.js` | contratto, canale di sync, scheda per la home |

---

## Dove finisce l'intelligenza artificiale

Fuori, come in Allenamenti. L'app non ha un modello e non lo avrà: niente
backend, niente CDN.

La divisione è questa, e conviene tenerla:

- **La chat di Claude popola il DATABASE**, ogni tanto, quando serve roba
  nuova o si vuole rifare i conti sui macro. Formato JSON, `importa.js`.
- **L'app pianifica la SETTIMANA**, da sola, ogni domenica, senza chiedere
  niente a nessuno.

Il contrario — chiedere alla chat il piano ogni domenica — sarebbe una
dipendenza settimanale da un'app esterna per una cosa che è un giro di
`for` su una lista di pasti. Il piano della settimana non richiede
intelligenza: richiede i vincoli giusti, e quelli stanno in `piano.js`.

---

## La scheda della home

`oggi()` dice **due cose sole**: cosa c'è per cena, e quante proteine
mancano. Non il totale delle calorie, non una percentuale, non un semaforo.

«Non voglio essere fissato»: una home che ogni mattina apre con un numero
rosso su quanto hai sgarrato ieri è esattamente l'app che si disinstalla a
gennaio. Il tono è quello di un promemoria, non di un giudizio.

---

## Quello che non c'è, e perché

- **Niente ricette e niente ingredienti.** Richiesta esplicita: «non ho
  bisogno di ricette». Un pasto porta i suoi macro e basta. Lo strato degli
  ingredienti servirebbe solo alla lista della spesa, che oggi non c'è.
- **Niente database nutrizionale esterno.** Nessuna API, nessun CDN: i macro
  li porta il pasto, scritti una volta.
- **Niente micronutrienti** per ora. Il design li mostra, ma senza una fonte
  dati sarebbero numeri inventati, ed è peggio di non averli.

## Quello che manca ancora

- L'attività di Allenamenti dovrebbe alzare il fabbisogno nei giorni di
  palestra. Si fa con la **lavagna** (`leggiFatto("allenamenti", …)`), mai
  con un import diretto: è una richiesta da mettere in `docs/CANTIERE.md`
  per la chat Allenamenti.
- La lista della spesa. C'è nel design di partenza, non è stata chiesta.
