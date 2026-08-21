# Sincronizzazione iOS ⇄ Windows

Nessun backend. I dati vivono in un repo GitHub **privato**, letti e scritti
dal browser con la Contents API. `localStorage` è la copia locale che fa
funzionare tutto offline; il repo è la copia condivisa.

---

## Come si mette in piedi

### 1. Il repo dei dati

Crea un repo **privato** chiamato `atlas-dati`. Vuoto va benissimo: i file
li crea l'app al primo salvataggio.

```bash
gh repo create napema/atlas-dati --private --add-readme
```

Alla fine conterrà:

```
finanze.json      movimenti, categorie, ricorrenti
mobilita.json     assessment, programma, storico sessioni
abitudini.json    definizioni, spunte, serie
notifiche.json    iscrizioni push e orari
foto/<id>.jpg     le foto dei progressi (i riferimenti stanno nel JSON)
```

**Un file per modulo, non uno unico.** Ogni file ha il suo `sha`: due moduli
che salvano nello stesso istante non entrano in conflitto. Con un file solo,
salvare le finanze mentre il timer della mobilità scrive una sessione
significa che uno dei due perde.

### 2. Il token

Un token **fine-grained**, non un classico:

- *Repository access*: solo `napema/atlas-dati`
- *Permissions* → *Contents*: **Read and write**
- niente altro

### 3. `config.js`

In una console del browser:

```js
const t = "github_pat_iltuotoken";
const b = btoa(t), n = Math.ceil(b.length / 3);
console.log(JSON.stringify([b.slice(0, n), b.slice(n, 2*n), b.slice(2*n)]));
```

I tre pezzi vanno in `t1`, `t2`, `t3`.

> Il token è nel sorgente di un sito pubblico. Non è sicurezza: è
> antiscraping. Regge perché il token può fare **una cosa sola** su **un
> repo privato di dati personali** e si revoca in un clic. Se i dati
> diventano sensibili sul serio, o gli utenti più di uno, questa soluzione
> non basta più e serve un backend.

---

## Come funziona il ciclo

```
GET file  →  fondi col locale  →  salva in locale  →  PUT se è cambiato
```

Ogni venti secondi mentre l'app è in primo piano, un secondo e mezzo dopo
una modifica locale, e sempre al rientro in primo piano o al ritorno online.

### Il modello dei dati

Ogni lista sincronizzata è una lista di record con:

- `id` — stabile, generato una volta, mai riusato
- `up` — millisecondi dell'ultima modifica

La fusione è **per record**: vince il più recente. Due dispositivi che
toccano record diversi non si sovrascrivono. Due dispositivi che toccano lo
stesso record: vince l'ultimo che l'ha scritto, e l'altra modifica è persa.
È accettabile per un utente su due dispositivi; non lo sarebbe per due
utenti.

### Le lapidi

Cancellare non toglie il record: lo sostituisce con `{ id, del: true, up }`.
Senza la lapide, il dispositivo che non sa della cancellazione rimanda
indietro il record e la cancellazione si annulla da sola.

Le lapidi si potano dopo 90 giorni. Un dispositivo rimasto spento più di
tre mesi resusciterà qualcosa: è il prezzo per non far crescere il file
all'infinito, ed è un caso che non capita.

---

## Le tre regole nate da guasti veri

**1. Chi non ha letto non scrive.**
Un dispositivo al primo avvio, o con la cache appena svuotata, ha lo stato
vuoto. Se può scrivere prima di aver letto, spedisce il vuoto e cancella
tutto. In `mobility-blueprint` è successo davvero e ha portato via un
assessment intero. `core/sync.js` non scrive finché `letturaFatta` è falso.

**2. Confronta normalizzato, o scrivi per sempre.**
Se il confronto locale/remoto è sensibile all'ordine delle chiavi o dei
record, ogni giro vede una differenza che non c'è e fa una PUT: un commit
ogni venti secondi, all'infinito. `impronta()` ordina tutto prima di
confrontare.

**3. Non ridisegnare sotto le dita.**
Un ridisegno mentre l'utente scrive gli porta via il campo. I dati si
applicano subito, il ridisegno aspetta che il campo perda il fuoco.

---

## Diagnosi

`#/impostazioni` mostra ogni canale con il suo stato e l'ora dell'ultimo
giro, e permette di forzarne uno.

| Sintomo | Causa quasi sempre |
|---|---|
| tutti i canali `non configurato` | `t1/t2/t3` vuoti o token incollato male |
| `HTTP 401` | token revocato o scaduto |
| `HTTP 403` | il token non ha *Contents: read and write*, o non copre quel repo |
| `HTTP 404` sempre | `owner`/`repo` sbagliati — attenzione: un repo privato invisibile al token risponde 404, non 403 |
| `conflitto` una volta ogni tanto | normale: l'altro dispositivo ha scritto, il giro dopo si allinea |
| `conflitto` sempre | due schede della stessa app aperte che si rincorrono |
