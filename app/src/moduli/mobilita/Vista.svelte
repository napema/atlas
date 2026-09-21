<script lang="ts">
  import DaPortare from "$lib/ui/DaPortare.svelte";
  let { resto = [] }: { resto?: string[] } = $props();
</script>

<DaPortare titolo="Mobilità" id="mobilita" icona="corpo" />
