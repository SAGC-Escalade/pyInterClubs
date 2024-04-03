export default function FormInput({ label, children, id_for_label = undefined }) {
    if (id_for_label === undefined) id_for_label = "id_" + Math.floor(Math.random() * 100000);

    return (
        <ReactBootstrap.FormGroup as={ReactBootstrap.Row} className="mb-3" controlId={id_for_label}>
            <ReactBootstrap.FormLabel column sm={3}>{label}</ReactBootstrap.FormLabel>
            <ReactBootstrap.Col sm={9}>
                <ReactBootstrap.InputGroup>
                    {React.Children.map(children, (child) => { return child; })}
                </ReactBootstrap.InputGroup>
            </ReactBootstrap.Col>
        </ReactBootstrap.FormGroup>
    );
}
