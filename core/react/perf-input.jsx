import Observer from "./observer.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";
import VoieInput from "./voie-input.jsx";


function EtatInput({ name, value, choices = undefined }) {
    if (choices === undefined)
        choices = { "A réaliser": null, "Réussie": 1, "Valorisée": 2, "Echouée": 3 }
    choices = Object.keys(choices);
    return (
        <ReactBootstrap.FormSelect name={name} defaultValue={value | ""}>
            {choices.map((label, index) => {
                return (<option value={index} key={index}>{label}</option>);
            })}
        </ReactBootstrap.FormSelect>
    );
}
function Points({ value, valid = false }) {
    return (
        <span className={"input-group-text" + (valid ? " bg-success" : "")}>
            {value}<span className="d-none d-sm-inline ms-1">pts</span>
        </span>
    );
}

function Vitesse({ name, value }) {
    return (
        <>
            <ReactBootstrap.FormControl name={name} type="text" placeholder="00:00:00.000000" defaultValue={value} />
            <button className="btn btn-outline-secondary dropdown-toggle dropdown-toggle-split" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-reference="parent">
                <span className="visually-hidden">Cas particuliers</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-end vitesse">
                <li>
                    <button className="dropdown-item" data-value="00:00:00.000000">
                        <i className="fa-regular fa-clock fa-fw me-2"></i>
                        hh:mm:ss.ffffff
                    </button>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li><h6 className="dropdown-header">Cas particuliers</h6></li>
                <li>
                    <button className="dropdown-item" data-value="Chute">
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-person-falling" data-fa-transform="shrink-2 down-2 left-2"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="rotate-52 right-5"></i>
                        </span>
                        Chute
                    </button>
                </li>
                <li>
                    <button type="button" className="dropdown-item" data-value="Abandon">
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-person-walking" data-fa-transform="flip-h shrink-2 left-2"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="rotate-52 shrink-2 right-5 up-4"></i>
                        </span>
                        Abandon
                    </button>
                </li>
            </ul>
        </>
    );
}

export default function PerfInput({ id, index }) {
    return (
        <Observer endpoint="perfs" id={id} csrf={csrf}>
            {({ data: perf }) => {
                var valide = false;
                if (perf === undefined) {
                    return (
                        <HorizontalFormGroup label="Chargement">
                            <span className="placeholder col-4" />
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie === null || perf.voie.type == 2) { // Diff
                    valide = (perf.voie && perf.etat);
                    return (
                        <HorizontalFormGroup label={"Voie " + index}>
                            <ReactBootstrap.InputGroup>
                                {!rencontre.voiesGroupees && <VoieInput name="voie" value={perf.voie?.id} choices={rencontre.voies} />}
                                <EtatInput name="etat" value={perf.etat} choices={perf.voie?.zones} />
                                <Points value={perf.points} valid={valide} />
                            </ReactBootstrap.InputGroup>
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie.type == 1) { // Bloc
                    valide = (perf.voie && perf.etat);
                    return (
                        <HorizontalFormGroup label={"Bloc " + index}>
                            <ReactBootstrap.InputGroup>
                                <EtatInput name="etat" value={perf.etat} choices={perf.voie.zones} />
                                <Points value={perf.points} valid={valide} />
                            </ReactBootstrap.InputGroup>
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie.type == 3) {// Vitesse
                    valide = (perf.voie && perf.temps);
                    return (
                        <HorizontalFormGroup label={"Temps " + index}>
                            <ReactBootstrap.InputGroup>
                                <Vitesse name="temps" value={perf.temps} />
                                <Points value={perf.points} valid={valide} />
                            </ReactBootstrap.InputGroup>
                        </HorizontalFormGroup>
                    );
                } else {
                    return (
                        <HorizontalFormGroup label="Erreur">
                            <span className="hstack">
                                <i className="fa-solid fa-triangle-exclamation fa-fw me-2 text-danger"></i> Type inconnu : {perf.type.toString()}
                            </span>
                        </HorizontalFormGroup>
                    );
                }
            }}
        </Observer>
    );
}