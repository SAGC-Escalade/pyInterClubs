const { useState, useEffect, useRef, useCallback } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

const eventSource = new EventSource('/events/', { withCredentials: true });
eventSource.onerror = () => { console.log("Erreur de connexion avec le canal temps réel..."); };
eventSource.onmessage = (event) => { console.log("message non traité :", event); };

const defaultBaseUri = "/api/";

export default function Observer({ baseUri = undefined, endpoint, children, id = undefined, initialData = undefined, csrf = undefined, queryString = undefined }) {
    /* Fonctions et valeurs possibles des paramètres :
     * 
     * baseUri (string): C'est la première partie du chemin de l'API, la partie fixe, généralement https://x.x.x.x/api.
     *   exemple: rencontres, scores, equipes, performances
     * endpoint (string): C'est la seconde partie du chemin de l'API, c'est aussi la première partie de l'id des events SSE
     *   exemple: rencontres, scores, equipes, performances
     * id (int, null, undefined): Défini l'id de l'objet à surveiller ou le comportement (trap d'événements SSE ou polling).
     *   int: L'id de l'objet à surveiller. La structure JSX enfant sera mise à jour en cas de modification des champs de cette instance du modèle
     *   null: Surveille la liste complète des instances du modèle. La structure JSX est MAJ en cas d'ajout/suppression ou certaines modifications des instances du modèle
     *   undefined: Désactive la surveillance. La structure JSX est MAJ par polling
     * initialData (object): Initialise les données à passer à la structure JSX enfant avant même le premier GET du modèle
     * csrf (string): Définie la chaîne CSRF utilisé lors de cette session HTML
     * querystring (string): Définie une chaîne de requête supplémentaire à ajouter à l'URI de l'API juste avant d'envoyer la requête.
     *   Permet de configurer du filtrage ou des paramètres supplémentaires attendus côté serveur.
     * children (object): Défini la structure JSX à mettre à jour
     * 
     * Dans la structure JSX enfant, il est possible d'utiliser les paramètres suivants pour la personnaliser :
     * 
     * data (object, array, null, undefined): Ce sont les données récupérées par l'API.
     *   object: Les données d'une instance d'un modèle
     *   array: Les données de plusieurs instances d'un même modèle
     *   null: Aucune donnée n'a été récupérée ou elles ont été supprimées
     *   undefined: Les données sont en cours de récupération
     * errors (object): Défini la totalité des erreurs rencontrées durant les opérations CRUDS sur le modèle
     * status (object):
     *   isLoading:  Une requête est en cours de chargement,
     *   isError:    Une requête a terminé en erreur,
     *   isSuccess:  La requête s'est terminée correctement, se référer à "data" pour utiliser les données récupérées
     *   isDeleting: Une requête de suppression est en cours d'envoi,
     * action (function): C'est une fonction utilisable pour agir sur l'API (permet de gérer les opérations CRUDS)
     * resetErrors (function): Permet de supprimer les erreurs de l'appel précédent
     */

    const queryClient = useQueryClient();       // Le gestionnaire de requêtes
    const [errors, setErrors] = useState(null);
    const isDeleting = useRef(false);
    const isSingle = !!id;
    endpoint = endpoint + (isSingle && id ? `/${id}` : '');
    const apiEndpoint = `${baseUri ?? defaultBaseUri}${endpoint}/`;

    const subscriptions = useRef({});

    /*************************************************************/
    /* Gestion des événements (MAJ modèle => interface)          */

    // MAJ des datas en fonction des événements
    const handleSSEMessage = useCallback((event) => {
        //console.log("receive", event);
        const newData = event.data ? JSON.parse(event.data) : null;
        if (newData) {
            queryClient.setQueryData(endpoint, (oldData) => {
                if (Array.isArray(oldData)) {
                    if (newData.deleted) {
                        //unsubscribe(newData.deleted.id);
                        return oldData.filter((oldItem) => oldItem.id !== newData.deleted.id);
                    } else if (oldData.findIndex((item) => item.id === newData.id) !== -1) {
                        return oldData.map((item) => (item.id === newData.id ? newData : item));
                    } else {
                        //subscribe(newData.id);
                        return [...oldData, newData];
                    }
                } else if (oldData && oldData.id === newData.id) {
                    return { ...oldData, ...newData };
                } else if (newData.deleted) {
                    return null;
                }
                return oldData;
            });
        } else {
            queryClient.invalidateQueries(endpoint);
        }
    }, [endpoint, queryClient]);

    // Abonnement aux événements d'un objet
    const subscribe = useCallback((id) => {
        // TODO: Il faudrait extraire la fin du endpoint pour faire la souscription
        // Pb: Comment justifier cela dans un composant réutilisable ?
        if (!subscriptions.current[id]) {
            //console.log(`subscribe ${endpoint}/${id}`);
            eventSource.addEventListener(`${endpoint}/${id}`, handleSSEMessage);
            subscriptions.current[id] = handleSSEMessage;
        }
    }, [handleSSEMessage]);

    // Désabonnement des événements d'un objet
    const unsubscribe = useCallback((id) => {
        const handler = subscriptions.current[id];
        if (handler) {
            //console.log(`unsubscribe ${endpoint}/${id}`);
            eventSource.removeEventListener(`${endpoint}/${id}`, handler);
            delete subscriptions.current[id];
        }
    }, []);


    /*************************************************************/
    /* Gestion des requêtes                                      */

    async function send({ method, url, data = null }) {
        const response = await fetch(url, {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf,
            },
            body: data ? JSON.stringify(data) : null,
        });
        if (!response.ok) {
            let error = await response.text();
            try {
                error = JSON.parse(error);
            } catch {
                error = {
                    non_field_errors: "Une erreur est survenue, réessayez ou contactez un administrateur.",
                    message: "Erreur " + response.status + ": " + response.statusText,
                    debug: error,
                };
            }
            throw new Error(JSON.stringify(error));
        }
        let responseData = method === 'DELETE' ? null : undefined;
        if (response.status !== 204) responseData = await response.json();
        return responseData;
    }


    /*************************************************************/
    /* Gestion des erreurs                                       */

    function handleErrors(error) {
        try {
            error = JSON.parse(error.message);
        } catch (error) {
            error = { message: error.message };
        }
        if (error.message) {
            if (error.debug)
                Toast(0, "text-bg-danger", error.debug, error.message);
            else
                Toast(1, "text-bg-danger", error.message);
        }
        setErrors(error);
    }


    /*************************************************************/
    /* Initialisation                                            */

    const { data, error: queryError, status, isFetching } = useQuery(
        endpoint,
        () => {
            if (id === undefined) return Promise.resolve(initialData);
            return send({ method: 'GET', url: apiEndpoint + (queryString ?? '') })
        },
        {
            initialData,
            enabled: id !== undefined,
            onError: (error) => handleErrors(error),
            refetchOnWindowFocus: false,    // NOTE: Supprimer une fois en Production
        }
    );

    // Abonnement/Désabonnement global
    useEffect(() => {
        if (id !== undefined) {
            //console.log(`subscribe ${endpoint}`);
            eventSource.addEventListener(endpoint, handleSSEMessage);

            return () => {
                eventSource.removeEventListener(endpoint, handleSSEMessage);
                // Nettoyage de tous les abonnements
                Object.keys(subscriptions.current).forEach(unsubscribe);
            };
        }
    }, [endpoint, handleSSEMessage, unsubscribe]);

    // On s'abonne à chaque sous-objet quand les données récupérées sont une liste d'objets
    useEffect(() => {
        if (id !== undefined && Array.isArray(data)) {
            data.forEach((item) => {
                if (item && item.id) {
                    subscribe(item.id);
                }
            });
        }
    }, [data, subscribe]);


    /*************************************************************/
    /* Gestion des actions utilisateur                           */

    const mutation = useMutation(
        async ({ method, data, action }) => {
            setErrors(undefined);
            isDeleting.current = (method === 'DELETE');

            const url = apiEndpoint + (action ?? '') + (queryString ?? '');
            return send({ method, url, data });
        },
        {
            onMutate: async ({ method, data }) => {
                await queryClient.cancelQueries(endpoint);
                return queryClient.getQueryData(endpoint);
            },
            onError: (error, variables, context) => {
                handleErrors(error);
                // Rollback
                queryClient.setQueryData(endpoint, context.previousData);
            },
            onSuccess: (responseData, { method, data }, context) => {
                // Real update
                queryClient.setQueryData(endpoint, (oldData) => {
                    if (Array.isArray(oldData)) {
                        if (method === 'POST') {
                            //subscribe(responseData.id);
                            return oldData.map((oldItem) => (oldItem.id === 0 ? responseData : oldItem));
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map((oldItem) => (oldItem.id === responseData.id ? responseData : oldItem));
                        } else if (method === 'DELETE') {
                            //unsubscribe(responseData.id);
                            return oldData.filter((oldItem) => oldItem.id !== data.id);
                        }
                    } else {
                        if (method === 'PUT' || method === 'PATCH') {
                            return { ...oldData, ...responseData };
                        } else if (method === 'DELETE') {
                            return null;
                        }
                    }
                    return responseData !== undefined ? responseData : oldData;
                });
                // On invalide pas la requête, mais cela pourrai être nécessaire en cas de polling (que l'on rajoutera plus tard)
                //queryClient.invalidateQueries(endpoint, { refetchInactive: false });
            },
            onSettled: () => {
                isDeleting.current = false;
            },
        }
    );

    // Méthode asynchrone de mutation pré-paramétrée pour les sous-composants
    const mutateAsync = useCallback((action = 'read', data = null) => {
        const methods = { create: "POST", read: "GET", update: "PUT", delete: "DELETE", patch: "PATCH" };
        return mutation.mutateAsync({
            method: methods[action] ?? (data ? "POST" : "GET"),
            data,
            action: methods[action] === undefined ? action : undefined,
        });
    }, [mutation]);


    /*************************************************************/
    /* Gestion du rendu                                          */

    const statuses = {
        isLoading: status === 'loading' || mutation.isLoading || isFetching,
        isError: status === 'error' || mutation.isError,
        isSuccess: status === 'success' || mutation.isSuccess,
        isDeleting: isDeleting.current,
    };

    //if (queryError) {
    //    console.log(queryError, data, errors, statuses);
    //    return <div>Error: {queryError.message}</div>;
    //}

    return children({
        data,
        errors,
        status: statuses,
        action: mutateAsync,
        resetErrors: () => setErrors(undefined),
    });
}



