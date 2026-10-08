# Modulo Allenamenti — briefing

Istruzioni per chi lavora su Allenamenti. Valgono **in aggiunta** al
`CLAUDE.md` alla radice, che va letto per primo.

## Il tuo perimetro

Possiedi `moduli/allenamenti/` e **nient'altro**. Committa con il prefisso
`allenamenti:`.

## Cosa tiene

Un **blocco** di 13 settimane verso i 5 km sotto i venti minuti. Parte lunedì
**14 settembre 2026**, finisce domenica **13 dicembre**, e il test è dentro
l'ultima settimana.

## Le tre cose che ti faranno perdere tempo se non le sai

1. **Il piano è CODICE, non dati.** Le tredici settimane stanno in `dati.js`
   come costante `PIANO`. Non si seminano nell'archivio e non si
   sincronizzano. È quello che rende questo modulo immune alla classe di
   guasti che ha morso ATLAS quattro volte — un valore di fabbrica con un
   `up` fresco che batte la scrittura vera. Nell'archivio ci va solo quello
   che succede.

2. **Gli slot NON hanno un giorno**, ed è il piano a volerlo: «3 corse + 3
   palestre a settimana, giorni liberi». Quindi niente griglia
   lunedì-domenica da riempire, e la domanda della schermata non è «cosa
   tocca oggi» ma «quanto mi resta e quanti giorni ho». Se un giorno ti viene
   voglia di scrivere «oggi tocca la lunga», fermati: è una cosa che l'app si
   sta inventando.

3. **Gli allenamenti importati COPRONO il piano, non lo sostituiscono.** Lo
   scostamento sta nello stesso record della spunta (`slot[]`, campi `testo`
   e `km`) e si toglie con `ripristinaSlot`. Un record separato vorrebbe dire
   due chiavi da tenere allineate nel sync per la stessa casella, e la prima
   volta che si disallineano hai uno slot spuntato che mostra il lavoro di un
   altro.

## Gli id

Deterministici, sempre. Uno slot è `s03-qualita`, una corsa è
`c-2026-09-15-6210` (data + metri). Due dispositivi che spuntano la stessa
cosa producono lo **stesso** record, e reimportare lo stesso export di Garmin
non raddoppia i km — che sono l'unico numero per cui questo modulo esiste.

## I file

| file | cosa |
|---|---|
| `dati.js` | `PIANO` (costante), l'archivio, gli slot, le scritture |
| `calcolo.js` | puro: progresso, km, andamento, proiezione. Nessun DOM |
| `importa.js` | CSV in entrata: corse da Garmin, allenamenti dalla chat |
| `passi.js` | il testo del piano → passi strutturati |
| `fit.js` | lo scrittore binario del file Garmin |
| `hevy.js` | il client dell'API, e il vocabolario italiano→inglese |
| `viste.js` | striscia, testata, slot, andamento, fogli |
| `stile.css` | i token di ATLAS, con la voce editoriale del piano |

## Portare fuori: due strade diverse

**Hevy si crea davvero** (`hevy.js`). API aperta, `api-key` in un header,
CORS permissivo — verificato prima di scrivere il codice, perché senza
backend non c'è modo di aggirarlo. La chiave sta in una casella LOCALE che
il sync non tocca: atlas-dati si legge col token dentro `config.js`, che è
servito da Pages, quindi sincronizzarla vorrebbe dire pubblicarla.

**Garmin no** (`fit.js`). Non esiste una porta d'ingresso che non sia un
file `.FIT` binario, quindi il pulsante lo costruisce e lo salva; poi lo
mandi a Garmin Connect dal foglio di condivisione. Tre tocchi, non uno, e
non si può fare di meglio da nessuna app.

`passi.js` traduce il testo italiano del piano in passi strutturati. Quando
non capisce NON inventa: un passo aperto col testo originale, e la vista lo
dice. Un orologio che impone dieci ripetute che non erano nel piano è molto
peggio di uno che dice «corri».

## Quello che manca ancora

- **Import da PDF**: servirebbe pdf.js, che è pesante. Se si fa, va caricato
  pigramente e **solo dentro questo modulo** (regola 8 alla radice).
- **Un secondo blocco**: oggi `PIANO` è uno solo. Quando ne servirà un altro,
  diventa un elenco di blocchi con l'inizio in `config`.

---

## «Ho fatto un altro allenamento» (8 ottobre 2026)

