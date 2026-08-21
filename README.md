# ATLAS

Finanze, mobilità e abitudini in una sola PWA. Statica, offline,
installabile, sincronizzata fra iPhone e Windows senza backend.

→ **[napema.github.io/atlas](https://napema.github.io/atlas/)**

---

## Cosa fa

Tre tracker separati diventano uno. Non è un refactoring: è la schermata
**Oggi**, che nessuna delle tre poteva avere da sola — quanto resta in
cassa questa settimana, la sessione di mobilità del giorno e le abitudini
ancora da spuntare, in un colpo d'occhio.

| modulo | cosa fa |
|---|---|
| **Finanze** | movimenti, budget per categoria, cassa settimanale, proiezione di fine mese, autocategorizzazione che impara |
| **Mobilità** | la sessione del giorno decisa dall'app, follow-along cronometrato, progressi per gruppo muscolare |
| **Abitudini** | spunte del giorno, serie, tre tipi di pianificazione |

I moduli non si conoscono fra loro, ma si parlano: finita una sessione di
mobilità, l'abitudine corrispondente si spunta da sé.

## Stato

Tutti e tre i moduli sono dentro, con i dati veri migrati. Le notifiche sono
unificate: una coppia VAPID e un workflow al posto di due.

Resta un passo che può fare solo l'utente: installare ATLAS sull'iPhone e
attivare le notifiche da Impostazioni. Le iscrizioni delle vecchie app non
si possono riusare, perché una subscription è legata all'origine e allo
scope del service worker.

Le tre app di partenza sono ancora vive e si spengono una alla volta.

---

## Provarla in locale

Serve un server vero: i moduli ES e il service worker non funzionano da
`file://`.

```bash
python -m http.server 8080
```

Senza `config.js` compilato gira tutto in locale, senza sincronizzazione.

## Metterla sull'iPhone

Safari → Condividi → *Aggiungi alla schermata Home*. Da lì parte a schermo
intero, con la sua icona. **Le notifiche funzionano solo da qui**, non da
Safari.

---

## Struttura

```
core/       router, storage, sync, bus, lavagna, blob, notifiche, ui
moduli/     un modulo per cartella: dati / calcolo / viste / modulo / stile
styles/     token e componenti condivisi
docs/       schemi, sync, migrazione, stile, cantiere
legacy/     i sorgenti delle tre app di partenza, da leggere
```

Niente build, niente dipendenze, niente CDN. È una scelta: un'app che deve
durare anni non deve dipendere da una catena di strumenti che invecchia.

## Documentazione

- **`CLAUDE.md`** — perché ATLAS esiste, il contratto dei moduli, le regole
  ferme. Da leggere prima di toccare qualsiasi cosa.
- **`docs/SCHEMI.md`** — i tre schemi letti dai dati veri, con le trappole.
- **`docs/APPLE.md`** — il riferimento di stile. I token ne sono la
  traduzione: se divergono, vince il documento.
- **`docs/SYNC.md`** — come è configurata la sincronizzazione e i guasti veri
  da cui nascono le sue regole.
- **`docs/MIGRAZIONE.md`** — la procedura di porting e la lista di controllo.
- **`docs/CANTIERE.md`** — chi fa cosa, decisioni chiuse e aperte.
