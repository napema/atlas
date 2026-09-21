<!--
  Il simbolo di un'abitudine: un centinaio di emoji per argomento, più una
  casella per scriverne una qualsiasi — su iPhone apre la tastiera emoji di
  sistema, che resta il selettore migliore che esista.

  Le emoji Apple su Windows non si possono avere: il disegno sta dentro
  `Apple Color Emoji`, un font di sistema che non si può ridistribuire.
  Sono comunque gli stessi caratteri, e fra i due dispositivi restano
  identici: cambia solo come li disegna il sistema.
-->
<script lang="ts">
  let { valore = $bindable("⭐️") }: { valore: string } = $props();

  const EMOJI: Record<string, string[]> = {
    Salute: ["💊", "🩺", "🦷", "🧘", "😴", "🛌", "💧", "🥤", "🧴", "🧼", "🌡️", "🫀", "🧠", "👁️", "🦴"],
    Movimento: ["🏃", "🚴", "🏋️", "🤸", "🧗", "🏊", "⚽", "🎾", "🥊", "⛹️", "🚶", "🧎", "🤾", "🏸", "🛹"],
    Cibo: ["🥗", "🍎", "🥦", "🍳", "🥑", "🐟", "🍚", "🥜", "☕", "🍵", "🚫", "🍺", "🍫", "🧂", "🥛"],
    Mente: ["📖", "✍️", "📝", "🎧", "🎸", "🎹", "🎨", "🧩", "♟️", "🗣️", "🌍", "💭", "📚", "🔬", "💡"],
    Lavoro: ["💻", "📊", "📅", "✅", "📈", "🧾", "📮", "🗂️", "⏰", "🎯", "🚀", "🛠️", "🔑", "📌", "💼"],
    Casa: ["🧹", "🧺", "🪴", "🐕", "🐈", "🍽️", "🛒", "🔧", "🚗", "🗑️", "🛏️", "🚿", "🪟", "🧽", "📦"],
    Umore: ["⭐️", "🔥", "❤️", "🙏", "😌", "🌙", "☀️", "🌱", "🏆", "💎", "🎉", "🤝", "🕯️", "🧿", "✨"],
  };

  let libero = $state("");
  function scrivi() {
    const v = [...libero].slice(0, 2).join("");
    if (v) valore = v;
  }
</script>

<div class="scelta">
  {#each Object.entries(EMOJI) as [gruppo, elenco] (gruppo)}
    <p class="text-footnote secondario gruppo">{gruppo}</p>
    <div class="griglia">
      {#each elenco as e (e)}
        <button
          type="button"
          class="tasto emoji"
          class:scelto={e === valore}
          aria-label={e}
          aria-pressed={e === valore}
          onclick={() => { valore = e; libero = ""; }}
        >{e}</button>
      {/each}
    </div>
  {/each}
  <input
    class="libera emoji"
    type="text"
    maxlength="4"
    placeholder="o scrivine una"
    aria-label="Emoji personalizzata"
    bind:value={libero}
    oninput={scrivi}
  />
</div>

<style>
  .scelta { padding: var(--space-3) var(--space-4) var(--space-4); }
  .gruppo { margin: var(--space-2) 0 var(--space-1); }
  .griglia { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 2px; }
  .tasto {
    aspect-ratio: 1; display: grid; place-items: center; border-radius: 10px; font-size: 24px;
    transition: transform var(--duration-fast) var(--ease-spring), background-color var(--duration-fast);
  }
  .tasto:active { transform: scale(0.88); }
  .tasto.scelto { background: color-mix(in srgb, var(--accento) 22%, transparent); box-shadow: inset 0 0 0 2px var(--accento); }
  .libera {
    width: 100%; margin-top: var(--space-3); height: 44px; padding: 0 var(--space-4);
    border-radius: var(--radius-lg); background: var(--fill-tertiary); font-size: 17px; outline: none;
  }
</style>
