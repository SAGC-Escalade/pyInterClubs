const sse = new EventSource('/events', { withCredentials: true });
sse.onopen = () => {
    console.log("Connexion ouverte...");
};
sse.onerror = () => {
    console.log("Erreur de connexion avec les events...");
};

export default function Observer({ source, children, onChange, defaultData = {} }) {
    const [data, setData] = React.useState(defaultData);
    // const timerId = React.useRef(null);

    React.useEffect(() => {
        // Récupération initiales des données
        const polling = () => {
            fetch(source)
                .then((response) => response.json())
                .then((data) => {
                    console.log(data);
                    setData(data);
                    onChange && onChange(data);
                })
                .catch((err) => {
                    console.log(err.message);
                });
        };

        // Connection au serveur d'évènements pour écouter les mises à jours
        sse.addEventListener(source, (ev) => {
            console.log("Réception d'un event: " + ev.data);
            setData(ev.data);
            onChange && onChange(data);
        });
        // timerId.current = setInterval(polling, 10000);
    }, []);

    function handleChange(ev) {
        console.log("onChange " + source);
    }
    function handleSubmit(ev) {
        console.log("onSubmit " + source);
        ev.preventDefault();
    }

    return (
        <form action={source} method="post" onChange={handleChange} onSubmit={handleSubmit}>
            {React.Children.map(children, (child) => { return child; })}
        </form>
    )
}
