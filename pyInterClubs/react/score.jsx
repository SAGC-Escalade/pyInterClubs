import Observer from "./observer.jsx";

var Accordion = ReactBootstrap.Accordion,
    AccordionItem = ReactBootstrap.AccordionItem,
    AccordionHeader = ReactBootstrap.AccordionHeader,
    AccordionBody = ReactBootstrap.AccordionBody,
    AccordionCollapse = ReactBootstrap.AccordionCollapse,
    Badge = ReactBootstrap.Badge;


export function Score({ source }) {
    const [score, setScore] = React.useState({
        Grimpeur: {},
    });

    function handleChange(score) {
        setScore(score);
    }

    return (
        <AccordionItem eventKey={source}>
            <Observer source={source} onChange={handleChange}>
                <AccordionHeader>
                    <span className="w-100 d-flex">
                        <i className={score.Grimpeur.Sexe === 2 ? "sexe homme fa-solid fa-person fa-fw me-2 fa-lg" : "d-none"}></i>
                        <i className={score.Grimpeur.Sexe === 1 ? "sexe femme fa-solid fa-person-dress fa-fw me-2 fa-lg" : "d-none"}></i>
                        <span className="text-truncate">{score.Grimpeur.Nom} {score.Grimpeur.Prenom}</span>
                        <Badge bg={null} className={score.Valid ? "me-3 ms-auto text-bg-success" : "me-3 ms-auto text-bg-primary"}>
                            {score.Points}<span className="d-none d-sm-inline ms-1">pts</span>
                        </Badge>
                    </span>
                </AccordionHeader>
                <AccordionCollapse eventKey={source}>
                    <div>
                        tests
                    </div>
                </AccordionCollapse>
            </Observer>
        </AccordionItem>
    );
}

export default function Scores() {
    return (
        <Accordion defaultActiveKey="876">
            <Score source="/api/scores/876/" />
            <Score source="/api/scores/877/" />
            <Score source="/api/scores/878/" />
            <Score source="/api/scores/879/" />
            <Score source="/api/scores/880/" />
            <Score source="/api/scores/881/" />
        </Accordion>
    );
}

const root = ReactDOM.createRoot(document.getElementById("react-equipe"));
root.render(<Scores />);
