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
| peso | ~73 MB in tutto, 77 clip |

Il nome del file **è l'id dell'esercizio**. Non c'è una tabella di
corrispondenza da tenere allineata: se un esercizio si chiama `g5-9090`, il
suo video è `g5-9090.mp4`. `clip.js` elenca quali esistono, ed è generato.

## Rifare la conversione

I sorgenti stanno in `moduli/mobilita/video/` e **non sono nel repo** (326 MB,
esclusi da `.gitignore`). Ci sono solo quelli che servono davvero: i 46
scaricati che non corrispondevano a nessun esercizio sono stati tolti il 27
agosto — quasi tutti GOWOD **con l'elastico**, che il catalogo esclude di
proposito («servono un elastico, che non hai»). La corrispondenza fra sorgente ed esercizio è in
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

**Non sono nel precarico.** Settantatré megabyte alla prima apertura vorrebbero
dire un'installazione che non finisce mai su una connessione da telefono. Si
salvano uno alla volta, il giorno che quell'esercizio esce nella rotazione, e
da lì in poi ci sono anche in aereo: dopo una settimana di sessioni la
libreria è completa da sé.

Una regola a parte per le richieste con `Range`: Safari chiede i video a
pezzi, e a una richiesta con Range va risposto 206 con quel pezzo.
`cache.match()` risponde 200 con tutto, e il player va in errore — video nero
e nessun messaggio. Quelle richieste passano alla rete.


## Copertura

**77 esercizi su 77.** `g1-isometria` non ha video e non ne ha bisogno: è un
protocollo di spinte isometriche descritto a parole, senza filmato anche
nell'originale.

Il controllo che vale la pena rifare dopo ogni aggiunta — l'id del catalogo
deve coincidere con quello nel nome del sorgente:

```bash
while IFS='|' read -r id file; do
  atteso=$(grep -oE "id: \"$id\", video: \"[^\"]+\"" esercizi.js |
           sed -E 's/.*video: "([^"]+)".*/\1/' | head -1)
  nel=$(echo "$file" | grep -oE '\[[A-Za-z0-9_-]{11}\]' | tr -d '[]')
  [ -n "$nel" ] && [ "$nel" != "$atteso" ] && echo "SBAGLIATO $id"
done < ../../.mm/mappa.txt
```

Ha già trovato un errore vero: `l-cossack` puntava al video di
`A3` — una abduzione sul fianco al posto di un cossack squat col goblet.
L'abbinamento a mano sbaglia, questo controllo no.
