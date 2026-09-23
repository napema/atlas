<!--
  Il corpo: due figure, fronte e retro, con i gruppi muscolari accesi.

  Non è un disegno anatomico ed è voluto. È fatto di forme semplici — la
  stessa grammatica delle icone — perché deve reggere a 120px dentro una
  lastra e restare leggibile: un'anatomia vera, rimpicciolita, diventa una
  macchia. Quello che serve capire è UNA cosa: stasera dove arriva il
  lavoro. Per quello bastano le sagome, purché stiano al loro posto.

  I primari sono pieni e accesi, i secondari a metà: un rematore prende i
  bicipiti, ma chiamarlo un giorno di braccia sarebbe falso.
-->
<script lang="ts">
  let {
    primari = [],
    secondari = [],
    altezza = 220,
    evidenzia = null,
  }: {
    primari?: string[];
    secondari?: string[];
    altezza?: number;
    /** Un gruppo da far pulsare: quello dell'esercizio che stai guardando. */
    evidenzia?: string | null;
  } = $props();

  const stato = (g: string) =>
    evidenzia === g ? "punta" : primari.includes(g) ? "primario" : secondari.includes(g) ? "secondario" : "spento";
</script>

<svg class="corpo" viewBox="0 0 440 460" height={altezza} role="img"
     aria-label="Corpo umano: {primari.length ? primari.join(', ') : 'nessun gruppo'} in evidenza">
  {#snippet sagoma(dx: number)}
    <g class="pelle" transform="translate({dx} 0)">
      <ellipse cx="100" cy="38" rx="20" ry="25" />
      <rect x="89" y="56" width="22" height="26" rx="9" />
      <!-- il tronco: spalle larghe, vita stretta, bacino -->
      <path d="M52 96q0-14 14-16l14-3q20-4 40 0l14 3q14 2 14 16l-4 62q-2 26-6 44l-4 26q-1 8-10 8H72q-9 0-10-8l-4-26q-4-18-6-44z" />
      <!-- braccia: omero, avambraccio, mano -->
      <rect x="30" y="92" width="27" height="92" rx="13" transform="rotate(7 43 138)" />
      <rect x="26" y="176" width="23" height="82" rx="11" transform="rotate(9 37 217)" />
      <circle cx="33" cy="268" r="12" />
      <rect x="143" y="92" width="27" height="92" rx="13" transform="rotate(-7 157 138)" />
      <rect x="151" y="176" width="23" height="82" rx="11" transform="rotate(-9 163 217)" />
      <circle cx="167" cy="268" r="12" />
      <!-- gambe: coscia, polpaccio, piede -->
      <rect x="56" y="222" width="42" height="130" rx="20" />
      <rect x="102" y="222" width="42" height="130" rx="20" />
      <rect x="62" y="338" width="32" height="104" rx="15" />
      <rect x="106" y="338" width="32" height="104" rx="15" />
      <rect x="58" y="432" width="36" height="16" rx="7" />
      <rect x="106" y="432" width="36" height="16" rx="7" />
    </g>
  {/snippet}

  {@render sagoma(0)}
  {@render sagoma(220)}

  <!-- ---------------------------------------------------------- FRONTE -->
  <g class="muscoli">
    <g data-stato={stato("spalle")}>
      <ellipse cx="57" cy="104" rx="17" ry="16" /><ellipse cx="143" cy="104" rx="17" ry="16" />
    </g>
    <g data-stato={stato("petto")}>
      <path d="M73 96q14-5 24-3v34q0 5-6 6l-16 2q-8 1-9-7l-2-22q-1-8 9-10z" />
      <path d="M127 96q-14-5-24-3v34q0 5 6 6l16 2q8 1 9-7l2-22q1-8-9-10z" />
    </g>
    <g data-stato={stato("bicipiti")}>
      <ellipse cx="45" cy="134" rx="12" ry="27" transform="rotate(7 45 134)" />
      <ellipse cx="155" cy="134" rx="12" ry="27" transform="rotate(-7 155 134)" />
    </g>
    <g data-stato={stato("avambracci")}>
      <ellipse cx="36" cy="208" rx="10" ry="30" transform="rotate(9 36 208)" />
      <ellipse cx="164" cy="208" rx="10" ry="30" transform="rotate(-9 164 208)" />
    </g>
    <g data-stato={stato("addome")}>
      <rect x="87" y="140" width="26" height="72" rx="9" />
    </g>
    <g data-stato={stato("obliqui")}>
      <path d="M78 146q8 2 8 12v48q0 10-9 6l-5-2q-5-2-6-10l-2-38q-1-14 6-15z" />
      <path d="M122 146q-8 2-8 12v48q0 10 9 6l5-2q5-2 6-10l2-38q1-14-6-15z" />
    </g>
    <g data-stato={stato("quadricipiti")}>
      <ellipse cx="76" cy="272" rx="18" ry="50" /><ellipse cx="124" cy="272" rx="18" ry="50" />
    </g>
    <g data-stato={stato("adduttori")}>
      <ellipse cx="93" cy="262" rx="7" ry="38" /><ellipse cx="107" cy="262" rx="7" ry="38" />
    </g>
    <g data-stato={stato("tibiali")}>
      <ellipse cx="82" cy="382" rx="8" ry="34" /><ellipse cx="118" cy="382" rx="8" ry="34" />
    </g>
  </g>

  <!-- ----------------------------------------------------------- RETRO -->
  <g class="muscoli" transform="translate(220 0)">
    <g data-stato={stato("trapezio")}>
      <path d="M100 78q22 2 44 20l-8 16q-16-8-36-8t-36 8l-8-16q22-18 44-20z" />
      <path d="M100 106q14 0 22 6l-22 52-22-52q8-6 22-6z" />
    </g>
    <g data-stato={stato("deltoidiPost")}>
      <ellipse cx="57" cy="106" rx="16" ry="15" /><ellipse cx="143" cy="106" rx="16" ry="15" />
    </g>
    <g data-stato={stato("dorsali")}>
      <path d="M69 118q14 4 27 22l2 44q0 8-8 5l-16-6q-8-3-10-12l-4-40q-1-14 9-13z" />
      <path d="M131 118q-14 4-27 22l-2 44q0 8 8 5l16-6q8-3 10-12l4-40q1-14-9-13z" />
    </g>
    <g data-stato={stato("tricipiti")}>
      <ellipse cx="45" cy="134" rx="12" ry="27" transform="rotate(7 45 134)" />
      <ellipse cx="155" cy="134" rx="12" ry="27" transform="rotate(-7 155 134)" />
    </g>
    <g data-stato={stato("lombari")}>
      <rect x="88" y="178" width="11" height="38" rx="5" /><rect x="101" y="178" width="11" height="38" rx="5" />
    </g>
    <g data-stato={stato("glutei")}>
      <path d="M99 218v34q0 14-13 16l-12 2q-14 2-16-12l-1-16q-2-20 16-24z" />
      <path d="M101 218v34q0 14 13 16l12 2q14 2 16-12l1-16q2-20-16-24z" />
    </g>
    <g data-stato={stato("femorali")}>
      <ellipse cx="76" cy="288" rx="18" ry="46" /><ellipse cx="124" cy="288" rx="18" ry="46" />
    </g>
    <g data-stato={stato("polpacci")}>
      <ellipse cx="78" cy="378" rx="13" ry="34" /><ellipse cx="122" cy="378" rx="13" ry="34" />
    </g>
  </g>

  <text class="etichetta" x="100" y="456" text-anchor="middle">FRONTE</text>
  <text class="etichetta" x="320" y="456" text-anchor="middle">RETRO</text>
</svg>

<style>
  .corpo { display: block; width: 100%; height: auto; max-width: 100%; overflow: visible; }

  .pelle { fill: var(--fill-secondary); }

  /* Un gruppo spento non sparisce: resta la sua ombra sulla pelle, così si
     vede che c'è ed è a riposo. Sparire vorrebbe dire «non esiste». */
  .muscoli g { transition: fill var(--duration-fast) var(--ease-default), opacity var(--duration-fast) var(--ease-default); }
  .muscoli g[data-stato="spento"]     { fill: var(--fill-tertiary); opacity: 0.55; }
  .muscoli g[data-stato="secondario"] { fill: color-mix(in srgb, var(--accento) 42%, transparent); }
  .muscoli g[data-stato="primario"]   { fill: var(--accento); }
  /* Quello che stai guardando è acceso davvero: colore pieno e alone. */
  .muscoli g[data-stato="punta"] {
    fill: var(--accento);
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accento) 80%, transparent));
  }

  .etichetta {
    fill: var(--label-tertiary);
    font-size: 11px; font-weight: var(--weight-semibold); letter-spacing: 0.6px;
  }
</style>
