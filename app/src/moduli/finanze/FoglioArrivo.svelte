<!--
  Una spesa in arrivo, che non è ancora un movimento.

  «Paga» vuol dire una cosa sola: è uscita davvero, adesso. Registra il
  movimento e toglie la voce dall'elenco. L'importo si corregge prima di
  confermare: le stime sbagliano, ed è l'unico momento in cui si conosce il
  numero vero.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Icona from "$lib/ui/Icona.svelte";
  import Importo from "$lib/ui/Importo.svelte";
  import { avviso, celebra, centesimi, dataUmana, euro, maiuscola, nuovoId, oggiISO } from "$lib/core/ui";
  import { categoriaPerId, salvaMovimento, segnaPrevistoPagato, segnaScadenzaPagata } from "$condivisi/finanze/dati.js";
  import { coperturaDi } from "$condivisi/finanze/calcolo.js";
  import { nomePocket, testoDa, etichettaCadenza } from "./comune";

  let { aperto = $bindable(false), voce }: { aperto: boolean; voce: any } = $props();

  let testo = $state("");
  $effect(() => { if (aperto) testo = testoDa(voce?.importo || 0); });

  const imp = $derived(centesimi(testo) ?? 0);
  const cop = $derived(voce ? coperturaDi({ ...voce, importo: imp || voce.importo }) : null);
  const quando = $derived(!voce ? "" : voce.fra === 0 ? "oggi" : voce.fra === 1 ? "domani" : voce.fra < 0 ? `${Math.abs(voce.fra)} giorni fa` : `fra ${voce.fra} giorni`);

  /** Il movimento vero + la voce che sparisce. Le due cose insieme, sempre. */
  function paga() {
    if (!imp) { avviso("Serve un importo.", { tipo: "errore" }); return; }
    const oggi = oggiISO();
    /* `pian` È IL LEGAME CON LA SCADENZA, e non è decorazione: senza, una
       rata pagata il giorno giusto pesava sulla settimana come una pizza
       decisa stasera. La scheda «Da spendere» conta solo le decisioni del
       giorno, e questo campo è il solo modo che ha di distinguerle. */
    salvaMovimento({
      id: nuovoId("m"), data: oggi, tipo: "out", imp,
      nota: voce.nome, cat: voce.cat || "fisse", sub: null,
      pocket: voce.pocket || "principale", ecc: false,
      pian: voce.id,
    });
    if (voce.origine === "previsto") segnaPrevistoPagato(voce.id, oggi);
    else segnaScadenzaPagata(voce.id, voce.quando);
    aperto = false;
    celebra(voce.nome.length <= 22 ? voce.nome : "Pagato");
  }

  /* LA SECONDA VIA: segnare senza registrare. Una spunta persa in una
     fusione fa ricomparire una scadenza il cui movimento è già in archivio,
     e ripagarla dall'unico pulsante disponibile vorrebbe dire contare la
     stessa uscita due volte. Sta in basso, con l'aria di una riparazione. */
  function giaPagata() {
    if (voce.origine === "previsto") segnaPrevistoPagato(voce.id, voce.quando);
    else segnaScadenzaPagata(voce.id, voce.quando);
    aperto = false;
    avviso("Segnata come pagata. Nessun movimento aggiunto.");
  }
</script>

<Foglio bind:aperto titolo={voce?.nome ?? ""}>
  {#if voce && cop}
    <div class="testa">
      <Importo centesimi={voce.importo} misura={44} />
      <span class="text-subheadline secondario">{maiuscola(dataUmana(voce.quando))} · {quando}</span>
    </div>

    <Sezione>
      <Riga titolo="Esce da" valore={nomePocket(voce.pocket)} />
      <Riga titolo="Tipo" valore={voce.origine === "previsto" ? "Una tantum" : etichettaCadenza(voce)} />
      {#if voce.cat}<Riga titolo="Categoria" valore={categoriaPerId(voce.cat)?.nome || voce.cat} />{/if}
      {#if voce.stimato}<Riga titolo="Importo" valore="stimato" />{/if}
      {#if voce.nota}<Riga titolo="Nota" valore={voce.nota} />{/if}
    </Sezione>

    <!-- La domanda vera davanti a una scadenza non è quanto costa: è se i
         soldi ci sono nel posto da cui deve uscire. -->
    <div class="copertura" class:male={!cop.coperto}>
      <Icona nome={cop.coperto ? "fatto" : "allarme"} misura={22} tratto={1.9} />
      <div>
        <span class="text-headline">{cop.coperto ? "I soldi ci sono" : `Mancano ${euro(cop.manca, { tondo: true })}`}</span>
        <span class="text-footnote secondario">{nomePocket(cop.pocket)}: {euro(cop.saldo)} disponibili</span>
      </div>
    </div>

    <Sezione piede="Già scritto quello previsto. Correggilo se la cifra vera è un'altra.">
      <Campo etichetta="Pagato" bind:valore={testo} modo="decimal" allinea="destra" unita="€" />
    </Sezione>

    <Pulsante variante="pieno" larga onclick={paga}>Paga</Pulsante>
    <p class="text-footnote secondario spiega">
      Registra il movimento di oggi e toglie la voce da «In arrivo». {voce.origine === "previsto" ? "Il pagamento previsto non torna più." : "Il ricorrente resta, e riparte dalla prossima scadenza."}
    </p>

    <div class="riparazione">
      <Pulsante variante="testo" larga onclick={giaPagata}>Era già pagata, non registrare niente</Pulsante>
      <p class="text-footnote secondario spiega">Toglie la voce e basta: il saldo non si muove. Da usare quando il movimento c'è già in archivio.</p>
    </div>
  {/if}
</Foglio>

<style>
  .testa { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: var(--space-2) 0; }
  .copertura { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-xxl); color: var(--color-green); background: color-mix(in srgb, var(--color-green) 12%, transparent); }
  .copertura.male { color: var(--color-red); background: color-mix(in srgb, var(--color-red) 12%, transparent); }
  .copertura div { display: flex; flex-direction: column; color: var(--label-primary); }
  .spiega { padding: 0 var(--space-4); margin-top: calc(-1 * var(--space-4)); }
  .riparazione { margin-top: var(--space-4); padding-top: var(--space-4); border-top: 0.5px solid var(--separator); display: flex; flex-direction: column; gap: var(--space-6); }
</style>
