const { useState } = React;
const { Badge, Button, FormControl } = ReactBootstrap;

import Observer from "./observer.jsx";

export default function Ranking({ categorie }) {
    return (
        <Observer endpoint='scores' id={null} csrf={csrf} queryString="?order_by=-points&withClub=1">
            {({ data: scores = [], status }) => {
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

                var ranks = {};
                return (
                    <ul className="list-group">
                        <li className="list-group-item d-flex fw-bold" key={0} style={{ borderBottom: "2px solid black" }}>
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
                        {scores.map(function (score, index) {
                            let icon;
                            icon = "d-none";
                            if (score?.grimpeur?.sexe === 2) { icon = "sexe homme fa-solid fa-person       fa-fw fa-lg lh-1"; }
                            if (score?.grimpeur?.sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw fa-lg lh-1"; }

                            let medal = "";
                            let background = "";
                            const sexe = `${score?.grimpeur?.sexe}`;
                            const rank = (ranks[sexe] || 0) + 1;
                            ranks[sexe] = rank;
                            if (rank <= 3) {
                                background = [0, "gold", "silver", "bronze"][rank];
                                medal = (
                                    <i className="fa-layers fa-fw fa-lg me-3">
                                        <i className={`fa-solid fa-medal sexe ${sexe == 1 ? 'femme' : 'homme'}`} data-fa-transform="grow-4 down-1"></i>
                                        <i className={`fa-solid fa-circle ${background}`} data-fa-transform="shrink-2 down-4"></i>
                                        <i className={`fa-solid fa-${rank} text-white`} data-fa-transform="shrink-5 down-4"></i>
                                    </i>
                                );
                            }

                            return (
                                <li className={`list-group-item d-flex ${background}`} key={score.id}>
                                    <div className="me-2" style={{ width: "3ch" }}>{rank}.</div>
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
                                            {score.points}<span className="d-none d-sm-inline ms-1">pts</span>
                                        </Badge>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                );
            }}
        </Observer>
    );
}
