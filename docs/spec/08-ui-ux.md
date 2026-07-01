# 08 — UI / UX

Source : templates `*/templates/`, composants `*/react/*.jsx`, `pyInterClubs/templates/`.
L'UI actuelle = **Bootstrap 5 + Font Awesome**, React 18 + React-Bootstrap + React Query +
react-flip-move, le tout **transpilé à la volée** (Babel runtime, pas de build). La cible
recrée ces écrans en **Next.js** (composants React natifs, build standard).

## 1. Layout global

`index.html` / `p_index.html` / `p_menu.html` :

- **Navbar fixe** (hamburger, branding) + **menu latéral offcanvas** dont les entrées
  dépendent du rôle (superuser / staff / coach / juge).
- Zone de contenu `#mainFragment`, conteneur de **toasts** `#messagesFragment`, conteneur
  de **modales** `#modalFragment`.
- Données de la rencontre injectées en JSON (`rencontre.saison` est lu par `ranking.jsx:69`).
- Tri auto des voies par préfixe `M`/`T` + numéro.

> **Cible** : `app/layout.tsx` (navbar + sidebar), layouts par rôle
> (`app/(admin)/`, `app/(coach)/`, `app/(judge)/`), provider de toasts (sonner/react-hot-toast).

## 2. Architecture front actuelle (à réimplémenter)

`api/react/app.jsx` : `QueryClientProvider` ▸ `CRUDProvider` (CSRF + `send()`) ▸
`SSEProvider`. Hooks clés (`api/react/observer.jsx`) :

- `useCRUD()` : `send({method, endpoint, data})` avec CSRF auto ;
- `useCRUDHandler({queryKey, endpoint, initialData, pollInterval, ...})` : React Query +
  mutations + erreurs + **mise à jour optimiste** ; `action('create'|'read'|'update'|
  'delete'|'patch', data)` ; `status:{isLoading,isError,isSuccess,isDeleting}` ;
- `useSSEUpdater({queryKey, endpoint, debounceTime})` : maj du cache sur événement (doc 07).

| Brique actuelle | Cible |
| ----------------- | ------- |
| React Query | TanStack Query (idem) |
| `CRUDProvider`/CSRF | client supabase-js / fetch + auth header |
| `SSEProvider`/`useSSEUpdater` | `useRealtime` sur `supabase.channel` (doc 07) |
| Toasts jQuery (`Toast()`) | sonner / react-hot-toast |
| react-flip-move | conserver (ou framer-motion) |
| django-js-reverse (`Urls[...]`) | routes Next.js typées |

## 3. Composants par rôle

### Coach

- **`ListEquipe`** (`leader/react/equipe.jsx`) : liste des équipes, badge points, médaille
  top 3, tri par points (flip-move), abo `equipes/`, `club/{club}/equipes/`.
- **`Equipe`** : carte équipe, numéro éditable, accordéon de 8 `Score`, `AddScore`
  (autocomplétion), suppression avec modale.
- **`Score`** (`leader/react/score.jsx`) : accordéon par grimpeur ; en-tête (nom, genre,
  badge club prêteur, points) ; réglages (groupe, club prêteur, ordre ↑↓, supprimer) ;
  `PerfInput` par voie.
- **`ListScore`** : « Mes grimpeurs ».

### Juge

- **`ListVoies`** (`judge/react/judge.jsx`) : onglets par voie, badge « X/Y scorés ».
- **`ListPerf`** : filtre par nom, sections **Invalides**/**Valides**, bouton
  « Enregistrer un grimpeur » (modale autocomplétion → `register`).
- **`ListPerfItem`** : un `PerfInput` (désactivé si déjà scoré).

### Admin

- **`Ranking`** (`admin/react/ranking.jsx`) : classement live, séparé F/H puis fusionné,
  rangs avec ex æquo, **catégories d'âge U11–U21** (voir §4), **médailles** top 3
  (`Medal`), en-tête collant, flip-move, abo `scores/`.
- **`resultats.html`** : `Ranking` + **auto-scroll** (30 px/s, pauses 2 s en haut/bas).

### Partagés

- **`Autocomplete`** (`api/react/autocomplete.jsx`) : recherche debouncée (500 ms, ≥3
  car.), dropdown loading/error, bouton clear (si nullable), `queryString`.
- **`PerfInput`** (`core/react/perf-input.jsx`) : saisie selon type (bloc/diff/vitesse,
  doc 05 §4).
- **`HorizontalFormGroup`** (`core/react/horizontal-form-group.jsx`) : label + colonnes.

## 4. Catégories d'âge U11–U21 (affichage)

`ranking.jsx:59-68` — `age = saison - anneeNaissance` :

| Âge | Catégorie |
| ----- | ----------- |
| 8–9 | U11 |
| 10–11 | U13 |
| 12–13 | U15 |
| 14–15 | U17 |
| 16–17 | U19 |
| 18–19 | U21 |
| autre | « Hors catégorie » |

(À distinguer des **catégories de rencontre** enfants/ado, qui filtrent l'éligibilité,
`core/models.py:96-103` : enfants = 8–13 ans, ado = 13–19 ans.)

## 5. Classement client (flip-move)

`Ranking.ranking()` (`ranking.jsx:102-114`) : tri par points décroissants, rang = index+1
sauf si points identiques au précédent (ex æquo). Séparation F/H puis re-fusion globale.
Médaille si rang ≤ 3. **À reproduire** (ou déléguer à la vue SQL `v_classement`, doc 02).

## 6. Patterns UX à conserver

- Mise à jour **optimiste** + rollback sur erreur.
- **Debounce** (autocomplétion 500 ms ; saisie vitesse formatée, submit sur Enter).
- **Listes animées** (flip-move) au reclassement / passage valide↔invalide.
- **Toasts** succès/erreur + alerte perte de connexion temps réel.
- **Placeholders**/spinners pendant chargement ; boutons désactivés pendant soumission.
- **Modales** de confirmation (suppression équipe ; affichage token/QR).
- **Onglets** (sélection de voie juge ; assistant de création de rencontre).
- **Responsive** Bootstrap (icône sur mobile, texte sur desktop).
- Erreurs serveur affichées inline (`invalid-feedback`), champ + non-champ.

## 7. Choix UI cible (à trancher à l'implémentation)

Conserver **Bootstrap 5 + React-Bootstrap** minimise la réécriture des écrans (recommandé
pour fidélité), ou migrer vers Tailwind/shadcn pour modernisation. Quoi qu'il en soit,
**reproduire les écrans et interactions** décrits ici.
