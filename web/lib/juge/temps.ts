/**
 * Tranche 4 (juge) — temps de vitesse (doc 05 §4).
 * Stocké en `interval` Postgres. Cas spéciaux : « À réaliser » = null,
 * « Chute » = -1 min, « Abandon » = -2 min. Saisie/affichage en mm:ss.cc.
 */

export type SaisieTemps =
  | { kind: "areal" }
  | { kind: "chute" }
  | { kind: "abandon" }
  | { kind: "temps"; secondes: number };

const SEC_CHUTE = -60;
const SEC_ABANDON = -120;

/** Parse une saisie « ss.cc », « mm:ss.cc » ou « hh:mm:ss.cc » en secondes. */
export function parseChrono(saisie: string): number | null {
  const txt = saisie.trim();
  if (!txt) return null;
  const parts = txt.split(":");
  if (parts.length > 3) return null;

  let total = 0;
  for (const p of parts) {
    if (!/^\d+(\.\d+)?$/.test(p)) return null;
    total = total * 60 + parseFloat(p);
  }
  return total;
}

/** Formate des secondes en mm:ss.cc (centièmes arrondis sans débordement). */
export function formatChrono(secondes: number): string {
  const cs = Math.round(Math.abs(secondes) * 100); // centièmes
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(m)}:${p2(s)}.${p2(c)}`;
}

/** Parse un interval Postgres « [-]HH:MM:SS[.cc] » en secondes (signé). */
export function intervalVersSecondes(interval: string | null): number | null {
  if (!interval) return null;
  const m = interval
    .trim()
    .match(/^(-)?(\d+):(\d{2}):(\d{2})(\.\d+)?$/);
  if (!m) return null;
  const signe = m[1] ? -1 : 1;
  const h = Number(m[2]);
  const min = Number(m[3]);
  const s = Number(m[4]) + (m[5] ? Number(m[5]) : 0);
  return signe * (h * 3600 + min * 60 + s);
}

/** Libellé d'affichage d'un temps stocké (interval ou null). */
export function etiquetteTemps(interval: string | null): string {
  if (interval === null) return "À réaliser";
  const sec = intervalVersSecondes(interval);
  if (sec === null) return "À réaliser";
  if (sec === SEC_CHUTE) return "Chute";
  if (sec === SEC_ABANDON) return "Abandon";
  return formatChrono(sec);
}

/** Convertit une saisie en valeur `interval` à envoyer (null = à réaliser). */
export function saisieVersInterval(s: SaisieTemps): string | null {
  switch (s.kind) {
    case "areal":
      return null;
    case "chute":
      return "-1 minutes";
    case "abandon":
      return "-2 minutes";
    case "temps":
      return `${s.secondes} seconds`;
  }
}
