<!--
  Interruttore — lo switch di iOS 27, largo 64. Acceso prende il colore del
  modulo e non il verde di sistema: in ATLAS il verde vuol dire «fatto» e
  basta (CLAUDE.md, regola 7), e un'impostazione accesa non è una cosa fatta.
-->
<script lang="ts">
  let {
    acceso = $bindable(false),
    etichetta,
    disabled = false,
    oncambio,
  }: {
    acceso: boolean;
    etichetta?: string;
    disabled?: boolean;
    oncambio?: (v: boolean) => void;
  } = $props();
</script>

<button
  type="button"
  role="switch"
  class="interruttore"
  class:acceso
  aria-checked={acceso}
  aria-label={etichetta}
  {disabled}
  onclick={() => { acceso = !acceso; oncambio?.(acceso); }}
><span class="manopola"></span></button>

<style>
  .interruttore {
    position: relative; flex: none;
    width: 64px; height: 28px;
    border-radius: var(--radius-full);
    background: var(--fill-primary);
    transition: background-color var(--duration-normal) var(--ease-default);
  }
  .interruttore.acceso { background: var(--accento, var(--color-blue)); }
  .interruttore:disabled { opacity: 0.4; }
  .manopola {
    position: absolute; top: 2px; left: 2px;
    width: 38px; height: 24px;
    border-radius: var(--radius-full);
    background: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06);
    transition: transform var(--duration-normal) var(--ease-spring);
  }
  .acceso .manopola { transform: translateX(22px); }
  .interruttore:active .manopola { width: 44px; }
  .acceso:active .manopola { transform: translateX(16px); }
</style>
