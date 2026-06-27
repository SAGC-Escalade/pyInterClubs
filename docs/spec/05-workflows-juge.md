# 05 — Workflows juge

Source : `judge/views.py`, `judge/react/judge.jsx`, `core/react/perf-input.jsx`,
`api/views.py` (Score/Performance côté juge). Le juge saisit les **performances** sur les
**voies qui lui sont affectées**.

## 1. Connexion et périmètre

Le juge scanne un **QR code** (créé par l'admin lors de l'affectation) →
`/accounts/club?token=<md5>` (même mécanisme token que le coach, doc 10). Son `Profil` de
type `Juge` porte les `voies` (M2M via `RencontreVoie`) ; le middleware injecte
`interclub.voies` (`admin/middleware.py:44-47`).

## 2. Écran : feuille de scoring

Page d'accueil `/` (template `p_index.html`) : si `user.profil.voies` est peuplé, on rend
le composant React `ListVoies` (`judge/react/judge.jsx`) avec les voies du juge.

Structure :

- **Onglets** : un onglet par voie affectée. L'onglet affiche le nom/niveau de la voie et
  un badge « **X scorés / Y total** » (compteur de perfs).
- **Contenu (par voie)** = composant `ListPerf` :
  - **Champ de filtre** : recherche de grimpeur par nom (normalisation des accents).
  - **Section « Invalides »** : grimpeurs **à scorer** (perf sans état) — `ListPerfItem`.
  - **Section « Valides »** : grimpeurs déjà scorés (accordéon repliable).
  - **Bouton « Enregistrer un grimpeur »** (mode non groupé) : modale d'autocomplétion sur
    `scores/` puis action `register`.

## 3. Données vues par le juge

`ScoreViewSet.get_queryset` (juge) (`api/views.py:139-149`) : scores ayant **au moins une
performance sans voie** (`performances__voie__isnull=True`) — c.-à-d. des grimpeurs dont une
voie de diff n'est pas encore affectée — avec leur grimpeur/club, filtrables par `?q=`.

`PerformanceViewSet` (juge) : pour la route `voie/<voie>/perfs`, on charge les perfs de la
voie avec `score__grimpeur__club` et on utilise **`FullPerformanceSerializer`**
(`api/views.py:203-207`) qui **inclut le grimpeur** (`api/serializers.py:297-309`) — le juge
voit donc nom/club du grimpeur sur sa feuille.

## 4. Saisie d'une performance (`PerfInput`)

`core/react/perf-input.jsx` — l'UI dépend du **type de voie** :

- **Bloc** : menu déroulant d'état (zones de la voie) → points affichés.
- **Difficulté** : (si non groupé) sélecteur de voie + menu d'état → points.
- **Vitesse** : saisie de **temps** `HH:MM:SS.CC` + menu pour cas spéciaux
  (« A réaliser », « Chute », « Abandon »).

Soumission : `PATCH perfs/<id>` avec `{voie, etat, temps}`. Effets :

- bloc/diff : points calculés immédiatement (doc 02 §2) ;
- vitesse : à la modification du `temps`, **recalcul du classement** par rang/sexe
  (doc 02 §3) déclenché par signal (`core/signals.py:14-25`).

Format du temps : `DurationField` (`api/serializers.py:258-283`) traduit
« A réaliser »↔null, « Chute »↔−1 min, « Abandon »↔−2 min, et formate `HH:MM:SS.CC`.

## 5. Action `register` (affecter un grimpeur à la voie du juge)

`ScoreViewSet.register` (`api/views.py:177-186`) : le juge sélectionne un score ;
on prend la **première** performance **sans voie** du score et on lui affecte **la voie du
juge** (`request.user.profil.voies.get(pk=...)`). Cela fait passer le grimpeur de la liste
des « à enregistrer » à la feuille de la voie.

## 6. Temps réel

`ListVoies`/`ListPerf` s'abonnent à `voie/{voie_id}/perfs/` (doc 07) :

- saisie d'un état → le grimpeur passe d'« Invalides » à « Valides » (flip-move) et le
  badge de l'onglet s'incrémente ;
- changement de voie d'une perf → suppression de l'ancienne feuille + ajout sur la
  nouvelle (`PerformanceNotifier.update`, `api/signals.py:195-216`).

⚠️ Le code note un compromis d'abonnement (`api/signals.py:201-210`) : les perfs sont
notifiées **à la fois** individuellement (`perfs/{id}/`) et globalement à la feuille
(`voie/{id}/perfs/`) pour gérer correctement le passage valide/invalide. **À reproduire**
dans la stratégie d'abonnement cible (doc 07).

## 7. Mapping cible

| Actuel | Cible |
|--------|-------|
| Périmètre juge (`profil.voies`) | **RLS** : juge ne lit/écrit que les perfs des voies de ses `rencontre_voie` |
| `FullPerformanceSerializer` | vue/jointure exposant grimpeur+club avec la perf pour les voies du juge |
| `register` | route handler → affecte la 1ʳᵉ perf sans voie à la voie du juge (vérif RLS) |
| Recalcul vitesse au PATCH temps | trigger Postgres (doc 02 §8) + Realtime |
