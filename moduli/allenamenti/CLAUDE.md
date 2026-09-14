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
