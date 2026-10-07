<!--
  L'obiettivo: il traguardo, la data, il versamento per stipendio, gli
  extra previsti.

  Uno solo per volta, ed è voluto. Due obiettivi vogliono dire due
  versamenti che si fanno la guerra per lo stesso avanzo, e il risultato è
  che non si alimenta nessuno dei due — la stessa ragione per cui il
  vecchio budget «Risparmio» non ha mai prodotto un risparmio.

  `targetProvvisorio` esiste perché 3.500 € è una stima: se la cifra vera
  arriva diversa, il gap cambia e va cambiato senza che sembri un
  fallimento. Una stima dichiarata si corregge; un numero scritto come
  definitivo e poi mancato è una sconfitta.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import RigaNumero from "$lib/ui/RigaNumero.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso, euro, nuovoId, oggiISO, plurale, dataBreve } from "$lib/core/ui";
  import { scriviMeta, statoConfig } from "$condivisi/finanze/dati.js";
  import { ultimoStipendio } from "$condivisi/finanze/calcolo.js";
  import { statoObiettivo, obiettivo } from "$condivisi/finanze/piano.js";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  const d = $derived.by(() => {
    dati.versione;
    const iso = oggiISO();
    return {
      iso,
      o: obiettivo(),
      s: statoObiettivo(iso),
      cfg: statoConfig(ultimoStipendio(iso)),
    };
  });

  /* LE MODIFICHE PASSANO DAL BLOCCO. Un obiettivo che si può abbassare nel
     momento in cui sei indietro non è un obiettivo: è un campo di testo che
     registra quello che è successo. Fuori dalle 48 ore dopo lo stipendio
     serve uno sblocco con un motivo scritto. */
  const scrivi = (fn: (o: any) => void) => {
    if (d.cfg.bloccata) { avviso("Configurazione bloccata.", { tipo: "errore" }); return; }
    scriviMeta((s: any) => {
      s.config.obiettivo = { ...(s.config.obiettivo || {}) };
      fn(s.config.obiettivo);
    });
  };

  let nomeExtra = $state("");
  let impExtra = $state(0);
  let quandoExtra = $state("");
</script>

