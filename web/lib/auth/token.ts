/**
 * Tranche 4 — jetons d'accès terrain (doc 10 §2).
 *
 * Le QR encode un jeton aléatoire (UUID v4) échangé contre une session via
 * /auth/club?token=… On abandonne le MD5 déterministe Django (devinable,
 * sans secret) au profit d'un jeton non devinable et révocable.
 */

// UUID v4, insensible à la casse. Rejette notamment un MD5 (32 hex sans tirets).
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Vérifie qu'un jeton respecte le format aléatoire attendu (UUID v4). */
export function isValidTokenFormat(token: unknown): boolean {
  return typeof token === "string" && UUID_V4.test(token);
}

/** Génère un jeton aléatoire non devinable, destiné au QR. */
export function generateToken(): string {
  return crypto.randomUUID();
}

/** Construit l'URL d'échange encodée dans le QR : `{base}/auth/club?token=…`. */
export function qrExchangeUrl(token: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/auth/club?token=${encodeURIComponent(token)}`;
}
