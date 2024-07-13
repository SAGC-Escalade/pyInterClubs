import Observer from "./observer.jsx";
import Autocomplete from "./autocomplete.jsx";
import PerfInput from "./perf-input.jsx";
import FormInput from "./form-input.jsx";
import VoieInput from "./voie-input.jsx";


let clubs = [];
fetch('/api/clubs/')
    .then((res) => { return res.json(); })
    .then((data) => { clubs = data; });


export function ScoreHeader({ score }) {
    let icon;
    icon = "d-none";
    if (score.grimpeur.sexe === 2) { icon = "sexe homme fa-solid fa-person fa-fw me-2 fa-lg"; }
    if (score.grimpeur.sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg"; }

    return (
        <span className="w-100 d-flex">
            <i className={icon} style={{ lineHeight: 1 }}></i>
            <span className="text-truncate">{score.grimpeur.nom} {score.grimpeur.prenom}</span>
            <ReactBootstrap.Badge bg={score.valide ? "success" : "primary"} className="me-3 ms-auto">
                {score.points}<span className="d-none d-sm-inline ms-1">pts</span>
            </ReactBootstrap.Badge>
        </span>
    );
}
function ScoreForm({ score }) {
    return (
        <ReactBootstrap.ListGroup variant="flush">
            <button className="list-group-item bg-light text-left" type="button" data-bs-toggle="collapse" data-bs-target={"#bdyOptions" + score.id} aria-expanded="false" aria-controls={"bdyOptions" + score.id}>
                <i className="fa-solid fa-gear fa-fw me-2"></i>
                Paramètres
            </button>
            <li id={"bdyOptions" + score.id} className="list-group-item collapse border-bottom">
                {rencontre.voiesGroupees && <FormInput label="Groupe"><VoieInput name="groupe" value={score.groupe} choices={rencontre.voies} /></FormInput>}
                <FormInput label="Club prêteur">
                    <Autocomplete endpoint="clubs" defaultValue={score.clubPreteur} label="nom" nullable={true} />
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
            {Object.keys(score.performances).forEach(function (t, index) {
                return (
                    <ReactBootstrap.ListGroupItem key={index}>
                        <h5>{t}</h5>
                        {score.performances[t].map(function (id, index) {
                            return (<PerfInput key={id} id={id} index={index+1} />);
                        })}
                    </ReactBootstrap.ListGroupItem>
                );
            })}
            <ReactBootstrap.ListGroupItem>
                <h5>Bloc</h5>
                {score.performances.Bloc.map(function (id, index) {
                    return (<PerfInput key={id} id={id} index={index + 1} />);
                })}
            </ReactBootstrap.ListGroupItem>
            <ReactBootstrap.ListGroupItem>
                <h5>Difficulté</h5>
                {score.performances["Difficulté"].map(function (id, index) {
                    return (<PerfInput key={id} id={id} index={index + 1} />);
                })}
            </ReactBootstrap.ListGroupItem>
            <ReactBootstrap.ListGroupItem>
                <h5>Vitesse</h5>
                {score.performances.Vitesse.map(function (id, index) {
                    return (<PerfInput key={id} id={id} index={index + 1} />);
                })}
            </ReactBootstrap.ListGroupItem>
        </ReactBootstrap.ListGroup>
    );
}


export function ScoreItemPlaceholder({ eventKey }) {
    return (
        <>
            <ReactBootstrap.AccordionHeader>
                <span className="w-100 d-flex">
                    <span className="placeholder col-6"></span>
                </span>
            </ReactBootstrap.AccordionHeader>
            <ReactBootstrap.AccordionCollapse eventKey={eventKey}>
                <ReactBootstrap.ListGroup variant="flush">
                    <ReactBootstrap.ListGroupItem><span className="placeholder col-3" /></ReactBootstrap.ListGroupItem>
                    <ReactBootstrap.ListGroupItem><span className="placeholder col-3" /></ReactBootstrap.ListGroupItem>
                    <ReactBootstrap.ListGroupItem><span className="placeholder col-3" /></ReactBootstrap.ListGroupItem>
                    <ReactBootstrap.ListGroupItem><span className="placeholder col-3" /></ReactBootstrap.ListGroupItem>
                </ReactBootstrap.ListGroup>
            </ReactBootstrap.AccordionCollapse>
        </>
    );
}
function ScoreItem({ eventKey, score }) {
    return (
        <>
            <ReactBootstrap.AccordionHeader>
                <ScoreHeader score={score} />
            </ReactBootstrap.AccordionHeader>
            <ReactBootstrap.AccordionCollapse eventKey={eventKey}>
                <ScoreForm score={score} />
            </ReactBootstrap.AccordionCollapse>
        </>
    );
}


export default function Score({ eventKey, source }) {
    return (
        <ReactBootstrap.AccordionItem eventKey={eventKey}>
            <Observer endpoint={source} csrf={csrf}>
                {({ data: score }) => {
                    if (score !== undefined)
                        return (<ScoreItem eventKey={eventKey} score={score} />);
                    return (<ScoreItemPlaceholder eventKey={eventKey} score={score} />);
                }}
            </Observer>
        </ReactBootstrap.AccordionItem>
    );
}
