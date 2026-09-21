<!-- Un'icona del set di ATLAS. Eredita il colore del testo intorno. -->
<script lang="ts">
  import { icona } from "$lib/core/icone";

  let { nome, misura = 24, tratto = 1.7 }: { nome: string; misura?: number; tratto?: number } = $props();
</script>

<span class="icona" aria-hidden="true">{@html icona(nome, misura, tratto)}</span>

<style>
  .icona { display: inline-flex; flex: none; line-height: 0; }
</style>
