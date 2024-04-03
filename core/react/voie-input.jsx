

export default function VoieInput({ name, value, choices = niveaux }) {
    return (
        <ReactBootstrap.FormSelect name={name} defaultValue={value}>
            {choices.map(function (voie) {
                return (<option key={voie.id} value={voie.id}>{voie.nom}/{voie.niveau}</option>);
            })}
        </ReactBootstrap.FormSelect>
    );
}