/**********************************************************************/
/* Observer v2                                                        */
/**********************************************************************/

/**********************************************************************/
/* CRUD Context                                                       */
/**********************************************************************/

const { createContext, useContext } = React;

const CRUDContext = createContext();

export const useCRUD = () => useContext(CRUDContext);

export const CRUDProvider = ({ baseUri = '/api/', csrf, children }) => {
    const queryClient = useQueryClient();

    const send = async ({ method, endpoint, data }) => {
        const response = await fetch(`${baseUri}${endpoint}`, {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf,
            },
            body: data ? JSON.stringify(data) : null,
        });

        if (!response.ok) {
            let error = await response.text();
            try {
                error = JSON.parse(error);
            } catch {
                error = {
                    non_field_errors: "Une erreur est survenue, réessayez ou contactez un administrateur.",
                    message: "Erreur " + response.status + ": " + response.statusText,
                    debug: error,
                };
            }
            throw new Error(JSON.stringify(error));
        }

        let responseData = method === 'DELETE' ? null : undefined;
        if (response.status !== 204) responseData = await response.json();
        return responseData;
    };

    return (
        <CRUDContext.Provider value={{ queryClient, send }}>
            {children}
        </CRUDContext.Provider>
    );
};


/**********************************************************************/
/* CRUD Handler                                                       */
/**********************************************************************/

