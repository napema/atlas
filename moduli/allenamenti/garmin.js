// moduli/allenamenti/garmin.js — l'allenamento come lo vuole Garmin Connect.
//
// PERCHÉ IL .FIT NON BASTAVA. Il file `.FIT` è corretto — il cookbook di
// Garmin conferma la struttura — ma Garmin Connect non ha nessuna
// importazione di allenamenti: il suo caricatore sa fare solo attività e
// percorsi, e infatti un workout caricato lì dentro diventa un PERCORSO.
// Il `.FIT` resta la strada giusta per l'orologio (cavo USB, cartella
// `GARMIN/NewFiles`), ma non porta niente dentro Connect.
//
// DENTRO CONNECT GLI ALLENAMENTI ENTRANO COME JSON, su un'API interna:
//
//     POST /gc-api/workout-service/workout
//     connect-csrf-token: <dal <meta name="csrf-token">>
//     x-requested-with: XMLHttpRequest
//     credentials: include
//
// È la stessa porta che usa l'editor di Connect quando premi «Salva», ed è
// quella che usano le estensioni che importano allenamenti.
//
// ATLAS NON PUÒ CHIAMARLA DA SÉ, e non è una scelta: sta su un altro
// dominio, quella API vuole i cookie di sessione e un token CSRF letto dalla
// pagina, e il browser blocca tutto e tre le cose. L'unico modo senza
// chiedere la password di Garmin — che non si fa — è che la chiamata parta
// DA DENTRO connect.garmin.com. Da qui esce il JSON; a portarlo dentro è un
// segnalibro che si salva una volta sola (vedi `SEGNALIBRO` in fondo).

/* ------------------------------------------------- le tabelle di Connect -- */

const SPORT = { sportTypeId: 1, sportTypeKey: "running", displayOrder: 1 };

const PASSO_TIPO = {
  warmup:   { stepTypeId: 1, stepTypeKey: "warmup",   displayOrder: 1 },
  cooldown: { stepTypeId: 2, stepTypeKey: "cooldown", displayOrder: 2 },
  interval: { stepTypeId: 3, stepTypeKey: "interval", displayOrder: 3 },
  active:   { stepTypeId: 3, stepTypeKey: "interval", displayOrder: 3 },
  recovery: { stepTypeId: 4, stepTypeKey: "recovery", displayOrder: 4 },
  rest:     { stepTypeId: 5, stepTypeKey: "rest",     displayOrder: 5 },
};

const FINE_TEMPO    = { conditionTypeId: 2, conditionTypeKey: "time",       displayOrder: 2, displayable: true };
const FINE_DISTANZA = { conditionTypeId: 3, conditionTypeKey: "distance",   displayOrder: 3, displayable: true };
const FINE_APERTO   = { conditionTypeId: 1, conditionTypeKey: "lap.button", displayOrder: 1, displayable: true };
const FINE_GIRI     = { conditionTypeId: 7, conditionTypeKey: "iterations", displayOrder: 7, displayable: false };

