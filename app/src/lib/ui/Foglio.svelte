<!--
  Foglio — il foglio che sale dal basso, come in iOS.

  È un <dialog> vero, aperto con `showModal()`: il focus resta dentro, Esc
  lo chiude, il resto della pagina diventa inerte. E il sync lo riconosce —
  `interfacciaOccupata()` guarda `dialog[open]` — quindi non ridisegna
  sotto le dita mentre stai scrivendo (CLAUDE.md, regola 6).

  In testa: la X a sinistra, il titolo, la spunta a destra. È la testata dei
  fogli di iOS 27, e mette «annulla» e «fatto» nello stesso posto ovunque.
  Si chiude anche trascinandolo giù per la testata.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import Pulsante from "./Pulsante.svelte";

  let {
    aperto = $bindable(false),
    titolo,
    conferma,
    onchiuso,
    destra,
    children,
  }: {
    aperto: boolean;
    titolo?: string;
    /** La spunta in alto a destra. Senza, il foglio si chiude e basta. */
    conferma?: { fai: () => void | boolean | Promise<void | boolean>; disabilitata?: boolean; etichetta?: string };
    onchiuso?: () => void;
    /** Al posto della spunta: un'azione di testo («Modifica»). */
    destra?: Snippet;
    children: Snippet;
  } = $props();

  let dialogo: HTMLDialogElement | undefined = $state();
  let chiudendo = $state(false);
  let spinta = $state(0);          // di quanto è trascinato giù, in px

  $effect(() => {
    if (!dialogo) return;
    if (aperto && !dialogo.open) {
      chiudendo = false;
      spinta = 0;
      dialogo.showModal();
    } else if (!aperto && dialogo.open) {
      chiudi();
    }
  });

  /** Chiude con l'animazione: il dialogo se ne va DOPO essere sceso. */
  function chiudi() {
    if (!dialogo?.open || chiudendo) return;
    chiudendo = true;
    const fine = () => {
      dialogo?.close();
      chiudendo = false;
      spinta = 0;
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) fine();
    else setTimeout(fine, 280);
  }

  function suChiuso() {
    aperto = false;
    onchiuso?.();
  }

  async function confermaTocco() {
    if (!conferma || conferma.disabilitata) return;
    // `false` vuol dire «non chiudere»: un campo non valido, per esempio.
    const esito = await conferma.fai();
    if (esito !== false) aperto = false;
  }

  // Esc: il browser chiuderebbe di colpo. Lo intercettiamo per l'animazione.
  function suAnnulla(e: Event) {
    e.preventDefault();
    aperto = false;
  }

  // Tocco sul velo fuori dal foglio: chiude, come in iOS.
  function suClic(e: MouseEvent) {
    if (e.target === dialogo) aperto = false;
  }

  /* ---- trascinamento per chiudere ---- */
  let inizioY = 0, inizioT = 0, trascina = false;
  function giu(e: PointerEvent) {
    // Sui bottoni della testata niente cattura: si prenderebbe il tocco e
    // la X non chiuderebbe più.
    if ((e.target as Element).closest("button, a")) return;
    trascina = true; inizioY = e.clientY; inizioT = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function muovi(e: PointerEvent) {
    if (!trascina) return;
    const d = e.clientY - inizioY;
    // Verso l'alto resiste: un foglio non si stira oltre la sua altezza.
    spinta = d > 0 ? d : d / 6;
  }
  function su() {
    if (!trascina) return;
    trascina = false;
    const velocita = spinta / Math.max(1, performance.now() - inizioT);
    if (spinta > 120 || velocita > 0.6) aperto = false;
    else spinta = 0;
  }
</script>

<dialog
  bind:this={dialogo}
  class="foglio"
  class:chiudendo
  class:trascinato={spinta !== 0}
  style:--spinta="{spinta}px"
  aria-label={titolo}
  onclose={suChiuso}
  oncancel={suAnnulla}
  onclick={suClic}
>
  <div class="corpo-foglio">
    <div
      class="testa"
      onpointerdown={giu}
      onpointermove={muovi}
      onpointerup={su}
      onpointercancel={su}
      role="presentation"
    >
      <span class="maniglia" aria-hidden="true"></span>
      <div class="testa-riga">
        <Pulsante variante="vetro" misura="media" tondo icona="chiudi" etichetta="Chiudi" onclick={() => (aperto = false)} />
        <h2 class="text-headline">{titolo ?? ""}</h2>
        {#if destra}
          <span class="destra">{@render destra()}</span>
        {:else if conferma}
          <Pulsante
            variante="pieno" misura="media" tondo icona="spunta"
            etichetta={conferma.etichetta ?? "Fatto"}
            disabled={conferma.disabilitata}
            onclick={confermaTocco}
          />
        {:else}
          <span class="vuoto"></span>
        {/if}
      </div>
    </div>
    <div class="contenuto">
      {#if aperto || chiudendo}{@render children()}{/if}
    </div>
  </div>
</dialog>

<style>
  .foglio {
    /* dentro un foglio i gruppi salgono di un gradino */
    --bg-grouped-primary: var(--foglio-fondo);
    --bg-grouped-secondary: var(--foglio-lastra);

    position: fixed; inset: auto 0 0 0;
    width: 100%; max-width: 640px; max-height: calc(100dvh - env(safe-area-inset-top, 0px) - 10px);
    margin: 0 auto; padding: 0; border: 0;
    background: var(--foglio-fondo);
    color: var(--label-primary);
    border-radius: var(--radius-glass) var(--radius-glass) 0 0;
    box-shadow: var(--shadow-sheet);
    overflow: hidden;
    transform: translateY(var(--spinta, 0px));
    /* Solo `transform`. Con `display`/`overlay` in `allow-discrete` il
       dialogo restava visibile mezzo secondo DOPO `close()`, e in quel
       mezzo secondo la classe `chiudendo` era già caduta: il foglio
       risaliva da sotto — si vedeva spuntare la maniglia, un trattino — e
       spariva di colpo. La discesa la guidiamo noi, con il timeout in
       `chiudi()`: quelle due transizioni non servono, e mentivano. */
    transition: transform 0.42s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .foglio:not([open]) { display: none; }
  .foglio[open] { display: flex; }
  @starting-style { .foglio[open] { transform: translateY(100%); } }
  .foglio.chiudendo { transform: translateY(100%); transition-duration: 0.28s; }
  .foglio.trascinato { transition: none; }

  .foglio::backdrop {
    background: var(--dim);
    transition: opacity 0.3s ease;
  }
  @starting-style { .foglio[open]::backdrop { opacity: 0; } }
  .foglio.chiudendo::backdrop { opacity: 0; }

  .corpo-foglio { display: flex; flex-direction: column; width: 100%; min-height: 0; }

  .testa { flex: none; padding: 5px var(--space-4) var(--space-2); touch-action: none; cursor: grab; }
  .maniglia {
    display: block; width: 36px; height: 5px; margin: 0 auto 6px;
    border-radius: var(--radius-full); background: var(--label-tertiary);
  }
  .testa-riga { display: grid; grid-template-columns: minmax(44px, auto) 1fr minmax(44px, auto); align-items: center; gap: var(--space-2); }
  .testa-riga h2 { text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .vuoto { width: 44px; }
  .destra { display: flex; justify-content: flex-end; }

  .contenuto {
    flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
    padding: var(--space-2) var(--space-4) calc(env(safe-area-inset-bottom, 0px) + var(--space-6));
    display: flex; flex-direction: column; gap: var(--space-6);
  }
  /* In una colonna flex che scorre, i figli si restringono per starci — e
     quelli con uno scorrimento proprio (le pillole in riga) arrivano a
     zero. Nel foglio non si restringe niente: scorre il foglio. */
  .contenuto > :global(*) { flex-shrink: 0; }
</style>
