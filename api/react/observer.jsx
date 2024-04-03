const sse = new EventSource('/events/', { withCredentials: true });
sse.onerror   = ()      => { console.log("Erreur de connexion avec le canal temps réel..."); };
sse.onmessage = (event) => { console.log("message non traité :", event); };


export default function Observer({ source, children, interval = 0, csrf = undefined, auto = true }) {
    const [data, setData] = React.useState();
    const timerId = React.useRef(null);

    const readObject = () => {
        fetch(source)
            .then((response) => response.json())
            .then((data) => { setData(data); })
            .catch((err) => { console.log(err.message); });
    };
    const send = (method, data) => {
        return fetch(source, {
            method: method,
            headers: {
                Accept: "application/json",
                'Content-Type': "application/json",
                'X-CSRFToken': csrf,
            },
            body: JSON.stringify(data),
        })
            .then((response) => {
                if (response.status !== 200) {
                    console.log(response.json());
                    throw new Error(response.statusText);
                }
                //readObject();
            })
            .catch((err) => { console.log(err); });
    };
    const modifyObject = (data) => send("put", data);
    const updateObject = (data) => send("patch", data);
    const createObject = (data) => send("post", data);
    const deleteObject = (data) => send("delete", data);

    React.useEffect(() => {
        // Récupération initiales des données, Connection aux évènements push et Préparation du polling
        readObject();
        console.log('suscribing ' + source);
        sse.addEventListener(source, (ev) => { console.log("traitement du message :", ev); readObject(); });
        if (interval) { timerId.current = setInterval(get, interval * 1000); };
    }, []);

    function handleChange(ev) {
        if (!auto) return;
        ev.preventDefault();
        ev.stopPropagation();

        const data = { [ev.target.name]: ev.target.value || null };
        updateObject(data);
        return false;
    }

    return (
        <div onChange={handleChange}>
            {children(data, updateObject, createObject, deleteObject)}
        </div>
    )
}
