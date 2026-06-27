"use client";

/**
 * Éditeur du barème `zones` d'une voie : tableau ORDONNÉ d'objets
 * { label, points }. L'index de chaque ligne = `etat` d'une performance (doc 02 §1/§6).
 *
 * `points` accepte :
 *  - vide      -> null  (zone « non réalisé », typiquement la 1ʳᵉ ligne)
 *  - entier    -> number
 *  - expression-> string (vitesse uniquement : « 60-{rank} », « 11-{rank}//5 »)
 * De même `label` peut être une condition « {rank}>50 » pour la vitesse.
 */

export type Zone = { label: string; points: number | string | null };

const pointsToText = (p: Zone["points"]) => (p === null ? "" : String(p));

const textToPoints = (t: string): Zone["points"] => {
  const s = t.trim();
  if (s === "") return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  return s; // expression {rank} (vitesse)
};

export default function ZonesEditor({
  zones,
  onChange,
}: {
  zones: Zone[];
  onChange: (zones: Zone[]) => void;
}) {
  const update = (i: number, patch: Partial<Zone>) =>
    onChange(zones.map((z, idx) => (idx === i ? { ...z, ...patch } : z)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= zones.length) return;
    const next = [...zones];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => onChange(zones.filter((_, idx) => idx !== i));
  const add = () => onChange([...zones, { label: "", points: null }]);

  return (
    <div>
      <label className="form-label">Barème (zones)</label>
      <table className="table table-sm align-middle mb-2">
        <thead>
          <tr>
            <th style={{ width: "3ch" }}>#</th>
            <th>Libellé</th>
            <th style={{ width: "12rem" }}>Points</th>
            <th style={{ width: "9rem" }} />
          </tr>
        </thead>
        <tbody>
          {zones.map((z, i) => (
            <tr key={i}>
              <td className="text-muted">{i}</td>
              <td>
                <input
                  className="form-control form-control-sm"
                  value={z.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="ex. Top, Chute, {rank}<=50"
                  required
                />
              </td>
              <td>
                <input
                  className="form-control form-control-sm"
                  value={pointsToText(z.points)}
                  onChange={(e) => update(i, { points: textToPoints(e.target.value) })}
                  placeholder="vide = non réalisé"
                />
              </td>
              <td className="text-end">
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    title="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => move(i, 1)}
                    disabled={i === zones.length - 1}
                    title="Descendre"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => remove(i)}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-sm btn-outline-primary" onClick={add}>
        + Ajouter une zone
      </button>
      <p className="form-text">
        L&apos;ordre compte : l&apos;index de la ligne est l&apos;état stocké. Laissez
        « Points » vide pour la zone « non réalisé ».
      </p>
    </div>
  );
}
