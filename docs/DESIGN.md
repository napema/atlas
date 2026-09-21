# Il linguaggio visivo di ATLAS — iOS 27

Da leggere **prima di aggiungere una schermata**.

ATLAS non ha un suo sistema visivo e non deve averlo. Usa quello di Apple,
preso da un'implementazione che lo ha **misurato** invece di indovinarlo.

---

## 1. Da dove vengono i valori

Fonte: [`seunghan91/ios27-design-system`](https://github.com/seunghan91/ios27-design-system)
(MIT). Non è un'imitazione a occhio:

- **colori e metriche** letti dallo UI Kit ufficiale di iOS 27.0.2, con il
  nodo Figma e la data di misura annotati token per token;
- **il materiale Liquid Glass** ricavato fotografando un pannello
  `.glassEffect()` sul simulatore iOS 26.5 e adattando ai minimi quadrati
  il profilo del bordo bianco/nero a una funzione d'errore;
- **le metriche dei componenti** lette a runtime via UIKit.

Il repo distribuisce pacchetti npm. **ATLAS non ha build, non ha
dipendenze e non usa CDN** (regola 8 del contratto), quindi i token sono
riscritti a mano in `styles/tokens.css` dai sorgenti JSON
(`packages/tokens/src/*.json`). Chi aggiorna riparte da lì, non dal nostro
file.

---

## 2. Le cinque forme, e non se ne inventa una sesta

### La lista raggruppata
L'impaginazione di sistema: un fondo e sopra dei gruppi a spigoli tondi.
Dentro un gruppo le righe sono alte **52** e si separano con un filo che
**parte dopo l'icona**, mai da bordo a bordo. Quel rientro è la cosa che fa
leggere un elenco come un blocco unico invece che come tante fette.

### Il titolo grande
34/41, Bold, **allineato a sinistra**. Non centrato: su iOS il centro è
della barra di navigazione compatta, non del titolo.

### La barra di vetro
L'unico posto dell'app con un materiale, e l'unico dove serve: il contenuto
ci scorre sotto. Se niente ci scorresse sotto sarebbe una decorazione.

### Il pulsante a pastiglia
Raggio pieno, alto 50, accento del modulo. Su iOS 26+ il tondo è la forma
di sistema, non una variante.

### Il campo scavato
Non un rettangolo col bordo: un velo grigio semitrasparente (`fills`) che
prende il colore di ciò che ha sotto.

---

## 3. Il vetro, e perché quasi tutti lo sbagliano

```css
background: rgba(26, 26, 26, 0.70);
backdrop-filter: blur(6px) saturate(1.8);
box-shadow: 0 0 0 0.5px rgba(166,166,166,.45), 0 8px 48px rgba(0,0,0,.45);
```

Tre cose che il repo annota esplicitamente:

1. **La sfocatura è 6px, non 20 o 40.** Il valore nativo misurato è
   sigma 5,4pt e `blur()` in CSS prende il raggio *come* sigma: 5,4/0,9 = 6.
   Le riproduzioni web sbagliano di un fattore quattro, e per due ragioni
   sommate — riproducono la variante *clear* invece della *regular*, e
   convertono sigma come se fosse il doppio.
2. **`saturate(1.8)` non è un vezzo.** Il materiale di Apple alza la croma
   di ciò che ha sotto. Senza, viene fuori una patina piatta.
3. **Il bordo è un anello grigio chiaro**, misurato come ombra esterna a
   sfocatura zero con spread positivo. Non è una riga scura, come quasi
   tutti assumono.

Il vetro vive in due posti: la barra delle schede e il toast. Basta.

---

## 4. I colori

Tre insiemi, e non si mescolano.

| insieme | risponde a | dove |
|---|---|---|
| **superfici** (`--fondo`, `--rilievo`…) | dove sto | pagine, gruppi, campi |
| **etichette** (`--inchiostro` ×4) | quanto conta questo testo | tutto il testo |
| **accenti** (12 di sistema) | di che cosa parla / cosa si tocca | chip, pulsanti, scheda attiva |

**Scuro e chiaro sono due palette misurate, non una l'inversione
dell'altra.** Nello scuro il fondo è nero pieno e i gruppi salgono
(#1c1c1e); nel chiaro il fondo è grigio (#f2f2f7) e i gruppi sono bianchi.
Sono due logiche opposte e vanno tenute tutte e due.

**Un pulsante porta sempre l'accento del modulo in cui si trova.** Non c'è
un secondo colore per le azioni. I tre pesi si distinguono per *quanto*
colore, non per quale: `.btn` pieno, `.btn.tinto` al 15%, `.btn.morbido`
grigio.

**Il chip d'icona** è il quadratino delle Impostazioni di iOS: fondo pieno
della tinta, glifo bianco. È il modo in cui il sistema mette colore in una
lista senza colorare il testo.

### L'unico valore non misurato
`--inchiostro-3`. iOS passa da `labels.secondary` (0,7) a `tertiary` (0,3)
e non ha niente in mezzo, ma ATLAS usa tre livelli di grigio e a 0,3 le sue
etichette non si leggono. 0,55 è interpolato, ed è segnato come tale nel
file perché non venga preso per un valore di Apple.

---

## 5. Le regole che non si discutono

1. **17px minimo sui campi di testo.** Sotto, iOS zooma al focus e non
   torna indietro. È un baco di sistema, non una preferenza.
2. **44px minimo su qualunque cosa si tocchi** — il pavimento attestato dal
   kit. Il segno visibile può essere più piccolo: l'area la allarga il
   padding.
3. **Nessun valore letterale nei moduli.** Solo token.
4. **Verde è «fatto», rosso è uno stato negativo.** Unica eccezione,
   consapevole: l'interruttore acceso è verde perché è la convenzione di
   sistema che tutti riconoscono.
5. **Un componente, un nome.** Il CSS è globale anche dentro un modulo:
   `grep -oE '^\.[a-z][a-z0-9_-]*' styles/base.css | sort -u`
6. **Niente build, niente dipendenze, niente CDN.**
7. **Lo stato vuoto non nasconde il contenitore**: cambia il contenuto, mai
   l'ingombro.

---

## 6. La tipografia

Gli undici stili del kit, con corpo, interlinea e crenatura misurati.
**L'interlinea è in pixel e non in multipli**: è così che la pubblica
Apple, ed è l'unico modo perché due stili diversi cadano sulla stessa
griglia di righe.

SF Pro, self-hosted in `assets/fonts/`. `emphasized` di un corpo è
**Semibold, non Medium** — una correzione che il kit 27 segna come misurata
due volte.

---

## 7. Sviluppo

In locale il service worker **non si registra** e disinstalla quello che
trova (guardia in cima a `registraServiceWorker()` in `core/app.js`): la
sua cache sta davanti alla rete e ignora `Cache-Control`.

Il server di sviluppo è `.claude/serve-dev.py` (aggiunge `no-store`), e
**deve** restare a thread: ATLAS carica una ventina di moduli in parallelo
e a thread singolo le richieste si accodano.

In produzione `VERSIONE` in `sw.js` va alzata a ogni rilascio.
