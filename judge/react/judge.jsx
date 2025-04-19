const { useState, useRef, forwardRef } = React;
const { Badge, Button, InputGroup, ButtonToolbar, ButtonGroup, ListGroupItem } = ReactBootstrap;
const { Accordion, Spinner } = ReactBootstrap;
const { Modal } = ReactBootstrap;

import { useCRUDHandler, useSSEUpdater } from './observer.jsx';
import Autocomplete from "./autocomplete.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";
import PerfInput from "./perf-input.jsx";


const ListPerfItem = forwardRef(({ perf, show, disabled, queryKey }, ref) => {
    let icon, color;
    icon = "fa-solid fa-person-half-dress fa-fw me-2 fa-lg"; color = "rgba(0,0,0,.3)";
    if (perf.grimpeur?.sexe === 2) { icon = "sexe homme fa-solid fa-person       fa-fw me-2 fa-lg"; color = "lightblue"; }
    if (perf.grimpeur?.sexe === 1) { icon = "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg"; color = "lightpink"; }

    const label = (
        <span className="d-inline-block text-truncate">
            <i className={icon} style={{ color: color }}></i>
            <span className={disabled ? "text-muted" : ""}>
                {perf.grimpeur?.nom} {perf.grimpeur?.prenom}
                <sup className="d-none d-lg-inline ms-2"><Badge bg="secondary">{perf.grimpeur?.club_nom}</Badge></sup>
            </span>
        </span>
    );

    return (
        <ListGroupItem className={show ? "" : "d-none"} key={perf.id} ref={ref}>
            <PerfInput id={perf.id} label={label} className="" hideVoie={true} sm={7} disabled={disabled} perf={perf} />
        </ListGroupItem>
    );
});
export default function ListPerf({ voie }) {
    const [exclude, setExclude] = useState('');
    const inputRef = useRef(null);
    const [show, setShow] = useState(false);
    const [score, setScore] = useState(null);

    const endpoint = `voie/${voie.id}/perfs/`;
    const { data: perfs, status } = useCRUDHandler({ endpoint, initialData: [] });
    const { action, status: registerStatus, errors } = useCRUDHandler({ queryKey: `${endpoint}scores`, endpoint: 'scores/', enabled: false });
    useSSEUpdater({ endpoint });

    const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    let content, footer;
    if (status.isLoading) {
        content = (
            <ul className="list-group rounded list-group-flush">
                <li className="list-group-item"><span className="placeholder w-75"></span></li>
            </ul>
        );
    }
    else if (perfs.length == 0) {
        content = (
            <ul className="list-group rounded list-group-flush">
                <li className="list-group-item">Aucun grimpeur, veuillez inscrire un grimpeur à l'aide du bouton "+".</li>
            </ul>
        );
    }
    else {
        const sorted = perfs.sort((a, b) => `${a.grimpeur?.nom} ${a.grimpeur?.prenom}`.localeCompare(`${b.grimpeur?.nom} ${b.grimpeur?.prenom}`))
        const valides = sorted.filter((perf) => perf.points !== null);
        const invalides = sorted.filter((perf) => perf.points === null);

        content = (
            <FlipMove typeName="ul" className="list-group list-group-flush" maintainContainerHeight={true}>
                {invalides.map(function (perf, index) {
                    //const show = !(exclude && `${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`.search(new RegExp(exclude, "i")) == -1);
                    //const show = !(exclude && !new RegExp(normalize(exclude), "i").test(normalize(`${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`)));
                    const show = !(exclude && !normalize(`${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`).includes(normalize(exclude)));
                    return (<ListPerfItem key={perf.id} perf={perf} show={show} queryKey={endpoint} />);
                })}
            </FlipMove>
        );
        footer = (
            <Accordion flush={true} style={{
                "--bs-accordion-btn-bg": "rgba(0,0,0,0.03)",
                "--bs-accordion-active-bg": "rgba(0,0,0,0.03)",
                "--bs-accordion-active-color": "var(--bs-body-color)"
            }} >
                <Accordion.Item eventKey={voie} className="rounded-bottom">
                    <Accordion.Header>
                        Grimpeurs déjà passés : {valides.length}
                    </Accordion.Header>
                    <Accordion.Collapse eventKey={voie}>
                        <FlipMove typeName="ul" className="list-group list-group-flush rounded-bottom" maintainContainerHeight={true}>
                            {valides.map(function (perf, index) {
                                //const show = !(exclude && `${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`.search(new RegExp(exclude, "i")) == -1);
                                //const show = !(exclude && !new RegExp(normalize(exclude), "i").test(normalize(`${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`)));
                                const show = !(exclude && !normalize(`${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`).includes(normalize(exclude)));
                                return (<ListPerfItem key={perf.id} perf={perf} show={show} disabled={false} queryKey={endpoint} />);
                            })}
                        </FlipMove>
                    </Accordion.Collapse>
                </Accordion.Item>
            </Accordion>
        );
    }


    const handleClick = async () => {
        try {
            await action(`${score.id}/register`, { voie: voie.id });
        } catch (error) { }
        setShow(false);
        setScore(null);
    };

    return (
        <>
            <div className="card-body border-bottom">
                <ButtonToolbar className={errors ? "is-invalid" : ""}>
                    <InputGroup className="flex-fill">
                        <input ref={inputRef} type="text" className="form-control"
                            value={exclude} onChange={(ev) => setExclude(ev.target.value)}
                            placeholder="Filtrer les grimpeurs inscrits"
                        />
                        <Button disabled={!exclude} variant={(exclude ? "" : "outline-") + "secondary"} onClick={() => setExclude('')}>
                            <svg class="svg-inline--fa" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="filter" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-fa-i2svg="">
                                {exclude ? (
                                    <path fill="currentColor" d="M3.9 22.9C10.5 8.9 24.5 0 40 0L472 0c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L396.4 195.6C316.2 212.1 256 283 256 368c0 27.4 6.3 53.4 17.5 76.5c-1.6-.8-3.2-1.8-4.7-2.9l-64-48c-8.1-6-12.8-15.5-12.8-25.6l0-79.1L9 65.3C-.7 53.4-2.8 36.8 3.9 22.9zM432 224a144 144 0 1 1 0 288 144 144 0 1 1 0-288zm59.3 107.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L432 345.4l-36.7-36.7c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6L409.4 368l-36.7 36.7c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0L432 390.6l36.7 36.7c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L454.6 368l36.7-36.7z" />
                                ): (
                                    <path fill="currentColor" d="M3.9 54.9C10.5 40.9 24.5 32 40 32l432 0c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9 320 448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6l0-79.1L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z" />
                                )}
                            </svg>
                            <span className="visually-hidden">Effacer le filtre</span>
                        </Button>
                    </InputGroup>

                    {!rencontre.voiesGroupees && (
                        <>
                            <InputGroup className="ms-2 d-none d-sm-inline">
                                <span className="input-group-text bg-white border-0">ou</span>
                            </InputGroup>

                            <ButtonGroup className="ms-2">
                                <Button variant="outline-secondary" onClick={() => setShow(true)}>
                                    <span className="hstack">
                                        <i className="fa-solid fa-plus fa-fw"></i>
                                        <span className="d-none d-md-inline ms-2">Inscrire</span>
                                        <span className="d-none d-lg-inline">&nbsp;un grimpeur</span>
                                    </span>
                                </Button>
                            </ButtonGroup>

                            <Modal show={show} onHide={() => setShow(false)} centered size="lg" fullscreen="sm-down">
                                <Modal.Header closeButton>
                                    <Modal.Title>Inscrire un grimpeur</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    <HorizontalFormGroup label="Grimpeur" className="">
                                        <div className="hstack">
                                            <Autocomplete className="w-100" endpoint="scores/" value={score} onChange={(s) => setScore(s)} queryKey={`voie/${voie.id}/scores/`}>
                                                {(s) => `${s.grimpeur?.nom} ${s.grimpeur?.prenom} (${s.grimpeur?.club_nom})`}
                                            </Autocomplete>
                                        </div>
                                    </HorizontalFormGroup>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="outline-secondary" onClick={() => setShow(false)}>Annuler</Button>
                                    <Button variant="primary" disabled={!score || registerStatus.isLoading} onClick={handleClick}>
                                        {registerStatus.isLoading && (
                                            <Spinner as="span" className="me-2" animation="border" variant="dark" size="sm" role="status">
                                                <span className="visually-hidden">Chargement...</span>
                                            </Spinner>
                                        )}
                                        Inscrire le grimpeur
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </>
                    )}
                </ButtonToolbar>
                {errors && Object.keys(errors).map((key) => (
                    errors[key].map((msg, i) => (<span key={`${key}-${i}`} className="invalid-feedback">{msg}</span>))
                ))}
            </div>
            {content}
            {footer && (<div className="card-footer p-0">{footer}</div>)}
        </>
    );
}