<Foglio bind:aperto titolo="Obiettivo">
  {#if d.s}
    <div class="testa">
      <span class="cifre grande">{euro(d.s.saldo, { tondo: true })}</span>
      <span class="text-subheadline secondario cifre">
        di {euro(d.s.target, { tondo: true })} entro il {dataBreve(d.s.data)}
      </span>
      <span class="text-footnote cifre" class:ok={d.s.inLinea} class:avviso={!d.s.inLinea}>
        {d.s.inLinea ? "in linea" : `indietro di ${euro(-d.s.scarto, { tondo: true })}`}
        · previsto a oggi {euro(d.s.previsto, { tondo: true })}
      </span>
    </div>

    <Sezione titolo="Dove arriva" piede="Proiezione: quello che c'è più i versamenti programmati fino alla data, più gli extra previsti.">
      <Riga titolo="Versamenti rimasti" sottotitolo="{plurale(d.s.versamenti, 'stipendio', 'stipendi')} × {euro(d.s.versamento, { tondo: true })}" valore={euro(d.s.daiVersamenti, { tondo: true })} />
      <Riga titolo="Extra previsti" valore={euro(d.s.daiExtra, { tondo: true })} />
      <Riga titolo="Proiezione" valore={euro(d.s.proiezione, { tondo: true })} />
      <Riga titolo={d.s.gap > 0 ? "Mancano" : "Avanza"} valore={euro(Math.abs(d.s.target - d.s.proiezione), { tondo: true })} />
    </Sezione>
  {/if}

  {#if d.cfg.bloccata}
    <!-- Non si sblocca da qui: il motivo si scrive una volta, in
         Impostazioni, e vale per tutta la configurazione. -->
    <Riga titolo="Configurazione bloccata" sottotitolo="Si modifica nelle 48 ore dopo lo stipendio, oppure con uno sblocco motivato."
      accento freccia onclick={() => { aperto = false; location.hash = "#/impostazioni/finanze"; }} />
  {/if}

  <Sezione titolo="Il traguardo">
    <Riga titolo="Nome">
      {#snippet fine()}
        <input class="dentro" type="text" value={d.o?.nome ?? ""} aria-label="Nome dell'obiettivo"
          onchange={(e) => scrivi((o) => { o.nome = e.currentTarget.value.trim() || "Obiettivo"; })} />
      {/snippet}
    </Riga>
    <RigaNumero etichetta="Target" valore={(d.o?.target ?? 0) / 100} decimali unita="€"
      onsalva={(n) => scrivi((o) => { o.target = Math.max(0, Math.round(n * 100)); })} />
    <Riga titolo="Il target è una stima" sottotitolo="Dichiararla stima è ciò che permette di correggerla senza che sembri un fallimento.">
      {#snippet fine()}
        <Interruttore acceso={Boolean(d.o?.provvisorio)} oncambio={(v) => scrivi((o) => { o.provvisorio = v; })} etichetta="Stima" />
      {/snippet}
    </Riga>
    <Riga titolo="Entro il">
      {#snippet fine()}
        <input class="dentro" type="date" value={d.o?.data ?? ""} aria-label="Data obiettivo"
          onchange={(e) => { const v = e.currentTarget.value; if (v) scrivi((o) => { o.data = v; }); }} />
      {/snippet}
    </Riga>
    <RigaNumero etichetta="Versamento per stipendio" valore={(d.o?.versamento ?? 0) / 100} decimali unita="€"
      onsalva={(n) => scrivi((o) => { o.versamento = Math.max(0, Math.round(n * 100)); })} />
  </Sezione>

  <Sezione titolo="Extra previsti" piede="Entrate una tantum che finiscono nel fondo: la tredicesima, un rimborso. Entrano nella proiezione, non nel «previsto a oggi».">
    {#each (d.o?.extra ?? []) as x (x.id)}
      <Riga titolo={x.nome} sottotitolo="{x.quando}{x.stimato ? ' · stima' : ''}" valore={euro(x.imp, { tondo: true })}>
        {#snippet fine()}
          <button type="button" class="via" aria-label="Togli" onclick={() => scrivi((o) => { o.extra = (o.extra || []).filter((y: any) => y.id !== x.id); })}>×</button>
        {/snippet}
      </Riga>
    {/each}

    <div class="aggiungi">
      <input type="text" bind:value={nomeExtra} placeholder="Nome" aria-label="Nome dell'extra" />
      <input type="number" bind:value={impExtra} placeholder="€" aria-label="Importo in euro" />
      <input type="month" bind:value={quandoExtra} aria-label="Mese" />
      <Pulsante variante="tinto" misura="piccola" disabled={!nomeExtra.trim() || !impExtra || !quandoExtra}
        onclick={() => {
          scrivi((o) => {
            o.extra = [...(o.extra || []), {
              id: nuovoId("x"), nome: nomeExtra.trim(),
              imp: Math.round(Number(impExtra) * 100), quando: quandoExtra, stimato: true,
            }];
          });
          nomeExtra = ""; impExtra = 0; quandoExtra = "";
        }}>Aggiungi</Pulsante>
    </div>
  </Sezione>
</Foglio>

<style>
  .testa { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: var(--space-2) 0 var(--space-4); text-align: center; }
  .grande { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: var(--weight-bold); }
  .ok { color: var(--color-green); }
  .avviso { color: var(--color-orange); }
  .via { width: 28px; height: 28px; border-radius: 50%; color: var(--label-tertiary); background: var(--fill-quaternary); font-size: 17px; line-height: 1; }
  .aggiungi { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-top: 0.5px solid var(--separator); }
  /* 17px: sotto, iOS zooma al focus e non torna indietro. */
  .aggiungi input { font-size: 17px; padding: 6px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--label-primary); min-width: 0; }
  .aggiungi input[type="number"] { grid-column: 1; width: 100%; }
  /* 17px anche qui, per la stessa ragione. */
  .dentro { font-size: 17px; padding: 4px 8px; border-radius: var(--radius-sm); background: var(--fill-tertiary); outline: none; color: var(--accento); text-align: right; max-width: 190px; }
</style>
