<script lang="ts">
  import DaPortare from "$lib/ui/DaPortare.svelte";
  let { resto = [] }: { resto?: string[] } = $props();
</script>

<DaPortare titolo="Finanze" id="finanze" icona="finanze" />
