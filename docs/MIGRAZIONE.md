# Portare un'app dentro ATLAS

La procedura è la stessa per tutte e tre, e l'ordine dei passi conta: è
costruito perché in nessun momento esista una finestra in cui i dati
possano andare persi.

---

## Il principio

**Le due app convivono.** Quella di partenza scrive sul suo repo dati,
ATLAS legge quello stesso repo in sola lettura finché non è pronto. Solo
alla fine si scambia la direzione della scrittura, e solo dopo aver
verificato che ATLAS scriva bene.

Non si migra un'app spegnendola e sperando.

---

## I passi

### 1. Leggere lo schema, non indovinarlo

```bash
gh api repos/napema/<repo-dati>/contents/<file>.json \
  --jq '.content' | base64 -d > schema.json
```

Guardare i dati veri. Ogni app di partenza ha campi che nel codice non si
vedono: aggiunti a mano, rimasti da una versione precedente, o scritti da
un'unica funzione dimenticata. Vanno tutti conservati, anche quelli che
sembrano morti — cancellarli è irreversibile, ignorarli no.

### 2. Dare `id` e `up` a ogni record

Quasi nessuna delle app di partenza ce li ha su tutto. Senza, la fusione
per record non può funzionare e il sync diventa "vince l'ultimo file
intero", che è esattamente il modo di perdere dati.

Per i record già esistenti l'id si deriva da qualcosa di stabile e già
presente (data + tipo, per esempio), **mai da un contatore**: due
dispositivi che generano contatori indipendenti producono collisioni.

### 3. Separare calcolo e disegno

Nei due monoliti la stessa funzione legge lo stato, calcola e scrive nel
DOM. Vanno divisi:

```
dati.js      lo schema e i valori predefiniti
calcolo.js   funzioni pure: stato → numeri. Nessun DOM, nessun localStorage
viste.js     dal risultato del calcolo agli elementi
modulo.js    il contratto: monta, oggi, avviaSync
```

`calcolo.js` puro è ciò che rende `oggi()` possibile: la home ha bisogno
dei numeri di un modulo senza montarne l'interfaccia.

### 4. Buttare il motore di sync dell'app di partenza

Tutto intero. Non se ne salva niente: `core/sync.js` fa già quello che
facevano tutti e tre, e in più fa le cose che ognuno dei tre aveva imparato
separatamente.

Al suo posto, nel modulo:

```js
import { apriCasella } from "../../core/storage.js";
import { apriCanale, fondiRecord, potaLapidi } from "../../core/sync.js";

const casella = apriCasella("finanze", PREDEFINITO);

export function avviaSync() {
  const canale = apriCanale({
    id: "finanze",
    file: "finanze.json",
    impacchetta: () => {
      const s = casella.leggi();
      return { movimenti: s.movimenti, meta: s.meta, metaUp: s.metaUp };
    },
    applica: (remoto) => {
      casella.aggiorna((s) => {
        s.movimenti = potaLapidi(fondiRecord(s.movimenti, remoto.movimenti));
        if ((remoto.metaUp || 0) > (s.metaUp || 0)) { s.meta = remoto.meta; s.metaUp = remoto.metaUp; }
      }, { origine: "sync", tocca: false });   // `tocca: false`: applicare
                                              // un dato remoto non è una
                                              // modifica locale
    },
  });
  casella.osserva((_, origine) => { if (origine !== "sync") canale.segnalaModifica(); });
  canale.avvia();
}
```

Il `tocca: false` non è un dettaglio: senza, applicare il remoto alza `up`,
il che fa sembrare il locale più recente, il che riscrive il remoto — un
ping-pong infinito fra i due dispositivi.

### 5. Ricostruire l'interfaccia con i token

Non copiare il CSS incorporato. I colori diventano token, le liste
`.lista`/`.riga`, i pulsanti `.btn`. Ciò che resta di specifico va in
`moduli/<id>/stile.css`, caricato dal modulo.

Le due app di partenza scure e quella chiara si riconciliano da sole: i
token gestiscono entrambi i temi e l'utente sceglie in Impostazioni.

### 6. Migrare i dati, una volta sola

Con ATLAS che legge già bene:

```bash
gh api repos/napema/<repo-vecchio>/contents/<file>.json --jq '.content' | base64 -d > vecchio.json
# trasformare nello schema nuovo (id, up, lapidi)
gh api repos/napema/atlas-dati/contents/<nuovo>.json -X PUT \
  -f message="migrazione da <repo-vecchio>" \
  -f content="$(base64 -w0 nuovo.json)"
```

Poi si apre ATLAS sui **due** dispositivi e si controlla che entrambi
vedano gli stessi numeri prima di andare avanti.

#### Due trappole prese in pieno durante la migrazione vera

**La codifica.** PowerShell, se legge un file senza BOM, non presume UTF-8:
usa la codepage ANSI di Windows. Ogni byte di un'emoji viene reinterpretato
e riscritto, e `🧠` diventa `ðŸ§ `. Il file resta JSON valido, il sync lo
trasporta senza lamentarsi, e il difetto si vede solo guardando lo schermo.

```powershell
# NO — legge in ANSI e rovina tutto ciò che non è ASCII
$d = Get-Content file.json -Raw | ConvertFrom-Json

# SÌ — codifica dichiarata in lettura e in scrittura
$txt = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($f, $out, (New-Object System.Text.UTF8Encoding($false)))
```

E se un file **non ha bisogno di trasformazioni, non trasformarlo**: si
copiano i byte così come sono. `registro.json` di Finanze andava bene tale
e quale, e passarlo comunque per un round-trip JSON è stato un rischio preso
per niente.

**L'ordine dei passi.** Caricare i dati corretti mentre ATLAS è aperta non
serve a niente: al giro dopo l'app fonde il remoto con quello che ha in
locale e, **a parità di `up`, vince il locale**. La copia sbagliata torna su
e cancella la migrazione. Successo davvero, due volte di fila.

La sequenza giusta è: **prima si svuota il dispositivo, poi si carica.** E
lo svuotamento va fatto da una pagina dello stesso dominio che *non* sia
l'app — `manifest.webmanifest` va benissimo — altrimenti i canali di sync
sono già partiti e rispediscono tutto prima che si faccia in tempo.

### 7. Solo adesso, spegnere

L'app di partenza si mette in sola lettura (un avviso in cima che manda ad
ATLAS), non si cancella. Il repo dati vecchio **non si tocca**: costa nulla
tenerlo ed è l'unica rete di sicurezza che resta.

---

## La lista di controllo

- [ ] Ogni record ha `id` stabile e `up`
- [ ] Le cancellazioni sono lapidi, non rimozioni
- [ ] `applica` usa `tocca: false`
- [ ] `calcolo.js` non tocca il DOM né `localStorage`
- [ ] `oggi()` è sincrona e non ha effetti collaterali
- [ ] Nessun colore letterale: solo token
- [ ] Provato **offline**, con la modalità aereo, non solo con DevTools
- [ ] Provato su iPhone **installato**, non solo in Safari
- [ ] I due dispositivi mostrano gli stessi numeri
- [ ] `VERSIONE` in `sw.js` alzata
