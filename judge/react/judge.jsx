const { useState, useRef, forwardRef } = React;
const { Badge, Button, InputGroup, ListGroup, ListGroupItem, Collapse } = ReactBootstrap;
const { Accordion, AccordionItem, AccordionHeader, AccordionCollapse } = ReactBootstrap;

import { useCRUDHandler, useSSEUpdater } from './observer.jsx';
import Autocomplete from "./autocomplete.jsx";
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
            <PerfInput id={perf.id} label={label} className="" hideVoie={true} sm={7} disabled={disabled} perf={perf} queryKey={queryKey} />
        </ListGroupItem>
    );
});
export default function ListPerf({ voie, exclude }) {
    const endpoint = `voie/${voie}/perfs/`;
    const { data: perfs, status } = useCRUDHandler({ endpoint, initialData: [] });
    useSSEUpdater({ endpoint });

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

    const sorted = perfs.sort((a, b) => `${a.grimpeur?.nom} ${a.grimpeur?.prenom}`.localeCompare(`${b.grimpeur?.nom} ${b.grimpeur?.prenom}`))
    const valides = sorted.filter((perf) => perf.points !== null);
    const invalides = sorted.filter((perf) => perf.points === null);

    return (
        <>
            <FlipMove typeName="ul" className="list-group list-group-flush" maintainContainerHeight={true}>
                {invalides.map(function (perf, index) {
                    const show = !(exclude && `${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`.search(new RegExp(exclude, "i")) == -1);
                    return (<ListPerfItem key={perf.id} perf={perf} show={show} queryKey={endpoint} />);
                })}
            </FlipMove>
            <div className="card-footer p-0">
                <Accordion flush={true} style={{
                    "--bs-accordion-btn-bg": "rgba(0,0,0,0.03)",
                    "--bs-accordion-active-bg": "rgba(0,0,0,0.03)",
                    "--bs-accordion-active-color": "var(--bs-body-color)"
                }} >
                    <AccordionItem eventKey={voie} className="rounded-bottom">
                        <AccordionHeader>
                            Grimpeurs déjà passés : {valides.length}
                        </AccordionHeader>
                        <AccordionCollapse eventKey={voie}>
                            <FlipMove typeName="ul" className="list-group list-group-flush rounded-bottom" maintainContainerHeight={true}>
                                {valides.map(function (perf, index) {
                                    const show = !(exclude && `${perf.grimpeur?.nom} ${perf.grimpeur?.prenom} ${perf.grimpeur?.club_nom}`.search(new RegExp(exclude, "i")) == -1);
                                    return (<ListPerfItem key={perf.id} perf={perf} show={show} disabled={true} queryKey={endpoint} />);
                                })}
                            </FlipMove>
                        </AccordionCollapse>
                    </AccordionItem>
                </Accordion>
            </div>
        </>
    );
}


function ListVoiesHeader({ voie, index }) {
    const endpoint = `voie/${voie.id}/perfs/`;
    const { data: perfs } = useCRUDHandler({ endpoint, initialData: [] });
    useSSEUpdater({ endpoint });

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
                        return (<ListVoiesHeader key={voie.id} voie={voie} index={index} />);
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
