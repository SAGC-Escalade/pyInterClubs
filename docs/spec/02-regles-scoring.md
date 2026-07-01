# 02 — Règles de scoring et de validation

C'est le cœur métier. Aujourd'hui la logique est **éclatée** entre `Performance.save()`
(`core/models.py:522`), `Rencontre.proceed_speed_points()` (`core/models.py:366`), les
signaux (`core/signals.py`) et les querysets annotés (`core/models.py:160-225`). **Cible :
centraliser dans Postgres** (triggers + fonctions + vues). Le comportement décrit ici doit
être **reproduit à l'identique**, y compris les cas chiffrés du §7.

## 1. Le barème `zones`

Chaque voie porte `zones` : un dictionnaire **ordonné** `{libellé: points}`. L'**index**
d'un libellé dans cet ordre est l'`etat` stocké dans la performance. La **première** zone
est toujours l'état « non réalisé » (points `null`).

- **Bloc / Difficulté** : les valeurs sont des **entiers fixes** (ou `null`).
  Ex. bloc enfants n°1 (`addVoies.py:27`) :
  `{"A réaliser": null, "Chute": 0, "2e essai": 3, "1er essai": 4}`
  → `etat=3` (« 1er essai ») ⇒ `points=4`.
  Ex. diff ado T1 (`addVoies.py:69`) :
  `{"A réaliser": null, "Chute": 0, "Zone 2": 2, "Zone 1": 1, "Top": 4}`.

- **Vitesse** : les clés peuvent être des **conditions** sur `{rank}` et les valeurs des
  **formules** sur `{rank}`. Ex. vitesse ado (`addVoies.py:20`) :
  `{"A réaliser": null, "Abandon": 0, "Chute": 1, "{rank}>50": 10, "{rank}<=50": "60-{rank}"}`.

> Le champ a un `help_text` (`core/models.py:284`) : « `{rank}` (compteur à partir de 0)
> utilisable **uniquement** pour les voies de vitesse ».

⚠️ **Sécurité** : le code actuel évalue ces chaînes avec `eval()`
(`core/models.py:391,399`). Les `zones` sont éditables (admin). **En cible, ne jamais
`eval()` de la donnée** : utiliser un **mini-évaluateur sûr** (grammaire restreinte :
`{rank}`, entiers, `+ - * // < > <= >= ==`) ou **pré-compiler** le barème. Voir §6.

## 2. Scoring Bloc / Difficulté (statique)

Déclenché à la modification de `etat` (`Performance.save()`, `core/models.py:522-531`) :

```text
si voie est définie:
  si etat a changé:
    si etat est null        -> points = null
    sinon                   -> p = zones.values()[etat]
                               si p est un entier -> points = p
                               (si p est une chaîne -> laissé pour calcul ultérieur)
```

Pour bloc/diff, `p` est toujours entier ⇒ `points` est fixé immédiatement.

Cas particulier (`etat == null` via le temps) : si `temps` passe à null, `points=null` et
`etat` est repositionné sur la zone « non réalisée » (la zone dont la valeur est `null`,
`core/models.py:536`).

## 3. Scoring Vitesse (dynamique, par rang et par sexe)

C'est le calcul le plus subtil. Déclenché **à chaque changement de `temps`** sur une perf
de type vitesse, via signal (`core/signals.py:14-25`), qui appelle
`Rencontre.proceed_speed_points(perf)` (`core/models.py:366-405`).

### 3.1 Valeurs spéciales de `temps`

| Saisie | Valeur stockée | Sens |
| -------- | ---------------- | ------ |
| « A réaliser » | `null` | pas encore passé (jamais classé) |
| « Chute » | `-1 min` (`timedelta(minutes=-1)`) | chuté |
| « Abandon » | `-2 min` (`timedelta(minutes=-2)`) | abandon |
| temps réel | `interval` positif | temps de l'ascension |

(Définies dans `api/serializers.py:259-263`, et retraduites en libellés au §3.2.)

### 3.2 Algorithme (par sexe homme/femme)

```text
pour chaque sexe dans (homme, femme):                  # filtre par sexe du grimpeur
  classement = perfs vitesse de la rencontre, ce sexe, temps NON null, triées par temps croissant
  rank = 0
  pour chaque groupe de perfs de MÊME temps (groupby sur temps):
     # libellé du temps pour matcher une clé littérale de zones
     si temps == -2min -> tkey = "Abandon"
     si temps == -1min -> tkey = "Chute"
     (temps == null n'arrive jamais ici)
     pour chaque perf du groupe:
        # 1) trouver la zone applicable, dans l'ordre des clés
        pour i, (cle, val) dans enumerate(zones):
           si tkey == cle  OU  ('rank' dans cle ET eval(cle avec {rank}->rank)) :
              points_expr = val ; etat = i ; STOP
        sinon: erreur "aucune condition trouvée"
        # 2) calculer les points
        si points_expr est une chaîne contenant 'rank':
           points = eval(points_expr avec {rank}->rank)
        sinon:
           points = points_expr
     # le rang n'avance QUE pour les temps réels (pas Abandon/Chute)
     si tkey n'est pas une chaîne (donc temps réel): rank += taille(groupe)
  bulk_update(points, etat)
```

