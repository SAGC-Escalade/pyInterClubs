function Select({ id_for_label, value, options=[] }) {
    return (
        <select className="form-select" id={id_for_label}>
            <option>{value}</option>
            {options.map((item) => (
                <option>{item}</option>
            ))}
        </select>
    );
}

function Field({ label, children, id_for_label = undefined, help_text = "", errors = [] }) {
    if (id_for_label === undefined) { id_for_label = "id"+label; }
    return (
        <div className="row mb-3">
            <label className="col-3 col-form-label" htmlFor={id_for_label}>{label}</label>
            <div className="col-9">
                <div className="input-group">
                    {children}
                </div>
            </div>
            {errors.map((e) => (
                <div className="text-danger">{e}</div>
            ))}
            {help_text && (<div class="form-text">{help_text}</div>)}
        </div>
    );
}


class Score extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            score: {
                Grimpeur: {},
            },
        };
    }

    fetchData() {
        fetch('/api/scores/876/')
            .then((response) => response.json())
            .then((data) => {
                console.log(data);
                this.setState({ score: data });
            })
            .catch((err) => {
                console.log(err.message);
            });
    }

    componentDidMount() { this.fetchData(); }
    /*componentDidUpdate() { this.fetchData(); }*/

    render() {
        return (
            <div className="accordion-item">
                <h2 className="accordion-header placeholder-glow" id={"hdg" + this.state.score.ID}>
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target={"#bdy" + this.state.score.ID} aria-expanded="false" aria-controls={"bdy" + this.state.score.ID}>
                        <span className="w-100 d-flex">
                            <i className={this.state.score.Grimpeur.Sexe === 2 ? "sexe homme fa-solid fa-person fa-fw me-2 fa-lg" : "d-none"}></i>
                            <i className={this.state.score.Grimpeur.Sexe === 1 ? "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg" : "d-none"}></i>
                            <span className="text-truncate">{this.state.score.Grimpeur.Nom} {this.state.score.Grimpeur.Prenom}</span>
                            <span className={this.state.score.Valid ? "me-3 ms-auto badge text-bg-success" : "me-3 ms-auto badge text-bg-primary"}>
                                {this.state.score.Points}<span className="d-none d-sm-inline ms-1">pts</span>
                            </span>
                        </span>
                    </button>
                </h2>
                <div id={"bdy" + this.state.score.ID} className="accordion-collapse collapse collapsed" aria-labelledby={"hdg" + this.state.score.ID} data-bs-parent="#equipe">
                    <ul className="list-group list-group-flush">
                        <button className="list-group-item bg-light text-left" type="button" data-bs-toggle="collapse" data-bs-target={"#bdyOptions" + this.state.score.ID} aria-expanded="false" aria-controls={"bdyOptions" + this.state.score.ID}>
                            <i className="fa-solid fa-gear fa-fw me-2"></i>
                            Paramètres
                        </button>
                        <li id={"bdyOptions" + this.state.score.ID} className="list-group-item collapse border-bottom">
                            <Field label="groupe" >
                                <Select id_for_label="idgroupe" value={this.state.score.IDVoie1} />
                            </Field>
                            <Field label="clubpreteur" >
                                <Select id_for_label="idclubpreteur" value={this.state.score.IDClubPreteur} />
                            </Field>
                            <div className="row align-items-center">
                                <label className="col-3 col-form-label">Actions</label>
                                <div className="col-9 btn-toolbar" role="toolbar">
                                    <div className="btn-group me-3" role="group">
                                        <button type="button" className="btn btn-primary"><i className="fa-solid fa-angle-up fa-fw me-2"></i>Monter</button>
                                        <button type="button" className="btn btn-primary"><i className="fa-solid fa-angle-down fa-fw me-2"></i>Descendre</button>
                                    </div>
                                    <div className="btn-group mt-2 mt-md-0" role="group">
                                        <button type="button" className="btn btn-danger col-12 col-md-3 mt-0"><i className="fa-solid fa-trash fa-fw me-2"></i>Supprimer</button>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li className="list-group-item">
                            <h5>Difficulté</h5>
                            {
                                [
                                    { i: 1, IDValue: this.state.score.IDVoie1, Value: this.state.score.Voie1, Points: this.state.score.PtsVoie1 },
                                    { i: 2, IDValue: this.state.score.IDVoie2, Value: this.state.score.Voie2, Points: this.state.score.PtsVoie2 },
                                    { i: 3, IDValue: this.state.score.IDVoie3, Value: this.state.score.Voie3, Points: this.state.score.PtsVoie3 },
                                    { i: 4, IDValue: this.state.score.IDVoie4, Value: this.state.score.Voie4, Points: this.state.score.PtsVoie4 },
                                ].map((item) => (
                                    <Field key={item.i} label={"voie" + item.i}>
                                        <Select id_for_label={"id_idvoie"+item.i} value={item.IDValue} />
                                        <Select id_for_label={"id_voie" + item.i} value={item.Value} />
                                        <span className={(item.IDValue != null && item.Value !== null) ? "input-group-text bg-success" : "input-group-text"}>
                                            {item.Points}<span className="d-none d-sm-inline ms-1">pts</span>
                                        </span>
                                    </Field>
                                ))
                            }
                        </li>
                        <li className="list-group-item">
                            <h5>Bloc</h5>
                            <Field label="bloc1" >
                                <Select id_for_label="idbloc1" value={this.state.score.Bloc1} />
                                <span className={this.state.score.IDBloc1 != null && this.state.score.Bloc1 !== null ? "input-group-text bg-success" : "input-group-text"}>
                                    {this.state.score.PtsBloc1}<span className="d-none d-sm-inline ms-1">pts</span>
                                </span>
                            </Field>
                            <Field label="bloc2" >
                                <Select id_for_label="idbloc2" value={this.state.score.Bloc2} />
                                <span className={this.state.score.IDBloc2 != null && this.state.score.Bloc2 !== null ? "input-group-text bg-success" : "input-group-text"}>
                                    {this.state.score.PtsBloc2}<span className="d-none d-sm-inline ms-1">pts</span>
                                </span>
                            </Field>
                        </li>
                        <li className="list-group-item">
                            <h5>Vitesse</h5>
                            <Field label="vitesse" >
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
                                <span className={this.state.score.Vitesse != "" ? "input-group-text bg-success" : "input-group-text"}>
                                    {this.state.score.PtsVitesse}<span className="d-none d-sm-inline ms-1">pts</span>
                                </span>
                            </Field>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}

const root = ReactDOM.createRoot(document.getElementById("score-876"));
root.render(<Score />);
