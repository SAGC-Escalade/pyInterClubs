const { useState, useCallback, useEffect, useRef } = React;
const { Button, InputGroup, FormSelect, FormControl, ButtonGroup } = ReactBootstrap;
const { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, DropdownDivider, DropdownHeader } = ReactBootstrap;

import Observer from "./observer.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";


export function VoieInput({ value, choices = niveaux, onChange, size, isValid, isInvalid }) {
    const selected = !!value ? (choices.some(voie => voie.id === value) ? value : -1) : 0;
    return (
        <FormSelect value={selected} onChange={onChange} size={size} isValid={isValid} isInvalid={isInvalid}>
            {selected == -1 && <option value={-1} disabled>La voie sélectionnée n'est pas autorisée</option>}
            <option value={0} disabled>Sélectionnez une voie</option>
            {choices.map(function (voie) {
                return (<option key={voie.id} value={voie.id}>{voie.nom} ({voie.niveau})</option>);
            })}
        </FormSelect>
    );
}
export function EtatInput({ value, choices = undefined, onChange, size, isValid, isInvalid }) {
    if (choices === undefined)
        choices = { "A réaliser": null, "Chute": 0, "Valorisée": 0, "Réussie": 0 }
    choices = Object.entries(choices);
    // On désactive le select si la valeur sélectionnée rapporte 0 points (sauf si c'est la chute)
    const disabled = (choices[value] || [])[0] != "Chute" && (choices[value] || [])[1] === 0;
    return (
        <FormSelect value={value | ""} onChange={onChange} size={size} isValid={isValid} isInvalid={isInvalid} disabled={disabled}>
            {choices.map(([label, points], index) => {
                // Si l'option ne rapporte pas de points, on ne l'affiche pas (sauf si c'est celle qui est sélectionnée)
                if (points === 0 && label != "Chute" && value != index) return;
                return (<option value={index} key={index}>{label}</option>);
            })}
        </FormSelect>
    );
}
export function Points({ value }) {
    const valid = value !== null;
    return (
        <span className={"input-group-text" + (valid ? " bg-success" : "")}>
            {value ?? "-"}<span className="d-none d-sm-inline ms-1">pts</span>
        </span>
    );
}

export function Vitesse({ value, onChange:setTime }) {
    const defaultTime = "00:00:00.00";
    function format(time) {
        if (time === null) return 'A réaliser';
        if (time === 'Chute' || time === 'Abandon') return time;
        time = time.replace(/\D/g, '');
        time = time.match(/(?:(?:([0-2]?\d)??([0-5]?\d))??([0-5]?\d))??(\d\d?)$/);
        if (time === null) return defaultTime;
        const [m, hr, min, sec, cent] = time.map((x) => x?.padStart(2, '0') ?? "00");
        return `${hr}:${min}:${sec}.${cent}`;
    }

    //const [time, setTime] = useState("");
    const inputRef = useRef(null);

    const handleChange = (ev) => setTime(format(ev.target.value));
    //const handleValueChange = useEffect(() => { console.log("change value", value); setTime(format(value)); }, [value]);

    return (
        <>
            <FormControl ref={inputRef} type="text" placeholder={defaultTime} value={format(value)} onChange={handleChange} />
            <Dropdown as={ButtonGroup}>
                <DropdownToggle split variant="outline-secondary" align="end">
                    <span className="visually-hidden">Cas particuliers</span>
                </DropdownToggle>
                <DropdownMenu align="end">
                    <DropdownItem onClick={() => setTime(defaultTime)}>
                        <i className="fa-regular fa-clock fa-fw me-2"></i>
                        hh:mm:ss.ff
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownHeader>Cas particuliers</DropdownHeader>
                    <DropdownItem onClick={() => setTime("A réaliser")}>
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-slash" data-fa-mask="fa-regular fa-clock" data-fa-transform="flip-h down-1 right-1"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="flip-h" ></i>
                        </span>
                        A réaliser
                    </DropdownItem>
                    <DropdownItem onClick={() => setTime("Chute")}>
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-person-falling" data-fa-transform="shrink-2 down-2 left-2"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="rotate-52 right-5"></i>
                        </span>
                        Chute
                    </DropdownItem>
                    <DropdownItem onClick={() => setTime("Abandon")}>
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-person-walking" data-fa-transform="flip-h shrink-2 left-2"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="rotate-52 shrink-2 right-5 up-4"></i>
                        </span>
                        Abandon
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </>
    );
}

export default function PerfInput({ id, index }) {
    return (
        <Observer endpoint="perfs" id={id} csrf={csrf}>
            {({ data: perf, status, errors, action }) => {
                if (perf === undefined) {
                    return (
                        <HorizontalFormGroup label="Chargement">
                            <span className="placeholder col-4" />
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie === null || perf.voie.type == 2) { // Diff
                    return (
                        <HorizontalFormGroup label={"Voie " + index}>
                            <InputGroup className={errors ? "is-invalid" : ""}>
                                {rencontre.voiesGroupees ? (
                                    <span className="input-group-text">{perf.voie ? `${perf.voie.nom} (${perf.voie.niveau})` : "Sélectionnez un groupe"}</span>
                                ) : (
                                    <VoieInput value={perf.voie?.id} choices={rencontre.voies.filter((v) => v.type == 2)} onChange={(ev) => action('patch', { "voie": ev.target.value })} />
                                )}
                                <EtatInput value={perf.etat} choices={perf.voie?.zones} onChange={(ev) => action('patch', { "etat": ev.target.value })} />
                                <Points value={perf.points} />
                            </InputGroup>
                            {errors && Object.keys(errors).map((key) => (
                                errors[key].map((msg, i) => (<span key={`${key}-${i}`} className="invalid-feedback">{msg}</span>))
                            ))}
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie.type == 1) { // Bloc
                    return (
                        <HorizontalFormGroup label={"Bloc " + index}>
                            <InputGroup>
                                <EtatInput value={perf.etat} choices={perf.voie.zones} onChange={(ev) => action('patch', { "etat": ev.target.value })} />
                                <Points value={perf.points} />
                            </InputGroup>
                        </HorizontalFormGroup>
                    );
                } else if (perf.voie.type == 3) { // Vitesse
                    return (
                        <HorizontalFormGroup label={"Temps " + index}>
                            <InputGroup>
                                <Vitesse value={perf.temps} onChange={(value) => action('patch', { "temps": value })} />
                                <Points value={perf.points} />
                            </InputGroup>
                        </HorizontalFormGroup>
                    );
                } else {
                    return (
                        <HorizontalFormGroup label="Erreur">
                            <span className="hstack">
                                <i className="fa-solid fa-triangle-exclamation fa-fw me-2 text-danger"></i> Type inconnu : {perf?.voie?.type?.toString()}
                            </span>
                        </HorizontalFormGroup>
                    );
                }
            }}
        </Observer>
    );
}