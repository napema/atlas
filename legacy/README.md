# legacy — i sorgenti delle tre app di partenza

Solo da leggere. Non viene pubblicato (il workflow di Pages lo esclude) e
non viene eseguito: è il materiale da cui si porta il codice dentro
`moduli/`.

```
finanze/    da napema/budget-tracker-webpage   — index.html monolitico, 118 KB
abitudini/  da napema/habit-tracker-webapp     — index.html monolitico, 73 KB
                                                 + notify.js e notify.yml, le
                                                   notifiche push già funzionanti
mobilita/   da napema/mobility-blueprint       — già modulare: js/, css/,
                                                 SPEC-mobilita.md, il catalogo
                                                 esercizi e i programmi
```

**I `config.js` non ci sono**, di proposito: contengono i token delle app di
partenza, e ATLAS ha il suo. Se serve leggerli, stanno nei repo originali.

`mobilita/SPEC-mobilita.md` era `CLAUDE.md` nel repo di partenza. Rinominato
perché un `CLAUDE.md` qui dentro verrebbe caricato come istruzioni di
progetto mentre si lavora su ATLAS, e queste non sono le istruzioni di ATLAS.

## Le tre app sono ancora vive

Restano la copia buona finché il modulo corrispondente non è finito:

- https://napema.github.io/budget-tracker-webpage/
- https://napema.github.io/mobility-blueprint/
- https://napema.github.io/habit-tracker-webapp/

**Attenzione durante la migrazione:** una modifica fatta in uno di quei repo
dopo che il codice è stato copiato qui non arriva in ATLAS da sola. Va
riportata a mano, o rifatta. Meglio fermare il lavoro su quei repo finché il
modulo non è passato.

Questa cartella sparisce quando l'ultimo modulo è portato.
