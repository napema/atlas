# Da ATLAS a life_app — il passaggio

ATLAS (Svelte, GitHub Pages, dati in `napema/atlas-dati`) si trasferisce dentro
**life_app** (`C:\Users\ASUS\life_app`: React 19 + Tailwind, Tauri 2 per
Windows, Supabase per i dati, Vercel per il web). Questo file è per la chat
che fa il porting. Va letto **prima** di scrivere codice, insieme a
`CLAUDE.md`, `docs/SCHEMI.md`, `docs/SYNC.md` e alle memorie in
`C:\Users\ASUS\.claude\projects\C--Users-ASUS-Documents-ATLAS\memory\`.

---

## 0. La regola sopra tutte: niente si perde

1. **ATLAS resta viva** finché life_app non fa tutto quello che fa ATLAS, coi
   dati veri, su iPhone e su Windows. È l'app che si usa ogni giorno: se il
   porting ha un problema, il dato del giorno si inserisce lì.
2. **`atlas-dati` non si tocca e non si cancella mai.** È un repo git: ogni
   sync è un commit, quindi ogni versione di ogni file è recuperabile. Finito
   il porting si **archivia** su GitHub (Settings → Archive), non si elimina.
3. **Si copia, non si sposta.** L'import in Supabase legge `atlas-dati` e
   scrive in Supabase. Non scrive mai in `atlas-dati`.
4. **Prima di ogni import, una fotografia**: un clone di `atlas-dati` in una
   cartella datata FUORI da qualunque repo (contiene dati finanziari
   personali), più i conteggi della sezione 4. Se qualcosa va storto si
   riparte da lì.
5. **L'import è idempotente**: si può rifare dieci volte e il risultato è lo
   stesso. Upsert sulla chiave, e su un conflitto vince il record con `up` più
   alto — la stessa regola di ATLAS. Così si rilancia finché ATLAS è ancora in
   uso, senza duplicare e senza tornare indietro.

## 0bis. Com'è fatta life_app, e lo stile

**All'apertura, un launcher**: icone grandi e cliccabili, una per app —
**To do** e **Calendar** (che esistono già in life_app) e poi un'icona per
ogni modulo di ATLAS: Finanze, Abitudini, Training, Mobilità, Pasti, e la
schermata Oggi. Ogni icona apre la sua app dentro life_app.

**Lo stile è quello di life_app, non quello di ATLAS.** To do e Calendar
sono il riferimento: colori, tipografia, spaziature, componenti, icone,
materiali. I moduli di ATLAS si ridisegnano in quello stile; non si porta
niente di `app/src/lib/stili/`, del kit `app/src/lib/ui/` o di
`docs/DESIGN.md`. Mai il contrario: To do e Calendar non si toccano per
somigliare ad ATLAS.

Di ATLAS si portano la logica, i dati e le regole — non l'aspetto. Due
eccezioni, perché non sono stile ma significato, e vanno rese con i mezzi di
life_app: un colore deve voler dire una cosa sola (in ATLAS il verde è
«fatto» e il rosso uno stato negativo), e i campi di testo restano almeno a
17 px su iPhone (sotto, iOS zooma e non torna indietro).

## 1. Le fasi

| fase | cosa | chi scrive dove |
|---|---|---|
| **A. Fotografia** | clone datato di `atlas-dati` + conteggi | nessuno scrive |
| **B. Schema** | le tabelle ATLAS in Supabase (sezione 2), con RLS | migrazione SQL in life_app |
| **C. Import** | script una tantum: `atlas-dati` → Supabase, poi verifica (sezione 4) | lo script, solo su Supabase |
| **D. Doppio binario** | life_app legge i dati importati; ATLAS resta l'app vera; l'import si rilancia quando serve | ATLAS su `atlas-dati`, lo script su Supabase |
| **E. Modulo per modulo** | quando un modulo di life_app fa tutto, si **congela** quel modulo in ATLAS (sola lettura), ultimo import, verifica, e da lì si scrive solo in life_app | — |
| **F. Chiusura** | tutti i moduli passati: ATLAS in sola lettura, `atlas-dati` archiviato | — |

Mai due app che scrivono lo stesso modulo in due posti diversi: è la
situazione in cui un dato inserito su una non esiste sull'altra, e il giorno
dopo nessuno sa più quale è giusta.

## 2. Lo schema: generico prima, normalizzato dopo

Il modo che **non può perdere niente** è portare i record come sono,
conservandone `id`, `up` e le lapidi:

```sql
-- un record di ATLAS = una riga. `dati` è il record intero, come in atlas-dati.
create table public.atlas_record (
  user_id  uuid    not null default auth.uid() references auth.users,
  modulo   text    not null,          -- 'finanze', 'abitudini', 'allenamenti', …
  tipo     text    not null,          -- 'movs', 'ricorrenti', 'previsti', 'pockets', 'lista', 'slot', …
  id       text    not null,          -- l'id di ATLAS, IDENTICO (es. 'v31-corredo-quota')
  up       bigint  not null default 0,
  del      boolean not null default false,
  dati     jsonb   not null,
  primary key (user_id, modulo, tipo, id)
);

