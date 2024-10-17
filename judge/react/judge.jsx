const { useState } = React;
const { Badge, Button, ButtonToolbar, ButtonGroup, ListGroup, ListGroupItem } = ReactBootstrap;
const { Accordion, AccordionItem, AccordionHeader, AccordionCollapse, Collapse } = ReactBootstrap;

import Observer from "./observer.jsx";
import Autocomplete from "./autocomplete.jsx";
import PerfInput from "./perf-input.jsx";


export default function ListPerfs({ voie, flush = true }) {
    return (
        <Observer endpoint={`voie/${voie}/perfs`} id={null} queryString="?order_by=grimpeur__nom&order_by=grimpeur__prenom" csrf={csrf}>
            {({ data: perfs = [], status }) => {
                if (status.isLoading)
                    return (
                        <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i><span className="placeholder w-75"></span></li>
                        </ul>
                    );
                if (perfs.length == 0)
                    return (
                        <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i> Aucun grimpeur, veuillez d'abord créer une équipe.</li>
                        </ul>
                    );

                return (
                    <div className="card">
                        <div className="card-header d-flex align-items-center">
                            <i className="fa-solid fa-users fa-fw me-2"></i>
                            Mes grimpeurs
                            <sup className="ms-2"><Badge bg="secondary">{perfs.length}</Badge></sup>
                            <Button className="ms-auto" variant="light">
                                <i className="fa-solid fa-plus fa-fw"></i>
                            </Button>
                        </div>
                        <ListGroup variant={flush ? "flush" : ""}>
                            {perfs.map(function (perf, index) {
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

                                return (
                                    <ListGroupItem key={perf.id}>
                                        <PerfInput id={perf.id} key={perf.id} label={label} className="" hideState={true} sm={7} />
                                    </ListGroupItem>
                                );
                            })}
                        </ListGroup>
                        <div className="card-footer">
                            Comptabiliser les grimpeurs déjà passés (pb: ils ne sont plus modifiable pour le juge)
                        </div>
                    </div>
                );
            }}
        </Observer>
    );
}