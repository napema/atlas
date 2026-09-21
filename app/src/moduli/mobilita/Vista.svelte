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
  import { dati } from "$lib/core/reattivo.svelte";
  import { maiuscola } from "$lib/core/ui";
  import { getState } from "$condivisi/mobilita/ponte.js";
  import { settimanaEffettiva, tipoDelGiorno, oggiISO } from "$condivisi/mobilita/sessione.js";

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

  const sopra = $derived.by(() => {
    dati.versione;
    const data = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    return `${maiuscola(data)} · settimana ${settimanaEffettiva(getState())}`;
  });
</script>

<Pagina titolo="Mobilità" {sopra}>
  {#snippet testata()}<TitoloGruppo id="mobilita" />{/snippet}

  <Segmenti opzioni={[{ id: "oggi", testo: "Oggi" }, { id: "progressi", testo: "Progressi" }]} bind:valore={vista} etichetta="Vista" />

  {#if vista === "oggi"}
    <Oggi oninizia={inizia} />
  {:else}
    <Progressi />
  {/if}
</Pagina>

<Player bind:aperto={player} {tipo} />
