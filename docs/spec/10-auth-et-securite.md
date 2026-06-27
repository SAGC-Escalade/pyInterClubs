# 10 — Authentification et sécurité

Source : `pyInterClubs/backends.py`, `pyInterClubs/forms.py`, `pyInterClubs/views.py`,
`admin/models.py`, `admin/middleware.py`, `admin/views.py`. Décision retenue : **conserver
et adapter le modèle token/QR** (login terrain sans mot de passe).

## 1. Modèle actuel

### Trois identités

- **Admin** : `auth.User` superuser/staff, **login mot de passe** via l'admin Django.
- **Coach** : `User` + `Coach` créés à l'ouverture de la rencontre (doc 03 §5),
  `username = token`, mot de passe **inutilisable**.
- **Juge** : `User` + `Juge` créés à l'affectation (doc 03 §6), `username = token`.

### Tokens (MD5)

- Coach : `md5("{rencontre}:{club.nom}")` (`admin/models.py:54-57`).
- Juge : `md5("{rencontre}:" + ":".join(sorted(map(str, voie_ids))))` (`:64-70`).

### Login token

- Form `TokenAuthenticationForm` (`pyInterClubs/forms.py`) : champ `token` caché →
  `authenticate(request, token=...)`.
- Backend `ClubBackend` (`pyInterClubs/backends.py`) : `User.objects.get(username=token)`
  (le token EST le username).
- Vue `ClubAuthenticationView` (`pyInterClubs/views.py:52-63`) : GET et POST traités
  pareil → on peut se connecter via un simple lien `/accounts/club?token=<md5>` (ce que
  contiennent les **QR codes**).
- Session Django créée à l'authentification.

### Résolution du rôle (middleware)

`pyInterClubsMiddleware` (`admin/middleware.py`) injecte `request.interclub` :

- `rencontre` : `Config.DEFAULT_RENCONTRE` ▸ `profil.rencontre_id` ▸ `?rencontre=` ;
- `club` : `profil.club_id` si Coach ;
- `voies` : `profil.voies` (ids) si Juge ;
- `user_is_coach` / `user_is_juge` : test polymorphe sur `Profil`.

### Déprovisioning

À l'arrêt de la rencontre, suppression des `User`/`Coach`/`Juge` (force la déconnexion,
doc 03 §8).

⚠️ **Faiblesses du modèle actuel** (à améliorer en cible) :

- Token MD5 **déterministe** et **devinable** (basé sur nom de club / ids de voies) → toute
  personne connaissant ces valeurs peut se connecter. Pas de secret.
- Pas d'expiration des tokens (hors suppression manuelle à l'arrêt).

## 2. Modèle cible (Supabase)

Conserver l'**ergonomie** (QR/lien, sans mot de passe) tout en corrigeant les faiblesses.

### Identités

- **Admin** : utilisateur Supabase Auth (email/mot de passe), claim `role=admin`.
- **Coach / Juge** : identités **provisionnées** à l'ouverture/affectation. Deux options :

| Option | Principe | Sécurité |
|--------|----------|----------|
| **A. Token aléatoire stocké (recommandé)** | À l'ouverture, générer un **token aléatoire** (UUID/secret) par coach/juge, stocké en base, encodé dans le QR. Un endpoint d'échange le convertit en **JWT signé** (claims `role`, `rencontre`, `club` ou `voies`). | Token non devinable, révocable, expirable |
| **B. Magic link Supabase** | Lien Supabase Auth par identité technique. | Standard Supabase, mais change un peu l'UX |

> On garde le QR qui pointe vers une URL d'échange (`/auth/club?token=...`), équivalent
> fonctionnel de `/accounts/club?token=...`.

### Claims JWT (équivalents de `interclub`)

```text
role:      'admin' | 'coach' | 'judge'
rencontre: <id de la rencontre courante>
club:      <id du club>          (coach)
voies:     [<ids des voies>]     (judge)
```

Le **middleware Next.js** lit ces claims (remplace `pyInterClubsMiddleware`) et la
**rencontre courante** suit la même priorité (défaut global `config` ▸ préférence ▸ query).

### Provisioning / déprovisioning

- **Ouverture de rencontre** : créer une identité coach par club (token + claims).
- **Affectation juge** : créer une identité juge (token + voies).
- **Arrêt** : **révoquer** (supprimer les tokens / invalider les JWT) ; les données de
  compétition subsistent.

## 3. RLS (cloisonnement par rôle)

Les `get_queryset` de `api/views.py` deviennent des **policies RLS** fondées sur les claims :

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|----------------------|
| club, voie, grimpeur, rencontre, rencontre_voie | authentifié | `role=admin` |
| equipe | authentifié (classements) | `role=admin`, ou `role=coach` ET `club = jwt.club` ET `rencontre = jwt.rencontre` |
| score | authentifié | idem equipe (via `equipe.club`/`equipe.rencontre`) |
| performance | authentifié | `role=admin` ; `role=coach` (création à l'inscription, scores de son club) ; `role=juge` ET `voie = ANY(jwt.voies)` |

- **Coach** : ne lit/écrit que ses équipes/scores de la rencontre courante (filtre
  `grimpeur`/`club`/`rencontre`).
- **Juge** : ne lit/écrit que les perfs des **voies affectées** (`jwt.voies`).
- **Lecture publique des classements** : exposer les vues `v_classement`/`v_equipe_points`
  en lecture (anon) si l'affichage public live est souhaité, sinon authentifié.

> Les **triggers/fonctions de scoring** (doc 02) s'exécutent en `SECURITY DEFINER` au besoin
> pour recalculer au-delà du périmètre RLS de l'appelant (un juge déclenche un recalcul
> global du classement vitesse).

## 4. Points de vigilance

- Ne jamais exposer la **clé service_role** au client ; les opérations privilégiées
  (provisioning, recalcul global) passent par des **route handlers serveur** Next.js.
- Les **tokens QR** doivent être aléatoires (option A) et **révoqués à l'arrêt**.
- Conserver les **messages d'erreur FR** (rencontre non démarrée, suppression protégée,
  8 membres max, voie déjà utilisée — doc 06 §5).
