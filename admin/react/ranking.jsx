const { useState } = React;
const { Badge, Button, FormControl } = ReactBootstrap;

import { useCRUDHandler, useSSEUpdater } from './observer.jsx';


export default function Ranking({ gender }) {
    const { data: scores, status } = useCRUDHandler({ endpoint: "scores/", id: null, initialData: [] });
    useSSEUpdater({ endpoint: "scores/" });

    const ranking = (scores) => {
        let currentRank = 1;
        let lastPoints = scores[0]?.points || 0;

        // Ajouter le rang à chaque enfant
        return scores.map((score, index) => {
            if (index > 0 && score.points !== lastPoints) {
                currentRank = index + 1;
            }
            lastPoints = score.points;
            return { ...score, rank: currentRank };
        });
    };

    if (status.isLoading) return (
        <ul className="list-group">
            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i><span className="placeholder w-75"></span></li>
        </ul>
    );

    if (scores.length == 0) return (
        <ul className="list-group">
            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i> Aucun grimpeur inscrit</li>
        </ul>
    );

    // On classe les résultats
    const sorted = [...scores].sort((a, b) => b.points - a.points);
    // On sépare les garçons des filles
    const femmes = sorted.filter((score) => score.grimpeur?.sexe == 1);
    const hommes = sorted.filter((score) => score.grimpeur?.sexe == 2);
    // On applique les rangs
    const rankedFemmes = ranking(femmes);
    const rankedHommes = ranking(hommes);
    // On reforme le classement global
    const ranked = [...rankedFemmes, ...rankedHommes].sort((a, b) => b.points - a.points);

    return (
        <ul className="list-group">
            <li className="list-group-item d-flex fw-bold sticky-top" key={0} style={{ borderBottom: "2px solid black", top: "50px" }}>
                <div className="me-2" style={{ width: "3ch" }}>#</div>
                <div className="me-2">
                    <i className="fa-solid fa-person-half-dress fa-fw fa-lg lh-1"></i>
                </div>
                <div className="col-8 col-md-9 row">
                    <div className="col-12 col-sm-8 text-truncate">Nom</div>
                    <div className="d-none d-sm-block col-sm-4  text-truncate">Club</div>
                </div>
                <div className="text-end text-nowrap ms-auto">Score</div>
            </li>
            {ranked.map(function (score, index) {
                const sexe = score?.grimpeur?.sexe;
                let icon;
                icon = "d-none";
                if (sexe == 2) { icon = "sexe homme fa-solid fa-person       fa-fw fa-lg lh-1"; }
                if (sexe == 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw fa-lg lh-1"; }

                let medal = "";
                let background = "";
                if (score.rank <= 3) {
                    background = [0, "gold", "silver", "bronze"][score.rank];
                    let rank;
                    if      (score.rank == 1) rank = (<path fill="currentColor" d="M160 64c0-11.8-6.5-22.6-16.9-28.2s-23-5-32.8 1.6l-96 64C-.5 111.2-4.4 131 5.4 145.8s29.7 18.7 44.4 8.9L96 123.8 96 416l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0 96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-352z" transform="translate(-128 -256)"></path>)
                    else if (score.rank == 2) rank = (<path fill="currentColor" d="M142.9 96c-21.5 0-42.2 8.5-57.4 23.8L54.6 150.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L40.2 74.5C67.5 47.3 104.4 32 142.9 32C223 32 288 97 288 177.1c0 38.5-15.3 75.4-42.5 102.6L109.3 416 288 416c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 480c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9L200.2 234.5c15.2-15.2 23.8-35.9 23.8-57.4c0-44.8-36.3-81.1-81.1-81.1z" transform="translate(-160 -256)"></path>)
                    else if (score.rank == 3) rank = (<path fill="currentColor" d="M0 64C0 46.3 14.3 32 32 32l240 0c13.2 0 25 8.1 29.8 20.4s1.5 26.3-8.2 35.2L162.3 208l21.7 0c75.1 0 136 60.9 136 136s-60.9 136-136 136l-78.6 0C63 480 24.2 456 5.3 418.1l-1.9-3.8c-7.9-15.8-1.5-35 14.3-42.9s35-1.5 42.9 14.3l1.9 3.8c8.1 16.3 24.8 26.5 42.9 26.5l78.6 0c39.8 0 72-32.2 72-72s-32.2-72-72-72L80 272c-13.2 0-25-8.1-29.8-20.4s-1.5-26.3 8.2-35.2L189.7 96 32 96C14.3 96 0 81.7 0 64z" transform="translate(-160 -256)"></path>)
                    medal = (
                        <i className="fa-layers fa-fw fa-lg me-3">
                            <svg className={`svg-inline--fa sexe ${sexe == 1 ? 'femme' : 'homme'}`} aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{transformOrigin: "0.5em 0.5625em"}}>
                                <g transform="translate(256 256)">
                                    <g transform="translate(0, 32)  scale(1.25, 1.25)  rotate(0 0 0)">
                                        <path fill="currentColor" d="M4.1 38.2C1.4 34.2 0 29.4 0 24.6C0 11 11 0 24.6 0L133.9 0c11.2 0 21.7 5.9 27.4 15.5l68.5 114.1c-48.2 6.1-91.3 28.6-123.4 61.9L4.1 38.2zm503.7 0L405.6 191.5c-32.1-33.3-75.2-55.8-123.4-61.9L350.7 15.5C356.5 5.9 366.9 0 378.1 0L487.4 0C501 0 512 11 512 24.6c0 4.8-1.4 9.6-4.1 13.6zM80 336a176 176 0 1 1 352 0A176 176 0 1 1 80 336zm184.4-94.9c-3.4-7-13.3-7-16.8 0l-22.4 45.4c-1.4 2.8-4 4.7-7 5.1L168 298.9c-7.7 1.1-10.7 10.5-5.2 16l36.3 35.4c2.2 2.2 3.2 5.2 2.7 8.3l-8.6 49.9c-1.3 7.6 6.7 13.5 13.6 9.9l44.8-23.6c2.7-1.4 6-1.4 8.7 0l44.8 23.6c6.9 3.6 14.9-2.2 13.6-9.9l-8.6-49.9c-.5-3 .5-6.1 2.7-8.3l36.3-35.4c5.6-5.4 2.5-14.8-5.2-16l-50.1-7.3c-3-.4-5.7-2.4-7-5.1l-22.4-45.4z" transform="translate(-256 -256)"></path>
                                    </g>
                                </g>
                            </svg>
                            <svg className={`svg-inline--fa ${background}`} aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style={{ transformOrigin: "0.5em 0.75em" }}>
                                <g transform="translate(256 256)">
                                    <g transform="translate(0, 128)  scale(0.875, 0.875)  rotate(0 0 0)">
                                        <path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z" transform="translate(-256 -256)"></path>
                                    </g>
                                </g>
                            </svg>
                            <svg className="svg-inline--fa text-white" aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" style={{ transformOrigin: "0.3125em 0.75em" }}>
                                <g transform="translate(160 256)">
                                    <g transform="translate(0, 128)  scale(0.6875, 0.6875)  rotate(0 0 0)">
                                        {rank}
                                    </g>
                                </g>
                            </svg>
                        </i>
                    );
                }

                return (
                    <li className={`list-group-item d-flex ${background}`} key={score.id}>
                        <div className="me-2" style={{ width: "3ch" }}>{score.rank}.</div>
                        <div className="me-2">
                            <i className={icon}></i>
                        </div>
                        <div className="col-8 col-md-9 row">
                            <div className="col-12 col-sm-8 text-truncate">
                                {score.grimpeur?.nom} {score.grimpeur?.prenom}
                            </div>
                            <div className="col-12 col-sm-4 text-truncate">
                                {score?.grimpeur?.club_nom && <small className="text-muted">{score?.grimpeur?.club_nom}</small>}
                            </div>
                        </div>
                        <div className="text-end text-nowrap ms-auto">
                            {medal}
                            <Badge bg={score.valide ? "success" : "primary"}>
                                {score.points || 0}<span className="d-none d-sm-inline ms-1">pts</span>
                            </Badge>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