export function useCRUDHandler({ endpoint, id, initialData, queryString, pollInterval }) {
    const { queryClient, send } = useCRUD();
    const [errors, setErrors] = useState(null);
    const isDeleting = useRef(false);

    // Gestion des erreurs
    const handleErrors = (error) => {
        try {
            error = JSON.parse(error.message);
        } catch (error) {
            error = { message: error.message };
        }
        if (error.message) {
            setErrors(error);
        }
    };

    // Requête GET pour récupérer les données
    const { data, status, isFetching } = useQuery(
        endpoint,
        () => {
            if (id === undefined) return Promise.resolve(initialData);
            return send({ method: 'GET', endpoint: `${endpoint}${id ? id + '/' : ''}${queryString ? '?' + queryString : ''}` })
        },
        {
            initialData,
            enabled: id !== undefined,
            onError: (error) => handleErrors(error),
            refetchOnWindowsFocus: false,   // NOTE: Supprimer une fois en production
            retry: 3,
            refetchInterval: pollInterval ?? false,
        }
    );

    // Gestion des mutations (POST, PUT, DELETE, etc.)
    const mutation = useMutation(
        async ({ method, action, data, extraQuery }) => {
            setErrors(null);
            isDeleting.current = (method === 'DELETE');

            const qs = `${queryString || extraQuery ? '?' : ''}${queryString ?? ''}${queryString && extraQuery ? '&' : ''}${extraQuery ?? ''}`
            const url = `${endpoint}${id ? id + '/' : ''}${action ? action + '/' : ''}${qs}`;
            return send({ method, endpoint: url, data });
        },
        {
            onMutate: async () => {
                await queryClient.cancelQueries(endpoint);
                const previousData = queryClient.getQueryData(endpoint);
                return { previousData };
            },
            onError: (error, variables, context) => {
                handleErrors(error);
                // Rollback
                queryClient.setQueryData(endpoint, context.previousData);
            },
            onSuccess: (responseData, { method }) => {
                // Met à jour le cache en fonction de la méthode
                queryClient.setQueryData(endpoint, (oldData) => {
                    if (Array.isArray(oldData)) {
                        if (method === 'POST') {
                            if (oldData.some(item => item.id === 0)) {
                                return oldData.map((item) => (item.id === 0 ? responseData : item));
                            } else {
                                return [...oldData, responseData];
                            }
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map(item => item.id === responseData.id ? responseData : item);
                        } else if (method === 'DELETE') {
                            return oldData.filter(item => item.id !== responseData.id);
                        }
                    } else {
                        if (method === 'PUT' || method === 'PATCH') {
                            return { ...oldData, ...responseData };
                        } else if (method === 'DELETE') {
                            return null;
                        }
                    }
                    return responseData !== undefined ? responseData : oldData;
                });
                // On invalide pas la requête, mais cela pourrai être nécessaire en cas de polling (que l'on rajoutera plus tard)
                //queryClient.invalidateQueries(endpoint, { refetchInactive: false });
            },
            onSettled: () => {
                isDeleting.current = false;
            },
        }
    );

    const mutateAsync = useCallback(async (action = 'read', data = null, extraQuery) => {
        const methods = { create: "POST", read: "GET", update: "PUT", delete: "DELETE", patch: "PATCH" };
        return mutation.mutateAsync({
            method: methods[action] ?? (data ? "POST" : "GET"),
            action: methods[action] === undefined ? action : undefined,
            data,
            extraQuery,
        });
    }, [mutation]);

    const statuses = {
        isLoading: status === 'loading' || mutation.isLoading || isFetching,
        isError: status === 'error' || mutation.isError,
        isSuccess: status === 'success' || mutation.isSuccess,
        isDeleting: isDeleting.current,
    };

    return {
        data,
        errors,
        status: statuses,
        action: mutateAsync,
        resetErrors: () => setErrors(null),
    };
}


