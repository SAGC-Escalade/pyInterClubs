const { useState } = React;
const { Badge, Button, ButtonToolbar, ButtonGroup, ListGroup, ListGroupItem } = ReactBootstrap;
const { AccordionItem, AccordionHeader, AccordionCollapse, Collapse } = ReactBootstrap;

import Observer from "./observer.jsx";
import Autocomplete from "./autocomplete.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";
import PerfInput, { VoieInput } from "./perf-input.jsx";


export default function Score({ id }) {
    const [showParameters, setShowParameters] = useState(false);

    return (
        <Observer endpoint='scores' id={id} csrf={csrf}>
            {({ data: score, errors, status, action }) => {
                if (score === null) return;

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
                                        {score.clubPreteur && <sup><Badge pill bg="secondary" className="ms-1">{score.clubPreteur.nom}</Badge></sup>}
                                        <Badge bg={score.valide ? "success" : "primary"} className="me-3 ms-auto">
                                            {score.points}<span className="d-none d-sm-inline ms-1">pts</span>
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
                                                    <Autocomplete endpoint="clubs" value={score.clubPreteur} onChange={(c) => action('patch', { "clubPreteur": c?.id ?? null })}>
                                                        {({ nom, ville }) => {
                                                            return `${nom} (${ville})`;
                                                        }}
                                                    </Autocomplete>
                                                </HorizontalFormGroup>
                                                <HorizontalFormGroup label="Actions">
                                                    <ButtonToolbar>
                                                        <ButtonGroup className={"me-3" + (errors?.ordre ? " is-invalid" : "")}>
                                                            <Button onClick={() => action("ordre/up/")}><i className="fa-solid fa-angle-up fa-fw me-2"></i>Monter</Button>
                                                            <Button onClick={() => action("ordre/down/")}><i className="fa-solid fa-angle-down fa-fw me-2"></i>Descendre</Button>
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
            }}
        </Observer>
    );
}
