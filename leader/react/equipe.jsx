const { useState } = React;
const { Button, FormControl } = ReactBootstrap;
const { Accordion, AccordionItem, AccordionHeader, Collapse } = ReactBootstrap;
const { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } = ReactBootstrap;

import Observer from "./observer.jsx";
import Autocomplete from "./autocomplete.jsx";
import HorizontalFormGroup from "./horizontal-form-group.jsx";
import Score from "./score.jsx";

export function AddScore({ equipe }) {
    const [grimpeur, setGrimpeur] = useState(null);

    return (
        <Observer endpoint="scores" csrf={csrf}>
            {({ data: score, status, action, errors }) => {
                return (
                    <HorizontalFormGroup label="Grimpeur" className="">
                        <div className={"hstack" + (status.isError ? " is-invalid" : "")}>
                            <Autocomplete className="w-100" endpoint="grimpeurs" value={grimpeur} onChange={(g) => setGrimpeur(g)}>
                                {({ nom, prenom }) => {
                                    return `${nom} ${prenom}`;
                                }}
                            </Autocomplete>
                            <Button className="text-nowrap ms-3" disabled={!grimpeur}
                                onClick={() => action('create', { equipe: equipe.id, grimpeur: grimpeur.id }).then(setGrimpeur(null))}
                            >
                                <i className="fa-solid fa-plus fa-fw me-2"></i>Ajouter le grimpeur
                            </Button>
                        </div>
                        {status.isError && (
                            <div className="invalid-feedback">
                                {errors.grimpeur && <span>{errors.grimpeur}</span>}
                                {errors.non_field_errors && <span>{errors.non_field_errors}</span>}
                            </div>
                        )}
                    </HorizontalFormGroup>
                );
            }}
        </Observer>
    );
}

