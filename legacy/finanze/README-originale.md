# Registro

Tracker di entrate e uscite, tarato sul budget di Torino da settembre 2026.

## Com'è configurata

### Dodici macrocategorie

Il cibo fuori casa è la voce più pesante, quindi ha una categoria sua invece di stare
dentro un generico "Personale":

| Categoria | Sottocategorie |
|---|---|
| Fisse | 5 — prestito, affitto, abbonamenti digitali, telefono, assicurazioni |
| Casa | 9 — luce e gas, acqua, internet, condominio, detersivi, arredo, biancheria, stoviglie, riparazioni |
| Auto | 12 — carburante, pedaggi, parcheggi, tagliando, gomme, meccanico, RC, bollo, revisione, multe, lavaggio, accessori |
| Spesa | 7 — supermercato, panetteria, macelleria, frutta e verdura, pescheria, bevande, alimentari |
| Trasporti | 7 — treno, abbonamento urbano, biglietti, bus extraurbano, taxi, aereo, sharing |
| **Cibo fuori** | **8 — caffè e bar, colazione, pranzo, cena, aperitivo, delivery, fast food, gelato** |
| Cura e look | 7 — barbiere, cura persona, profumeria, abbigliamento, scarpe, accessori, intimo |
| Sport e salute | 7 — palestra, integratori, attrezzatura, gare, farmacia, visite, ottico |
| Svago | 7 — libri, cinema, concerti, videogiochi, serate, viaggi, alloggi |
| Varie | 4 — elettronica, cancelleria, regali, altro |
| Accantonamenti | 4 — fondo auto, imprevisti, salute, tecnologia |
| Risparmio | 3 — fondo trasloco, risparmio, investimenti |

Ottanta sottocategorie in tutto, ciascuna con le sue keyword. Scrivi la nota e categoria e
sottocategoria si assegnano da sole: barbiere, Glovo, spritz, Foot Locker, multa ZTL,
revisione, lenti a contatto, Ticketone, Airbnb, SMAT, pasticceria.

Il livello di dettaglio serve a rispondere a "dove sono finiti i soldi": non *Personale 480*,
ma quanto di quei 480 è aperitivo, quanto delivery, quanto barbiere.

### Aggiornare da una versione precedente

Se avevi già dei movimenti con la vecchia categoria *Personale*, la migrazione è automatica
al primo avvio: ogni sottocategoria va nella sua nuova casa, il vocabolario appreso viene
riscritto di conseguenza e i 480 € di budget si ripartiscono su cibo, cura, sport, svago e
varie mantenendo lo stesso totale. Non serve fare niente.

### Aggiungere e modificare categorie

**Setup → Gestisci categorie.** Puoi creare macrocategorie nuove (nome, colore tra dodici,
icona tra ventitré), rinominarle, eliminarle, e fare lo stesso con le sottocategorie.
Per ognuna imposti le parole che la fanno scattare, separate da virgola.

Le categorie viaggiano nel sync e nel backup. Una macrocategoria nuova nasce con budget zero
in entrambi i profili: il tetto lo metti tu in Setup.

### Due profili di budget

| Categoria | Settembre | Agosto (ferie) |
|---|---|---|
| Fisse | 940 | 440 |
| Casa | 80 | 0 |
| Auto | 170 | 170 |
| Spesa | 200 | 0 |
| Trasporti | 100 | 100 |
| Cibo fuori | 220 | 150 |
| Cura e look | 60 | 40 |
| Sport e salute | 70 | 50 |
| Svago | 80 | 40 |
| Varie | 50 | 20 |
| Accantonamenti | 125 | 125 |
| **Totale** | **2.095** | **1.135** |

Il profilo si sceglie da solo in base al mese: agosto 2026 e precedenti usano il profilo
ferie, da settembre 2026 in poi quello di Torino. Ad agosto la home mostra il fondo
trasloco invece del costo casa, perché vitto e alloggio sono coperti e l'obiettivo è
accumulare il massimo entro il 1 settembre.

Entrambi i profili si modificano in Setup, ognuno per conto suo.

### Tipi di movimento

Non tutto quello che si muove è una spesa. Solo `Spesa` ed `Entrata` toccano il budget:

| Tipo | Conta come |
|---|---|
| Spesa | uscita |
| Entrata | entrata |
| Giroconto | niente |
| Rimborso ricevuto | niente |
| Reso | niente |
| **Ricarica extra** | **sforamento** |

I rimborsi degli amici gonfiavano sia entrate che uscite e rendevano illeggibile la spesa
vera: ora restano fuori dai totali ma sono comunque registrati.

