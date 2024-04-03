import Observer from "./observer.jsx";
import Score, { ScoreItemPlaceholder } from "./score.jsx";


function EquipePlaceholder() {
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
                    <a className="btn btn-danger disabled placeholder col-12 col-md-5 col-lg-3"></a>
                </div>
            </div>
        </div>
    );
}
function EquipeForm({ equipe }) {
    return (
        <div className="card placeholder-glow">
            <div className="card-header">
                {/* Il faut mettre les non_fields_errors ici */}
                <div className="row">
                    <label className="col-9 col-sm-8 col-xl-10 col-form-label" htmlFor="id_numero">
                        {equipe.club.nom}
                    </label>
                    <label className="d-none col-2 d-sm-inline col-xl-1 col-form-label" htmlFor="id_numero">
                        Numéro
                    </label>
                    <div className="col-3 col-sm-2 col-xl-1">
                        <ReactBootstrap.FormControl name="numero" type="number" defaultValue={equipe.numero} />
                    </div>
                    {/* Il faut mettre les numero.errors ici */}
                </div>
            </div>

            <ReactBootstrap.Accordion flush>
                {equipe.membres.map(function (id, index) {
                    return (<Score key={id} eventKey={id} source={"/api/scores/" + id} />);
                })}
            </ReactBootstrap.Accordion>

            <div className="card-footer">
                <div className="row g-2 justify-content-around">
                    <a className="btn btn-primary col-12 col-md-5 col-lg-3" href="{% url 'equipe:add-score' object.id %}"><i className="fa-solid fa-plus fa-fw me-2"></i>Ajouter un grimpeur</a>
                    <a className="btn btn-danger col-12 col-md-5 col-lg-3" href=""><i className="fa-solid fa-trash fa-fw me-2"></i>Supprimer l'équipe</a>
                </div>
            </div>
        </div>
    );
}


export default function Equipe({ source }) {
    return (
        <Observer source={source} csrf={csrf}>
            {(equipe, updateEquipe, addEquipe, deleteEquipe) => {
                if (equipe !== undefined)
                    return (<EquipeForm equipe={equipe} />);
                return (<EquipePlaceholder />);
            }}
        </Observer>
    );
}
