const { useState, useCallback, useEffect, useRef, forwardRef } = React;
const { Button, InputGroup, FormSelect, FormControl, ButtonGroup } = ReactBootstrap;
const { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, DropdownDivider, DropdownHeader } = ReactBootstrap;

import { useCRUDHandler, useSSEUpdater } from './observer.jsx';
import HorizontalFormGroup from "./horizontal-form-group.jsx";


export function VoieInput({ value, children, choices = niveaux, onChange, size, isValid, isInvalid, disabled }) {
    const selected = !!value ? (choices.some(voie => voie.id === value) ? value : -1) : 0;
    return (
        <FormSelect value={selected} onChange={onChange} size={size} isValid={isValid} isInvalid={isInvalid} disabled={disabled}>
            {selected == -1 && <option value={-1} disabled>La voie sélectionnée n'est pas autorisée</option>}
            <option value={0} disabled>Sélectionnez une voie</option>
            {choices.map(function (voie, index) {
                return (<option key={voie.id} value={voie.id}>{children ? children(voie, index) : `${voie.nom} (${voie.niveau})`}</option>);
            })}
        </FormSelect>
    );
}
export function EtatInput({ value, choices = undefined, onChange, size, isValid, isInvalid, disabled }) {
    if (choices === undefined)
        choices = { "A réaliser": null, "Abandon": 0, "Chute": 0, "Valorisée": 0, "Réussie": 0 }
    choices = Object.entries(choices);
    const choice = choices[value] || ["Inexistant", 0];
    // On désactive le select si la valeur sélectionnée rapporte 0 points (sauf si c'est la chute)
    disabled = disabled || (choice[0] != "Chute" && choice[0] != "Abandon" && choice[1] === 0);
    return (
        <FormSelect value={value | ""} onChange={onChange} size={size} isValid={isValid} isInvalid={isInvalid} disabled={disabled}>
            {choices.map(([label, points], index) => {
                // Si l'option ne rapporte pas de points, on ne l'affiche pas (sauf si c'est celle qui est sélectionnée)
                if (points === 0 && label != "Chute" && label != "Abandon" && value != index) return;
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

export function Vitesse({ value, onChange, disabled }) {
    const defaultTime = "00:00:00.00";
    function format(time) {
        if (time === null) return 'A réaliser';
        if (time === 'Chute' || time === 'Abandon' || time === 'A réaliser') return time;
        time = time.replace(/\D/g, '');
        time = time.match(/(?:(?:([0-2]?\d)??([0-5]?\d))??([0-5]?\d))??(\d\d?)$/);
        if (time === null) return defaultTime;
        const [m, hr, min, sec, cent] = time.map((x) => x?.padStart(2, '0') ?? "00");
        return `${hr}:${min}:${sec}.${cent}`;
    }

    const [time, setTime] = useState(format(value));
    const inputRef = useRef(null);

    useEffect(() => {
        setTime(format(value));
    }, [value]);

    const handleChange = (t) => {
        t = format(t);
        setTime(t);
        if (t == 'Chute' | t == 'Abandon' | t == 'A réaliser')
            onChange(t);
    }

    return (
        <>
            <FormControl ref={inputRef} type="text" placeholder={defaultTime} value={time} disabled={disabled}
                onChange={(ev) => handleChange(ev.target.value)}
                onKeyDown={(ev) => ev.key === 'Enter' && onChange(time)}
            />
            <Dropdown as={ButtonGroup} disabled={disabled}>
                <DropdownToggle split variant="outline-secondary" align="end" disabled={disabled}>
                    <span className="visually-hidden">Cas particuliers</span>
                </DropdownToggle>
                <DropdownMenu align="end">
                    <DropdownItem onClick={() => handleChange(defaultTime)}>
                        <i className="fa-regular fa-clock fa-fw me-2"></i>
                        hh:mm:ss.ff
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownHeader>Cas particuliers</DropdownHeader>
                    <DropdownItem onClick={() => handleChange("A réaliser")}>
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-slash" data-fa-mask="fa-regular fa-clock" data-fa-transform="flip-h down-1 right-1"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="flip-h" ></i>
                        </span>
                        A réaliser
                    </DropdownItem>
                    <DropdownItem onClick={() => handleChange("Chute")}>
                        <span className="fa-layers fa-fw me-2">
                            <i className="fa-solid fa-person-falling" data-fa-transform="shrink-2 down-2 left-2"></i>
                            <i className="fa-solid fa-slash" data-fa-transform="rotate-52 right-5"></i>
                        </span>
                        Chute
                    </DropdownItem>
                    <DropdownItem onClick={() => handleChange("Abandon")}>
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

const PerfInput = forwardRef(({ id, index, label = undefined, className = "mb-3", hideVoie = false, sm = 9, disabled=false, perf, queryKey }, ref) => {
    const endpoint = `perfs/${id}/`;
    const { data, errors, status, action } = useCRUDHandler({ endpoint, enabled: !perf });
    perf = data || perf;
    useSSEUpdater({ queryKey, endpoint });

    if (perf === undefined) {
        return (
            <HorizontalFormGroup label="Chargement" className={className} sm={sm} ref={ref}>
                <span className="placeholder col-4" />
            </HorizontalFormGroup>
        );
    }

    // Diff
    if (perf.voie === null || perf.voie.type == 2) {
        const lbl = (<>
            {label ?? "Voie " + index}
            {status.isLoading ? (
                <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            ) : ""}
        </>);
        return (
            <HorizontalFormGroup label={lbl} className={className} sm={sm} ref={ref}>
                <InputGroup className={errors ? "is-invalid" : ""}>
                    {rencontre.voiesGroupees | hideVoie ? (
                        <span className="input-group-text">{perf.voie ? `${perf.voie.nom} (${perf.voie.niveau})` : "Sélectionnez un groupe"}</span>
                    ) : (
                        <VoieInput value={perf.voie?.id} choices={rencontre.voies.filter((v) => v.type == 2)} onChange={(ev) => action('patch', { "voie": ev.target.value })} disabled={disabled} />
                    )}
                    <EtatInput value={perf.etat} choices={perf.voie?.zones} onChange={(ev) => action('patch', { "etat": ev.target.value })} disabled={disabled} />
                    <Points value={perf.points} />
                </InputGroup>
                {errors && Object.keys(errors).map((key) => (
                    errors[key].map((msg, i) => (<span key={`${key}-${i}`} className="invalid-feedback">{msg}</span>))
                ))}
            </HorizontalFormGroup>
        );
    }

    // Bloc
    if (perf.voie.type == 1) {
        const lbl = (<>
            {label ?? "Bloc " + index}
            {status.isLoading ? (
                <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            ) : ""}
        </>);
        return (
            <HorizontalFormGroup label={lbl} className={className} sm={sm} ref={ref}>
                <InputGroup>
                    <EtatInput value={perf.etat} choices={perf.voie.zones} onChange={(ev) => action('patch', { "etat": ev.target.value })} disabled={disabled} />
                    <Points value={perf.points} />
                </InputGroup>
            </HorizontalFormGroup>
        );
    }

    // Vitesse
    if (perf.voie.type == 3) {
        const lbl = (<>
            {label ?? "Temps " + index}
            {status.isLoading ? (
                <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            ) : ""}
        </>);
        return (
            <HorizontalFormGroup label={lbl} className={className} sm={sm} ref={ref}>
                <InputGroup>
                    <Vitesse value={perf.temps} onChange={(value) => action('patch', { "temps": value })} disabled={disabled} />
                    <Points value={perf.points} />
                </InputGroup>
            </HorizontalFormGroup>
        );
    }

    // Erreur: type de voie inconnu
    const lbl = (<><i className="fa-solid fa-triangle-exclamation fa-fw me-2 text-danger"></i> Erreur</>);
    return (
        <HorizontalFormGroup label={lbl} className={className} sm={sm} ref={ref}>
            <span className="hstack">
                Type inconnu : {perf?.voie?.type?.toString()}
            </span>
        </HorizontalFormGroup>
    );
});
export default PerfInput;
