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

Rifatto su `docs/APPLE.md`. Token in `styles/tokens.css`, componenti in
`styles/base.css`, un `stile.css` per modulo caricato dal router insieme al
modulo. Chiaro e scuro, più la scelta manuale.

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

---

## Decisioni aperte

- **Spegnimento delle app di partenza.** Una alla volta, e solo dopo che i
  due dispositivi mostrano gli stessi numeri per qualche giorno. I repo dati
  vecchi non si cancellano: costano nulla e sono l'unica rete di sicurezza
  rimasta.
- **Le foto dei progressi di Mobilità.** Lo schema c'è (`foto[]` e
  `core/blobs.js`), l'interfaccia per scattarle no. Serviva
  all'assessment, che oggi è completato con la sola lateralizzazione.
- **`legacy/`.** Si cancella quando le tre app di partenza sono spente e i
  moduli hanno retto un mese.