const SENZA_BERSAGLIO = { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target", displayOrder: 1 };
const BERSAGLIO_PASSO = { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone", displayOrder: 6 };

/** Da secondi al km a metri al secondo, che è l'unità dei bersagli di passo. */
const mSec = (secPerKm) => Math.round((1000 / secPerKm) * 1000) / 1000;

/* ------------------------------------------------------------ i passi --- */

function passoEseguibile(p, ordine, figlioDi) {
  const voce = {
    type: "ExecutableStepDTO",
    stepId: null,
    stepOrder: ordine,
    stepType: PASSO_TIPO[p.intensita] || PASSO_TIPO.interval,
    childStepId: figlioDi,
    description: p.nome || null,
    endCondition: p.tipo === "tempo" ? FINE_TEMPO : p.tipo === "distanza" ? FINE_DISTANZA : FINE_APERTO,
    endConditionValue: p.tipo === "tempo" ? p.secondi : p.tipo === "distanza" ? p.metri : null,
    targetType: SENZA_BERSAGLIO,
    targetValueOne: null,
    targetValueTwo: null,
  };

  // La distanza vuole l'unità dichiarata: senza, Connect la interpreta con
  // l'unità del profilo e 1000 metri possono diventare 1000 iarde.
  if (p.tipo === "distanza") {
    voce.preferredEndConditionUnit = { unitId: 1, unitKey: "meter", factor: 100.0 };
  }

  if (p.passoSec) {
    // Una FINESTRA di ±10 s/km, non un valore: a 4:30/km esatti non ci corre
    // nessuno, e un orologio che bippa a ogni secondo di scarto si spegne.
    voce.targetType = BERSAGLIO_PASSO;
    voce.targetValueOne = mSec(p.passoSec + 10);   // il più lento
    voce.targetValueTwo = mSec(p.passoSec - 10);   // il più veloce
  }
  return voce;
}

/**
 * I passi di `passi.js` → i passi di Connect.
 *
 * `stepOrder` cresce su TUTTO l'allenamento, anche dentro le ripetizioni, e
 * i figli di un gruppo portano il `childStepId` del gruppo: è così che
 * Connect sa quali passi stanno dentro quale ciclo.
 */
function convertiPassi(passi) {
  const fuori = [];
  let ordine = 0;
  let gruppo = 0;

  for (const p of passi) {
    if (p.tipo !== "ripeti") {
      fuori.push(passoEseguibile(p, ++ordine, null));
      continue;
    }
    gruppo += 1;
    const mio = gruppo;
    const blocco = {
      type: "RepeatGroupDTO",
      stepId: null,
      stepOrder: ++ordine,
      stepType: { stepTypeId: 6, stepTypeKey: "repeat", displayOrder: 6 },
      childStepId: null,
      numberOfIterations: p.volte,
      smartRepeat: false,
      endCondition: FINE_GIRI,
      endConditionValue: p.volte,
      workoutSteps: [],
    };
    for (const dentro of p.passi) blocco.workoutSteps.push(passoEseguibile(dentro, ++ordine, mio));
    fuori.push(blocco);
  }
  return fuori;
}

/** L'allenamento completo, pronto da spedire. */
export function allenamentoJSON(nome, passi, nota = "") {
  return {
    sportType: SPORT,
    workoutName: nome,
    description: nota || null,
    workoutSegments: [{
      segmentOrder: 1,
      sportType: SPORT,
      workoutSteps: convertiPassi(passi),
    }],
  };
}

/* ====================================================== il segnalibro === */
/*
   Si salva UNA volta. Legge il JSON dagli appunti, lo manda all'API interna
   con il token CSRF della pagina, e apre l'allenamento appena creato.

   Sta qui e non in un file a parte perché deve restare una riga sola da
   copiare, e perché il formato che produce e il codice che lo spedisce
   devono cambiare insieme.

   Se Garmin rifiuta, mostra IL SUO messaggio invece di un «errore»
   generico: su un'API non documentata la risposta del server è l'unica
   diagnosi che esista.
*/
/*
   NON LEGGE PIÙ GLI APPUNTI DA SOLO, e non è una semplificazione: è che i
   browser lo vietano.

   La prima versione faceva `navigator.clipboard.readText()` appena partiva,
   e Safari rispondeva «Clipboard read request was blocked due to lack of
   user activation». Il clic su un segnalibro NON vale come attivazione
   utente: la pagina non l'ha ricevuto, l'ha ricevuto la barra dei
   segnalibri. Qualunque cosa chieda un permesso, da lì dentro, parte già
   negata.

   Quindi il segnalibro apre un riquadro DENTRO la pagina: ci incolli il
   JSON con le dita — che è un incollaggio normale e non chiede permessi — e
   il pulsante è un clic vero, con l'attivazione che serve. Ci prova anche
   da solo a leggere gli appunti, in silenzio: se il permesso c'è, il
   riquadro è già pieno e devi solo confermare.
*/
export const SEGNALIBRO = [
  "javascript:(function(){",
  "if(document.getElementById('axbox'))return;",
  "var d=document.createElement('div');d.id='axbox';",
  "d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif';",
  "d.innerHTML=\"<div style='background:#fff;color:#111;max-width:440px;width:92%;padding:18px;border-radius:14px'>",
  "<div style='font-weight:700;margin-bottom:6px'>ATLAS &rarr; Garmin</div>",
  "<div id='axm' style='color:#555;margin-bottom:10px'>Incolla qui il JSON copiato da ATLAS.</div>",
  "<textarea id='axt' style='width:100%;height:110px;box-sizing:border-box;font:12px monospace;border:1px solid #ccc;border-radius:8px;padding:8px'></textarea>",
  "<div style='display:flex;gap:8px;margin-top:10px'>",
  "<button id='axgo' style='flex:1;padding:11px;border:0;border-radius:8px;background:#0b6cf5;color:#fff;font-weight:600'>Crea allenamento</button>",
  "<button id='axno' style='padding:11px 14px;border:0;border-radius:8px;background:#eee'>Chiudi</button>",
  "</div></div>\";",
  "document.body.appendChild(d);",
  "var t=d.querySelector('#axt'),m=d.querySelector('#axm');",
  "d.querySelector('#axno').onclick=function(){d.remove()};",
  "t.focus();",
  // Tentativo silenzioso: se il permesso c'è, risparmia l'incollaggio.
  "try{navigator.clipboard.readText().then(function(x){if(x&&!t.value){t.value=x;m.textContent='Preso dagli appunti. Tocca Crea.'}}).catch(function(){})}catch(e){}",
  "d.querySelector('#axgo').onclick=async function(){m.textContent='Invio...';try{",
  "var raw=t.value.trim();",
  "if(!raw){try{raw=(await navigator.clipboard.readText()).trim()}catch(e){}}",
  "if(!raw){m.textContent='Il riquadro e vuoto: incolla il JSON.';return}",
  "var j=JSON.parse(raw);",
  "var meta=document.querySelector('meta[name=csrf-token]');",
  "if(!meta){m.textContent='Non trovo il token: sei dentro connect.garmin.com?';return}",
  "var r=await fetch('/gc-api/workout-service/workout',{method:'POST',credentials:'include',",
  "headers:{'Content-Type':'application/json','connect-csrf-token':meta.content,'x-requested-with':'XMLHttpRequest'},",
  "body:JSON.stringify(j)});",
  "var b=await r.text();",
  "if(!r.ok){m.textContent='Garmin ha risposto '+r.status+': '+b.slice(0,300);return}",
  "var w=JSON.parse(b);location.href='/modern/workout/'+w.workoutId;",
  "}catch(e){m.textContent='Errore: '+(e&&e.message||e)}};",
  "})()",
].join("");