Points clés à respecter :

- **`rank` commence à 0** et s'incrémente par **taille de groupe** (gestion des ex æquo :
  même temps ⇒ même rang).
- **Abandon et Chute n'incrémentent pas `rank`** (`core/models.py:403-404`), et matchent
  par **libellé exact** de la clé (`"Abandon"`, `"Chute"`) — leurs points sont fixes
  (0 et 1 dans les barèmes `addVoies.py`).
- Les zones « non réalisé » / formules `{rank}` ne sont parcourues **que pour les temps
  réels**, dans l'ordre des clés ; la **première condition vraie** gagne.
- `etat` est repositionné sur l'index de la zone retenue (donc la feuille de classement
  affiche le bon libellé).
- Le recalcul ne porte **que sur le sexe** de la perf modifiée quand `perf` est fourni
  (`core/models.py:370-372`), sinon sur les deux.

### 3.3 Exemple de barème vitesse enfants (`addVoies.py:12`)

`{"A réaliser":null,"Abandon":0,"Chute":1,"{rank}>44":2,"{rank}>5":"11-{rank}//5","{rank}<=5":"15-{rank}"}`

- `"11-{rank}//5"` signifie `11 - (rank // 5)` (division entière, priorité Python).
- rang 0 ⇒ `15-0 = 15` pts ; rang 5 ⇒ `15-5 = 10` ; rang 6 ⇒ `11 - 6//5 = 11-1 = 10` ;
  rang 45 ⇒ `>44` ⇒ 2 pts.

## 4. Règles métier sur Score / Equipe

- **Max 8 membres par équipe** : `Score.clean()` (`core/models.py:446-449`).
- **Ordre 1–8** : à la création, on choisit le **premier ordre libre** dans 1..8
  (`ScoreSerializer.create`, `api/serializers.py:240-244`). `ordre_up`/`ordre_down`
  **échangent** l'ordre avec le voisin (transaction atomique, `core/models.py:455-470`).
- **Club prêteur auto** : à la création d'un score, si `grimpeur.club ≠ equipe.club`,
  alors `clubPreteur = grimpeur.club` (`core/models.py:491-496`).
- **Création des performances** : à la création d'un Score (`api/serializers.py:247-252`)
  on instancie automatiquement, selon le **genre** du grimpeur et la rencontre :
  - `nbBloc` perfs bloc (voies de bloc de la rencontre pour ce genre, **pré-affectées**) ;
  - `nbDiff` perfs diff **sans voie** (`voie=null`, à affecter ensuite) ;
  - `nbVitesse` perfs vitesse (voies vitesse pour ce genre, **pré-affectées**).
- **Affectation des voies de diff (mode groupé)** : `Score.groupe(groupe)`
  (`core/models.py:472-488`) prend la voie de diff choisie et affecte au grimpeur les
  **`nbDiff` voies consécutives** à partir de celle-ci (ordonnées par `order_by__nom`).
- **Voies non réutilisables** : `Performance.clean()` (`core/models.py:542-548`) interdit
  d'affecter une voie déjà utilisée par le même grimpeur dans la rencontre, **sauf** si
  `voiesReutilisables` **ou** `voiesGroupees` est vrai.

⚠️ `ordre_up/down` et la création « premier ordre libre » supposent qu'il n'y a pas de
trou ni de doublon d'ordre. **Cible** : implémenter en fonction Postgres (swap atomique)
et envisager une normalisation des ordres à l'ajout/suppression (le code note ce TODO,
`core/models.py:452-454`).

## 5. Validation et calcul des points (agrégats)

### 5.1 Points

- **Points d'un score** = somme des `points` de ses performances
  (`with_valide_and_points`, `core/models.py:205` ; fallback `to_representation`,
  `api/serializers.py:235`).
- **Points d'une équipe** = somme des points de toutes les perfs de ses membres
  (`core/models.py:162`).

### 5.2 Validité

- **Score valide** (`core/models.py:203-223`) : pour chaque type, le **nombre de perfs
  ayant des points non-null** == nombre attendu :
  `nb_blocs_valide == nbBloc ET nb_diffs_valide == nbDiff ET nb_vitesses_valide == nbVitesse`.
- **Équipe valide** (`core/models.py:160-181`) : `nb_membres > 0` ET pour chaque type,
  `nb_*_valide == nb_membres * nb*` (toutes les perfs attendues de tous les membres ont
  des points).
