import Observer from "./observer.jsx";
import Score, { ScoreItemPlaceholder } from "./score.jsx";

function EquipePlaceholder({ deleting = false }) {
    return (
        <div className="card placeholder-glow">
            <div className="card-header">
                <div className="row">
                    <span className="placeholder col-4" />
                    <span className="col-5 col-sm-3" />
                    <span className="placeholder col-2 d-none d-sm-inline" />
                    <span className="placeholder col-3" />
                </div>
            </div>

            <ReactBootstrap.Accordion flush>
                <ScoreItemPlaceholder eventKey={1} />
                <ScoreItemPlaceholder eventKey={2} />
                <ScoreItemPlaceholder eventKey={3} />
                <ScoreItemPlaceholder eventKey={4} />
                <ScoreItemPlaceholder eventKey={5} />
                <ScoreItemPlaceholder eventKey={6} />
                <ScoreItemPlaceholder eventKey={7} />
                <ScoreItemPlaceholder eventKey={8} />
            </ReactBootstrap.Accordion>

            <div className="card-footer">
                <div className="row g-2 justify-content-around">
                    <a className="btn btn-primary disabled placeholder col-12 col-md-5 col-lg-3"></a>
                    <a className="btn btn-danger disabled placeholder col-12 col-md-5 col-lg-3">
                        {deleting && <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>}
                    </a>
                </div>
            </div>
        </div>
    );
}
function EquipeForm({ equipe, patch, remove, action, errors }) {
    return (
        <div className="card placeholder-glow">
            <div className="card-header">
                <div className="row">
                    <label className="col-7 col-md-8 col-lg-9 col-xxl-10 col-form-label" htmlFor="id_numero">
                        {equipe.club.nom}
                    </label>
                    <div className={"col row" + (errors ? " is-invalid" : "")}>
                        <label className="d-none d-sm-inline col-6 col-form-label text-end" htmlFor="id_numero">Numéro</label>
                        <div className="col-12 col-sm-6">
                            <ReactBootstrap.FormControl name="numero" type="number" value={equipe.numero}
                                onChange={(e) => patch(equipe.id, { numero: e.target.value })}
                                className={(errors && errors.numero) ? " is-invalid" : ""}
                            />
                        </div>
                    </div>
                    {
                        errors && <div className="col-12 invalid-feedback">
                            {errors.non_field_errors && <span>{errors.non_field_errors}</span>}
                            {errors.numero && <span className="float-end">{errors.numero}</span>}
                        </div>
                    }
                </div>
            </div>

            <ReactBootstrap.Accordion flush>
                {equipe.membres.map(function (id, index) {
                    return (<Score key={id} eventKey={id} source={"scores/" + id} />);
                })}
            </ReactBootstrap.Accordion>

            <div className="card-footer">
                <div className="row g-2 justify-content-around">
                    {equipe.membres.length < 8 && (
                        <a className="btn btn-primary col-12 col-md-5 col-lg-3"
                            onClick={() => action('add')}>
                            <i className="fa-solid fa-plus fa-fw me-2"></i>Ajouter un grimpeur
                        </a>
                    )}
                    <a className="btn btn-danger col-12 col-md-5 col-lg-3"
                        onClick={() => remove(equipe.id).then(() => window.location.href = '/')}
                    >
                        <i className="fa-solid fa-trash fa-fw me-2"></i>Supprimer l'équipe
                    </a>
                </div>
            </div>
        </div>
    );
}


export default function Equipe({ source }) {
    return (
        <Observer endpoint={source} csrf={csrf}>
            {({ data: equipe, partial_update, destroy, action, errors }) => {
                if (equipe === undefined || equipe === null)
                    return (<EquipePlaceholder deleting={equipe === null} />);

                return (<EquipeForm equipe={equipe} patch={partial_update} remove={destroy} action={action} errors={errors} />);
            }}
        </Observer>
    );
}

export function ListEquipe({ source, flush = true }) {
    return (
        <Observer endpoint={source} csrf={csrf}>
            {({ data: equipes, create }) => {
                if (equipes === undefined)
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