### Il numero in cima alla home

Le **ricariche extra** — quando ricarichi Revolut da un'altra carta — sono in cima a
tutto, prima del budget. Non sono movimenti neutri: sono la prova che il sistema a pocket
ha ceduto quel mese, ed è il motivo per cui il conto principale scende. È l'unico numero
che deve restare a zero, e la home lo dice in verde quando ci riesci.

### Il costo casa

In home c'è un indicatore fisso: **risparmio reale = 580 − casa all-in**. A 450 risparmi
130, a 500 ottanta, a 580 chiudi in pari, a 700 bruci 120 al mese. Una riga sola del
budget decide se metti via o consumi, quindi sta sotto gli occhi.

Il valore si cambia in Setup e l'indicatore si aggiorna.

## Sincronizzazione tra iPhone e computer

**GitHub Pages serve solo file statici: non può salvare niente da solo.** Non esiste
un file sul sito che si aggiorna quando registri una spesa — Pages non esegue codice,
serve la cartella così com'è.

La sincronizzazione funziona in modo diverso: l'app scrive un file JSON dentro un
**secondo repository, privato**, usando l'API di GitHub. Ogni dispositivo scarica il
file, lo fonde con quello che ha in locale e lo ricarica. Risultato: iPhone e computer
vedono gli stessi movimenti.

### Come attivarla

1. **Crea un secondo repository, privato**, ad esempio `registro-dati`. Lascialo vuoto.
   Deve essere separato da quello dell'app: su GitHub Pages gratuito il repo del sito
   è pubblico, e i dati non ci devono stare.
2. **Crea un token**: GitHub → Settings → Developer settings →
   *Personal access tokens* → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → `registro-dati` e basta
   - Permissions → Repository permissions → **Contents: Read and write**
   - Metti una scadenza (90 giorni va bene, poi lo rinnovi)
3. Nell'app: **Setup → Sincronizzazione**, incolla `tuo-utente/registro-dati` e il token,
   tocca *Sincronizza adesso*.
4. Ripeti il punto 3 sull'altro dispositivo, con lo stesso repository e lo stesso token.

L'indicatore a forma di nuvola in alto mostra lo stato: verde allineato, blu in corso,
rosso errore. Toccalo per forzare un aggiornamento.

### Quando sincronizza

All'apertura, a ogni movimento registrato (dopo un paio di secondi), quando torni
sull'app, quando la rete ritorna, e comunque ogni due minuti se l'app è aperta.
Offline continua a funzionare: le modifiche restano in locale e partono appena c'è rete.

### Come risolve i conflitti

Ogni movimento ha un identificativo e l'ora dell'ultima modifica. Quando due dispositivi
hanno versioni diverse, vince la più recente. Le eliminazioni lasciano una traccia, così
un movimento cancellato sul computer non ricompare dal telefono. Budget e tetti seguono
l'ultimo dispositivo che li ha toccati. Il vocabolario delle categorie si somma: quello
che insegni su un dispositivo lo sa anche l'altro.

### Configurare un secondo dispositivo senza ridigitare niente

Da **Setup → Copia link di configurazione** ottieni un indirizzo che contiene repository
e token. Aprilo sull'altro dispositivo: si configura da solo e sincronizza subito.

Salva quel link nel gestore password o nelle note bloccate — ti serve solo se cambi
dispositivo o reinstalli. Contiene il token, quindi vale quanto una password.

Il token e il repository finiscono dopo il `#`, cioè nel frammento dell'indirizzo:
i browser non lo inviano mai al server, resta solo in locale.

### Configurazione permanente per tutti i dispositivi — `config.js`

Se vuoi che il sync sia già attivo ovunque, senza inserire niente su nessun dispositivo:

1. Configura il sync su un dispositivo come sopra.
2. **Setup → Genera config.js** — copia negli appunti il contenuto del file.
3. Nel repository **del sito** (quello con Pages): *Add file → Create new file*,
   nome `config.js`, incolla, commit.

Da quel momento chiunque apra l'indirizzo trova il sync già attivo. Sopravvive alla
cancellazione della cache, alla reinstallazione dell'app, a un dispositivo nuovo.
In Setup compare una riga verde che conferma che `config.js` è in uso.

Se su un dispositivo inserisci repository e token a mano, quelli hanno la precedenza
su `config.js`. Se premi *Disattiva*, quel dispositivo resta disattivato e non si
riconfigura da solo.

