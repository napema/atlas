<!--
  I saldi dei pocket. Si compila una volta sola copiando da Revolut e da
  ING; da lì in poi i saldi li muovono i movimenti, e questo foglio serve a
  rimetterli in bolla quando ci si accorge di uno scostamento.
-->
<script lang="ts">
  import Foglio from "$lib/ui/Foglio.svelte";
  import Sezione from "$lib/ui/Sezione.svelte";
  import Campo from "$lib/ui/Campo.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import { avviso, centesimi, oggiISO } from "$lib/core/ui";
  import { stato, riancoraPocket, scriviMeta } from "$condivisi/finanze/dati.js";
  import { pocketConSaldi, deltaPocket } from "$condivisi/finanze/calcolo.js";
  import { testoDa } from "./comune";

  let { aperto = $bindable(false) }: { aperto: boolean } = $props();

  const NOTE: Record<string, string> = {
    principale: "Revolut · la settimana corrente. È l'unico conto da cui si spende.",
    cassa: "Revolut · le settimane future del mese. Parcheggio, non spendibile.",
    fisse: "Revolut · gli addebiti automatici. Non si tocca.",
    ing: "Il deposito. Riserva: alimenta gli altri, non si spende da qui.",
  };

  let pk = $state<{ id: string; nome: string; testo: string }[]>([]);
  let cassaSett = $state("");
  // Il saldo VERO, quello che si vede ovunque nell'app — non l'ancora.
  $effect(() => {
    if (!aperto) return;
    pk = (pocketConSaldi() as any[]).map((p) => ({ id: p.id, nome: p.nome, testo: testoDa(p.saldoVero || 0) }));
    cassaSett = testoDa(Number(stato().config?.cassaSettimanale) || 0);
  });

  function salva() {
    // NON si scrive un saldo: si riscrive l'ANCORA, con la data di oggi. Il
    // numero digitato è quanto c'è sul conto ADESSO; l'ancora vale quanto
    // c'era all'INIZIO di oggi. In mezzo ci sono le spese già segnate
    // stamattina, che il calcolo sottrae comunque: si toglie il delta prima
    // di scrivere, altrimenti verrebbero tolte due volte.
    const oggi = oggiISO();
    for (const p of pk) riancoraPocket(p.id, (centesimi(p.testo) ?? 0) - deltaPocket(p.id, oggi), oggi);
    const cs = centesimi(cassaSett) ?? 0;
    scriviMeta((s: any) => { s.config.cassaSettimanale = cs; });
    aperto = false;
    avviso("Saldi aggiornati.");
  }
</script>

<Foglio bind:aperto titolo="Saldi dei pocket" conferma={{ fai: salva, etichetta: "Salva i saldi" }}>
  <p class="text-subheadline secondario">Qui c'è quello che l'app crede di avere. Apri il conto e confronta: se combacia, non toccare niente. Se no, scrivi il numero che vedi adesso — alle spese già segnate oggi ci pensa l'app.</p>
  {#each pk as p (p.id)}
    <Sezione piede={NOTE[p.id] || ""}>
      <Campo etichetta={p.nome} bind:valore={p.testo} segnaposto="0,00" modo="decimal" allinea="destra" unita="€" />
    </Sezione>
  {/each}
  <Sezione titolo="Il travaso del lunedì" piede="Quanto passa dalla Cassa al Principale ogni lunedì. È il budget della settimana.">
    <Campo etichetta="Ogni lunedì" bind:valore={cassaSett} segnaposto="130,00" modo="decimal" allinea="destra" unita="€" />
  </Sezione>
  <Pulsante variante="pieno" larga onclick={salva}>Salva i saldi</Pulsante>
</Foglio>
