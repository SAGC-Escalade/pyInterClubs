/**
 * Tranche 7 — import CSV des grimpeurs.
 * Port fidèle de `admin/management/commands/importClimbers.py` (doc 11 §5).
 *
 * Toute la logique de transformation/résolution est PURE et testable :
 * parse nom/prénom (MAJUSCULES = nom), déduction du sexe (colonne explicite sinon
 * liste de prénoms), résolution des 6 cas de conflit et planification de l'import
 * (compteurs + plan d'actions). La persistance (route admin) applique le plan.
 *
 * Codes sexe : 1 femme, 2 homme, 3 mixte (schéma SQL, cf. lib/constants).
 */

export type Genre = 1 | 2 | 3;

/** Structure attendue des colonnes du CSV FFME (valeurs = en-têtes source). */
export type CsvMapping = {
  club: string;
  licence: string;
  identite: string;
  dateNaissance: string;
  /** Colonne sexe optionnelle (prioritaire sur la déduction par prénom). */
  sexe?: string;
};

export const MAPPING_FFME: CsvMapping = {
  club: "Structure",
  licence: "Numéro de licence",
  identite: "Nom complet",
  dateNaissance: "Date de naissance",
};

/** Grimpeur issu d'une ligne CSV, prêt à comparer/insérer. */
export type RowGrimpeur = {
  club: string;
  licence: number;
  nom: string;
  prenom: string;
  anneeNaissance: number;
  sexe: Genre;
};

/** Grimpeur déjà présent en base (snapshot pour la résolution de conflits). */
export type GrimpeurExistant = {
  id: number;
  nom: string;
  prenom: string;
  anneeNaissance: number;
  licence: number;
  club: string;
};

export type Motif = "licence-et-club" | "licence" | "licence-dupliquee";

export type Action =
  | { type: "skip" }
  | { type: "create" }
  | { type: "move"; id: number; changements: { club: string } }
  | { type: "update"; id: number; motif: Motif; changements: Partial<GrimpeurExistant> }
  | { type: "ignore"; motif: Motif };

// --------------------------------------------------------------------------
// Parsing
// --------------------------------------------------------------------------

/** Sépare une identité « NOM Prénom » : les mots en MAJUSCULES forment le nom. */
export function parseIdentite(identite: string): { nom: string; prenom: string } {
  const nom: string[] = [];
  const prenom: string[] = [];
  for (const mot of identite.trim().split(/\s+/).filter(Boolean)) {
    if (estMajuscule(mot)) nom.push(mot);
    else prenom.push(mot);
  }
  return { nom: nom.join(" "), prenom: prenom.join(" ") };
}

/** Équivalent de str.isupper() (Python) : au moins une lettre, aucune minuscule. */
function estMajuscule(mot: string): boolean {
  return mot === mot.toUpperCase() && mot !== mot.toLowerCase();
}

/** Normalise (minuscule, accents supprimés) comme importClimbers.get_sexe. */
function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Titre à la Python str.title() (première lettre de chaque mot en majuscule). */
function titre(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s-])([a-zà-ÿ])/g, (_m, sep, c) => sep + c.toUpperCase());
}

/** Déduit le sexe d'un prénom via la liste portée (fallback mixte). */
export function getSexe(prenom: string): Genre {
  const p = normaliser(prenom);
  if (MASCULINS.has(p)) return 2;
  if (FEMININS.has(p)) return 1;
  return 3;
}

/** Sexe = colonne explicite si exploitable (F/M/1/2/…), sinon liste de prénoms. */
export function resoudreSexe(opts: {
  prenom: string;
  sexeExplicite?: string | number | null;
}): Genre {
  const explicite = normaliserSexe(opts.sexeExplicite);
  if (explicite) return explicite;
  return getSexe(opts.prenom);
}

function normaliserSexe(v: string | number | null | undefined): Genre | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (["1", "f", "femme", "féminin", "feminin"].includes(s)) return 1;
  if (["2", "m", "h", "homme", "masculin"].includes(s)) return 2;
  return null;
}

