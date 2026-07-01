/**
 * Tranche 7 — barème de voies de référence.
 * Port fidèle de `admin/management/commands/addVoies.py` (doc 11 §6, doc 02 §1/§3.3).
 *
 * Les `zones` sont produites au format tableau ORDONNÉ [{label, points}] (doc 02 §6,
 * doc 11 §2) : l'ordre des zones porte l'index `etat`, il ne doit jamais être réordonné
 * par le stockage jsonb. `points` peut être null (À réaliser), un entier, ou une
 * expression littérale `{rank}` (voies de vitesse, évaluée au recalcul par rang).
 *
 * Le seed SQL rejouable généré ici remplace le sous-ensemble de voies de
 * `web/supabase/seed.sql` et alimente la migration `0010_seed_voies_reference.sql`.
 */

/** Codes : genre 1 femme / 2 homme / 3 mixte ; catégorie 1 enfants / 2 ado ;
 * type 1 bloc / 2 diff / 3 vitesse (cf. lib/constants). */
export type Genre = 1 | 2 | 3;
export type Categorie = 1 | 2;
export type TypeVoie = 1 | 2 | 3;

export type Zone = { label: string; points: number | string | null };

export type VoieSeed = {
  type: TypeVoie;
  nom: string;
  niveau: string;
  categorie: Categorie;
  genre: Genre;
  zones: Zone[];
  actif: boolean;
};

/** Dict ordonné `{label: points}` → tableau ordonné `[{label, points}]`.
 * L'ordre d'insertion des clés (chaînes) est garanti en JS et porte l'index `etat`. */
export function zonesEnTableau(
  dict: Record<string, number | string | null>,
): Zone[] {
  return Object.entries(dict).map(([label, points]) => ({ label, points }));
}

/** Génère les 40 voies « modèle » du barème (addVoies.py). */
export function genererVoiesReference(): VoieSeed[] {
  const voies: VoieSeed[] = [];

  // Voies de vitesse enfants (par genre : femme, homme)
  for (const genre of [1, 2] as const) {
    voies.push({
      type: 3,
      nom: "Vitesse",
      niveau: genre === 2 ? "Homme" : "Femme",
      categorie: 1,
      genre,
      zones: zonesEnTableau({
        "A réaliser": null,
        Abandon: 0,
        Chute: 1,
        "{rank}>44": 2,
        "{rank}>5": "11-{rank}//5",
        "{rank}<=5": "15-{rank}",
      }),
      actif: true,
    });
  }

  // Voies de vitesse adolescents (par genre : femme, homme, mixte → niveau « 2025 »)
  for (const genre of [1, 2, 3] as const) {
    voies.push({
      type: 3,
      nom: "Vitesse",
      niveau: genre === 2 ? "Homme" : genre === 1 ? "Femme" : "2025",
      categorie: 2,
      genre,
      zones: zonesEnTableau({
        "A réaliser": null,
        Abandon: 0,
        Chute: 1,
        "{rank}>50": 10,
        "{rank}<=50": "60-{rank}",
      }),
      actif: true,
    });
  }

  // Voies de bloc pour chaque catégorie (genre mixte par défaut)
  voies.push(
    bloc("1", 1, { "A réaliser": null, Chute: 0, "2e essai": 3, "1er essai": 4 }),
    bloc("2", 1, {
      "A réaliser": null,
      Chute: 0,
      "3e essai": 4,
      "2e essai": 5,
      "1er essai": 6,
    }),
    bloc("1", 2, { "A réaliser": null, Chute: 0, "Zone 1": 10, Top: 30 }),
    bloc("2", 2, {
      "A réaliser": null,
      Chute: 0,
      "Zone 2": 40,
      "Zone 1": 20,
      Top: 60,
    }),
  );

  // Voies de difficulté enfants — M1..M4
  ["4c", "5a", "5b", "5c"].forEach((niveau, i) => {
    voies.push(
      diff(`M${i + 1}`, niveau, 1, { "A réaliser": null, Chute: 0, Top: i }),
    );
  });

  // Voies de difficulté enfants — T1..T10 (+ doublons Cestas T3, T4)
  const enfantsT: [number, string][] = [
    [0, "4c"], [1, "5a"], [2, "5b"], [3, "5c"], [4, "6a"], [5, "6b"],
    [6, "6c"], [7, "7a"], [8, "7b"], [9, "7c"],
    [2, "5b"], [3, "5c"], // Voies doublées à Cestas
  ];
  for (const [i, niveau] of enfantsT) {
    voies.push(
      diff(`T${i + 1}`, niveau, 1, {
        "A réaliser": null,
        Chute: 0,
        Zone: 3 + Math.floor(i / 2) + Math.floor(i / 9),
        Top: i + 5,
      }),
    );
  }

  // Voies de difficulté adolescents — T1..T10 (+ doublons Cestas T1..T5)
  const adosT: [number, string][] = [
    [0, "4c"], [1, "5a"], [2, "5b"], [3, "5c"], [4, "6a"], [5, "6b"],
    [6, "6c"], [7, "7a"], [8, "7b"], [9, "7c"],
    [0, "4c"], [1, "5a"], [2, "5b"], [3, "5c"], [4, "6a"], // doublées à Cestas
  ];
  for (const [i, niveau] of adosT) {
    voies.push(
      diff(`T${i + 1}`, niveau, 2, {
        "A réaliser": null,
        Chute: 0,
        "Zone 2": 2 * i + 2,
        "Zone 1": 2 * i + 1,
        Top: 2 * i + 4,
      }),
    );
  }

  return voies;
}

function bloc(
  niveau: string,
  categorie: Categorie,
  zones: Record<string, number | string | null>,
): VoieSeed {
  return {
    type: 1,
    nom: "Bloc",
    niveau,
    categorie,
    genre: 3,
    zones: zonesEnTableau(zones),
    actif: true,
  };
}

function diff(
  nom: string,
  niveau: string,
  categorie: Categorie,
  zones: Record<string, number | string | null>,
): VoieSeed {
  return {
    type: 2,
    nom,
    niveau,
    categorie,
    genre: 3,
    zones: zonesEnTableau(zones),
    actif: true,
  };
}

/**
 * Émet un bloc SQL REJOUABLE insérant le barème complet dans `public.voie`.
 * Gardé par un « if not exists » (sentinelle : la vitesse Homme enfants) pour ne pas
 * dupliquer les voies à chaque exécution (pas de contrainte d'unicité sur `voie`).
 */
export function voiesVersSql(voies: VoieSeed[]): string {
  const lignes = voies
    .map((v) => {
      const zones = JSON.stringify(v.zones);
      return `    ('${sqlStr(v.nom)}', '${sqlStr(v.niveau)}', ${v.categorie}, ${v.genre}, ${v.type}, '${sqlStr(zones)}', ${v.actif})`;
    })
    .join(",\n");

  return `do $$
begin
  if not exists (
    select 1 from public.voie
    where nom = 'Vitesse' and niveau = 'Homme' and categorie = 1
  ) then
    insert into public.voie (nom, niveau, categorie, genre, type, zones, actif) values
${lignes};
  end if;
end $$;
`;
}

function sqlStr(s: string): string {
  return s.replace(/'/g, "''");
}