Per cambiare il token in futuro: rigenera `config.js` e sostituisci il file. Non è in
cache, quindi la modifica arriva al primo caricamento.

### Cosa stai accettando con `config.js`

Su GitHub Pages gratuito il repository del sito è pubblico, quindi `config.js` è leggibile
da chiunque conosca l'indirizzo. Il token è codificato — non per nasconderlo a un umano,
ma perché lo scanner automatico di GitHub non lo riconosca e non lo revochi, cosa che
succederebbe entro poche ore con un token in chiaro.

Chi trovasse l'indirizzo potrebbe quindi leggere e modificare il repository dei dati.
Due attenuanti reali: l'indirizzo non è pubblicizzato da nessuna parte, e i dati sono
in git — anche una cancellazione resta recuperabile dalla cronologia dei commit.

Se in futuro cambi idea: cancella `config.js` dal repository e revoca il token da GitHub.

### L'alternativa senza `config.js`

Sarebbe la soluzione comoda, ma non è praticabile. Su GitHub Pages gratuito il repository
del sito è pubblico: chiunque potrebbe aprire `index.html` e leggere il token, e con quello
entrare nel repository privato dei dati. In più GitHub scansiona i repo pubblici alla ricerca
di credenziali e revoca da solo i token che trova — il sync smetterebbe di funzionare
comunque, ma dopo aver esposto i dati.

Senza `config.js` il token vive nel `localStorage` del singolo dispositivo: lo inserisci una
volta e resta. Non scade a fine sessione, sopravvive a riavvii e aggiornamenti del sito. Sparisce
solo se cancelli i dati di navigazione o disinstalli l'app. Su iPhone, l'app aggiunta alla
schermata Home ha uno spazio riservato che la pulizia della cronologia di Safari non tocca.

### Sul token — leggilo

Il token resta nel `localStorage` di quel browser. Non finisce nei backup esportati e
non passa da nessun server che non sia GitHub. Ma chi ha accesso al tuo telefono sbloccato
ha accesso al token. Per questo va creato **fine-grained**, limitato a quel solo repository,
con permesso solo su Contents e con una scadenza. Se perdi il dispositivo, lo revochi da
GitHub e il problema è chiuso in dieci secondi.

### Senza sincronizzazione

Se preferisci non usare token: i dati restano nel browser del dispositivo dove li inserisci,
non si sincronizzano, e **spariscono** se cancelli i dati di navigazione o disinstalli l'app.
In quel caso **Setup → Esporta backup** una volta al mese non è un consiglio, è necessario.
Il file JSON si reimporta dalla stessa schermata e si fonde con quello che c'è già.

## Pubblicare su GitHub Pages

1. Crea un repository e carica tutti i file di questa cartella nella radice.
2. Repo → **Settings** → **Pages** → Source `Deploy from a branch`, branch `main`,
   cartella `/ (root)` → Save.
3. Dopo un minuto il sito è su `https://<utente>.github.io/<repo>/`.

## Installare su iPhone

Apri l'indirizzo **in Safari** — non Chrome, su iOS solo Safari può installare app.
Tocca Condividi → **Aggiungi a schermata Home**. Si apre a schermo intero, senza barra
del browser, e funziona anche offline.

Android: Chrome → menu → *Installa app*. Desktop: icona di installazione nella barra indirizzi.

## Categorie automatiche

Scrivi la nota e la categoria si sceglie da sola. Due livelli:

1. **Dizionario italiano di partenza** — circa 200 termini: catene di supermercati,
   distributori, farmacia, mezzi, abbonamenti, ristorazione.
2. **Apprendimento dalle tue correzioni** — ogni volta che cambi la categoria proposta,
   l'app associa le parole di quella nota alla categoria che hai scelto. Dalla volta
   dopo ci azzecca. Le tue correzioni hanno sempre la precedenza sul dizionario.

Il vocabolario appreso è nel backup JSON, quindi si sposta con i dati.
Si azzera da Setup senza toccare i movimenti.

## File

| File | Cosa fa |
|---|---|
| `index.html` | Tutta l'app: interfaccia, logica, grafici, dizionario |
| `manifest.webmanifest` | Rende l'app installabile |
| `sw.js` | Service worker: funzionamento offline |
| `icon-*.png` | Icone per schermata Home |

## Aggiornare l'app

Modifica `index.html` e fai push. Se le modifiche non compaiono, alza il numero di versione
in `sw.js` (`const CACHE = 'registro-v4'`): il service worker continua a servire la copia
in cache finché la chiave non cambia.
