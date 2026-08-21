# Abitudini — messa in opera

Due repo, come su Registro: uno pubblico per il sito, uno privato per i dati.

---

## 1. Repo pubblico del sito

Crea `abitudini-webpage` (pubblico) e mettici dentro, alla radice:

```
index.html
config.js
sw.js
manifest.webmanifest
icon-192.png
icon-512.png
icon-512-maskable.png
apple-touch-icon.png
```

Settings → Pages → Source: `main` / root. Il sito esce su
`https://TUOUTENTE.github.io/abitudini-webpage/`.

## 2. Repo privato dei dati

Crea `abitudini-dati` (**privato**). Lascialo vuoto: il file `abitudini.json`
lo crea l'app alla prima scrittura.

## 3. Token GitHub

Settings del profilo → Developer settings → Personal access tokens →
**Fine-grained tokens**. Solo repository `abitudini-dati`, solo permesso
**Contents: Read and write**. Scadenza: quella che ti pare, ma segnatela.

Converti il token in base64 e spezzalo in tre. Dal terminale:

```bash
printf '%s' 'github_pat_...' | base64 -w0
```

Prendi la stringa e tagliala in tre pezzi a caso (es. 20 / 20 / il resto).
In `config.js`:

```js
window.APP_CFG = {
  owner: "TUOUTENTE",
  repo:  "abitudini-dati",
  path:  "abitudini.json",
  branch:"main",
  t1: "primo pezzo", t2: "secondo pezzo", t3: "terzo pezzo",
  vapidPublicKey: ""      // lo riempi al punto 5
};
```

Il token resta leggibile da chiunque apra il sorgente: è antiscraping, non
sicurezza. Regge perché tocca un solo repo privato di dati tuoi e si revoca
in un clic.

## 4. Installazione su iPhone

Apri il sito in **Safari** (non Chrome) → Condividi → **Aggiungi alla schermata
Home**. Da lì in poi apri sempre l'app da quell'icona: le notifiche funzionano
solo così.

## 5. Notifiche

### 5a. Chiavi VAPID

```bash
npx web-push generate-vapid-keys
```

- La **pubblica** va in `config.js` → `vapidPublicKey`.
- La **privata** non va mai nel sito.

### 5b. Il mittente

Nel repo **privato** `abitudini-dati` metti:

```
notify.js
.github/workflows/notify.yml
```

Poi Settings del repo → Secrets and variables → Actions:

| Tipo     | Nome            | Valore                          |
|----------|-----------------|---------------------------------|
| Secret   | `VAPID_PUBLIC`  | la chiave pubblica              |
| Secret   | `VAPID_PRIVATE` | la chiave privata               |
| Secret   | `VAPID_SUBJECT` | `mailto:tua@email.it`           |
| Variable | `APP_URL`       | l'URL di GitHub Pages del sito  |

Lancia il workflow a mano una prima volta (Actions → Promemoria abitudini →
Run workflow) per vedere il log.

### 5c. Attivazione sul dispositivo

Nell'app: ingranaggio → Promemoria → interruttore **Notifiche su questo
dispositivo**. Fallo su ogni dispositivo su cui le vuoi. Poi imposta l'orario
su ogni abitudine, nel suo editor.

Il promemoria parte solo se l'abitudine non è già segnata e solo nei giorni in
cui è prevista. Se lo perdi per più di 3 ore, viene saltato invece di arrivare
a notte fonda.

**Limite da conoscere**: il cron di GitHub Actions non è puntuale. Il giro è
ogni 10 minuti ma può slittare, soprattutto agli orari tondi. Se ti serve un
promemoria al minuto esatto, quello lo fa una sveglia, non questa app.

---

## Manutenzione

- **Ogni volta che modifichi i file**: alza `CACHE` in `sw.js`
  (`abitudini-v1` → `abitudini-v2`). Senza, i dispositivi restano su una
  versione vecchia.
- `index.html` e `config.js` sono serviti *network-first*: un reload basta a
  farli aggiornare, anche senza toccare la cache.
- Se una versione resta incastrata: ingranaggio → **Svuota cache e ricarica**.
- Il pallino in alto a destra è lo stato del sync: grigio non configurato,
  ambra in corso, verde a posto, rosso errore (il messaggio è nel tooltip e
  in Impostazioni → Sincronizzazione).

## Com'è fatto dentro

- Un solo JSON: `habits`, `logs`, `subs`, `meta`.
- Merge **per record**, non per file: due dispositivi che toccano abitudini
  diverse non si sovrascrivono. Vince l'`up` più alto.
- Le cancellazioni sono **lapidi** (`{id, del:true, up}`), potate dopo 90
  giorni. Senza lapidi, un'abitudine cancellata sul telefono tornerebbe viva
  dal PC.
- Il segno di un giorno ha id `abitudineID|AAAA-MM-GG`: lo stesso segno fatto
  su due dispositivi è lo stesso record, non due.
- `snapshot()` normalizza prima di confrontare, così non parte una PUT ogni
  20 secondi per una differenza inesistente.
- Il sync non ridisegna mai mentre scrivi o mentre hai un foglio aperto: il
  ridisegno viene rimandato alla chiusura.

## Note su iPhone e Windows

- **Emoji**: su iPhone e Mac sono quelle native. Su Windows arrivano come
  immagini dal CDN jsDelivr (`emoji-datasource-apple`), con ricaduta sul font
  di sistema se il CDN non risponde. Il font Apple Color Emoji non è
  ridistribuibile, quindi questa è la strada praticabile.
- **Font**: su iPhone e Mac è SF Pro vero. Su Windows scende su Segoe UI: SF
  Pro non si può servire da web.
