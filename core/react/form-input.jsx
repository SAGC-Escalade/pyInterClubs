export default function FormInput({ label, children, id_for_label = undefined, className="mb-3" }) {
    if (id_for_label === undefined) id_for_label = "id_" + Math.floor(Math.random() * 100000);

    return (
        <ReactBootstrap.FormGroup as={ReactBootstrap.Row} className={className} controlId={id_for_label}>
            <ReactBootstrap.FormLabel column sm={3}>{label}</ReactBootstrap.FormLabel>
            <ReactBootstrap.Col sm={9}>
                {React.Children.map(children, (child) => { return child; })}
            </ReactBootstrap.Col>
        </ReactBootstrap.FormGroup>
    );
}
