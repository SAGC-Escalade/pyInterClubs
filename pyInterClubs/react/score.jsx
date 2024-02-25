//import * as React from "react";
import Observer from "./observer.jsx";


let niveaux = [];
fetch('/api/niveaux/')
    .then((res) => { return res.json(); })
    .then((data) => { niveaux = data; });
let clubs = [];
fetch('/api/clubs/')
    .then((res) => { return res.json(); })
    .then((data) => { clubs = data; });


export function ScoreHeader({ score }) {
    let icon;
    icon = "d-none";
    if (score.Grimpeur.Sexe === 2) { icon = "sexe homme fa-solid fa-person fa-fw me-2 fa-lg"; }
    if (score.Grimpeur.Sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg"; }

    return (
        <span className="w-100 d-flex">
            <i className={icon} style={{lineHeight:1}}></i>
            <span className="text-truncate">{score.Grimpeur.Nom} {score.Grimpeur.Prenom}</span>
            <ReactBootstrap.Badge bg={score.Valid ? "success" : "primary"} className="me-3 ms-auto">
                {score.Points}<span className="d-none d-sm-inline ms-1">pts</span>
            </ReactBootstrap.Badge>
        </span>
    );
}


function FormInput({ label, children, id_for_label = undefined }) {
    if (id_for_label === undefined) id_for_label = "id_" + Math.floor(Math.random() * 100000);

    return (
        <ReactBootstrap.FormGroup as={ReactBootstrap.Row} className="mb-3" controlId={id_for_label}>
            <ReactBootstrap.FormLabel column sm={3}>{label}</ReactBootstrap.FormLabel>
            <ReactBootstrap.Col sm={9}>
                <ReactBootstrap.InputGroup>
                    {React.Children.map(children, (child) => { return child; })}
                </ReactBootstrap.InputGroup>
            </ReactBootstrap.Col>
        </ReactBootstrap.FormGroup>
    );
}


function EtatInput({ value }) {
    return (
        <ReactBootstrap.FormSelect value={value}>
            <option value="">A réaliser</option>
            <option value="1">Réussie</option>
            <option value="2">Valorisée</option>
            <option value="3">Echouée</option>
        </ReactBootstrap.FormSelect>
    );
}
function VoieInput({ value }) {
    return (
        <ReactBootstrap.FormSelect value={value}>
            {niveaux.map(function (level) {
                return (<option key={level.ID} value={level.ID}>{level.NomVoie}/{level.NiveauVoie}</option>);
            })}
        </ReactBootstrap.FormSelect>
    );
}
function Points({ value, valid=false }) {
    return (
        <span className={"input-group-text" + (valid ? " bg-success" : "")}>
            {value}<span className="d-none d-sm-inline ms-1">pts</span>
        </span>
    );
}

function Vitesse({ value }) {
    return (
        <>
            <ReactBootstrap.FormControl type="text" placeholder="00:00:00.000000" value={value} />
            <button class="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                <span class="visually-hidden">Cas particuliers</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end vitesse">
                <li>
                    <button class="dropdown-item" data-value="00:00:00.000000">
                        <i class="fa-regular fa-clock fa-fw me-2"></i>
                        hh:mm:ss.ffffff
                    </button>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li><h6 class="dropdown-header">Cas particuliers</h6></li>
                <li>
                    <button class="dropdown-item" data-value="Chute">
                        <span class="fa-layers fa-fw me-2">
                            <i class="fa-solid fa-person-falling" data-fa-transform="shrink-2 down-2 left-2"></i>
                            <i class="fa-solid fa-slash" data-fa-transform="rotate-52 right-5"></i>
                        </span>
                        Chute
                    </button>
                </li>
                <li>
                    <button type="button" class="dropdown-item" data-value="Abandon">
                        <span class="fa-layers fa-fw me-2">
                            <i class="fa-solid fa-person-walking" data-fa-transform="flip-h shrink-2 left-2"></i>
                            <i class="fa-solid fa-slash" data-fa-transform="rotate-52 shrink-2 right-5 up-4"></i>
                        </span>
                        Abandon
                    </button>
                </li>
            </ul>
        </>
    );
}


export default function Score({ eventKey, source, category=1 }) {
    const [score, setScore] = React.useState({
        Grimpeur: {},
    });

    function handleChange(score) {
        setScore(score);
    }

    return (
        <ReactBootstrap.AccordionItem eventKey={eventKey}>
            <Observer source={source} onChange={handleChange}>
                <ReactBootstrap.AccordionHeader>
                    <ScoreHeader score={score} />
                </ReactBootstrap.AccordionHeader>
                <ReactBootstrap.AccordionCollapse eventKey={eventKey}>
                    <ReactBootstrap.ListGroup variant="flush">
                        <button className="list-group-item bg-light text-left" type="button" data-bs-toggle="collapse" data-bs-target={"#bdyOptions" + score.ID} aria-expanded="false" aria-controls={"bdyOptions" + score.ID}>
                            <i className="fa-solid fa-gear fa-fw me-2"></i>
                            Paramètres
                        </button>
                        <li id={"bdyOptions" + score.ID} className="list-group-item collapse border-bottom">
                            {category == 1 && <FormInput label="Groupe"><VoieInput value={ score.IDVoie1 } /></FormInput>}
                            <FormInput label="Club prêteur">
                                <ReactBootstrap.FormSelect>
                                    {clubs.map(function (club) {
                                        return (<option key={club.ID} value={club.ID}>{club.Nom}</option>);
                                    })}
                                </ReactBootstrap.FormSelect>
                            </FormInput>
                            <FormInput label="Actions">
                                <ReactBootstrap.ButtonToolbar>
                                    <ReactBootstrap.ButtonGroup className="me-3">
                                        <ReactBootstrap.Button><i className="fa-solid fa-angle-up fa-fw me-2"></i>Monter</ReactBootstrap.Button>
                                        <ReactBootstrap.Button><i className="fa-solid fa-angle-down fa-fw me-2"></i>Descendre</ReactBootstrap.Button>
                                    </ReactBootstrap.ButtonGroup>
                                    <ReactBootstrap.ButtonGroup>
                                        <ReactBootstrap.Button variant="danger"><i className="fa-solid fa-trash fa-fw me-2"></i>Supprimer</ReactBootstrap.Button>
                                    </ReactBootstrap.ButtonGroup>
                                </ReactBootstrap.ButtonToolbar>
                            </FormInput>
                        </li>
                        <ReactBootstrap.ListGroupItem>
                            <h5>Bloc</h5>
                            <FormInput label="Bloc 1">
                                <EtatInput value={score.Bloc1} />
                                <Points value={score.PtsBloc1} valid={score.IDBloc1 != null && score.Bloc1 != null} />
                            </FormInput>
                            <FormInput label="Bloc 2">
                                <EtatInput value={score.Bloc2} />
                                <Points value={score.PtsBloc2} valid={score.IDBloc2 != null && score.Bloc2 != null} />
                            </FormInput>
                        </ReactBootstrap.ListGroupItem>
                        <ReactBootstrap.ListGroupItem>
                            <h5>Difficulté</h5>
                            <FormInput label="Voie 1">
                                {category == 2 && <VoieInput value={score.IDVoie1} />}
                                <EtatInput value={score.Voie1} />
                                <Points value={score.PtsVoie1} valid={ score.IDVoie1 != null && score.Voie1 != null } />
                            </FormInput>
                            <FormInput label="Voie 2">
                                {category == 2 && <VoieInput value={score.IDVoie2} />}
                                <EtatInput value={score.Voie2} />
                                <Points value={score.PtsVoie2} valid={score.IDVoie2 != null && score.Voie2 != null} />
                            </FormInput>
                            <FormInput label="Voie 3">
                                {category == 2 && <VoieInput value={score.IDVoie3} />}
                                <EtatInput value={score.Voie3} />
                                <Points value={score.PtsVoie3} valid={score.IDVoie3 != null && score.Voie3 != null} />
                            </FormInput>
                            {category == 2 && (
                                <FormInput label="Voie 4">
                                    <VoieInput value={score.IDVoie4} />
                                    <EtatInput value={score.Voie4} />
                                    <Points value={score.PtsVoie4} valid={score.IDVoie4 != null && score.Voie4 != null} />
                                </FormInput>
                            )}
                        </ReactBootstrap.ListGroupItem>
                        <ReactBootstrap.ListGroupItem>
                            <h5>Vitesse</h5>
                            <FormInput label="Temps">
                                <Vitesse value={score.Vitesse} />
                                <Points value={score.PtsVitesse} valid={score.Vitesse != null} />
                            </FormInput>
                        </ReactBootstrap.ListGroupItem>
                    </ReactBootstrap.ListGroup>
                </ReactBootstrap.AccordionCollapse>
            </Observer>
        </ReactBootstrap.AccordionItem>
    );
}
