<!--
  Finanze — cinque blocchi, un ordine fisso, nessuna frase.

  L'ordine è una gerarchia di decisioni, non un'estetica:

    OBIETTIVO    dove sto andando. Sta in cima perché è la cosa che rende
                 una spesa costosa: 105 € non sono 105 €, sono due terzi di
                 un versamento al fondo.
    OGGI         quanto posso spendere. È il numero che si guarda dieci
                 volte al giorno, e deve essere UNO.
    FUORI PIANO  cosa ho fatto fuori dal piano. Non è un rimprovero: è
                 l'unica voce su cui si può agire, perché è l'unica fatta
                 di decisioni e non di addebiti.
    IN ARRIVO    cosa ribalta la risposta di «oggi».
    POCKET       dove sono i soldi, e da quando il numero è affidabile.

  Quello che c'era prima e non c'è più: nove barre per categoria, «come
  spendi», il check di oggi, gli sforamenti come blocco a sé. Erano tutte
  cose vere che non cambiavano niente — si guardavano una volta e poi si
  scorreva oltre. Le categorie restano in Cicli e in Movimenti, che sono le
  schermate fatte per guardare indietro.

  Regola di scrittura: etichette e numeri. Niente testo generato, niente
  consigli. Al massimo una riga per blocco, e quella riga è un confronto fra
  due cifre.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { euro, plurale, oggiISO, daISO, GIORNI, MESI_BREVI } from "$lib/core/ui";
  import { stato, TIPI_POCKET } from "$condivisi/finanze/dati.js";
  import { nomePocket } from "./comune";
  import { cicloDi, nomeCiclo, importoEffettivo, pocketConSaldi } from "$condivisi/finanze/calcolo.js";
  import {
    quotaDi, variazioneQuota, copreFino, statoObiettivo, fuoriPianoDelCiclo,
    ingPrevisto, inArrivoDiviso,
  } from "$condivisi/finanze/piano.js";
  import { allineamento } from "$condivisi/finanze/chiusura.js";
  import { apri } from "./fogli.svelte";

  /** `lato`: obiettivo e quota — la colonna sinistra sul PC. */
  let { parte }: { parte: "lato" | "resto" } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const oggi = oggiISO();
    const ciclo = cicloDi(oggi);
    const pk = pocketConSaldi();
    const q = quotaDi(oggi);
    return {
      oggi, ciclo, pk, q,
      // Zero perché non è configurato non è zero perché hai finito i soldi:
      // senza un'ancora su un pocket il conto della quota non può partire.
      configurato: pk.some((p: any) => p.ancoraDa || p.saldo),
      delta: variazioneQuota(oggi),
      copre: copreFino(oggi, q.quota),
      obi: statoObiettivo(oggi),
      fp: fuoriPianoDelCiclo(ciclo, oggi),
      ing: ingPrevisto(oggi),
      arrivo: inArrivoDiviso(14, oggi),
      all: allineamento(oggi),
      totale: pk.reduce((t: number, p: any) => t + p.saldoVero, 0),
    };
  });

  /** «ven 23». Il giorno della settimana serve: «23» da solo non si colloca. */
  const gg = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()}`;
  };
  /** «23 ott». */
  const gm = (iso: string) => {
    const x = daISO(iso);
    return `${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };
  /** «ven 23 ott», per le date lontane: senza il mese, «15» non dice nulla. */
  const glm = (iso: string) => {
    const x = daISO(iso);
    return `${GIORNI[(x.getDay() + 6) % 7].slice(0, 3)} ${x.getDate()} ${MESI_BREVI[x.getMonth()]}`;
  };

  const NOTA_POCKET: Record<string, string> = {
    principale: "spendibile", contanti: "in tasca", cassa: "parcheggio",
    fisse: "addebiti automatici", ing: "riserva", fondo: "obiettivo",
  };
</script>

