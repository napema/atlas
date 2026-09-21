<!--
  Campo — un campo di testo dentro una lastra, con l'etichetta a sinistra
  come nei Contatti. 17px sempre: sotto, iOS zooma al focus e non torna
  indietro (CLAUDE.md, regola 9).
-->
<script lang="ts">
  let {
    etichetta,
    valore = $bindable(""),
    segnaposto,
    tipo = "text",
    modo,
    allinea = "sinistra",
    unita,
    autofocus = false,
    oninvio,
  }: {
    etichetta?: string;
    valore: string | number;
    segnaposto?: string;
    tipo?: "text" | "number" | "time" | "date" | "search";
    /** La tastiera: "decimal" per gli importi, "numeric" per i numeri interi. */
    modo?: "text" | "decimal" | "numeric" | "search";
    allinea?: "sinistra" | "destra";
    /** «kcal», «€», «min»: dopo il valore, in grigio. */
    unita?: string;
    autofocus?: boolean;
    oninvio?: () => void;
  } = $props();

  let campo: HTMLInputElement | undefined = $state();
  $effect(() => { if (autofocus) queueMicrotask(() => campo?.focus()); });
</script>

<label class="campo" class:con-etichetta={Boolean(etichetta)}>
  {#if etichetta}<span class="etichetta">{etichetta}</span>{/if}
  <input
    bind:this={campo}
    bind:value={valore}
    type={tipo}
    inputmode={modo}
    placeholder={segnaposto}
    class:destra={allinea === "destra"}
    enterkeyhint="done"
    autocomplete="off"
    onkeydown={(e) => { if (e.key === "Enter") { e.preventDefault(); oninvio?.(); } }}
  />
  {#if unita}<span class="unita secondario">{unita}</span>{/if}
</label>

<style>
  .campo {
    position: relative;
    display: flex; align-items: center; gap: var(--space-3);
    min-height: var(--list-row-height); padding: 0 var(--space-4);
  }
  :global(* + .campo)::before {
    content: ""; position: absolute; top: 0; right: 0; left: var(--space-4);
    border-top: 0.5px solid var(--separator);
  }
  .etichetta { flex: none; min-width: 96px; }
  input {
    flex: 1; min-width: 0; height: var(--list-row-height);
    font-size: 17px;
    background: none; outline: none;
    caret-color: var(--accento);
  }
  input::placeholder { color: var(--label-tertiary); }
  input.destra { text-align: right; }
  input[type="time"], input[type="date"] { -webkit-appearance: none; appearance: none; text-align: right; color: var(--accento); }
  input::-webkit-date-and-time-value { text-align: right; }
  .unita { flex: none; }
</style>