/** Parse un CSV (virgule) en lignes de grimpeurs. */
export function parseCsvGrimpeurs(
  texte: string,
  mapping: CsvMapping = MAPPING_FFME,
): RowGrimpeur[] {
  const lignes = decouperCsv(texte);
  if (lignes.length === 0) return [];
  const entetes = lignes[0];
  const idx = (nom: string) => entetes.indexOf(nom);
  const iClub = idx(mapping.club);
  const iLicence = idx(mapping.licence);
  const iIdentite = idx(mapping.identite);
  const iDate = idx(mapping.dateNaissance);
  const iSexe = mapping.sexe ? idx(mapping.sexe) : -1;

  const rows: RowGrimpeur[] = [];
  for (const champs of lignes.slice(1)) {
    if (champs.every((c) => c.trim() === "")) continue;
    const { nom, prenom } = parseIdentite(champs[iIdentite] ?? "");
    const anneeNaissance = Number((champs[iDate] ?? "").split("/")[2]);
    rows.push({
      club: titre((champs[iClub] ?? "").trim()),
      licence: Number(champs[iLicence]),
      nom,
      prenom,
      anneeNaissance,
      sexe: resoudreSexe({
        prenom,
        sexeExplicite: iSexe >= 0 ? champs[iSexe] : null,
      }),
    });
  }
  return rows;
}

/** Découpe un CSV virgule en tableau de lignes de champs (guillemets gérés). */
function decouperCsv(texte: string): string[][] {
  const lignes: string[][] = [];
  for (const brute of texte.split(/\r?\n/)) {
    if (brute === "") continue;
    const champs: string[] = [];
    let courant = "";
    let dansGuillemets = false;
    for (let i = 0; i < brute.length; i++) {
      const c = brute[i];
      if (dansGuillemets) {
        if (c === '"' && brute[i + 1] === '"') {
          courant += '"';
          i++;
        } else if (c === '"') {
          dansGuillemets = false;
        } else {
          courant += c;
        }
      } else if (c === '"') {
        dansGuillemets = true;
      } else if (c === ",") {
        champs.push(courant);
        courant = "";
      } else {
        courant += c;
      }
    }
    champs.push(courant);
    lignes.push(champs);
  }
  return lignes;
}

// --------------------------------------------------------------------------
// Résolution de conflits (précédence identique à importClimbers.handle)
// --------------------------------------------------------------------------

