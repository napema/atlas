import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const qui = path.dirname(fileURLToPath(import.meta.url));
const radiceRepo = path.resolve(qui, "..");
const nucleoVecchio = path.join(radiceRepo, "core");
const nucleoNuovo = path.resolve(qui, "src/lib/core");

/**
 * UN NUCLEO SOLO.
 *
 * La logica dei moduli (`moduli/<id>/dati.js`, `calcolo.js`…) è condivisa
 * con la app di prima e importa il nucleo con percorsi relativi:
 * `../../core/storage.js`. Senza questo plugin quei file porterebbero dentro
 * la app nuova il nucleo VECCHIO, accanto a quello TypeScript — cioè due
 * `apriCasella`, due mappe di caselle, due copie in memoria degli stessi
 * dati di localStorage. Una scrittura fatta da una non la vedrebbe l'altra,
 * e il sync impacchetterebbe la copia sbagliata. È esattamente il guasto
 * da cui ATLAS è nata: lo stesso motore in due posti.
 *
 * Qui ogni import che punta dentro `<repo>/core/` viene girato al file
 * omonimo in `app/src/lib/core/`. Se il file TypeScript non esiste, la
 * build fallisce — ed è quello che si vuole: un pezzo di nucleo non portato
 * deve fermare la compilazione, non ricadere in silenzio sulla versione
 * vecchia.
 */
function nucleoUnico(): Plugin {
  return {
    name: "atlas-nucleo-unico",
    enforce: "pre",
    resolveId(sorgente, importatore) {
      if (!importatore || !sorgente.startsWith(".")) return null;
      const pulito = importatore.split("?")[0];
      const assoluto = path.resolve(path.dirname(pulito), sorgente);
      if (path.dirname(assoluto) !== nucleoVecchio) return null;
      return path.join(nucleoNuovo, `${path.basename(assoluto, ".js")}.ts`);
    },
  };
}

/**
 * Dopo la build: la versione nel service worker e le icone.
 *
 * La VERSIONE è l'ora della compilazione. Nella app di prima andava alzata a
 * mano in sw.js a ogni rilascio (regola 10), e ogni volta che ce se ne
 * dimenticava il guscio vecchio restava sui telefoni. Qui non c'è niente da
 * ricordare.
 *
 * Le ICONE stanno in `<repo>/assets/icons/`, condivise con la app di prima:
 * si copiano, non si duplicano nel repo.
 */
function timbraRilascio(): Plugin {
  return {
    name: "atlas-timbra-rilascio",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(qui, "dist");
      const sw = path.join(dist, "sw.js");
      const versione = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      fs.writeFileSync(sw, fs.readFileSync(sw, "utf8").replace("__VERSIONE__", versione));
      fs.cpSync(path.join(radiceRepo, "assets", "icons"), path.join(dist, "icons"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [nucleoUnico(), svelte(), timbraRilascio()],

  /* Percorsi RELATIVI. La app vive oggi in `/atlas/v2/` accanto a quella
     di prima, e domani in `/atlas/` al suo posto: con percorsi assoluti
     andrebbe ricompilata apposta per spostarla. Con l'hash routing (`#/…`)
     l'indirizzo della pagina non cambia mai, quindi i relativi reggono. */
  base: "./",

  resolve: {
    alias: {
      "$lib": path.resolve(qui, "src/lib"),
      // La logica dei moduli CONDIVISA con la app di prima: `dati.js`,
      // `calcolo.js`, `contratto.js`. Sta fuori da `app/`, in `moduli/`.
      "$condivisi": path.resolve(radiceRepo, "moduli"),
    },
  },

  server: {
    // La logica condivisa sta FUORI da `app/`: il server di sviluppo deve
    // poterla leggere.
    fs: { allow: [radiceRepo] },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
});
