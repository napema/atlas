<!--
  DaPortare — il posto di una schermata che la app nuova non ha ancora.
  Non un vicolo: porta alla stessa schermata nella app di prima, che resta
  viva finché questa non è finita (CLAUDE.md, §1).
-->
<script lang="ts">
  import Pagina from "./Pagina.svelte";
  import Vuoto from "./Vuoto.svelte";
  import Pulsante from "./Pulsante.svelte";

  let { titolo, id, icona }: { titolo: string; id: string; icona: string } = $props();
</script>

<Pagina {titolo}>
  <Vuoto {icona} titolo="In arrivo" testo="Questa schermata non è ancora nella versione nuova. Intanto funziona in quella di prima, con gli stessi dati.">
    <Pulsante variante="tinto" misura="media" href="../#/{id}">Apri {titolo}</Pulsante>
  </Vuoto>
</Pagina>