- **Rencontre valide** (`core/models.py:137-147`) :
  `nb_perfs_valides == nb_grimpeurs * (nbBloc+nbDiff+nbVitesse)`.

### 5.3 Champ `started` (UI coach)

`ScoreSerializer.get_started` (`api/serializers.py:220-224`) : `false` pour l'admin ;
sinon `true` si **au moins une perf de diff a des points** (le grimpeur a commencé →
on verrouille certaines actions côté coach).

## 6. Recalage des `etat` à l'édition d'une voie

Quand un admin modifie les `zones` d'une voie, l'ordre/contenu des clés peut changer.
`core/signals.py:31-89` (`maj_performances_etat`) :

1. avant save, mémorise les anciennes zones (`pre_save`, `:72`) ;
2. après save, construit une **table de correspondance** ancien_index → nouvel_index par
   **libellé identique** ;
3. met à jour `Performance.etat` des perfs existantes ; **réinitialise à null** celles dont
   la zone a disparu (et journalise un warning).

> **Cible — stockage de `zones`** : pour préserver l'ordre et faciliter ce recalage,
> stocker `zones` comme **tableau JSON ordonné** :
> `[{"label":"A réaliser","points":null}, {"label":"Chute","points":0}, ...]`.
> Pour la vitesse, `points`/`label` peuvent porter des expressions (`"{rank}>50"`,
> `"60-{rank}"`) interprétées par l'évaluateur sûr. La fonction `voie_points(zones, etat)`
> et `voie_etat_label(zones, etat)` remplacent `Voie.points()/etat()`.

## 7. Cas chiffrés de référence (tests de non-régression)

À reproduire à l'identique dans l'implémentation cible (barèmes réels de `addVoies.py`).

1. **Bloc enfants n°1** `{"A réaliser":null,"Chute":0,"2e essai":3,"1er essai":4}` :
   `etat=2` ⇒ 3 pts ; `etat=3` ⇒ 4 pts ; `etat=0` ⇒ null.
2. **Diff ado T1** `{"A réaliser":null,"Chute":0,"Zone 2":2,"Zone 1":1,"Top":4}` :
   `etat=4` (Top) ⇒ 4 pts ; `etat=2` (Zone 2) ⇒ 2 pts.
3. **Vitesse ado** `{"A réaliser":null,"Abandon":0,"Chute":1,"{rank}>50":10,"{rank}<=50":"60-{rank}"}`,
   4 grimpeurs hommes triés par temps (t1<t2<t3, t4=Chute) :
   - rang 0 ⇒ `60-0 = 60` pts ; rang 1 ⇒ 59 ; rang 2 ⇒ 58 ;
   - Chute ⇒ 1 pt, **n'incrémente pas le rang** ;
   - un 60ᵉ classé ⇒ `>50` ⇒ 10 pts.
4. **Ex æquo vitesse** : deux temps identiques au rang 0 ⇒ tous deux 60 pts, puis le
   suivant est au **rang 2** (le rang avance de la taille du groupe).
5. **Validité d'un score** rencontre `nbBloc=2,nbDiff=3,nbVitesse=1` : valide ⟺ 2 perfs
   bloc + 3 perfs diff + 1 perf vitesse ont des points non-null.

## 8. Mapping cible (triggers / fonctions / vues)

| Logique actuelle | Cible Postgres |
| ------------------ | ---------------- |
| `Performance.save()` (bloc/diff) | `BEFORE INSERT/UPDATE` trigger `trg_perf_points` → `fn_calc_perf_points(perf)` |
| `proceed_speed_points()` + signal temps | `AFTER UPDATE OF temps` trigger → `fn_proceed_speed_points(rencontre, sexe)` (recalcul groupé) |
| `maj_performances_etat()` (édition zones) | `AFTER UPDATE OF zones` trigger sur `voie` → `fn_remap_etat(voie, old_zones)` |
| `with_valide_and_points` (score/équipe) | Vues `v_score_points`, `v_equipe_points` (Sum + Count filtrés par type) |
| classement individuel/équipe | Vue `v_classement` (rang par `points`, par sexe) |
| `Score.groupe()` | `fn_score_groupe(score, voie)` |
| `ordre_up/down` | `fn_score_ordre(score, 'up'\|'down')` (swap atomique) |
| évaluation `{rank}` | `fn_eval_rank(expr text, rank int)` **sans eval dynamique** (parseur restreint) |

Le recalcul vitesse étant **transactionnel et groupé**, le réaliser en fonction PL/pgSQL
garantit la cohérence sous écritures concurrentes (plusieurs juges en simultané). Les
changements de lignes déclenchent ensuite **Supabase Realtime** (doc 07).