function ListVoiesHeader({ voie, index }) {
    const endpoint = `voie/${voie.id}/perfs/`;
    const { data: perfs } = useCRUDHandler({ queryKey:`header/${endpoint}`, endpoint, initialData: [] });
    useSSEUpdater({ queryKey: `header/${endpoint}`, endpoint });

    const valides = perfs.filter((perf) => perf.points !== null);
    const invalides = perfs.filter((perf) => perf.points === null);
    return (
        <li className="nav-item" role="presentation">
            <button className={"nav-link position-relative" + (index ? "" : " active")} type="button" role="tab" data-bs-toggle="tab"
                id={`v${voie.id}-tab`}
                data-bs-target={`#v${voie.id}-pane`}
            >
                {voie.nom} / {voie.niveau}
                <sup className="mx-2"><span className={"badge " + (invalides.length ? "bg-primary" : "bg-success")}>{valides.length} / {perfs.length}</span></sup>
            </button>
        </li>
    );
}
export function ListVoies({ voies }) {
    return (
        <div className="card">
            <div className="card-header">
                <span>Feuille de juge</span>
                <ul id="voies-tabs" className="mt-3 nav nav-tabs card-header-tabs" role="tablist">
                    {voies.map(function (voie, index) {
                        return (<ListVoiesHeader key={voie.id} voie={voie} index={index} />);
                    })}
                </ul>
            </div>

            {voies.map(function (voie, index) {
                return (
                    <div className="tab-content" key={voie.id}>
                        <div className={"tab-pane fade" + (index ? "" : " active show")} id={`v${voie.id}-pane`} role="tabpanel" key={voie.id}>
                            <ListPerf voie={voie} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