/**********************************************************************/
/* SSE Context                                                        */
/**********************************************************************/

const SSEContext = createContext();

export const useSSE = () => useContext(SSEContext);

export const SSEProvider = ({ uri = '/events', children }) => {
    const eventSourceRef = useRef(null);
    const subscriptions = useRef({});

    useEffect(() => {
        // Créer la connexion EventSource
        eventSourceRef.current = new EventSource(uri, { withCredentials: true });
        eventSourceRef.current.onerror = () => {
            console.error('Erreur de connexion avec le canal SSE...');
        };

        return () => {
            if (eventSourceRef.current) {
                // Fermer la connexion EventSource lors du démontage et purge des abonnements
                eventSourceRef.current.close();
                subscriptions.current = {};
            }
        };
    }, []);

    // Abonnement à un endpoint spécifique
    const subscribe = (endpoint, callback) => {
        if (!subscriptions.current[endpoint]) {
            subscriptions.current[endpoint] = [];
        }
        if (!subscriptions.current[endpoint].includes(callback)) {
            //console.log(`subscribe ${endpoint}`);
            eventSourceRef.current.addEventListener(endpoint, callback);
            subscriptions.current[endpoint].push(callback);
        }
    };

    // Désabonnement d'un endpoint spécifique
    const unsubscribe = (endpoint, callback) => {
        if (subscriptions.current[endpoint].includes(callback)) {
            //console.log(`unsubscribe ${endpoint}`);
            eventSourceRef.current.removeEventListener(endpoint, callback);
            subscriptions.current[endpoint] = subscriptions.current[endpoint].filter(fn => fn !== callback);
        }
    };

    return (
        <SSEContext.Provider value={{ subscribe, unsubscribe }}>
            {children}
        </SSEContext.Provider>
    );
};


