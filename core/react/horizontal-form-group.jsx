const { FormGroup, FormLabel, Col } = ReactBootstrap;


export default function HorizontalFormGroup({ label, children, id_for_label = undefined, className = "mb-3", sm = 9 }) {
    if (id_for_label === undefined) id_for_label = "id_" + Math.floor(Math.random() * 100000);

    return (
        <FormGroup as={ReactBootstrap.Row} className={className} controlId={id_for_label}>
            <FormLabel column sm={12-sm}>{label}</FormLabel>
            <Col sm={sm}>
                {React.Children.map(children, (child) => { return child; })}
            </Col>
        </FormGroup>
    );
}