Il piano è scritto per un mondo in cui decidi tu. Nella settimana vera
decidono anche gli altri: si va a correre col gruppo e la facile diventa una
lunga, la palestra è piena e la Lower diventa una Upper, il martedì c'è il
calcetto. Finché l'app sapeva dire solo «fatto / non fatto», quelle sedute
finivano in uno dei due modi sbagliati — spuntate come se avessi fatto
quello che c'era scritto, e allora i km mentono, oppure lasciate aperte, e
allora la settimana sembra persa quando invece ti sei allenato.

`cambiaSlot(id, { nome, testo, genere, km, secondi, durata, data })` riusa
**lo stesso scostamento dell'import**, nello stesso record della spunta.
Nessun secondo posto dove scrivere «cosa ho fatto davvero».

**Se è una corsa, diventa anche una corsa.** Non basta scriverlo sullo slot:
andamento, tetto della lunga e proiezione sui 5 km leggono `corse[]`. Quindi
`cambiaSlot` ne crea un record marcato `manuale: true` e legato allo slot.
`ripristinaSlot` lo toglie.

**La misura scaccia la stima.** Una corsa a mano da 10 km e la stessa corsa
dall'orologio da 10,14 hanno id diversi — `idCorsa` viene da data+metri — e
senza una regola sarebbero venti chilometri dove ce n'erano dieci. Quando
`salvaCorse` riceve una corsa NON manuale, le stime a mano dello stesso
giorno prendono la lapide e il legame con lo slot passa alla corsa vera.

Due cose che cambiano di conseguenza, e sono facili da dimenticare:

- **Il genere cambia con lo slot.** Una corsa fatta in palestra smette di
  contare nei «0/4 corse» e nei km previsti. Se restasse `corsa` direbbe che
  quei chilometri sono ancora da fare.
- **`gambeIl()` guarda il TESTO, non l'id.** L'id resta `s01-lower` anche
  dopo il cambio — ci sono appese la spunta e il giorno — quindi guardare
  solo l'id direbbe «ieri gambe» a chi è stato a nuoto, e bloccherebbe la
  seduta dura di oggi per niente.

`moduli/allenamenti/prova.js` controlla tutto questo con Deno, in due
secondi e senza Node:

```
deno run --location http://localhost/ --allow-read moduli/allenamenti/prova.js
```

### I pezzi, e l'abbinamento (8 ottobre 2026, sera)

**Una seduta può avere più pezzi.** 3 km, 2 km, 1 km a ritmo gara non sono
«6 km»: sono tre ripetute. Il campo è `giri[]`, lo **stesso** che il file dei
giri di Garmin porta già con sé — un 5×1000 fatto in pista e un 5×1000 letto
dall'orologio sono la stessa cosa, e due campi vorrebbero dire due strade da
tenere allineate nel grafico del passo, nei totali e nel sync.

**Una seduta spezzata non è una corsa continua, e il suo totale non si usa
per il passo.** È la trappola peggiore di tutto questo lavoro: sommare solo i
tempi dei pezzi dà «6 km in 23:56», cioè 3:59/km — più veloce di qualunque
singola ripetuta, perché i recuperi non sono nel tempo. Riegel su quel numero
diceva 19:35 sui 5 km, il muro già sfondato, a uno che le ripetute le aveva
corse a 4:02. Quindi:

- `proiezione()` **scarta l'aggregato** di una corsa con più di un pezzo e
  guarda i singoli pezzi ≥ 3 km;
- `equivalente5k()` di una spezzata usa il **pezzo migliore**;
- i **chilometri** del totale restano veri e contano nel volume e nel tetto.

**Tre attività dello stesso giorno sono una seduta.** In pista l'orologio
registra ogni ripetuta a sé, quindi nell'elenco diventano tre corse: il tetto
della lunga vedeva 3 km invece di 6. `sedutaDelGiorno(iso)` le raccoglie,
`unisciCorse(iso)` le fonde in una coi pezzi dentro (lapidi sulle altre, mai
rimozioni).

**L'abbinamento** (`daAbbinare`, `slotPerGiorno`, `abbina`) chiude il giro che
l'import lasciava aperto: i chilometri entravano, ma lo slot restava da
spuntare a mano. Ora l'import **propone** — giorno, seduta, slot più vicino di
chilometri, con un selettore per cambiarlo — e collegare mette il giorno sullo
slot, ne riscrive il contenuto e lo spunta. Propone e non fa: un CSV che
riscrive il piano da solo toglie la fiducia nei dati più in fretta di
qualunque bug.

Lo slot proposto si sceglie per distanza, e per le ripetute sbaglia quasi
sempre: 6 km somigliano più ai 7 della soglia che ai 7,6 degli intervalli. Il
selettore non è un extra, è il pezzo che rende usabile l'euristica.