{#if parte === "lato"}

<!-- 1. L'OBIETTIVO ------------------------------------------------------- -->
{#if d.obi}
  <Sezione>
    <button type="button" class="blocco obi" data-tono={d.obi.inLinea ? "" : "avviso"} onclick={() => apri({ tipo: "obiettivo" })}>
      <span class="testa">
        <span class="eti">{d.obi.nome.toUpperCase()} · {gm(d.obi.data)}</span>
        <span class="eti-dx cifre">{plurale(d.obi.giorni, "giorno", "giorni")}</span>
      </span>

      <span class="obi-cifre">
        <b class="cifre">{euro(d.obi.saldo, { tondo: true })}</b>
        <span class="secondario cifre">/ {euro(d.obi.target, { tondo: true })}</span>
        {#if d.obi.provvisorio}<span class="tag">stima</span>{/if}
      </span>
      <span class="barra"><i style:width="{Math.round(d.obi.frazione * 100)}%"></i></span>

      <span class="righe text-subheadline">
        <span>
          {#if d.obi.inLinea}in linea{:else}indietro di <b class="cifre">{euro(-d.obi.scarto, { tondo: true })}</b>{/if}
          <span class="secondario">· previsto a oggi {euro(d.obi.previsto, { tondo: true })}</span>
        </span>
        <span>
          proiezione <b class="cifre">{euro(d.obi.proiezione, { tondo: true })}</b>
          {#if d.obi.gap > 0}<span class="secondario">· mancano {euro(d.obi.gap, { tondo: true })}</span>{/if}
        </span>
        {#if d.obi.prossimo}
          <span class="secondario">prossimo versamento {euro(d.obi.versamento, { tondo: true })} · {glm(d.obi.prossimo)}</span>
        {/if}
      </span>
    </button>
  </Sezione>
{/if}

<!-- 2. OGGI -------------------------------------------------------------- -->
<Sezione>
  <div class="blocco oggi" data-tono={d.q.livello}>
    <span class="testa"><span class="eti">OGGI</span></span>

    {#if !d.configurato}
      <span class="vuota cifre">—</span>
      <Pulsante variante="pieno" larga onclick={() => apri({ tipo: "pocket" })}>Imposta i saldi</Pulsante>
    {:else}
      <span class="riga-grande">
        <Importo centesimi={d.q.quota} misura={46} tono={d.q.livello as any} />
        <span class="delta text-subheadline cifre" data-verso={d.delta > 0 ? "su" : d.delta < 0 ? "giu" : ""}>
          {#if d.delta !== 0}
            <Icona nome={d.delta > 0 ? "su" : "giu"} misura={13} tratto={2.6} />
          {/if}
          {d.delta > 0 ? "+" : ""}{euro(d.delta)} da ieri
        </span>
      </span>

      <span class="righe text-subheadline">
        <span class="secondario cifre">
          speso oggi {euro(d.q.speso)} · restano <b class:male={d.q.resta < 0}>{euro(d.q.resta)}</b>
        </span>
        <span class="due">
          <span class="cifre">
            <b>{euro(d.q.spendibile)}</b>
            <span class="secondario">fino a {gg(d.q.fine)} · {plurale(d.q.giorni, "giorno", "giorni")}</span>
          </span>
          <span class="secondario cifre">piano {euro(d.q.piano)}/g</span>
        </span>
        {#if d.copre}
          <span class="secondario cifre">
            {d.pk.find((p: any) => p.id === "principale")?.nome ?? "Principale"}
            {euro(d.pk.filter((p: any) => p.tipo === "spendibile" && !p.external).reduce((t: number, p: any) => t + p.saldoVero, 0))}
            · copre fino a {gg(d.copre)}
          </span>
        {/if}
      </span>
    {/if}
  </div>
</Sezione>

<!-- La lista d'attesa accanto ai due gesti: è il terzo gesto, e arriva nello
     stesso momento — davanti a una cosa che costa. -->
<Sezione>
  <Riga titolo="Lista d'attesa" freccia onclick={() => apri({ tipo: "lista" })}>
    {#snippet inizio()}<span class="ico"><Icona nome="orologio" misura={17} tratto={2.1} /></span>{/snippet}
    {#snippet fine()}
      {@const n = (stato().lista || []).filter((v: any) => v && !v.del && (v.stato === "attesa" || !v.stato)).length}
      <span class="cifre secondario">{n || ""}</span>
    {/snippet}
  </Riga>
</Sezione>

{:else}

<!-- 3. FUORI PIANO ------------------------------------------------------- -->
<Sezione>
  <div class="blocco fp" data-tono={d.fp.n ? "male" : "ok"}>
    <span class="testa">
      <span class="eti">FUORI PIANO · QUESTO CICLO</span>
      <span class="eti-dx cifre">
        {#if d.fp.n}{d.fp.n} · {euro(d.fp.totale, { tondo: true })}{:else}0{/if}
      </span>
    </span>

    {#if !d.fp.n}
      <span class="zero cifre">{plurale(d.fp.giorniSenza, "giorno", "giorni")} senza fuori piano</span>
    {:else}
      <ul class="elenco">
        {#each d.fp.voci.slice(0, 5) as m (m.id)}
          <li>
            <span class="e-data cifre secondario">{gm(m.data)}</span>
            <span class="e-nome">{m.nota || "—"}</span>
            {#if m.daRiserva}<span class="tag">da ING</span>{/if}
            <span class="e-cifra cifre">{euro(importoEffettivo(m))}</span>
          </li>
        {/each}
        {#if d.fp.voci.length > 5}
          <li class="piu text-footnote secondario">+{d.fp.voci.length - 5}</li>
        {/if}
      </ul>
      <span class="righe text-subheadline">
        {#if d.fp.pct != null}
          <span class="secondario cifre">= {Math.round(d.fp.pct * 100)}% del versamento mensile al fondo</span>
        {/if}
        {#if d.fp.ricariche.n}
          <span class="secondario cifre">ricariche da ING non pianificate: {d.fp.ricariche.n} · {euro(d.fp.ricariche.totale, { tondo: true })}</span>
        {/if}
      </span>
    {/if}
  </div>
</Sezione>

<!-- 4. IN ARRIVO --------------------------------------------------------- -->
<Sezione>
  <div class="blocco">
    <span class="testa">
      <span class="eti">IN ARRIVO · 14 GIORNI</span>
      {#if d.arrivo.prima.totale}<span class="eti-dx cifre">{euro(d.arrivo.prima.totale, { tondo: true })}</span>{/if}
    </span>

    <ul class="elenco">
      {#each d.arrivo.prima.voci as v (`${v.origine}:${v.id}:${v.quando}`)}
        {@const cop = (d.arrivo.prima.perPocket as any)[v.pocket || "principale"]}
        <li>
          <span class="e-data cifre secondario">{gg(v.quando)}</span>
          <span class="e-nome">{v.nome}</span>
          <span class="e-nota text-footnote" class:male={cop && !cop.coperto}>
            {nomePocket(v.pocket)}
            · {cop && !cop.coperto ? `manca ${euro(cop.scoperto, { tondo: true })}` : "coperto"}
          </span>
          <span class="e-cifra cifre">{euro(v.importo)}</span>
        </li>
      {/each}

      <!-- LA RIGA DELLA PAGA, e tutto quello che sta sotto non ha allarmi:
           una bolletta del 9 novembre la paga lo stipendio del 23 ottobre, e
           segnalarla scoperta oggi è un allarme su un mese che torna. -->
      <li class="paga">
        <span class="cifre">{gg(d.arrivo.paga)}</span>
        <span>GIORNO DI PAGA</span>
      </li>

      {#each d.arrivo.dopo as v (`${v.origine}:${v.id}:${v.quando}`)}
        <li class="dopo">
          <span class="e-data cifre secondario">{gg(v.quando)}</span>
          <span class="e-nome secondario">{v.nome}</span>
          <span class="e-cifra cifre secondario">{euro(v.importo)}</span>
        </li>
      {/each}
    </ul>
  </div>
</Sezione>

<!-- 5. I POCKET ---------------------------------------------------------- -->
<Sezione>
  <div class="blocco">
    <span class="testa">
      <span class="eti">POCKET</span>
      <button type="button" class="eti-dx all" data-tono={d.all.vecchio ? "avviso" : ""} onclick={() => apri({ tipo: "chiusura" })}>
        {#if d.all.quando}allineato all'estratto: {gm(d.all.quando)}{:else}mai allineato{/if}
      </button>
    </span>

    <ul class="elenco pocket">
      {#each d.pk as p (p.id)}
        <li>
          <span class="e-nome">{p.nome}</span>
          <span class="e-nota text-footnote secondario">{NOTA_POCKET[p.id] ?? (TIPI_POCKET as any)[p.tipo]?.nome ?? ""}</span>
          <span class="e-cifra cifre" class:male={p.saldoVero < 0}>{euro(p.saldoVero)}</span>
        </li>
      {/each}
    </ul>

    <!-- ING: il saldo non dice niente da solo. Il punto più basso dei
         prossimi dodici mesi è l'unico numero che risponde a «posso
         attingere». -->
    <span class="righe text-subheadline">
      <span class="cifre" class:avviso={d.ing.sotto}>
        <span class="secondario">ING minimo previsto</span>
        <b>{euro(d.ing.minimo, { tondo: true })}</b>
        <span class="secondario">· {glm(d.ing.quando)}</span>
      </span>
      <span class="secondario cifre">totale {euro(d.totale, { tondo: true })} · ciclo {nomeCiclo(d.ciclo)}</span>
    </span>
  </div>
</Sezione>

{/if}

<style>
  /* Un blocco solo per tutti e cinque: testa con due etichette, corpo,
     righe di chiusura. La ripetizione è il punto — cinque blocchi che si
     leggono con lo stesso movimento degli occhi. */
  .blocco { display: flex; flex-direction: column; gap: 6px; padding: var(--space-4); width: 100%; text-align: left; }
  .testa { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .eti {
    font-size: var(--text-caption1); font-weight: var(--weight-semibold);
    letter-spacing: 0.7px; color: var(--label-secondary);
  }
  .eti-dx { font-size: var(--text-footnote); color: var(--label-secondary); }
  .all { font-size: var(--text-footnote); color: var(--label-secondary); }
  .all[data-tono="avviso"] { color: var(--color-orange); }

  .righe { display: flex; flex-direction: column; gap: 2px; }
  .due { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); }
  .secondario { color: var(--label-secondary); }
  .male { color: var(--color-red); }
  .avviso { color: var(--color-orange); }

  /* --- obiettivo --- */
  .obi:active { background: var(--fill-quaternary); }
  .obi-cifre { display: flex; align-items: baseline; gap: 6px; }
  .obi-cifre b { font-family: var(--font-display); font-size: 30px; line-height: 34px; font-weight: var(--weight-bold); }
  .barra { height: 6px; border-radius: 3px; overflow: hidden; background: var(--fill-tertiary); margin: 4px 0 2px; }
  .barra i { display: block; height: 100%; border-radius: inherit; background: var(--accento); }
  .obi[data-tono="avviso"] .barra i { background: var(--color-orange); }
  .tag {
    padding: 1px 6px; border-radius: var(--radius-sm); font-size: var(--text-caption2);
    font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.4px;
    color: var(--label-secondary); background: var(--fill-tertiary);
  }

  /* --- oggi --- */
  .riga-grande { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }
  .delta { display: inline-flex; align-items: center; gap: 3px; color: var(--label-tertiary); }
  .delta[data-verso="su"] { color: var(--color-green); }
  .delta[data-verso="giu"] { color: var(--color-orange); }
  .vuota { font-family: var(--font-display); font-size: 46px; line-height: 52px; font-weight: var(--weight-bold); color: var(--label-tertiary); }

  .ico { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--fill-tertiary); color: var(--label-secondary); }

  /* --- gli elenchi: una griglia, non tre flex.

     Le cifre a destra incolonnate si confrontano con l'occhio; in tre flex
     ognuna finisce dove capita e per leggere la terza bisogna rileggere la
     prima. --- */
  .elenco { display: grid; grid-template-columns: auto 1fr auto; gap: 2px var(--space-3); margin-top: 2px; align-items: baseline; }
  /* `display: contents` e non `subgrid`: le celle delle righe devono stare
     sulla griglia del genitore, e questo lo fa su tutto quello che esiste. */
  .elenco li { display: contents; }
  .e-data { font-size: var(--text-footnote); white-space: nowrap; }
  .e-nome { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .e-cifra { justify-self: end; font-variant-numeric: tabular-nums; font-weight: var(--weight-semibold); }
  /* La nota va a capo sotto il nome: è la parte che si legge una volta. */
  .e-nota { grid-column: 2 / 3; color: var(--label-secondary); }
  .elenco .tag { grid-column: 2 / 3; justify-self: start; }
  /* Queste due righe NON sono `display: contents`: hanno un bordo e un
     margine, e una scatola che non esiste non si può bordare. */
  .piu { display: block; grid-column: 1 / -1; }

  .pocket { grid-template-columns: 1fr auto; }
  .pocket .e-nota { grid-column: 1 / 2; }

  /* La riga del giorno di paga: è un separatore, non una voce. */
  .paga {
    display: flex; gap: var(--space-3); grid-column: 1 / -1;
    margin: 6px 0; padding-top: 7px; border-top: 0.5px solid var(--separator);
    color: var(--color-green);
    font-size: var(--text-footnote); font-weight: var(--weight-semibold); letter-spacing: 0.6px;
  }
  .dopo .e-nome, .dopo .e-cifra { font-weight: var(--weight-regular); }

  /* --- fuori piano --- */
  .zero { font-family: var(--font-display); font-size: var(--text-title3); font-weight: var(--weight-semibold); color: var(--color-green); }
  .fp[data-tono="male"] .e-cifra { color: var(--color-red); }
</style>
