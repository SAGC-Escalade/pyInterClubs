const { useState, useRef } = React;
const { Badge, Button, InputGroup, ListGroup, ListGroupItem } = ReactBootstrap;

import Observer from "./observer.jsx";
import Autocomplete from "./autocomplete.jsx";
import PerfInput from "./perf-input.jsx";


export default function ListPerf({ voie, exclude }) {
    return (
        <Observer endpoint={`voie/${voie}/perfs`} id={null} queryString="?order_by=grimpeur__nom&order_by=grimpeur__prenom" csrf={csrf}>
            {({ data: perfs = [], status }) => {
                if (status.isLoading)
                    return (
                        <ul className="list-group rounded list-group-flush">
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i><span className="placeholder w-75"></span></li>
                        </ul>
                    );
                if (perfs.length == 0)
                    return (
                        <ul className="list-group rounded list-group-flush">
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i> Aucun grimpeur, veuillez d'abord créer une équipe.</li>
                        </ul>
                    );

                const valides = perfs.filter((perf) => perf.points !== null);
                const invalides = perfs.filter((perf) => perf.points === null);
                return (
                    <>
                        <ListGroup variant="flush">
                            {invalides.map(function (perf, index) {
                                let icon;
                                icon = "d-none";
                                if (perf.grimpeur?.sexe === 2) { icon = "sexe homme fa-solid fa-person       fa-fw me-2 fa-lg"; }
                                if (perf.grimpeur?.sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg"; }

                                const label = (
                                    <span className="d-inline-block text-truncate">
                                        <i className={icon}></i>
                                        {perf.grimpeur?.nom} {perf.grimpeur?.prenom}
                                        <sup className="d-none d-lg-inline ms-2"><Badge bg="secondary">{perf.grimpeur?.club_nom}</Badge></sup>
                                    </span>
                                );

                                const show = !(exclude && `${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`.search(new RegExp(exclude, "i")) == -1);

                                return (
                                    <ListGroupItem className={show ? "" : "d-none"} key={perf.id}>
                                        <PerfInput id={perf.id} key={perf.id} label={label} className="" hideState={true} sm={7} />
                                    </ListGroupItem>
                                );
                            })}
                        </ListGroup>
                        <div className="card-footer">
                            Grimpeurs déjà passés : {valides.length}
                        </div>
                    </>
                );
            }}
        </Observer>
    );
}


export function ListVoies({ voies }) {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);

    return (
        <div className="card">
            <div className="card-header">
                <span>Feuille de juge</span>
                <ul id="voies-tabs" className="mt-3 nav nav-tabs card-header-tabs" role="tablist">
                    {voies.map(function (voie, index) {
                        return (
                            <Observer endpoint={`voie/${voie.id}/perfs`} id={null} csrf={csrf} key={voie.id}>
                                {({ data: perfs = [] }) => {
                                    const valides = perfs.filter((perf) => perf.points !== null);
                                    const invalides = perfs.filter((perf) => perf.points === null);
                                    return (
                                        <li className="nav-item" role="presentation">
                                            <button className={"nav-link position-relative" + (index ? "" : " active")} type="button" role="tab" data-bs-toggle="tab"
                                                id={`v${voie.id}-tab`}
                                                data-bs-target={`#v${voie.id}-pane`}
                                            >
                                                {voie.nom} / {voie.niveau}
                                                <sup className="ms-2"><span className={"badge " + (invalides.length ? "bg-primary" : "bg-success")}>{valides.length} / {perfs.length}</span></sup>
                                            </button>
                                        </li>
                                    );
                                }}
                            </Observer>
                        );
                    })}
                </ul>
            </div>

            <div className="card-body border-bottom">
                <InputGroup>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        placeholder="Filtrer les grimpeurs"
                        onChange={(ev) => setSearchTerm(ev.target.value)}
                        className="form-control"
                    />
                    <Button disabled={!searchTerm} variant={(searchTerm ? "" : "outline-") + "secondary"} onClick={() => setSearchTerm('')}>
                        <i className="fa-solid fa-filter"></i>
                        <span className="visually-hidden">Effacer le filtre</span>
                    </Button>
                </InputGroup>
            </div>

            <div className="tab-content">
                {voies.map(function (voie, index) {
                    return (
                        <div className={"tab-pane fade" + (index ? "" : " active show")} id={`v${voie.id}-pane`} role="tabpanel" key={voie.id}>
                            <ListPerf voie={voie.id} exclude={searchTerm} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
