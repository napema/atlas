<!--
  Oggi — la home. La misura del successo di ATLAS è questa schermata
  (CLAUDE.md, §0): se al mattino non dice più di tre app aperte in fila,
  ATLAS non è servito a niente.

  Quattro blocchi, sempre gli stessi, sempre nello stesso posto:
    Adesso     le cose da fare in questa fascia, spuntabili da qui
    Finanze    quanto puoi spendere e cosa sta per uscire
    Costanza   la serie delle abitudini e la settimana che la spiega
    I moduli   una riga per modulo, per controllare e basta

  Non ha dati propri: chiede a ogni modulo la sua `oggi()`.
-->
<script lang="ts">
  import { flip } from "svelte/animate";
  import { slide } from "svelte/transition";
  import Pagina from "$lib/ui/Pagina.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Spunta from "$lib/ui/Spunta.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Settimana from "$lib/ui/Settimana.svelte";
  import { MODULI_DATI, voceDi } from "$lib/core/registro";
  import { contratti } from "$lib/core/contratti.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { statoSync } from "$lib/core/statoSync.svelte";
  import { tinta } from "$lib/core/tinte";
  import { tocco, dataUmana, maiuscola } from "$lib/core/ui";
  import { quadro, verdetto, saluto, costanza, fraseSerie, type Scheda, type VoceResta } from "./giornata";

  let { resto = [] }: { resto?: string[] } = $props();

  const NOME = "Ema";
  /** Quante righe in «Adesso» prima che diventi un elenco. */
  const MAX_RIGHE = 5;

  // Tollerante di proposito: un modulo rotto non deve portarsi via la home,
  // che è la schermata che si apre più spesso di tutte.
  const schede = $derived.by<Scheda[]>(() => {
    dati.versione;
    const pronti = contratti.pronti;
    return MODULI_DATI.filter((m) => pronti[m.id]).map((voce) => {
      const contratto = pronti[voce.id];
      let d = null;
      try { d = contratto.oggi?.() ?? null; }
      catch (e) { console.error(`[oggi] la scheda di "${voce.id}" non si è calcolata`, e); }
      return { voce, contratto, dati: d };
    });
  });

  const q = $derived.by(() => { dati.versione; return quadro(schede); });
  const c = $derived.by(() => { dati.versione; return costanza(); });
  const ora = $derived.by(() => { dati.versione; return new Date(); });

  const mostrate = $derived(q.prio.slice(0, MAX_RIGHE));
  const nascoste = $derived(q.prio.length - mostrate.length + q.dopo);
  const f = $derived(q.finanze);

  const dataLunga = $derived(maiuscola(ora.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })));

  function tocca(v: VoceResta) {
    // Una sessione non si spunta, si fa: toccarla apre il player.
    if (v.apre) { location.hash = v.apre; return; }
    const contr = contratti.pronti[v.modulo];
    // Parte e abitudine intera sono due chiamate diverse: unirle con un `??`
    // spuntava la parte `null`, sotto una chiave che nessuno rilegge.
    if (v.parteId) contr?.spuntaParte?.(v.habitId, v.parteId);
    else contr?.spunta?.(v.habitId);
    tocco(12);
  }

  const giorniCostanza = $derived(c.giorni.map((g) => ({
    iso: g.giorno,
    stato: g.stato === "ignoto" ? ("riposo" as const) : g.stato,
    titolo: `${dataUmana(g.giorno)} · ` + (
      g.stato === "ignoto" ? "nessun dato"
      : g.stato === "riposo" ? "niente in programma"
      : `${g.spuntate} su ${g.attese}`),
  })));
</script>