-- i blocchi di configurazione (`meta` di ogni file), uno per chiave
create table public.atlas_meta (
  user_id uuid   not null default auth.uid() references auth.users,
  modulo  text   not null,
  chiave  text   not null,             -- 'config', 'profili', 'cats', 'soglie', 'rules', …
  up      bigint not null default 0,
  valore  jsonb  not null,
  primary key (user_id, modulo, chiave)
);
-- RLS: ognuno vede e scrive solo le sue righe (user_id = auth.uid()).
```

Perché così e non subito tabelle «belle»: ogni campo che ATLAS ha aggiunto
negli anni (`pian`, `copre`, `rif`, `pending`, `fuoriPiano`, `ecc`,
`interessi`, `tredicesima`…) sopravvive senza che nessuno debba ricordarsene.
Le tabelle normalizzate (movimenti con colonne vere, indici per data) si
costruiscono **dopo**, da qui, con una vista o una migrazione — e si
verificano contro questa.

**Gli id non si cambiano mai.** Sono deterministici (`s03-soglia`,
`c-2026-09-15-6210`, `v31-*`) e ci sono legami fra record che li usano:
`rif` (rimborso → uscita), `pian` (movimento → scadenza), `copre`
(ricarica → uscita), `movId` (lista d'attesa → movimento). Un id rigenerato
spezza i legami senza errori visibili: i numeri cambiano e basta.

## 3. Cosa c'è in `atlas-dati`

| file | contenuto |
|---|---|
| `finanze.json` | `movs`, `ricorrenti`, `previsti`, `lista`, `pockets` + `meta` (cats, profili, rules, config, soglie, `up`, `profiliUp`) |
| `abitudini.json` | abitudini, log delle spunte, semi |
| `allenamenti.json` | `slot`, `corse`, `settimane`, `bonus`, `config` |
| `mobilita.json` | sessioni, assessment |
| `pasti.json` | piano dei pasti |
| `notifiche.json` | iscrizioni push e orari — **non si portano**: life_app ha le sue |
| `contesto.json` | la lavagna del giorno, potata a 14 giorni — **non serve portarla** |
| `stato-mittente.json`, `stato-notifiche.json` | stato dei mittenti — **non si porta** |

Il dettaglio dei campi e le trappole sono in `docs/SCHEMI.md`.

## 4. La verifica: i numeri devono tornare uguali

Un import è finito solo quando questi numeri sono **identici** fra ATLAS e
life_app, calcolati con lo stesso codice (le funzioni pure dei moduli, vedi
sezione 5):

- **Finanze**: movimenti vivi e lapidi per tipo; somma di `imp` per tipo; il
  saldo di ogni pocket (`saldoPocket`); la quota di oggi (`quotaDi`); il fuori
  piano del ciclo (`fuoriPianoDelCiclo`); il cuscinetto (`cuscinetto`); i
  travasi del prossimo stipendio (`travasiPaga`).
- **Abitudini**: abitudini vive, spunte per giorno degli ultimi 60 giorni.
- **Allenamenti**: slot fatti per settimana, km per settimana, corse.
- **Mobilità**: sessioni per settimana, ultimo assessment.
- **Ogni modulo**: numero di record per `tipo` e numero di lapidi.

`moduli/finanze/prova.js` mostra come far girare quel codice in Deno su un
archivio caricato da file: lo stesso trucco serve per calcolare i numeri su
entrambi i lati.

## 5. Cosa si riusa e cosa si rifà

**Si riusa, quasi così com'è** — JavaScript puro, niente DOM:

- Finanze: `calcolo.js`, `piano.js`, `pesa.js`, `travasi.js`, `paga.js`,
  `gruppi.js`, `chiusura.js`, `revolut.js`, `importa.js`
- Allenamenti: `calcolo.js`, `passi.js`, `fit.js`, `importa.js`
- Abitudini, Mobilità, Pasti: i rispettivi `calcolo.js`
- Notifiche: `notifiche/piano.ts` (cosa mandare e quando) — si sposta dentro
  una Edge Function di Supabase

Dipendono da tre file del nucleo, che in life_app vanno sostituiti da un
adattatore con la **stessa interfaccia**:

| in ATLAS | cosa fa | in life_app |
|---|---|---|
| `core/storage.js` → `apriCasella(id, default)` | `leggi()`, `scrivi()`, `aggiorna(fn)`, `osserva()` | una casella sopra Dexie, sincronizzata con le tabelle della sezione 2 |
| `core/ui.js` | date (`oggiISO`, `piuGiorni`, `daISO`), `euro()`, `nuovoId()` | si copia: sono funzioni pure |
| `core/contesto.js` | la lavagna (`scriviFatto`, `leggiFatto`) | una tabella o uno store locale |

**Si rifà**: tutte le viste (da Svelte a React), il service worker, le
iscrizioni push, il registro dei moduli.

## 6. Le trappole che ci sono già costate care

Ognuna è nata da un dato perso o da un numero sbagliato.

1. **Gli importi sono in centesimi.** `660` è 6,60 €. Mai convertire in euro
   nel database.
2. **`data` non è `ts`, `ts` non è `up`.** `data` è il giorno del movimento,
   `ts` quando l'hai scritto, `up` l'ultima modifica (è quello che decide la
   fusione).
3. **Le cancellazioni sono lapidi** (`del: true` con `up` nuovo). Una riga
   cancellata davvero viene rimessa dall'altro dispositivo al primo sync.
4. **Ogni scrittura alza `up`**; un valore di fabbrica nasce con `up: 0`. Due
   dispositivi con lo stesso `up` e valori diversi si contraddicono per sempre
   (memoria `stallo-up-pari-nel-sync`).
5. **Chi non ha letto non scrive**, anche le migrazioni automatiche: girano
   solo dopo la prima lettura (memorie `scritture-che-partono-da-se`,
   `migrazioni-e-stato-condiviso`).
6. **La storia si unisce, non si sostituisce**: check giornalieri, chiusure
   settimanali, travasi della paga fatti, regole di categorizzazione. In
   ATLAS si fondono per unione; un `upsert` che sostituisce il blocco intero
   li cancella.
7. **ING è un pocket esterno**: si muove solo con giroconti, sforamenti e
   movimenti legati a una scadenza (`pian`); il resto lo fa l'ancora
   (`saldo` + `ancoraDa`). L'ancora va col giorno DOPO.
8. **Il fuso è Europe/Rome** per tutto quello che è «oggi»: le notifiche, il
   cambio di giorno, il ciclo dello stipendio.
9. **`giorniFra` conta gli estremi** (oggi→oggi = 1); `fra` è la distanza
   (oggi→oggi = 0).

## 7. Segreti e pubblicazione

- **Su Vercel va solo `dist`**: `.vercelignore` esclude già `supabase/`,
  `src-tauri/`, `.env*`. Niente segreti nella build: la chiave `anon` di
  Supabase è pubblica per progetto, la `service_role` non deve mai stare
  nell'app.
- **Lo script d'import** usa la `service_role` (o un utente autenticato) da
  terminale, letta da una variabile d'ambiente, mai da un file del repo.
- **`life_app/supabase/password.txt` è registrato in git dal primo commit.**
  Se il repo va su GitHub va prima tolto dalla cronologia e la password del
  database va cambiata (memoria `niente-segreti-nei-file-serviti-da-pages`:
  un segreto in un file pubblicato è pubblico anche dopo averlo cancellato).
- Le chiavi VAPID di ATLAS restano ad ATLAS; life_app ha le sue.
