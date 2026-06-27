---
name: auth-provisioning
description: Implémente l'auth terrain pyInterClubs — échange token/QR → JWT, claims de rôle (role/rencontre/club/voies), résolution dans middleware.ts, RLS par rôle, et provisioning coach/juge au démarrage/arrêt d'une rencontre. À utiliser pour « login coach », « QR code », « démarrer/arrêter la rencontre », « auth juge ».
---

# Auth & provisioning terrain

Reproduit le modèle d'auth Django (token MD5 + QR + middleware injectant
rencontre/club/voies) en Supabase Auth. Réf. : `docs/spec/10-auth-et-securite.md`,
legacy `admin/models.py` (Coach/Juge), `admin/middleware.py`.

## Modèle cible

- **Identités** : tables `coach(rencontre_id, club_id, user_id, token)` et
  `juge(rencontre_id, nom, user_id, token)` existent déjà (`0001`). Le `token`
  est le secret encodé dans le QR. Ne pas reproduire le MD5 déterministe Django :
  utiliser un token aléatoire stocké en table (doc 10 §2).
- **Échange token → session** : route handler `web/app/auth/club/route.ts`
  (`?token=…`) qui, via `createAdminClient()` (service_role), retrouve le coach/juge,
  établit/rafraîchit une session Supabase et pose les cookies (cf. `lib/supabase/server.ts`).
- **Claims de rôle** : `role` ∈ {admin, coach, juge}, `rencontre`, `club` (coach),
  `voies` (juge). Sans Auth Hook, suivre l'approche `0004` : matérialiser le lien
  en table et le lire via des fonctions `security definer` (`fn_current_role()`,
  `fn_current_club()`, `fn_current_voies()`) consultées par les policies.
- **Middleware** (`web/middleware.ts`) : après `auth.getUser()`, résoudre le rôle
  et restreindre l'accès aux espaces `/admin`, `/leader`, `/judge` (équivalent de
  `pyInterClubsMiddleware`, cf. `lib/auth/admin.ts:getAdminSession`).

## RLS par rôle (migration via skill nouvelle-migration)

Sur le patron `admin_write` de `0004` :
- **coach** : INSERT/UPDATE/DELETE sur `equipe`/`score`/`performance` limités à
  `rencontre = fn_current_rencontre()` ET `club = fn_current_club()`.
- **juge** : UPDATE sur `performance` limité aux voies de `fn_current_voies()`.
- Garder `admin_write` en plus (les policies permissives s'ajoutent en OR).

## Provisioning démarrage / arrêt (doc 03 §9, doc 10)

Route handlers serveur utilisant `createAdminClient()` :
- **Démarrer** : pour chaque club de la rencontre, créer un `coach` + utilisateur
  Auth + token ; créer les `juge` selon `rencontre_voie.juge_id`. Transaction
  atomique. Génère ensuite les QR (URL `/auth/club?token=…`) + QR Wi-Fi (clé
  `config`). ⚠️ `config` ne doit jamais être exposée à `anon`.
- **Arrêter** : supprimer les comptes coach/juge (force la déconnexion), les
  données de compétition persistent.

## Vérification

- Lancer l'agent **rls-auditor** : 0 table sensible exposée `anon`, écriture
  coach/juge bien bornée, fonctions `security definer` avec `set search_path`.
- Tester : un coach ne peut écrire que sur son club ; un juge ne peut noter que
  ses voies ; un token révoqué (après arrêt) refuse la connexion.