export default function Equipe({ id }) {
    const [showDelete, setShowDelete] = useState(false);
    const [showAdd, setShowAdd] = useState(false);

    return (
        <Observer endpoint='equipes' id={id} csrf={csrf}>
            {({ data:equipe, errors, status, action, resetErrors }) => {
                if (equipe === null) return (
                    <div className="hstack gap-1">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement...</span>
                        </div>
                        <span>Chargement...</span>
                    </div>
                );

                const disabledAddButton = !(equipe?.membres.length < 8);
                const showAddCollapsible = (showAdd || (equipe?.membres.length == 0)) && !disabledAddButton;

                return (
                    <>
                        <div className={"card" + (status.isDeleting ? " opacity-50" : "")}>
                            <div className="card-header">
                                <div className="row">
                                    {equipe === undefined ? (
                                        <>
                                            <span className="placeholder col-4" />
                                            <span className="col-5 col-sm-3" />
                                            <span className="placeholder col-2 d-none d-sm-inline" />
                                            <span className="placeholder col-3" />
                                        </>
                                    ) : (
                                        <>
                                            <label className="col-7 col-md-8 col-lg-9 col-xxl-10 col-form-label" htmlFor="id_numero">
                                                {equipe.club.nom}
                                                {status.isLoading && <div className="spinner-border spinner-border-sm text-primary ms-1"></div>}
                                            </label>
                                            <div className={"col row" + (errors ? " is-invalid" : "")}>
                                                <label className="d-none d-sm-inline col-6 col-form-label text-end" htmlFor="id_numero">Numéro</label>
                                                <div className="col-12 col-sm-6">
                                                    <FormControl name="numero" type="number" value={equipe.numero}
                                                        onChange={(e) => action('patch', { numero: e.target.value })}
                                                        isInvalid={errors && errors.numero}
                                                    />
                                                </div>
                                            </div>
                                            {errors && (
                                                <div className="col-12 invalid-feedback">
                                                    {errors.non_field_errors && <span>{errors.non_field_errors}</span>}
                                                    {errors.numero && <span className="float-end">{errors.numero}</span>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <Accordion flush>
                                {!equipe && (
                                    <>
                                        <AccordionItem eventKey={1}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={2}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={3}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={4}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={5}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={6}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={7}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                        <AccordionItem eventKey={8}>
                                            <AccordionHeader>
                                                <span className="w-100 d-flex">
                                                    <span className="placeholder col-6" />
                                                </span>
                                            </AccordionHeader>
                                        </AccordionItem>
                                    </>
                                )}
                                {equipe?.membres.map((id, index) => (
                                    <Score key={id} id={id} />
                                ))}
                            </Accordion>

                            {equipe?.membres.length < 8 && (
                                <Collapse in={showAddCollapsible}>
                                    <ul className="list-group list-group-flush">
                                        <li className="list-group-item">
                                            <AddScore equipe={equipe} />
                                        </li>
                                    </ul>
                                </Collapse>
                            )}

                            <div className="card-footer hstack gap-3">
                                <Button variant="none" disabled={disabledAddButton} onClick={() => setShowAdd(!showAdd)}>
                                    {showAddCollapsible ? (
                                        <svg class="svg-inline--fa fa-fw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" /></svg>
                                    ) : (
                                        <svg class="svg-inline--fa fa-fw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" /></svg>
                                    )}
                                    <span className="d-none d-md-inline ms-2">Ajouter un grimpeur</span>
                                </Button>
                                <Button className="ms-auto" variant="danger" disabled={!equipe} onClick={() => setShowDelete(true)}>
                                    <i className="fa-solid fa-trash fa-fw"></i><span className="d-none d-md-inline ms-2">Supprimer l'équipe</span>
                                </Button>
                            </div>
                        </div>

                        {equipe && (
                            <Modal show={showDelete} onHide={() => { setShowDelete(false); resetErrors(); }}>
                                <ModalHeader closeButton>
                                    <ModalTitle>Supprimer l'équipe ?</ModalTitle>
                                </ModalHeader>
                                <ModalBody>
                                    <span className={errors?.delete ? "is-invalid" : ""}>Voulez-vous vraiment supprimer l'équipe {equipe.numero} ?</span>
                                    {errors?.delete && <span className="invalid-feedback">{errors.delete}</span>}
                                </ModalBody>
                                <ModalFooter>
                                    <Button variant="secondary" onClick={() => { setShowDelete(false); resetErrors(); }}>
                                        <i className="fa-solid fa-arrow-left fa-fw"></i>Annuler
                                    </Button>
                                    <Button variant="danger" onClick={() => action('delete').then(() => window.location.href = '/')}>
                                        <i className="fa-solid fa-trash fa-fw"></i>Supprimer
                                    </Button>
                                </ModalFooter>
                            </Modal>
                        )}
                    </>
                );
            }}
        </Observer>
    );
}

export function ListEquipe({ flush = true }) {
    return (
        <Observer endpoint='equipes' id={null} csrf={csrf}>
            {({ data: equipes = [], status }) => {
                if (status.isLoading)
                    return (
                        <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i><span className="placeholder w-75"></span></li>
                        </ul>
                    );
                if (equipes.length == 0)
                    return (
                        <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                            <li className="list-group-item"><i className="fa-solid fa-fw me-2"></i> Aucune équipe</li>
                        </ul>
                    );

                return (
                    <ul className={"list-group rounded" + (flush ? " list-group-flush" : "")}>
                        { equipes.map(function (equipe, index) {
                            return (
                                <a key={equipe.id} href={Urls['equipe:edit'](equipe.id)} className="list-group-item list-group-item-action d-flex align-items-center">
                                    <i className="fa-solid fa-fw me-2"></i>
                                    {equipe.club?.nom || 'Nouvelle équipe'} {equipe.numero}
                                    <sup><span className="badge text-bg-light text-muted">{equipe.membres?.length || 0}</span></sup>
                                    <span className={"badge ms-auto " + (equipe.valide ? "text-bg-success" : "text-bg-primary")}>{equipe.points || 0} pts</span>
                                </a>
                            );
                        })}
                    </ul>
                );
            }}
        </Observer>
    );
}