---
name: seed-qa
description: Génère ou étend web/supabase/seed.sql avec un jeu de données ciblé (rencontre + équipes + scoring partiel) pour tester manuellement une tranche pyInterClubs après db:reset. À utiliser pour « jeu de données de test », « seed pour tester l'écran X », « fixtures QA ».
---

# Données de QA (seed)

À défaut de tests automatisés, fabrique des fixtures reproductibles dans
`web/supabase/seed.sql` pour exercer un écran ou une règle précise. Réf. :
`docs/spec/11 §6` et le `seed.sql` existant.

## Principes

- Le seed est rejoué par `npm run db:reset` après les migrations — il doit donc
  être **idempotent** et cohérent avec le schéma courant.
- Respecter les conventions de données : enums `smallint` (1/2/3), `zones` en
  tableau ordonné, temps spéciaux (-1 min Chute / -2 min Abandon).
- Toujours poser `config.DEFAULT_RENCONTRE` vers la rencontre de démo pour que
  `/resultats` ait du contenu.

## Recettes selon la cible

- **Classement live / realtime** : 1 rencontre + 2 équipes + grimpeurs des deux
  sexes, scoring partiel pour voir le `rank()` et les animations Flip Move.
- **Ex-æquo vitesse** : plusieurs perfs vitesse à temps **identiques** + une
  Chute + un Abandon, pour vérifier rang partagé et non-incrément (doc 02 §7).
- **Validité de score** : un grimpeur complet (tous `nbBloc`+`nbDiff`+`nbVitesse`
  remplis) vs un incomplet, pour tester `v_score_points.valide`.
- **Diffs groupées** : rencontre `voies_groupees = true` avec une série de voies
  diff contiguës.

## Sortie

- Bloc SQL ajouté à `seed.sql` (ou fichier de seed dédié si volumineux), commenté
  en français, indiquant la tranche/écran ciblé.
- Vérifier : `npm run db:reset` sans erreur, puis inspection dans Supabase Studio
  (port 54323) ou via l'écran concerné.
