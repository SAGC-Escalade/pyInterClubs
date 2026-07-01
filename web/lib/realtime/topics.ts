/**
 * Tranche 6 — Constructeurs de topics Realtime (broadcast).
 * Port 1:1 des `event_id` de l'ancien SSE `django-eventstream` (api/signals.py),
 * préfixés par `rencontre:{r}:` pour isoler les rencontres simultanées et lever
 * la limitation du canal unique (doc 07 §3.1 et §4).
 */

const prefixe = (rencontre: number) => `rencontre:${rencontre}`;

/** Collection des équipes de la rencontre. */
export const topicEquipes = (rencontre: number) => `${prefixe(rencontre)}:equipes`;

/** Équipes d'un club (vue coach). */
export const topicClubEquipes = (rencontre: number, club: number) =>
  `${prefixe(rencontre)}:club:${club}:equipes`;

/** Une équipe précise (points/valide, membres). */
export const topicEquipe = (rencontre: number, equipe: number) =>
  `${prefixe(rencontre)}:equipes:${equipe}`;

/** Collection des scores de la rencontre. */
export const topicScores = (rencontre: number) => `${prefixe(rencontre)}:scores`;

/** Scores d'un club. */
export const topicClubScores = (rencontre: number, club: number) =>
  `${prefixe(rencontre)}:club:${club}:scores`;

/** Un score précis. */
export const topicScore = (rencontre: number, score: number) =>
  `${prefixe(rencontre)}:scores:${score}`;

/** Une performance précise. */
export const topicPerf = (rencontre: number, perf: number) =>
  `${prefixe(rencontre)}:perfs:${perf}`;

/** Performances d'une voie (feuille de juge). */
export const topicVoiePerfs = (rencontre: number, voie: number) =>
  `${prefixe(rencontre)}:voie:${voie}:perfs`;
