# 03 — Workflows administrateur

Source : `admin/views.py`, `admin/urls.py`, `judge/views.py`. L'admin est un **superuser**
(ou **staff** pour les QR codes) Django, authentifié par mot de passe via l'admin standard.

## 1. Cycle de vie d'une rencontre

```text
Créer ──► Sélectionner (rencontre courante) ──► Démarrer (provisionne les coachs)
   │                                                   │
   │                                                   ▼
   │                                   Affecter les juges aux voies
   │                                                   │
   │                                                   ▼
   │                                   Live (coachs inscrivent, juges scorent)
   │                                                   │
   │                                                   ▼
   │                                   Rapports (stats / classements / inscrits)
   │                                                   │
   ▼                                                   ▼
Supprimer (si non démarrée)                    Arrêter (déprovisionne coachs/juges)
```

## 2. Écrans et routes

| Route (`admin/`) | Vue | Rôle |
| ------ | ------ | ------ |
| `` (GET/POST) | `RencontreSelectionView` | Sélection de la rencontre courante |
| `create` | `RencontreCreateView` | Création (assistant 3 onglets) |
| `<pk>/delete` | `RencontreDeleteView` | Suppression |
| `<pk>/start` | `RencontreStartView` | Démarrage → provisioning coachs → redirige vers QR |
| `<pk>/stop` | `RencontreStopView` | Arrêt → déprovisioning |
| `clubs` | `ClubQRCodesView` (staff) | QR codes de connexion clubs + Wi-Fi |
| `resultats` | template `admin/resultats.html` | Classement live (auto-scroll) |
| `report/<pk>/stats` | `StatsReportView` | Statistiques (Chart.js) |
| `report/<pk>/teams` | `TeamsReportView` | Classement par équipes |
| `report/<pk>/ranking` | `RankingReportView` | Classement individuel H/F |
| `report/<date>/registration` | `RegistrationReportView` | Inscrits (par date) |
| `report/<saison>-/ranking` | `SeasonRankingReportView` | Classement individuel de saison |
| `report/<saison>-/teams` | `SeasonTeamsReportView` | Classement équipes de saison |

Affectation des juges : `judge/create` (`JugeCreateView`) ; liste : `judge/` (`JugeManageView`).

## 3. Sélection de la rencontre courante

`RencontreSelectionView` (`admin/views.py:52-68`) : enregistre la rencontre choisie sur le
`Profil` de l'admin (créé si absent) et redirige avec `?rencontre=<id>`. Le middleware
(`admin/middleware.py:27-31`) résout la **rencontre courante** dans cet ordre de priorité :

1. `Config.DEFAULT_RENCONTRE` (valeur globale) ;
2. `profil.rencontre_id` (préférence de l'utilisateur) ;
3. paramètre d'URL `?rencontre=` (override ponctuel).

> **Cible** : « rencontre courante » = état applicatif. Conserver les trois niveaux :
> défaut global (table `config`), préférence utilisateur (claim/colonne), override par
> query param. Le middleware Django devient un **resolver côté Next.js** + claims JWT.

## 4. Création d'une rencontre (assistant)

`RencontreCreateView` (`admin/views.py:70-88`), template `admin/create.html`, 3 onglets :

1. **Paramètres** : saison (défaut = année + 1 si mois > 8, `:81`), date (défaut
   aujourd'hui), club hôte, catégorie.
2. **Voies** : multi-sélection ; à la sélection d'une catégorie, pré-remplie avec
   `Voie.objects.actifs().categorie(categorie)` (`:87`).
3. **Avancés** : `nbBloc`, `nbDiff`, `nbVitesse`, `voiesReutilisables`, `voiesGroupees`
   (par défaut `voiesGroupees=True` si catégorie enfants, `:84-85`).

La sélection des voies crée les lignes `RencontreVoie` (M2M).

## 5. Démarrage : provisioning des coachs

> **Contrainte : une seule rencontre active à la fois.** Il est interdit de démarrer une
> rencontre si une autre est déjà à l'état `EN_COURS`. L'UI doit masquer / désactiver le
> bouton « Démarrer » dans ce cas et l'API doit retourner une erreur métier (HTTP 409)
> si la contrainte est violée côté serveur. Pour démarrer une nouvelle rencontre, l'admin
> doit d'abord arrêter la rencontre en cours.

`RencontreStartView` (`admin/views.py:97-121`, **transaction atomique**) : pour **chaque
club**, crée un `Coach(club, rencontre)` et un `User` Django dont :

- `username = coach.token` = `md5("{rencontre}:{club.nom}")` ;
- `first_name = club.nom`, `last_name = club.ville` ;
- mot de passe **inutilisable** (`set_unusable_password`).

Puis redirige vers les QR codes (`rencontre:qrcode-clubs?rencontre=<pk>`).

> **Cible** : à l'ouverture, générer pour chaque club une **identité coach** + un **token
> de login** déterministe (ou aléatoire stocké) servant au QR. Voir doc 10.

## 6. Affectation des juges

`JugeCreateView` / `JugeCreationForm.save()` (`judge/forms.py:44-63`) : l'admin saisit un
**nom** de juge et sélectionne des **voies** (`RencontreVoie` de la rencontre). On crée un
`Juge` + un `User` (`username = juge.get_token(voies)` = `md5("{rencontre}:{voie_ids triés}")`,
`last_name` = libellés des voies), et on **rattache** ces `RencontreVoie.juge` au juge.

Liste/édition : `JugeManageView` (`judge/manage.html`) montre, par voie, le juge affecté
(badge vert si affecté) et les QR codes.

## 7. QR codes de connexion

`ClubQRCodesView` (`admin/views.py:34-49`), template `admin/qrcode_club.html` :

- **QR Wi-Fi** (SSID, type de clé, mot de passe lus depuis `Config`) ;
- **par club** : QR vers l'URL de login token (`/accounts/club?token=...`), nom/ville,
  nombre de grimpeurs, bouton « Se connecter en tant que ».
- L'IP du serveur est déduite via `socket` (`:42-44`) pour construire les URLs.

> **Cible** : l'IP locale n'a plus de sens sur Netlify ; utiliser l'URL publique de
> déploiement (variable d'env). Wi-Fi reste piloté par `config`.

## 8. Arrêt : déprovisioning

`RencontreStopView.form_valid` (`admin/views.py:138-159`, **transaction**, confirmation par
`ConfirmationForm`) : sélectionne les `User` non-superuser dont le `profil.rencontre` est la
rencontre, puis **supprime** les `Juge`, `Coach` et `User` correspondants (force la
déconnexion). Note : la cascade polymorphique étant défaillante, la suppression est
explicite (`:142-157`).

> **Cible** : « arrêter » = révoquer les tokens/identités coach & juge de la rencontre
> (invalider les JWT / supprimer les lignes d'identité). Les données de compétition
> (équipes/scores/perfs) **subsistent** pour les rapports.

## 9. Configuration (`Config`)

Magasin clé-valeur (`admin/models.py:13-40`). Clés utilisées :

- `DEFAULT_RENCONTRE` : rencontre courante globale ;
- paramètres Wi-Fi (SSID, mot de passe, type) pour le QR Wi-Fi.

> **Cible** : table `config(key, type, value)` + helpers `config_get/config_set`, ou
> simples variables d'environnement Netlify pour les valeurs non éditables en ligne.
