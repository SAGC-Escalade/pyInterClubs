const { useState } = React;
const { Badge, Button, ButtonToolbar, ButtonGroup, ListGroup, ListGroupItem } = ReactBootstrap;
const { Accordion, AccordionItem, AccordionHeader, AccordionCollapse, Collapse } = ReactBootstrap;

import { useCRUDHandler, useSSEUpdater } from './observer.jsx';
import Autocomplete from "./autocomplete.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";
import PerfInput, { VoieInput } from "./perf-input.jsx";


export default function Score({ id, score, queryKey }) {
    const [showParameters, setShowParameters] = useState(false);
    const endpoint = `scores/${id}/`;
    const { data, errors, status, action } = useCRUDHandler({ endpoint, enabled: !score });
    useSSEUpdater({ queryKey, endpoint });
    score = data || score;

    if (score === null) return;

    if (status.isError) {
        return (
            <span className="w-100 d-flex px-4 py-3">
                <i className="fa-solid fa-triangle-exclamation text-danger fa-fw fa-lg me-2"></i>
                <span className="text-truncate">{ errors.detail || errors }</span>
            </span>
        );
    }

    let icon;
    icon = "d-none";
    if (score?.grimpeur?.sexe === 2) { icon = "sexe homme fa-solid fa-person       fa-fw me-2 fa-lg"; }
    if (score?.grimpeur?.sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg"; }

    return (
        <AccordionItem className={status.isDeleting ? "deleting" : ""} eventKey={id}>
            <AccordionHeader>
                <span className="w-100 d-flex">
                    {score === undefined ? (
                        <span className="placeholder col-6" />
                    ) : (
                        <>
                            <i className={icon} style={{ lineHeight: 1 }}></i>
                            <span className="text-truncate">{score.grimpeur?.nom} {score.grimpeur?.prenom}</span>
                            {score.clubPreteur && <sup className="text-truncate"><Badge pill bg="secondary" className="ms-1">{score.clubPreteur.nom}</Badge></sup>}
                            <Badge bg={score.valide ? "success" : "primary"} className="me-3 ms-auto">
                                {score.points || 0}<span className="d-none d-sm-inline ms-1">pts</span>
                            </Badge>
                        </>
                    )}
                </span>
            </AccordionHeader>
            <AccordionCollapse eventKey={id}>
                <ListGroup variant="flush">
                    {score === undefined ? (
                        <>
                            <ListGroupItem><span className="placeholder col-3" /></ListGroupItem>
                            <ListGroupItem><span className="placeholder col-3" /></ListGroupItem>
                            <ListGroupItem><span className="placeholder col-3" /></ListGroupItem>
                            <ListGroupItem><span className="placeholder col-3" /></ListGroupItem>
                        </>
                    ) : (
                        <>
                            <ListGroupItem variant="secondary" action className="text-center" onClick={() => setShowParameters(!showParameters)}>
                                <i className="fa-solid fa-gear fa-fw me-2"></i>
                                Paramètres
                            </ListGroupItem>
                            <Collapse in={showParameters}>
                                <ListGroupItem className="border-bottom">
                                    {rencontre.voiesGroupees && (
                                        <HorizontalFormGroup label="Groupe">
                                            <VoieInput name="groupe" value={score.groupe}
                                                choices={rencontre.voies.filter((v) => v.type == 2)}
                                                onChange={(ev) => action('groupe/', { 'id': parseInt(ev.target.value) })}
                                            />
                                        </HorizontalFormGroup>
                                    )}
                                    <HorizontalFormGroup label="Club prêteur">
                                            <Autocomplete endpoint="clubs" value={score.clubPreteur}
                                                onChange={(c) => (c != score.clubPreteur) ? action('patch', { "clubPreteur": c?.id ?? null }) : null}>
                                            {({ nom, ville }) => {
                                                return `${nom} (${ville})`;
                                            }}
                                        </Autocomplete>
                                    </HorizontalFormGroup>
                                    <HorizontalFormGroup label="Actions">
                                        <ButtonToolbar>
                                            <ButtonGroup className={"me-3" + (errors?.ordre ? " is-invalid" : "")}>
                                                <Button onClick={() => action("ordre/up/")} disabled={!!queryKey}><i className="fa-solid fa-angle-up fa-fw me-2"></i>Monter</Button>
                                                <Button onClick={() => action("ordre/down/")} disabled={!!queryKey}><i className="fa-solid fa-angle-down fa-fw me-2"></i>Descendre</Button>
                                            </ButtonGroup>
                                            <ButtonGroup>
                                                <Button variant="danger" onClick={() => action('delete')}>
                                                    <i className="fa-solid fa-trash fa-fw me-2"></i>Supprimer
                                                </Button>
                                            </ButtonGroup>
                                            {errors?.ordre && <div className="invalid-feedback">{errors.ordre}</div>}
                                        </ButtonToolbar>
                                    </HorizontalFormGroup>
                                </ListGroupItem>
                            </Collapse>
                            {Object.keys(score.performances).map((t, index) => (
                                <ListGroupItem key={index}>
                                    <h5>{t}</h5>
                                    {score.performances[t].map((id, index) => (
                                        <PerfInput key={id} id={id} index={index + 1} />
                                    ))}
                                </ListGroupItem>
                            ))}
                        </>
                    )}
                </ListGroup>
            </AccordionCollapse>
        </AccordionItem>
    );
}


export function ListScore({ flush = true, club = undefined }) {
    const endpoint = `${club ? `club/${club}/` : ''}scores/`;
    const { data: scores, status } = useCRUDHandler({ endpoint, initialData: [] });
    useSSEUpdater({ endpoint });

    if (status.isLoading)
        return (
            <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i><span className="placeholder w-75"></span></li>
            </ul>
        );
    if (scores.length == 0)
        return (
            <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i> Aucun grimpeur, veuillez d'abord créer une équipe.</li>
            </ul>
        );

    const sorted = scores.sort((a, b) => `${a.grimpeur?.nom} ${a.grimpeur?.prenom}`.localeCompare(`${b.grimpeur?.nom} ${b.grimpeur?.prenom}`))

    return (
        <>
            <Accordion flush={flush} className="rounded-bottom">
                {sorted.map(function (score, index) {
                    return (
                        <Score key={score.id} queryKey={endpoint} id={score.id} score={score} />
                    );
                })}
            </Accordion>
            <div className="card-footer">
                Score cumulés : {scores.reduce((n, {points}) => n + points, 0)} pts
            </div>
        </>
    );
}