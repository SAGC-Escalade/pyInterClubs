import { describe, it, expect } from "vitest";
import {
  topicEquipes,
  topicClubEquipes,
  topicEquipe,
  topicScores,
  topicClubScores,
  topicScore,
  topicPerf,
  topicVoiePerfs,
} from "@/lib/realtime/topics";

/**
 * Tranche 6 — Constructeurs de topics Realtime. Port 1:1 des `event_id` de
 * l'ancien SSE (api/signals.py), préfixés par `rencontre:{r}:` pour isoler les
 * rencontres simultanées (doc 07 §3.1 et §4).
 */
describe("constructeurs de topics", () => {
  const r = 7;

  it("équipes de la rencontre", () => {
    expect(topicEquipes(r)).toBe("rencontre:7:equipes");
  });

  it("équipes d'un club", () => {
    expect(topicClubEquipes(r, 3)).toBe("rencontre:7:club:3:equipes");
  });

  it("une équipe", () => {
    expect(topicEquipe(r, 42)).toBe("rencontre:7:equipes:42");
  });

  it("scores de la rencontre", () => {
    expect(topicScores(r)).toBe("rencontre:7:scores");
  });

  it("scores d'un club", () => {
    expect(topicClubScores(r, 3)).toBe("rencontre:7:club:3:scores");
  });

  it("un score", () => {
    expect(topicScore(r, 12)).toBe("rencontre:7:scores:12");
  });

  it("une performance", () => {
    expect(topicPerf(r, 99)).toBe("rencontre:7:perfs:99");
  });

  it("perfs d'une voie (feuille de juge)", () => {
    expect(topicVoiePerfs(r, 5)).toBe("rencontre:7:voie:5:perfs");
  });
});