function eq(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
function memePersonne(c: RowGrimpeur, g: GrimpeurExistant): boolean {
  return (
    eq(c.nom, g.nom) &&
    eq(c.prenom, g.prenom) &&
    c.anneeNaissance === g.anneeNaissance
  );
}

/** Détermine l'action à mener pour un candidat face aux grimpeurs existants. */
export function resoudreConflit(
  c: RowGrimpeur,
  existants: GrimpeurExistant[],
  opts: { force: boolean },
): Action {
  // Identique => aucune modification
  if (
    existants.some(
      (g) =>
        memePersonne(c, g) && g.licence === c.licence && eq(c.club, g.club),
    )
  ) {
    return { type: "skip" };
  }

  // Licence ET club changés
  const licenceEtClub = existants.find(
    (g) => memePersonne(c, g) && g.licence !== c.licence && !eq(c.club, g.club),
  );
  if (licenceEtClub) {
    return opts.force
      ? {
          type: "update",
          id: licenceEtClub.id,
          motif: "licence-et-club",
          changements: { licence: c.licence, club: c.club },
        }
      : { type: "ignore", motif: "licence-et-club" };
  }

  // Licence changée, même club
  const licence = existants.find(
    (g) => memePersonne(c, g) && g.licence !== c.licence && eq(c.club, g.club),
  );
  if (licence) {
    return opts.force
      ? {
          type: "update",
          id: licence.id,
          motif: "licence",
          changements: { licence: c.licence },
        }
      : { type: "ignore", motif: "licence" };
  }

  // Licence déjà attribuée à un autre grimpeur
  const licenceDupliquee = existants.find(
    (g) => g.licence === c.licence && !memePersonne(c, g),
  );
  if (licenceDupliquee) {
    return opts.force
      ? {
          type: "update",
          id: licenceDupliquee.id,
          motif: "licence-dupliquee",
          changements: {
            nom: c.nom,
            prenom: c.prenom,
            anneeNaissance: c.anneeNaissance,
            club: c.club,
          },
        }
      : { type: "ignore", motif: "licence-dupliquee" };
  }

  // Changement de club (toujours appliqué)
  const club = existants.find(
    (g) => memePersonne(c, g) && g.licence === c.licence && !eq(c.club, g.club),
  );
  if (club) {
    return { type: "move", id: club.id, changements: { club: c.club } };
  }

  // Nouveau grimpeur
  return { type: "create" };
}

// --------------------------------------------------------------------------
// Planification de l'import
// --------------------------------------------------------------------------

export type Resume = {
  existed: number;
  created: number;
  updated: number;
  moved: number;
  ignored: number;
  filles: number;
  garcons: number;
  /** Clubs à créer (absents du snapshot). */
  clubs: string[];
  /** Prénoms créés non classés (sexe mixte) — à arbitrer manuellement. */
  prenomsInconnus: string[];
};

export type PlanItem = { row: RowGrimpeur; action: Action };

/**
 * Construit le plan d'import (une action par ligne) et les compteurs.
 * Fonction pure : elle simule les effets au fil de l'eau (grimpeurs créés/mis à jour
 * deviennent visibles pour les lignes suivantes, comme le fait Django).
 * Le mode « dry-run » de la route = calculer ce plan sans l'appliquer.
 */
export function planifierImport(
  rows: RowGrimpeur[],
  existants: GrimpeurExistant[],
  opts: { force?: boolean } = {},
): { plan: PlanItem[]; resume: Resume } {
  const force = opts.force ?? false;
  const etat: GrimpeurExistant[] = existants.map((g) => ({ ...g }));
  let prochainId =
    etat.reduce((max, g) => Math.max(max, g.id), 0) + 1;
  const clubsConnus = new Set(etat.map((g) => g.club.toLowerCase()));

  const resume: Resume = {
    existed: 0,
    created: 0,
    updated: 0,
    moved: 0,
    ignored: 0,
    filles: 0,
    garcons: 0,
    clubs: [],
    prenomsInconnus: [],
  };
  const plan: PlanItem[] = [];

  for (const row of rows) {
    // Club nouveau ?
    if (!clubsConnus.has(row.club.toLowerCase())) {
      clubsConnus.add(row.club.toLowerCase());
      resume.clubs.push(row.club);
    }

    const action = resoudreConflit(row, etat, { force });
    plan.push({ row, action });

    switch (action.type) {
      case "skip":
        resume.existed++;
        break;
      case "create":
        resume.created++;
        if (row.sexe === 1) resume.filles++;
        else if (row.sexe === 2) resume.garcons++;
        else {
          const p = normaliserPrenom(row.prenom);
          if (!resume.prenomsInconnus.includes(p)) resume.prenomsInconnus.push(p);
        }
        etat.push({ id: prochainId++, ...row });
        break;
      case "move": {
        resume.moved++;
        const g = etat.find((x) => x.id === action.id);
        if (g) g.club = action.changements.club;
        break;
      }
      case "update": {
        resume.updated++;
        const g = etat.find((x) => x.id === action.id);
        if (g) Object.assign(g, action.changements);
        break;
      }
      case "ignore":
        resume.ignored++;
        break;
    }
  }

  return { plan, resume };
}

function normaliserPrenom(prenom: string): string {
  return prenom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// --------------------------------------------------------------------------
// Listes de prénoms (portées verbatim de importClimbers.get_sexe)
// --------------------------------------------------------------------------

const MASCULINS = new Set<string>([
  "aaron", "achille", "adan", "adrien", "alexandre", "alexis", "alban", "albin", "amichai", "amory", "antoine", "antone gabriel",
  "anton", "antonin", "antony", "armand", "arthur", "axel", "baptiste", "benjamin", "charles", "clement", "colin", "constant",
  "corentin", "daniel", "dorian", "edgar", "ehsan", "elias", "eliot", "elliot", "eliott", "elouan", "emile", "emilien", "enzo",
  "ethan", "evan", "flavien", "francois", "gabin", "gabriel", "gaspard", "gregoire", "hadrien", "hector", "hugo", "iban", "isaac",
  "ismael", "jaden", "jean", "jean-baptiste", "jeremy", "joachim", "joanis", "jonathan", "joseph", "joris", "josue", "jules",
  "julien", "kenzo", "killian", "leo", "leo paul", "leon", "leonard", "leopold", "lino", "louis", "lucas", "luca", "luis", "maceo",
  "malo", "manoa", "marc", "marcel", "marius", "martin", "matteo", "matthieu", "mathieu", "mathis", "maxence", "maxim", "maxime",
  "michel", "micoud", "milan", "milo", "moise", "nathan", "nazim", "nael", "nicolas", "nino", "noah", "noe", "nolan", "oscar",
  "owen", "paul", "paul-anthony", "pierre", "quentin", "raphael", "rayan", "remi", "robin", "romain", "samuel", "simon",
  "theo", "thibaud", "thomas", "timeo", "timothe", "titan", "titouan", "ugo", "valentin", "victor", "vincent", "william", "wilhem",
  "yoann", "yoen", "zacharie", "zakaria",
  "alan", "aliocha", "alphonse", "anatole", "antton", "arsene", "augustin", "aymeric", "chad", "christopher", "diwan", "edouard",
  "emilio", "etienne", "evaristo", "geoffroy", "glenn", "guiglini mignonat", "harrison", "jarek", "leon-loup",
  "lorenzo", "lubin", "louis-gabriel", "lucy", "lukas", "mahe", "matty", "maximilien", "nayel", "neil", "noam", "octave", "pablo", "paco",
  "philippe", "rafael", "romeo", "sean", "slevin", "timothee", "tom", "valentino", "yann", "yanis", "yvann",
]);

const FEMININS = new Set<string>([
  "adele", "adeline", "albane", "alice", "alicia", "amandine", "amelie", "amicie", "anaelle", "anae", "anais", "ana-rose", "angele",
  "annabelle", "apolline", "arina", "astrid", "audrey", "axelle", "bahia", "beryl", "blanche", "camille", "candice", "capucine",
  "carla", "caroline", "celia", "charlotte", "chiara", "chloe", "clementine", "clemence", "cleophee", "colombe", "daphne", "diane",
  "elea", "elena", "eleonore", "elina", "elisa", "elisabeth", "elise", "ella", "elsa", "emeline", "emilie", "emiline", "emma",
  "enora", "evana", "eva", "fanny", "faustine", "fleur", "flavie", "flore", "florine", "gabrielle", "garance", "giulia", "heloise",
  "hermione", "ines", "isabelle", "julia", "julie", "juliette", "justine", "kara", "lena", "lenaic", "lila", "lily", "lina",
  "line", "lisa", "lise", "lisette", "lou", "louane", "louisa", "louise", "lucie", "lucinda", "luna", "lyz", "maelle", "maelys", "maissa",
  "mailyne", "madeleine", "margaux", "margot", "maria-cecile", "marie", "marion", "martha", "mathilde", "melanie", "meliana",
  "melina", "meline", "melissa", "mia", "mila", "mina", "meloe", "naelle", "naia", "naomi", "nine", "ninon", "noemie",
  "olivia", "orane", "paloma", "pauline", "perrine", "prune", "rebeka", "romane", "rose", "salome", "sarah", "selene", "selena",
  "serena", "sidony", "solene", "sofia", "sophie", "suzanne", "tea", "thais", "tiphaine", "valentina", "valentine", "victoria",
  "violette", "zoe",
  "aena", "agathe", "alba", "alissa", "alyssia", "anahi", "anouk", "apoline", "ariane", "arielle", "augustine", "awena", "aya", "cassandre", "calysta",
  "celeste", "charlyne", "charyne", "clara", "cloe", "colette", "constance", "dali", "dorynn", "eileen", "elya", "eloise", "emmy", "esther",
  "gaelle", "gaia", "hanae", "iliana", "isaure", "jeanne", "lara", "laura", "lea", "leane", "leonie", "lia", "lilou", "lily-anne", "lola", "loucia",
  "louna", "lucia", "lucile", "luce", "lydie", "maeva", "maialen", "mailis", "manon", "marguerite", "maya", "maylis", "maud",
  "mona", "nellie", "nina", "nora", "raphaelle", "rosie", "salena", "sidonie", "zelda", "zelie",
]);
