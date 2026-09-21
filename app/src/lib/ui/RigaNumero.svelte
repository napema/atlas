<!--
  RigaNumero — un numero da impostare, in una riga di lista. Salva quando
  lasci il campo (o premi Invio), non a ogni tasto: una pesata di «6» mentre
  scrivi «69» non deve finire nella serie dei pesi.
-->
<script lang="ts">
  let {
    etichetta,
    valore,
    unita,
    decimali = false,
    segnaposto = "",
    onsalva,
  }: {
    etichetta: string;
    valore: number | string | null | undefined;
    unita?: string;
    decimali?: boolean;
    segnaposto?: string;
    onsalva: (n: number) => void;
  } = $props();

  let campo: HTMLInputElement | undefined = $state();
  let ultimo = "";
  function salva() {
    if (!campo) return;
    const t = campo.value.trim();
    if (t === ultimo) return;
    ultimo = t;
    const n = Number(t.replace(",", "."));
    if (Number.isFinite(n)) onsalva(n);
  }
  $effect(() => { ultimo = valore == null ? "" : String(valore); });
</script>

<label class="riga-numero">
  <span class="etichetta">{etichetta}</span>
  <input
    bind:this={campo}
    type="text"
    inputmode={decimali ? "decimal" : "numeric"}
    value={valore ?? ""}
    placeholder={segnaposto}
    onblur={salva}
    onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); campo?.blur(); } }}
  />
  {#if unita}<span class="unita secondario">{unita}</span>{/if}
</label>

<style>
  .riga-numero { position: relative; display: flex; align-items: center; gap: var(--space-2); min-height: var(--list-row-height); padding: 0 var(--space-4); }
  :global(* + .riga-numero)::before { content: ""; position: absolute; top: 0; left: var(--space-4); right: 0; border-top: 0.5px solid var(--separator); }
  .etichetta { flex: 1; }
  input { width: 110px; text-align: right; font-size: 17px; background: none; outline: none; color: var(--accento); font-variant-numeric: tabular-nums; }
  input::placeholder { color: var(--label-tertiary); }
  .unita { flex: none; min-width: 28px; }
</style>