/**********************************************************************/
/* SSE Handler                                                        */
/**********************************************************************/

export function useSSEUpdater({ endpoint, endpointCollection, debounceTime = 0, enabled = true }) {
    const { subscribe, unsubscribe } = useSSE();
    const queryClient = useQueryClient();
    const debounceUpdate = useRef(null);
    endpointCollection = endpointCollection ?? endpoint;

    const updateCache = (oldData, newData) => {
        if (Array.isArray(oldData)) {
            if (newData.deleted) {
                return oldData.filter((oldItem) => oldItem.id !== newData.deleted.id);
            } else if (oldData.findIndex((item) => item.id === newData.id) !== -1) {
                return oldData.map((item) => (item.id === newData.id ? newData : item));
            } else {
                return [...oldData, newData];
            }
        } else if (oldData && oldData.id === newData.id) {
            return { ...oldData, ...newData };
        } else if (newData.deleted) {
            return null;
        }
        return oldData;
    }

    // NOTE: Pour s'abonner aux événements des enfants, ajouter un useSSEHandler() dans chaque enfants
    // Ainsi, l'utilisateur à le choix de la nomenclature des endpoints. Il devra mentionner l'endpoint
    // de la collection afin que les requêtes et les data soient correctements mises à jour.
    const handleSSEMessage = useCallback((event) => {
        //console.log("receive", event);
        const newData = event.data ? JSON.parse(event.data) : null;
        if (newData) {
            if (debounceTime > 0) {
                clearTimeout(debounceUpdate.current);
                debounceUpdate.current = setTimeout(() => {
                    queryClient.setQueryData(endpointCollection, (oldData) => updateCache(oldData, newData));
                }, debounceTime);
            } else {
                queryClient.setQueryData(endpointCollection, (oldData) => updateCache(oldData, newData));
            }
        } else {
            queryClient.invalidateQueries(endpointCollection);
        }
    }, [endpointCollection, queryClient]);


    useEffect(() => {
        if (enabled) {
            subscribe(endpoint, handleSSEMessage);

            return () => {
                unsubscribe(endpoint, handleSSEMessage);
            };
        }
    }, [endpoint, handleSSEMessage, subscribe, unsubscribe, enabled]);
}


/**********************************************************************/
/* Exemple d'utilisation                                              */
/**********************************************************************/

function UserItem({ user, referee }) {
    useSSEUpdater({ endpoint: `users/${user.id}`, queryKey: referee });
    return <span>{user.username}</span>;
}
function UserList() {
    const endpoint = "referee/5/users/";
    const { data, errors, status, action } = useCRUDHandler({
        endpoint: endpoint,
        initialData: [],
        pollInterval: 30000,  // Ajout d'un intervalle de polling de 30 secondes
    });
    useSSEUpdater({ endpoint: endpoint });

    if (status.isLoading) return <p>Loading...</p>;
    if (status.isError) return <p>Error: {errors?.message}</p>;
    if (data.length == 0) return <p>Aucun utilisateur</p>;

    return (
        <ul>
            {data.map(user => (
                <li key={user.id}>
                    <UserItem user={user} referee={endpoint} />
                </li>
            ))}
        </ul>
    );
}
function App() {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <CRUDProvider csrf="your-csrf-token">
                <SSEProvider>
                    <UserList />
                </SSEProvider>
            </CRUDProvider>
        </QueryClientProvider>
    );
}
