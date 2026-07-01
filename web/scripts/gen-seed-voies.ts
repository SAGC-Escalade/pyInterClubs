/**
 * Tranche 7 — génère le SQL du barème de voies de référence sur la sortie standard.
 *
 * Source unique de vérité : lib/import/voies.ts (couvert par test/tranche7/voies.test.ts).
 * Régénérer la migration après toute évolution du barème :
 *
 *   node --experimental-strip-types web/scripts/gen-seed-voies.ts > /tmp/voies.sql
 *
 * puis recoller le bloc `do $$ ... $$;` dans 0010_seed_voies_reference.sql et le
 * sous-ensemble de seed.sql. (Pas de db:reset possible ici — cf. workflow migrations
 * manuel : appliquer le SQL à la main dans le SQL editor / psql.)
 */
import { genererVoiesReference, voiesVersSql } from "../lib/import/voies.ts";

process.stdout.write(voiesVersSql(genererVoiesReference()));
