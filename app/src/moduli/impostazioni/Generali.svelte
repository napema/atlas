<!--
  Le pagine di ATLAS stesso: aspetto, sincronizzazione, notifiche, spazio e
  dati, diagnostica. Una sola per volta, scelta da `pagina`.
-->
<script lang="ts">
  import Sezione from "$lib/ui/Sezione.svelte";
  import Riga from "$lib/ui/Riga.svelte";
  import Segmenti from "$lib/ui/Segmenti.svelte";
  import Pulsante from "$lib/ui/Pulsante.svelte";
  import Interruttore from "$lib/ui/Interruttore.svelte";
  import { dati } from "$lib/core/reattivo.svelte";
  import { avviso } from "$lib/core/ui";
  import { statoSync } from "$lib/core/statoSync.svelte";
  import { canaliAperti, sincronizzaTutto, verificaAccesso, recapito } from "$lib/core/sync";
  import { leggiToken, scriviToken, dimenticaToken, tokenPresente, sembraUnToken } from "$lib/core/credenziali";
  import { esportaTutto, caselleAperte } from "$lib/core/storage";
  import { spazio, chiediPersistenza } from "$lib/core/blobs";
  import { ultimiEventi, chiAscolta } from "$lib/core/bus";
  import { fattiDelGiorno, giornoCorrente } from "$lib/core/contesto";
  import * as notifiche from "$lib/core/notifiche";

  let { pagina }: { pagina: "aspetto" | "sync" | "notifiche" | "dati" | "diagnostica" } = $props();

  /* ---------------------------------------------------------- aspetto -- */
  let tema = $state<"auto" | "chiaro" | "scuro">(((): any => { try { return localStorage.getItem("atlas.tema") || "auto"; } catch { return "auto"; } })());
  function cambiaTema(v: string) {
    try {
      if (v === "auto") { localStorage.removeItem("atlas.tema"); document.documentElement.dataset.tema = "auto"; }
      else { localStorage.setItem("atlas.tema", v); document.documentElement.dataset.tema = v; }
    } catch { /* privata: vale fino alla chiusura */ }
  }

  /* ------------------------------------------------------------- sync --
     Il token si incolla QUI, e si verifica PRIMA di dichiararlo buono: un
     token che GitHub rifiuta non resta salvato. Uno rotto nella casella è
     peggio di nessuno — i canali bussano ogni venti secondi, prendono 401, e
     la schermata si riempie di errori che non dicono cosa fare. */
  let bozza = $state(leggiToken());
  let esito = $state<{ ok: boolean; testo: string } | null>(null);
  let verifico = $state(false);
  const canali = $derived.by(() => { dati.versione; statoSync.stato; return canaliAperti(); });
  const r = recapito();
  const ETICHETTE: Record<string, string> = { ok: "sincronizzato", corso: "in corso…", err: "errore", off: "non configurato", inattivo: "in attesa" };

  async function verificaESalva() {
    if (!sembraUnToken(bozza)) { esito = { ok: false, testo: "Non ha la forma di un token GitHub: deve cominciare per github_pat_ o ghp_." }; return; }
    verifico = true;
    const prima = leggiToken();
    scriviToken(bozza);
    const r2 = await verificaAccesso();
    if (!r2.ok) scriviToken(prima);
    esito = { ok: r2.ok, testo: r2.motivo };
    verifico = false;
    if (r2.ok) avviso("Token salvato su questo dispositivo.");
  }

  /* -------------------------------------------------------- notifiche -- */
  let n = $state<{ perm: string; attive: boolean; esito?: any; altri: number } | null>(null);
  const orari = $derived.by(() => { dati.versione; return notifiche.stato().orari; });
  async function leggiNotifiche() {
    const perm = notifiche.permesso();
    const attive = await notifiche.iscritto();
    let es = null, altri = 0;
    if (attive) {
      /* NON BASTA DIRE «ISCRITTO»: si riallinea prima, e la riga dice se il
         server conosce QUESTO telefono. Prima diceva «iscritto» anche quando
         il server ne conosceva un'altra, morta. */
      es = await notifiche.riallinea();
      const mio = await notifiche.idQuestoDispositivo();
      altri = notifiche.stato().subs.filter((x) => !x.del && x.id !== mio).length;
    }
    n = { perm, attive, esito: es, altri };
  }
  $effect(() => { if (pagina === "notifiche") leggiNotifiche(); });

  async function attiva() {
    const r3 = await notifiche.iscrivi();
    avviso(r3.ok ? "Dispositivo iscritto." : r3.motivo || "Non riuscito.", { tipo: r3.ok ? "info" : "errore", durata: r3.ok ? 2400 : 5000 });
    leggiNotifiche();
  }
  const orario = (modulo: string, k: string, v: string) => { notifiche.scriviOrari(modulo, { [k]: v }); avviso("Orario salvato."); };

  /* ------------------------------------------------------------- dati -- */
  let occupato = $state<{ usati: number; totali: number } | null>(null);
  $effect(() => { if (pagina === "dati") spazio().then((s) => (occupato = s)); });
  const mb = (x: number) => `${(x / 1048576).toFixed(1)} MB`;

  function esporta() {
    const testo = JSON.stringify(esportaTutto(), null, 2);
    const url = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `atlas-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function svuotaCache() {
    avviso("Svuoto la cache…");
    try {
      for (const reg of await navigator.serviceWorker.getRegistrations()) {
        if (reg.scope === new URL("./", location.href).href) await reg.unregister();
      }
      for (const k of await caches.keys()) if (k.startsWith("atlas2-")) await caches.delete(k);
    } catch { /* niente */ }
    location.reload();
  }

  /* ------------------------------------------------------ diagnostica -- */
  const diag = $derived.by(() => {
    dati.versione;
    const fatti = fattiDelGiorno() as Record<string, Record<string, unknown>>;
    return {
      fatti: Object.entries(fatti).flatMap(([m, ch]) => Object.entries(ch).map(([k, v]) => ({ m, k, v: JSON.stringify(v) }))),
      ascolti: Object.entries(chiAscolta()),
      eventi: ultimiEventi().slice(0, 10),
      caselle: caselleAperte().map((id) => ({ id, kb: ((localStorage.getItem(`atlas.${id}.v1`) || "").length / 1024).toFixed(1) })),
    };
  });
</script>

{#if pagina === "aspetto"}
  <Sezione piede="«Sistema» segue l'impostazione del telefono, e cambia da sola al tramonto se l'hai attivata lì.">
    <div class="blocco">
      <Segmenti opzioni={[{ id: "auto", testo: "Sistema" }, { id: "chiaro", testo: "Chiaro" }, { id: "scuro", testo: "Scuro" }]} bind:valore={tema} onscelta={cambiaTema} etichetta="Tema" />
    </div>
  </Sezione>

{:else if pagina === "sync"}
  {#if statoSync.stato !== "off"}
    <Sezione titolo="Canali" piede="Un file per modulo nello stesso repo privato: due moduli salvati insieme non si annullano.">
      {#each canali as c (c.id)}
        <Riga titolo={c.id} sottotitolo={c.stato === "err" ? c.messaggio : null}>
          {#snippet fine()}<span class="text-subheadline" class:ok={c.stato === "ok"} class:male={c.stato === "err"}>{ETICHETTE[c.stato] || c.stato}{c.ultimo ? ` · ${c.ultimo}` : ""}</span>{/snippet}
        </Riga>
      {:else}
        <Riga><span class="secondario">Nessun canale aperto.</span></Riga>
      {/each}
      <Riga titolo="Sincronizza adesso" accento onclick={() => { sincronizzaTutto(); avviso("Giro di sincronizzazione avviato."); }} />
    </Sezione>
  {:else}
    <p class="text-subheadline secondario">Non attiva: i dati restano su questo dispositivo. Incolla qui sotto il token e riparte.</p>
  {/if}

  <Sezione titolo="Token di accesso" piede="Su github.com/settings/personal-access-tokens: token fine-grained, solo il repo {r.owner}/{r.repo}, permesso «Contents: Read and write». Resta solo su questo dispositivo: non viene mai sincronizzato né incluso nel backup.">
    <label class="token">
      <input type="password" bind:value={bozza} placeholder="github_pat_…" autocomplete="off" aria-label="Token di accesso" />
    </label>
  </Sezione>
  {#if esito}<p class="text-subheadline" class:ok={esito.ok} class:male={!esito.ok}>{esito.testo}</p>{/if}
  <Pulsante variante="pieno" larga disabled={verifico || !bozza} onclick={verificaESalva}>{verifico ? "Verifico…" : "Verifica e salva"}</Pulsante>
  {#if tokenPresente()}
    <Pulsante variante="tinto" distruttivo larga onclick={() => { dimenticaToken(); bozza = ""; avviso("Token rimosso. I dati locali restano, il sync si ferma."); }}>Dimentica il token su questo dispositivo</Pulsante>
  {/if}

{:else if pagina === "notifiche"}
  {#if notifiche.suIOS() && !notifiche.installata()}
    <p class="attenzione text-subheadline">Su iPhone le notifiche funzionano solo con ATLAS aggiunta alla schermata Home. Condividi → Aggiungi alla schermata Home, poi riapri da lì.</p>
  {/if}
  {#if !n}
    <p class="secondario">Controllo…</p>
  {:else if n.perm === "unsupported"}
    <p class="secondario">Questo browser non supporta le notifiche push.</p>
  {:else if n.perm === "denied"}
    <p class="male">Permesso negato. Va riattivato dalle impostazioni del browser: da qui non si può più chiedere.</p>
  {:else if !n.attive}
    <Pulsante variante="pieno" larga icona="campanella" onclick={attiva}>Attiva le notifiche</Pulsante>
  {:else}
    <p class="text-subheadline ok">{n.esito?.stato === "riparato" ? "Questo dispositivo non era registrato sul server: sistemato ora." : "Questo dispositivo è iscritto, e il server lo conosce."}</p>
    {#if n.altri > 0}
      <Sezione piede="Se usi ATLAS solo su questo telefono sono vecchie — di una reinstallazione o di un aggiornamento di iOS — e ricevono messaggi che non arrivano da nessuna parte.">
        <Riga titolo={n.altri === 1 ? "Tieni solo questo dispositivo" : `Tieni solo questo dispositivo (togli le altre ${n.altri})`} accento onclick={async () => { const t = await notifiche.tieniSoloQuesto(); avviso(t ? `Tolte ${t}.` : "Niente da togliere."); leggiNotifiche(); }} />
      </Sezione>
    {/if}
    <Sezione titolo="Promemoria">
      {#each [["abitudini", "Abitudini"], ["mobilita", "Mobilità"], ["finanze", "Finanze"]] as [k, nome] (k)}
        <Riga titolo={nome}>
          {#snippet fine()}<Interruttore acceso={Boolean(orari[k]?.attiva)} etichetta={nome} oncambio={(v) => notifiche.scriviOrari(k, { attiva: v })} />{/snippet}
        </Riga>
      {/each}
    </Sezione>
    {#if orari.mobilita?.attiva}
      <Sezione titolo="Orari · Mobilità">
        <Riga titolo="Sessione">
          {#snippet fine()}<input class="ora" type="time" value={orari.mobilita.principale} onchange={(e) => orario("mobilita", "principale", e.currentTarget.value)} />{/snippet}
        </Riga>
        <Riga titolo="Dose minima">
          {#snippet fine()}<input class="ora" type="time" value={orari.mobilita.recupero} onchange={(e) => orario("mobilita", "recupero", e.currentTarget.value)} />{/snippet}
        </Riga>
      </Sezione>
    {/if}
    {#if orari.finanze?.attiva}
      <Sezione titolo="Orari · Finanze" piede="Tre avvisi per i pagamenti: a tre giorni fai in tempo a spostare i soldi, a uno a rinunciare a qualcosa, la mattina stessa a non trovare il conto più magro senza sapere perché.">
        <Riga titolo="Riepilogo serale">
          {#snippet fine()}<input class="ora" type="time" value={orari.finanze.riepilogo} onchange={(e) => orario("finanze", "riepilogo", e.currentTarget.value)} />{/snippet}
        </Riga>
        <Riga titolo="Pagamenti in arrivo">
          {#snippet fine()}<Interruttore acceso={orari.finanze.pagamenti !== false} etichetta="Pagamenti in arrivo" oncambio={(v) => notifiche.scriviOrari("finanze", { pagamenti: v })} />{/snippet}
        </Riga>
        {#if orari.finanze.pagamenti !== false}
          <Riga titolo="Ora dell'avviso">
            {#snippet fine()}<input class="ora" type="time" value={orari.finanze.pagamentiOra || "08:30"} onchange={(e) => orario("finanze", "pagamentiOra", e.currentTarget.value)} />{/snippet}
          </Riga>
        {/if}
      </Sezione>
    {/if}
    <Sezione piede="La prova parte da questo telefono e non passa dal server: se non la vedi, il problema è nelle impostazioni di iOS (Notifiche → ATLAS, e nessuna Full immersione attiva).">
      <Riga titolo="Manda una notifica di prova" accento onclick={async () => { const ok = await notifiche.provaLocale(); avviso(ok ? "Mandata." : "Non riuscita.", { tipo: ok ? "info" : "errore" }); }} />
      <Riga titolo="Disiscrivi questo dispositivo" distruttiva onclick={async () => { await notifiche.disiscrivi(); avviso("Disiscritto."); leggiNotifiche(); }} />
    </Sezione>
  {/if}

{:else if pagina === "dati"}
  <Sezione titolo="Spazio" piede="Su iOS un sito non aperto per settimane può perdere i dati locali. La persistenza lo rende molto meno probabile; il repo di sync resta comunque la copia che conta.">
    <Riga titolo="Usato" valore={occupato ? `${mb(occupato.usati)} su ${mb(occupato.totali)}` : "—"} />
    <Riga titolo="Chiedi persistenza" accento onclick={async () => { const ok = await chiediPersistenza(); avviso(ok ? "Persistenza concessa." : "Persistenza negata dal browser.", { tipo: ok ? "info" : "errore" }); }} />
  </Sezione>
  <Sezione titolo="Dati" piede="L'esportazione è tutto lo stato locale in un file (le foto no: stanno in IndexedDB e nel repo dati). Svuotare la cache non tocca i dati.">
    <Riga titolo="Esporta lo stato (JSON)" accento onclick={esporta} />
    <Riga titolo="Svuota la cache e ricarica" accento onclick={svuotaCache} />
  </Sezione>

{:else if pagina === "diagnostica"}
  <Sezione titolo="Lavagna di {giornoCorrente()}" piede="È qui che i moduli si dicono cosa è già successo, senza conoscersi.">
    {#each diag.fatti as f (f.m + f.k)}
      <Riga titolo="{f.m} · {f.k}" valore={f.v} />
    {:else}
      <Riga><span class="secondario">Niente scritto oggi.</span></Riga>
    {/each}
  </Sezione>
  <Sezione titolo="Comunicazione fra moduli">
    <Riga titolo="In ascolto" sottotitolo={diag.ascolti.map(([e, k]) => `${e} (${k})`).join(", ") || "nessuno"} />
    {#each diag.eventi as e, i (i)}
      <Riga titolo={e.evento} valore={new Date(e.quando).toLocaleTimeString("it-IT")} />
    {/each}
  </Sezione>
  <Sezione titolo="Archivi locali" piede="Una casella per modulo, isolate fra loro: azzerarne una non tocca le altre.">
    {#each diag.caselle as c (c.id)}<Riga titolo={c.id} valore="{c.kb} kB" />{/each}
  </Sezione>
{/if}

<style>
  .blocco { padding: var(--space-4); }
  .token { display: block; padding: 0 var(--space-4); }
  .token input { width: 100%; height: var(--list-row-height); font-size: 17px; background: none; outline: none; font-family: var(--font-mono); }
  .ora { font-size: 17px; background: var(--fill-tertiary); border-radius: var(--radius-sm); padding: 4px 8px; color: var(--accento); }
  .ok { color: var(--color-green); }
  .male { color: var(--color-red); }
  .attenzione { padding: var(--space-3) var(--space-4); border-radius: var(--radius-xl); background: color-mix(in srgb, var(--color-orange) 14%, transparent); }
</style>
