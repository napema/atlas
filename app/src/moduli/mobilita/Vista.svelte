<!--
  Mobilità — la pratica quotidiana: post-corsa, quotidiano, loaded.
  Il player si apre a schermo intero da qui, o da `#/mobilita/inizia` (la
  rotta su cui atterra la notifica della sera).
-->
<script lang="ts">
  import Pagina from "$lib/ui/Pagina.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import TitoloGruppo from "$lib/ui/TitoloGruppo.svelte";
  import Oggi from "./Oggi.svelte";
  import Progressi from "./Progressi.svelte";
  import Player from "./Player.svelte";
  import { getState } from "$condivisi/mobilita/ponte.js";
  import { tipoDelGiorno, oggiISO } from "$condivisi/mobilita/sessione.js";

  let { resto = [] }: { resto?: string[] } = $props();

  let vista = $state<"oggi" | "progressi">("oggi");
  let player = $state(false);
  let tipo = $state("quotidiano");

  const inizia = (t: string) => { tipo = t; player = true; };

  $effect(() => {
    if (resto[0] === "progressi") vista = "progressi";
    if (resto[0] === "inizia") {
      const s = getState();
      const gc = s.giornoCorrente?.data === oggiISO() ? s.giornoCorrente : null;
      queueMicrotask(() => inizia(gc?.forza || tipoDelGiorno(s, Boolean(gc?.haCorso))));
    }
  });

  /* NIENTE RIGA SOPRA IL TITOLO. Mobilità era l'unico modulo ad averla
     («Mercoledì 30 settembre · settimana 1»), e su iPhone il titolo partiva
     diciotto punti più in basso degli altri: passando da una scheda
     all'altra l'intestazione saltava. La data la dice già la home; la
     settimana del programma sta dove serve, nella testata di «Questa
     settimana». */
</script>

{#snippet strumenti()}
  <Segmenti opzioni={[{ id: "oggi", testo: "Oggi" }, { id: "progressi", testo: "Progressi" }]} bind:valore={vista} etichetta="Vista" />
{/snippet}

{#snippet riepilogo()}
  {#if vista === "oggi"}<Oggi parte="lato" oninizia={inizia} />{:else}<Progressi parte="lato" />{/if}
{/snippet}

<Pagina titolo="Mobilità" {strumenti} laterale={riepilogo}>
  {#snippet testata()}<TitoloGruppo id="mobilita" />{/snippet}

  {#if vista === "oggi"}
    <Oggi parte="resto" oninizia={inizia} />
  {:else}
    <Progressi parte="resto" />
  {/if}
</Pagina>

<Player bind:aperto={player} {tipo} />