<Pagina titolo="{saluto(ora.getHours())}, {NOME}" larga>
  {#snippet sopra()}
    <span>{dataLunga}</span>
    <span class="sync" title={statoSync.titolo}>
      <span class="pallino" data-stato={statoSync.stato}></span>{statoSync.etichetta}
    </span>
  {/snippet}
  {#snippet azioni()}
    <Pulsante variante="vetro" misura="media" tondo icona="ingranaggio" etichetta="Impostazioni" href="#/impostazioni" />
  {/snippet}

  <p class="verdetto text-title3">{verdetto(q)}</p>

  <div class="griglia">
    <!-- ADESSO: l'unica carta su cui si tocca per FARE invece che per andare. -->
    <div class="area-adesso">
      <Sezione titolo="Adesso">
        {#snippet coda()}
          {#if q.prio.length}<span class="conta cifre">{q.prio.length}</span>{/if}
        {/snippet}
        {#if !q.resta.length}
          <div class="calmo">
            <span class="segno ok"><Icona nome="fatto" misura={22} tratto={2} /></span>
            <p>{q.conDati.length ? "Niente. Hai spuntato tutto quello che c'era oggi." : "Sto leggendo i moduli…"}</p>
          </div>
        {:else if !q.prio.length}
          <div class="calmo">
            <span class="segno"><Icona nome="sole" misura={22} tratto={2} /></span>
            <p>Adesso non ti tocca niente. {q.dopo === 1 ? "Una cosa aspetta" : `${q.dopo} cose aspettano`} più avanti.</p>
          </div>
          <Riga titolo="Vedi tutte le abitudini" href="#/abitudini" freccia accento />
        {:else}
          {#each mostrate as v (v.chiave)}
            <div animate:flip={{ duration: 280 }} out:slide={{ duration: 220 }} class="voce avvolge" style:--tinta={tinta(v.tint)}>
              <Riga onclick={() => tocca(v)} freccia={Boolean(v.apre)}>
                {#snippet inizio()}
                  {#if v.apre}
                    <span class="apri"><Icona nome="play" misura={14} tratto={2.4} /></span>
                  {:else}
                    <Spunta finta misura={26} />
                  {/if}
                {/snippet}
                <span class="voce-nome">
                  {#if v.emoji}<span class="emoji">{v.emoji}</span>{/if}
                  {v.nome}
                </span>
                {#if v.dentro}<span class="text-subheadline secondario">{v.dentro}</span>{/if}
                {#snippet fine()}
                  {#if v.quando === "tardi"}
                    <span class="text-subheadline ritardo">in ritardo</span>
                  {:else if v.nomeFascia}
                    <span class="text-subheadline secondario">{v.nomeFascia}</span>
                  {/if}
                {/snippet}
              </Riga>
            </div>
          {/each}
          {#if nascoste > 0}
            <Riga titolo="Altre {nascoste} in Abitudini" href="#/abitudini" freccia accento />
          {/if}
        {/if}
      </Sezione>
    </div>

    <!-- FINANZE: le tre domande che si fanno davanti a una cena fuori. -->
    {#if f}
      <div class="area-finanze" style:--accento={voceDi("finanze")?.accento}>
        <Sezione titolo="Finanze">
          {#snippet coda()}<a href="#/finanze">Apri</a>{/snippet}
          <div class="soldi">
            <div class="eroe">
              <span class="cifra cifre">{f.valore ?? "—"}</span>
              <span class="text-subheadline secondario">{f.eti || "spendibili"}</span>
            </div>
            <div class="due">
              <div><span class="text-footnote secondario">Oggi</span><span class="num cifre">{f.spesoOggi ?? "0 €"}</span></div>
              <div><span class="text-footnote secondario">Al giorno</span><span class="num cifre">{f.alGiorno ?? "—"}</span></div>
            </div>
          </div>
          {#if f.calendario?.length}
            <div class="avvolge" style:--inizio-l="38px">
            {#each f.calendario as e (e.chiave)}
              <Riga>
                {#snippet inizio()}
                  <span class="data" class:oggi={e.oggi}>
                    <span class="data-g">{e.giornoNome}</span>
                    <span class="data-n cifre">{e.giornoData.split(" ")[0]}</span>
                  </span>
                {/snippet}
                <span>{e.nome}</span>
                {#if e.dettaglio}<span class="text-subheadline secondario">{e.dettaglio}</span>{/if}
                {#snippet fine()}
                  <span class="cifre importo" data-tono={e.tono}>{e.valore}</span>
                {/snippet}
              </Riga>
            {/each}
            </div>
          {:else}
            <Riga><span class="secondario">Niente in uscita entro domenica.</span></Riga>
          {/if}
          {#if q.allarme}
            <div class="allarme text-subheadline"><span class="punto"></span>{q.allarme}</div>
          {/if}
        </Sezione>
      </div>
    {/if}

    <!-- COSTANZA: il numero è la serie, la striscia la spiega. -->
    <div class="area-costanza">
      <Sezione titolo="Costanza">
        <div class="costanza">
          <div class="serie">
            <span class="cifra cifre" class:magra={c.serie > 0 && c.pieni === 0}>{c.serie}</span>
            <span class="text-subheadline secondario">{c.serie === 1 ? "giorno di fila" : "giorni di fila"}</span>
            {#if c.attese > 0}
              <span class="rapporto text-footnote secondario"><b class="cifre">{c.spuntate}/{c.attese}</b> spunte in 7 giorni</span>
            {/if}
          </div>
          <Settimana giorni={giorniCostanza} oggi={c.oggi} />
          <p class="text-subheadline secondario">{fraseSerie(c.serie, c.pieni, c.vuotiDiFila)}</p>
        </div>
      </Sezione>
    </div>

    <!-- I MODULI: qui non si decide niente, si controlla. Una riga a testa. -->
    <div class="area-moduli">
      <Sezione titolo="I moduli">
        {#each schede as s (s.voce.id)}
          <Riga titolo={s.voce.nome} href={s.dati?.azione?.rotta || `#/${s.voce.id}`} freccia>
            {#snippet inizio()}
              <span class="tessera" style:--colore={s.voce.accento}><Icona nome={s.voce.icona} misura={18} tratto={2} /></span>
            {/snippet}
            {#snippet fine()}
              <span class="stato-mod cifre" class:ok={s.dati?.fatto === true}>
                {#if s.dati?.fatto === true}<Icona nome="spunta" misura={14} tratto={2.6} />{/if}
                <span class="stato-testo">{s.dati ? String(s.dati.valore ?? "—") : "—"}</span>
              </span>
            {/snippet}
          </Riga>
        {:else}
          <Riga><span class="secondario">Sto leggendo i moduli…</span></Riga>
        {/each}
      </Sezione>
    </div>
  </div>
</Pagina>

<style>
  .sync { display: inline-flex; align-items: center; gap: 5px; margin-left: 8px; text-transform: none; }
  .pallino { width: 7px; height: 7px; border-radius: 50%; background: var(--label-tertiary); }
  .pallino[data-stato="ok"] { background: var(--color-green); }
  .pallino[data-stato="corso"] { background: var(--color-blue); animation: pulsa 1.2s ease-in-out infinite; }
  .pallino[data-stato="err"] { background: var(--color-red); }
  @keyframes pulsa { 50% { opacity: 0.35; } }

  .verdetto { margin-top: calc(-1 * var(--space-3)); color: var(--label-secondary); font-weight: var(--weight-regular); }

  /* `minmax(0, 1fr)` e non `1fr`: una colonna `1fr` non scende sotto la
     larghezza minima del suo contenuto, e il nome lungo di una cena la
     allargava oltre lo schermo del telefono. */
  .griglia {
    display: grid; gap: var(--space-6);
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "adesso" "finanze" "costanza" "moduli";
  }
  @media (min-width: 900px) {
    .griglia {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start;
      grid-template-areas: "adesso finanze" "costanza finanze" "costanza moduli";
    }
  }
  .area-adesso { grid-area: adesso; }
  .area-finanze { grid-area: finanze; }
  .area-costanza { grid-area: costanza; }
  .area-moduli { grid-area: moduli; }

  .conta {
    display: inline-grid; place-items: center; min-width: 26px; height: 26px; padding: 0 8px;
    border-radius: var(--radius-full); background: var(--fill-tertiary);
    color: var(--label-primary); font-size: var(--text-subheadline); font-weight: var(--weight-semibold);
  }

  .calmo { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); }
  .segno {
    flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
    color: var(--color-orange); background: color-mix(in srgb, var(--color-orange) 16%, transparent);
  }
  .segno.ok { color: var(--color-green); background: color-mix(in srgb, var(--color-green) 16%, transparent); }

  .voce { display: block; }
  .voce-nome { display: inline-flex; align-items: center; gap: 6px; }
  .apri {
    display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
    background: var(--tinta); color: #fff; padding-left: 2px;
  }
  .ritardo { color: var(--color-red); font-weight: var(--weight-medium); }

  .soldi { padding: var(--space-4) var(--space-4) var(--space-3); display: flex; flex-direction: column; gap: var(--space-4); }
  .eroe { display: flex; flex-direction: column; gap: 2px; }
  .eroe .cifra {
    font-family: var(--font-display); font-size: 40px; line-height: 44px; letter-spacing: -0.5px;
    font-weight: var(--weight-bold);
  }
  .due { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
  .due div { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: var(--radius-xl); background: var(--fill-quaternary); }
  .num { font-size: var(--text-title3); line-height: var(--lh-title3); font-weight: var(--weight-semibold); }

  .data {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: var(--radius-md);
    background: var(--fill-quaternary);
  }
  .data.oggi { background: color-mix(in srgb, var(--accento) 18%, transparent); color: var(--accento); }
  .data-g { font-size: 9px; line-height: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.3px; opacity: 0.8; }
  .data-n { font-size: var(--text-callout); line-height: 18px; font-weight: var(--weight-semibold); }
  .importo { font-weight: var(--weight-medium); }
  .importo[data-tono="male"] { color: var(--color-red); }
  .importo[data-tono="avviso"] { color: var(--color-orange); }

  .allarme {
    display: flex; align-items: flex-start; gap: var(--space-2);
    padding: var(--space-3) var(--space-4) var(--space-4);
    border-top: 0.5px solid var(--separator);
    color: var(--label-secondary);
  }
  .punto { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--color-orange); }

  .costanza { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
  .serie { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }
  .serie .cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); color: var(--color-orange); }
  .serie .cifra.magra { color: var(--label-primary); }
  .rapporto { margin-left: auto; }
  .rapporto b { color: var(--label-primary); font-weight: var(--weight-semibold); }

  .tessera {
    display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px;
    background: var(--colore); color: #fff;
  }
  .stato-mod { display: inline-flex; align-items: center; gap: 4px; min-width: 0; color: var(--label-secondary); }
  .stato-mod :global(.icona) { flex: none; }
  .stato-testo { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stato-mod.ok { color: var(--color-green); }
</style>
