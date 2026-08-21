# ATLAS

Finanze, mobilità e abitudini in una sola PWA. Statica, offline, installabile,
sincronizzata fra iPhone e Windows senza backend.

→ **[napema.github.io/atlas](https://napema.github.io/atlas/)**

---

## Stato

| Parte | Stato |
|---|---|
| Guscio: shell, router, registro, storage, sync, token, PWA | pronto |
| Oggi (la home che aggrega i moduli) | pronta, in attesa di moduli che parlino |
| Impostazioni: tema, stato sync, spazio, backup | pronte |
| Finanze · Mobilità · Abitudini | da portare — vedi `CLAUDE.md` §5 |
| Notifiche unificate | da fare |

Le tre app di partenza sono **ancora vive** e restano la copia buona finché
il modulo corrispondente non è finito. Ogni schermata in migrazione ci manda
con un pulsante.

---

## Provarla in locale

Serve un server vero: i moduli ES e il service worker non funzionano da
`file://`.

```bash
python -m http.server 8080
```

Poi `http://localhost:8080`. Senza `config.js` compilato gira tutto in
locale, senza sincronizzazione.

## Metterla sull'iPhone

Safari → Condividi → *Aggiungi alla schermata Home*. Da lì parte a schermo
intero, con la sua icona e senza barra degli indirizzi.

---

## Struttura

```
core/       il guscio: router, storage, sync, blob, ui
moduli/     un modulo per cartella, caricato pigramente
styles/     token e componenti condivisi
docs/       architettura, sync, migrazione
legacy/     i sorgenti delle tre app di partenza, da leggere mentre si porta
```

Niente build, niente dipendenze, niente CDN. È una scelta: un'app che deve
durare anni non deve dipendere da una catena di strumenti che invecchia.

## Documentazione

- **`CLAUDE.md`** — perché ATLAS esiste, il contratto dei moduli, le regole
  ferme. Da leggere prima di toccare qualsiasi cosa.
- **`docs/SYNC.md`** — come si configura la sincronizzazione e i tre guasti
  veri da cui nascono le sue regole.
- **`docs/MIGRAZIONE.md`** — come si porta un'app di partenza dentro ATLAS
  senza perdere un dato.
