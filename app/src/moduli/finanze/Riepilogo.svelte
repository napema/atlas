<!--
  Riepilogo — una domanda sola: posso spendere oggi, e quanto.

  L'ordine dei blocchi non è arbitrario. Prima il numero, poi il check (il
  gesto della sera), poi quello che sta per uscire — che è la cosa che
  ribalta la risposta al numero: 67 € restano tanti finché non scopri che
  dopodomani esce l'affitto. Poi dove sono i soldi, le categorie, come
  spendi, gli sforamenti. Il tono è quello di un cruscotto: riporta, non
  sgrida.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale, dataBreve, oggiISO, avviso, daISO, maiuscola, GIORNI } from "$lib/core/ui";
  import {
    stato, profiloDi, emojiCat, CATEGORIE_CASSA, SOGLIE_PREDEFINITE, TIPI_POCKET, categoriaPerId,
    pendenti, togliDaSospeso, salvaMovimento,
  } from "$condivisi/finanze/dati.js";
  import {
    cicloDi, finoAllaRicarica, pocketConSaldi, inArrivo, comeSpendi, sforamenti, alert,
    esitoCheck, comeEvento, categorieDelCiclo, categorieDelMese, nomeCiclo, nomeMese,
  } from "$condivisi/finanze/calcolo.js";
  import { nuovoId } from "$lib/core/ui";
  import { coloreCat, nomePocket } from "./comune";
  import { apri } from "./fogli.svelte";

  /* Ciclo o mese solare nelle categorie: una preferenza di lettura, non un
     dato. Non si salva e non si sincronizza; riparte da «ciclo», che è la
     vista giusta. */
  /** `lato`: il numero, il check, gli allarmi (la colonna sinistra sul PC). */
  let { parte }: { parte: "lato" | "resto" } = $props();

  let modoCategorie = $state<"ciclo" | "mese">("ciclo");

  const d = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const ciclo = cicloDi(oggi);
    const pk = pocketConSaldi();
    const configurato = pk.some((p: any) => p.saldo);
    const soglie = { ...SOGLIE_PREDEFINITE, ...(stato().soglie || {}) };
    return {
      oggi, ciclo, configurato,
      r: finoAllaRicarica(oggi),
      arrivo: inArrivo(30, oggi),
      av: alert(oggi),
      check: esitoCheck(oggi),
      sospese: pendenti(),
      pk, soglie,
      totalePk: pk.reduce((t: number, p: any) => t + p.saldoVero, 0),
      come: comeSpendi(ciclo),
      sfor: sforamenti(ciclo),
    };
  });

  const categorie = $derived.by(() => {
    dati.versione;
    const perCiclo = modoCategorie === "ciclo";
    const mese = d.oggi.slice(0, 7);
    const tutte = (perCiclo ? categorieDelCiclo(d.ciclo) : categorieDelMese(mese)).filter((c: any) => c.budget > 0 || c.speso > 0);
    // Solo quelle della cassa settimanale più le due che sforano di più:
    // nove barre non si leggono, e le sei che vanno bene rendono invisibili
    // le tre che non vanno.
    const cassa = tutte.filter((c: any) => CATEGORIE_CASSA.includes(c.id));
    const altre = tutte
      .filter((c: any) => !CATEGORIE_CASSA.includes(c.id) && c.budget > 0 && c.speso > 0)
      .sort((a: any, b: any) => b.speso / b.budget - a.speso / a.budget)
      .slice(0, 2);
    return {
      voci: [...cassa, ...altre],
      finestra: perCiclo ? nomeCiclo(d.ciclo) : nomeMese(mese),
      profilo: profiloDi(perCiclo ? d.ciclo.indice : mese).nome,
      mese,
    };
  });

  /* Due stati e basta: in linea, oppure sotto la quota che il piano
     prevedeva. Niente rosso lampeggiante e niente numeri negativi grandi —
     il tono è quello di un cruscotto, non di un rimprovero. */
  const tono = $derived(d.r.livello === "finita" ? "male" : d.r.livello === "sotto" ? "avviso" : "");

  /** «gio 24». Il giorno della settimana serve: «24 – 27» non si legge. */
  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`;
  };
  const ggLungo = (iso: string) => {
    const x = daISO(iso);
    return `${maiuscola(GIORNI[(x.getDay() + 6) % 7])} ${x.getDate()}`;
  };

  const NOTA_POCKET: Record<string, string> = {
    principale: "spendibile · carta", contanti: "spendibile · in tasca",
    cassa: "parcheggio · non spendere", fisse: "addebiti automatici", ing: "riserva · non toccare",
  };

  function registraSospesa(x: any) {
    const { ts, ...m } = x;
    salvaMovimento({ ...m, id: nuovoId("m"), data: oggiISO() });
    togliDaSospeso(x.id);
    avviso("Registrata.");
  }
</script>

{#if parte === "lato"}
<!-- 1. IL NUMERO ---------------------------------------------------------->
<Sezione titolo="Da spendere">
  <div class="numero" data-tono={tonoOggi}>
    {#if !d.configurato}
      <!-- Zero perché non è configurato non è zero perché hai finito i soldi. -->
      <span class="text-footnote secondario semibold">Questa settimana</span>
      <span class="cifra-vuota">—</span>
      <p class="text-subheadline secondario">I pocket non hanno ancora un saldo, quindi il conto della settimana non può partire.</p>
      <Pulsante variante="pieno" larga onclick={() => apri({ tipo: "pocket" })}>Imposta i saldi</Pulsante>
      <p class="text-footnote secondario">Si copiano da Revolut e da ING una volta sola. Da lì in poi li muovono i movimenti.</p>
    {:else if d.r.livello === "finita"}
      <div class="testa">
        <span class="text-footnote semibold male">Questa settimana</span>
        <span class="text-footnote secondario">{gg(d.r.da)} – {gg(d.r.a)}</span>
      </div>
      <Importo centesimi={0} misura={52} tono="male" />
      <p class="text-subheadline secondario">
        Settimana finita · {plurale(d.r.giorni, "giorno", "giorni")}{d.r.ricarica.quando ? " alla ricarica" : " allo stipendio"}
      </p>
      <div class="due-bottoni">
        <Pulsante variante="grigio" onclick={() => avviso("Va bene così. Lunedì si riparte.")}>Non ricaricare</Pulsante>
        <Pulsante variante="pieno" onclick={() => apri({ tipo: "ricarica" })}>Devo ricaricare</Pulsante>
      </div>
    {:else}
      <div class="testa">
        <span class="text-footnote secondario semibold">Questa settimana</span>
        <span class="text-footnote secondario">{gg(d.r.da)} – {gg(d.r.a)}</span>
      </div>
      <Importo centesimi={d.r.spendibile} misura={52} tono={tono as any} />
      <p class="text-subheadline secondario">
        <b class="cifre">{euro(d.r.alGiorno)}</b> al giorno · {plurale(d.r.giorni, "giorno", "giorni")}
      </p>

      <div class="consumo"><i style:width="{Math.round(d.r.frazione * 100)}%"></i></div>
      <p class="text-footnote secondario">speso {euro(d.r.speso, { tondo: true })} questa settimana</p>

      {#if d.r.livello === "sotto"}
        <!-- Fattuale, non un rimprovero: due numeri accanto, decide lui. -->
        <p class="text-footnote avviso">
          Il piano prevede {euro(d.r.quotaPiano)} al giorno. Ne hai {euro(d.r.alGiorno)} fino a {gg(d.r.a)}.
        </p>
      {/if}

      {#if d.r.ricarica.quando}
        <div class="ricarica">
          <span class="text-subheadline semibold">{ggLungo(d.r.ricarica.quando)}</span>
          <span class="text-subheadline secondario">
            <b class="cifre piu">+{euro(d.r.ricarica.importo, { tondo: true })}</b> dalla Cassa
          </span>
        </div>
      {/if}
    {/if}
  </div>
</Sezione>

<!-- 1ter. IL CICLO, sotto e in piccolo. Serve a sapere se il mese nel
     complesso regge, e non deve competere col numero della settimana: è
     una riga di testo, non una scheda. -->
{#if d.configurato}
  <p class="ciclo text-footnote secondario">
    Ciclo {dataBreve(d.r.ciclo.da)} – {dataBreve(d.r.ciclo.a)} · vita:
    <b class="cifre">{euro(d.r.ciclo.vita, { tondo: true })}</b> per {plurale(d.r.ciclo.giorni, "giorno", "giorni")} ·
    <b class="cifre">{euro(d.r.ciclo.alGiorno)}</b>/giorno
  </p>
{/if}

<!-- 1bis. IL CHECK — il gesto quotidiano. Costa trenta secondi o si salta. -->
{#if d.check.fatto}
  <Sezione>
    <Riga titolo="Check di oggi fatto" sottotitolo={d.check.serie > 1 ? `${plurale(d.check.serie, "giorno", "giorni")} di fila` : "Ci risentiamo domani"} freccia onclick={() => apri({ tipo: "check" })}>
      {#snippet inizio()}<span class="spunta-ok"><Icona nome="spunta" misura={16} tratto={2.8} /></span>{/snippet}
    </Riga>
  </Sezione>
{:else}
  <button type="button" class="check" data-esito={d.check.esito} onclick={() => apri({ tipo: "check" })}>
    <span class="check-testa">
      <span class="text-footnote semibold">Check di oggi</span>
      {#if d.check.serie > 0}<span class="serie cifre"><Icona nome="fiamma" misura={14} tratto={2} />{d.check.serie}</span>{/if}
    </span>
    <span class="text-title3">{d.check.titolo}</span>
    <span class="text-subheadline secondario">{d.check.sottotitolo}</span>
    <!-- Quattro pallini: l'esito si legge senza aprire niente; aprire serve a sapere PERCHÉ. -->
    <span class="punti">
      {#each d.check.voci as v, i (i)}<span class="punto" data-esito={v.esito} title={v.titolo}></span>{/each}
    </span>
    <span class="azione text-subheadline semibold">Fai il check <Icona nome="freccia" misura={14} tratto={2.4} /></span>
  </button>
{/if}

<!-- 2. GLI ALERT -->
{#if d.av.length}
  <div class="alert">
    {#each d.av as a, i (i)}
      <p class="text-subheadline" data-livello={a.livello}><span class="pallino"></span>{a.testo}</p>
    {/each}
  </div>
{/if}

{:else}
<!-- LE IN SOSPESO: «ci dormo su» -->
{#if d.sospese.length}
  <Sezione titolo="Ci hai dormito su">
    {#each d.sospese as x (x.id)}
      {@const ore = Math.floor((Date.now() - x.ts) / 3600000)}
      <div class="sospesa">
        <div class="sospesa-testo">
          <span>{x.nota || categoriaPerId(x.cat)?.nome || "Spesa"}</span>
          <span class="text-footnote secondario">{ore >= 24 ? "Sono passate 24 ore. La vuoi ancora?" : `Ancora ${plurale(24 - ore, "ora", "ore")} di attesa`}</span>
        </div>
        <span class="cifre semibold">{euro(x.imp)}</span>
        <div class="sospesa-azioni">
          <Pulsante variante="testo" misura="piccola" onclick={() => { togliDaSospeso(x.id); avviso("Lasciata perdere."); }}>Lascia stare</Pulsante>
          <Pulsante variante="tinto" misura="piccola" disabled={ore < 24} onclick={() => registraSospesa(x)}>Registra</Pulsante>
        </div>
      </div>
    {/each}
  </Sezione>
{/if}

<!-- 3. IN ARRIVO — «posso permettermi questa cena, o fra tre giorni arriva una bolletta?» -->
<Sezione titolo="In arrivo" piede={d.arrivo.voci.length ? "Prossimi 30 giorni." : "Niente in scadenza nei prossimi 30 giorni. I ricorrenti e i pagamenti previsti si configurano in Impostazioni."}>
  {#snippet coda()}{#if d.arrivo.voci.length}<span class="cifre secondario text-subheadline">{euro(d.arrivo.totale, { tondo: true })}</span>{/if}{/snippet}
  {#if d.arrivo.voci.length}
    <div class="avvolge" style:--inizio-l="38px">
      {#each d.arrivo.voci as v (`${v.origine}:${v.id}:${v.quando}`)}
        {@const e = comeEvento(v)}
        <Riga onclick={() => apri({ tipo: "arrivo", voce: v })} freccia>
          {#snippet inizio()}
            <span class="data" class:oggi={e.oggi}><span class="data-g">{e.giornoNome}</span><span class="data-n cifre">{e.giornoData.split(" ")[0]}</span></span>
          {/snippet}
          <span>{e.nome}</span>
          <span class="text-subheadline secondario">{e.dettaglio}</span>
          {#snippet fine()}<span class="cifre semibold uscita">{e.valore}</span>{/snippet}
        </Riga>
      {/each}
    </div>
    <!-- La verifica pocket per pocket: una maxi rata sulla riserva, con le
         sole Fisse controllate, non la vedeva nessuno. -->
    {#each Object.entries(d.arrivo.perPocket) as [id, p] (id)}
      {@const q = p as any}
      <div class="verifica text-footnote" class:male={!q.coperto}>
        <span>{q.coperto ? `Coperto da ${nomePocket(id)}` : `${nomePocket(id)} non basta`}</span>
        <span class="cifre">{q.coperto ? `${euro(q.totale, { tondo: true })} / ${euro(q.saldo, { tondo: true })}` : `mancano ${euro(q.scoperto, { tondo: true })}`}</span>
      </div>
    {/each}
  {/if}
</Sezione>

<!-- 4. DOVE SONO I SOLDI -->
{#if d.pk.length}
  <Sezione titolo="Dove sono i soldi">
    {#snippet coda()}<span class="cifre secondario text-subheadline">{euro(d.totalePk, { tondo: true })}</span>{/snippet}
    {#each d.pk as p (p.id)}
      {@const sotto = p.id === "ing" && p.saldoVero > 0 && p.saldoVero < d.soglie.ingMinimo}
      <!-- ING si aggiorna a mano: è l'unico saldo che l'app non può sapere. -->
      <Riga
        titolo={p.nome}
        sottotitolo={sotto ? "sotto il minimo di sicurezza" : NOTA_POCKET[p.id] || (TIPI_POCKET as any)[p.tipo]?.nome || ""}
        onclick={p.external ? () => apri({ tipo: "saldoING" }) : undefined}
        freccia={Boolean(p.external)}
      >
        {#snippet fine()}<span class="cifre semibold" class:male={p.saldoVero < 0 || sotto}>{euro(p.saldoVero)}</span>{/snippet}
      </Riga>
    {/each}
  </Sezione>
{/if}

<!-- 5. LE CATEGORIE -->
{#if categorie.voci.length}
  <Sezione
    titolo="Le categorie"
    piede={modoCategorie === "ciclo"
      ? `Dal giorno dello stipendio: è la finestra su cui l'app fa tutti i conti. Budget del profilo ${categorie.profilo}.`
      : `Mese solare, per confronto. I conti dell'app seguono il ciclo. Budget del profilo ${categorie.profilo}.`}
  >
    {#snippet coda()}<span class="text-footnote secondario">{categorie.finestra}</span>{/snippet}
    <div class="blocco"><Segmenti opzioni={[{ id: "ciclo", testo: "Ciclo" }, { id: "mese", testo: "Mese solare" }]} bind:valore={modoCategorie} /></div>
    {#each categorie.voci as c (c.id)}
      {@const f = c.budget > 0 ? c.speso / c.budget : 0}
      {@const oltre = c.budget > 0 && c.speso > c.budget}
      <button type="button" class="categoria" style:--tinta={oltre ? "var(--color-red)" : f >= 0.85 ? "var(--color-orange)" : coloreCat(c.id)} onclick={() => apri({ tipo: "categoria", catId: c.id, mese: categorie.mese })}>
        <span class="cat-alto">
          <span class="cat-nome"><span class="emoji">{emojiCat(c.id)}</span>{c.nome}</span>
          <span class="cifre text-subheadline" class:male={oltre}>{euro(c.speso, { tondo: true })} <span class="secondario">/ {euro(c.budget, { tondo: true })}</span></span>
        </span>
        <span class="barra"><i style:width="{Math.min(100, Math.round(f * 100))}%"></i></span>
      </button>
    {/each}
  </Sezione>
{/if}

<!-- 6. COME SPENDI -->
{#if d.come.totale}
  {@const pct = Math.round(d.come.pctDiscrezionale * 100)}
  <Sezione titolo="Come spendi" piede="Questo ciclo. Gli automatici — rate, bollette, accantonamenti — stanno a parte: non sono spese che fai, sono spese che ti fanno.">
    <div class="come">
      <div class="come-barra">
        <i class="auto" style:width="{Math.round(d.come.pct.automatico * 100)}%"></i>
        <i class="nec" style:width="{Math.round(d.come.pct.necessario * 100)}%"></i>
        <i class="disc" style:width="{Math.round(d.come.pct.discrezionale * 100)}%"></i>
      </div>
      <div class="come-legenda text-footnote">
        <span><i class="auto"></i>Automatico {euro(d.come.automatico, { tondo: true })}</span>
        <span><i class="nec"></i>Necessario {euro(d.come.necessario, { tondo: true })}</span>
        <span><i class="disc"></i>Discrezionale {euro(d.come.discrezionale, { tondo: true })} ({pct}%)</span>
      </div>
    </div>
  </Sezione>
{/if}

<!-- 7. SFORAMENTI — sempre visibile, e soprattutto quando è a zero: uno zero
     che si vede è quello che lo protegge. -->
<Sezione titolo="Sforamenti">
  <div class="sfor">
    <span class="sfor-cifra cifre" class:male={d.sfor.n > 0} class:ok={d.sfor.n === 0}>{d.sfor.n}</span>
    <div class="sfor-testo">
      <span class="text-subheadline">{d.sfor.n === 0 ? "Questo ciclo · nessuna ricarica fuori dal budget." : `Questo ciclo · ${euro(d.sfor.totale, { tondo: true })} in ${plurale(d.sfor.n, "ricarica", "ricariche")}.`}</span>
      {#if d.sfor.ultimo}
        <span class="text-footnote secondario">Ultimo: {dataBreve(d.sfor.ultimo.data)} · {euro(d.sfor.ultimo.imp, { tondo: true })}{d.sfor.ultimo.nota ? ` — ${d.sfor.ultimo.nota}` : ""}</span>
      {/if}
    </div>
  </div>
</Sezione>
{/if}

<style>
  .numero { padding: var(--space-5) var(--space-4) var(--space-4); display: flex; flex-direction: column; gap: 6px; }
  .testa { display: flex; justify-content: space-between; gap: var(--space-2); }
  .ciclo { padding: 0 var(--space-4); margin: calc(-1 * var(--space-3)) 0 0; }
  .cifra-vuota { font-family: var(--font-display); font-size: 52px; line-height: 58px; font-weight: var(--weight-bold); color: var(--label-tertiary); }
  .consumo { height: 6px; border-radius: 3px; overflow: hidden; background: var(--fill-tertiary); margin: var(--space-2) 0; }
  .consumo i { display: block; height: 100%; border-radius: inherit; background: var(--accento); transition: width var(--duration-slow) var(--ease-default); }
  [data-tono="avviso"] .consumo i { background: var(--color-orange); }
  [data-tono="male"] .consumo i { background: var(--color-red); }
  /* La ricarica che arriva: non è un avviso, è un fatto del calendario, e
     sta in fondo alla scheda perché è quello che spiega perché i giorni
     sono quattro e non ventinove. */
  .ricarica {
    display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3);
    margin-top: var(--space-2); padding-top: var(--space-3); border-top: 0.5px solid var(--separator);
  }
  .ricarica .piu { color: var(--color-green); font-weight: var(--weight-semibold); }
  .avviso { color: var(--color-orange); }
  .due-bottoni { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-top: var(--space-2); }
  .male { color: var(--color-red); }
  .ok { color: var(--color-green); }

  .spunta-ok { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--color-green); color: #fff; }
  .check {
    display: flex; flex-direction: column; gap: 4px; padding: var(--space-4); text-align: left;
    border-radius: var(--radius-xxxl); background: var(--bg-grouped-secondary);
    box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accento) 40%, transparent);
  }
  .check:active { opacity: 0.8; }
  .check-testa { display: flex; justify-content: space-between; align-items: center; color: var(--accento); }
  .serie { display: inline-flex; align-items: center; gap: 3px; color: var(--color-orange); font-weight: var(--weight-semibold); }
  .punti { display: flex; gap: 6px; margin: var(--space-2) 0; }
  .punto { width: 10px; height: 10px; border-radius: 50%; background: var(--fill-primary); }
  .punto[data-esito="ok"] { background: var(--color-green); }
  .punto[data-esito="attenzione"] { background: var(--color-orange); }
  .punto[data-esito="male"] { background: var(--color-red); }
  .azione { display: inline-flex; align-items: center; gap: 4px; color: var(--accento); }

  .alert { display: flex; flex-direction: column; gap: var(--space-2); }
  .alert p { display: flex; gap: var(--space-2); align-items: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); background: var(--bg-grouped-secondary); }
  .pallino { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--accento); }
  [data-livello="critico"] .pallino { background: var(--color-red); }
  [data-livello="warn"] .pallino { background: var(--color-orange); }

  .sospesa { position: relative; display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
  .sospesa + .sospesa::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .sospesa-testo { display: flex; flex-direction: column; }
  .sospesa-azioni { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: var(--space-2); }

  .data { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius-md); background: var(--fill-quaternary); }
  .data.oggi { background: color-mix(in srgb, var(--accento) 18%, transparent); color: var(--accento); }
  .data-g { font-size: 9px; line-height: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; opacity: 0.8; }
  .data-n { font-size: var(--text-callout); line-height: 18px; font-weight: var(--weight-semibold); }
  .uscita { color: var(--color-red); }
  .verifica { display: flex; justify-content: space-between; padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); color: var(--color-green); }
  .verifica.male { color: var(--color-red); }

  .blocco { padding: var(--space-3) var(--space-4) var(--space-2); }
  .categoria { width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px var(--space-4) 12px; text-align: left; }
  .categoria:active { background: var(--fill-quaternary); }
  .cat-alto { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-2); }
  .cat-nome { display: inline-flex; gap: 8px; align-items: center; }
  .barra { height: 6px; border-radius: 3px; overflow: hidden; background: var(--fill-tertiary); }
  .barra i { display: block; height: 100%; border-radius: inherit; background: var(--tinta); }

  .come { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .come-barra { display: flex; height: 12px; border-radius: 6px; overflow: hidden; gap: 2px; }
  .come-barra i { display: block; height: 100%; }
  .auto { background: var(--color-gray); }
  .nec { background: var(--color-blue); }
  .disc { background: var(--color-purple); }
  .come-legenda { display: flex; flex-direction: column; gap: 4px; color: var(--label-secondary); }
  .come-legenda span { display: inline-flex; align-items: center; gap: 6px; }
  .come-legenda i { width: 10px; height: 10px; border-radius: 3px; }

  .sfor { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); }
  .sfor-cifra { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); }
  .sfor-testo { display: flex; flex-direction: column; gap: 2px; }
</style>
