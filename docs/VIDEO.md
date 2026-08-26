# I video degli esercizi

Dal 27 agosto 2026 i video di Mobilità **stanno nel repo**, non su YouTube.

## Perché non più YouTube

L'iframe era sbagliato per tre motivi che si sommavano tutti nello stesso
momento — a metà sessione, con le mani per terra:

1. **offline non c'è**, e la sessione serale è il caso in cui l'offline
   serve davvero;
2. **la pubblicità parte quando vuole lei**, e non c'è modo di impedirlo;
3. **gli overlay «guarda anche»** coprono esattamente la parte del corpo che
   stai cercando di guardare.

## Come sono fatti

| | |
|---|---|
| dove | `moduli/mobilita/clip/<idEsercizio>.mp4` |
| formato | H.264 main, `yuv420p`, `+faststart` |
| misura | 480px di altezza (854×480 dai 1080p), 24 fps |
| audio | **nessuno** — il player ha i suoi bip, e l'audio è metà del peso |
| qualità | CRF 31 |
| peso | ~60 MB in tutto, 50 clip |

Il nome del file **è l'id dell'esercizio**. Non c'è una tabella di
corrispondenza da tenere allineata: se un esercizio si chiama `g5-9090`, il
suo video è `g5-9090.mp4`. `clip.js` elenca quali esistono, ed è generato.

## Rifare la conversione

I sorgenti stanno in `moduli/mobilita/video/` e **non sono nel repo** (533 MB,
esclusi da `.gitignore`). La corrispondenza fra sorgente ed esercizio è in
`.mm/mappa.txt`, anch'essa fuori dal repo.

```bash
ffmpeg -i "video/<sorgente>" -an \
  -vf "scale=-2:480:flags=lanczos,fps=24" \
  -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p \
  -crf 31 -preset slow -g 48 -movflags +faststart \
  "clip/<idEsercizio>.mp4"
```

Poi si rigenera l'indice:

```bash
ls clip | sed 's/\.mp4$//' | sort   # → il contenuto di CLIP in clip.js
```

## Come li serve il service worker

**Non sono nel precarico.** Sessanta megabyte alla prima apertura vorrebbero
dire un'installazione che non finisce mai su una connessione da telefono. Si
salvano uno alla volta, il giorno che quell'esercizio esce nella rotazione, e
da lì in poi ci sono anche in aereo: dopo una settimana di sessioni la
libreria è completa da sé.

Una regola a parte per le richieste con `Range`: Safari chiede i video a
pezzi, e a una richiesta con Range va risposto 206 con quel pezzo.
`cache.match()` risponde 200 con tutto, e il player va in errore — video nero
e nessun messaggio. Quelle richieste passano alla rete.

## I 27 esercizi ancora senza video

Il player li regge: dove il video non c'è, il riquadro non compare affatto e
lo spazio va alle istruzioni. Ma sono 27 su 78, e vanno colmati.

```
g1-trap              Trap stretch destro
g2-ankle-mob         Mobilizzazione di caviglia
g2-ankle-rolls       Ankle rolls
g2-deep-squat        Active deep squat
g2-dog-calf          Calf stretch nel cane a testa in giù
g2-squat-stand       Squat to stand
g3-ham-kneel         Kneeling hamstring stretch
g3-ham               Hamstring stretch
g3-ham-roll          Hamstring roll (foam roller)
g3-forward-bend      Standing forward bend
g3-hinge             Active hinge
g4-lunge-twist       Lunge twist
g4-quad-roll         Quad roll (foam roller)
g5-frog              The frog
g5-frog-att          Active frog
g5-frog-rot          Frog rotation alternata
g5-add-roll          Adductor roll (foam roller)
g5-cossack           Cossack squat
g5-half-lotus        Half lotus al muro
g7-quad              Quad stretch
g7-quad-att          Active quad stretch
g7-quad-roll         Quad roll (foam roller)
g8-prayer-lat        Prayer lat stretch
g8-scap              Scap mobilization
g8-cobra             Downward dog to cobra
g8-thread            Thread the needle
g8-supine-twist      Supine twist
```

`g1-isometria` non ne ha bisogno: è un protocollo di spinte isometriche
descritto a parole, senza video anche nell'originale.

Per aggiungerne uno basta mettere il file in `video/`, aggiungere la riga a
`.mm/mappa.txt`, convertire e rigenerare `clip.js`.

## I 28 sorgenti scaricati che non servono a nessun esercizio

Sono nella cartella ma non corrispondono a niente del catalogo: quasi tutti
sono i GOWOD **con l'elastico**, che il catalogo esclude di proposito
(`esercizi.js`: «servono un elastico, che non hai»). Gli altri sono esercizi
che nel programma non ci sono — `Inchworm`, `The_Ballerina`, `Plank_Toe_Taps`,
`Press_In_Snatch`.
