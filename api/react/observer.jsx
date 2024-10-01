const { useState, useEffect, useRef, useCallback } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

const eventSource = new EventSource('/events/', { withCredentials: true });
eventSource.onerror = () => { console.log("Erreur de connexion avec le canal temps réel..."); };
eventSource.onmessage = (event) => { console.log("message non traité :", event); };

export default function Observer({ endpoint, children, id = undefined, initialData = undefined, csrf = undefined, queryString = undefined }) {
    /* Fonctions et valeurs possibles des paramètres :
     * 
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
    const apiEndpoint = `/api/${endpoint}/`;

    const subscriptions = useRef({});

    /*************************************************************/
    /* Gestion des événements (MAJ modèle => interface)          */

    // MAJ des datas en fonction des événements
    const handleSSEMessage = useCallback((event) => {
        //console.log(event.type, event.data);
        const newData = event.data ? JSON.parse(event.data) : null;
        if (newData) {
            queryClient.setQueryData(endpoint, (oldData) => {
                if (Array.isArray(oldData)) {
                    if (newData.deleted) {
                        unsubscribe(newData.deleted.id);
                        return oldData.filter((oldItem) => oldItem.id !== newData.deleted.id);
                    } else if (oldData.findIndex((item) => item.id === newData.id) !== -1) {
                        return oldData.map((item) => (item.id === newData.id ? newData : item));
                    } else {
                        subscribe(newData.id);
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
                const previousData = queryClient.getQueryData(endpoint);

                // Optimistic update (Les modifications sont déjà appliquées par le composant enfant ou le formulaire HTML)
                /*if (method !== 'DELETE') {
                    queryClient.setQueryData(endpoint, (oldData) => {
                        if (Array.isArray(oldData)) {
                            if (method === 'POST') {
                                return [...oldData, { ...data, id: 0 }];
                            } else if (method === 'PUT' || method === 'PATCH') {
                                return oldData.map((oldItem) => (oldItem.id === data.id ? { ...oldItem, ...data } : oldItem));
                                //} else if (method === 'DELETE') {
                                //    return oldData.filter((oldItem) => oldItem.id !== id);
                            }
                        } else {
                            if (method === 'PUT' || method === 'PATCH') {
                                return { ...oldData, ...data };
                                //} else if (method === 'DELETE') {
                                //    return null;
                            }
                        }
                        return oldData;
                    });
                }*/

                return { previousData };
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
                            subscribe(responseData.id);
                            return oldData.map((oldItem) => (oldItem.id === 0 ? responseData : oldItem));
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map((oldItem) => (oldItem.id === responseData.id ? responseData : oldItem));
                        } else if (method === 'DELETE') {
                            unsubscribe(responseData.id);
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

    if (queryError) return <div>Error: {queryError.message}</div>;

    const statuses = {
        isLoading: status === 'loading' || mutation.isLoading || isFetching,
        isError:   status === 'error' || mutation.isError,
        isSuccess: status === 'success' || mutation.isSuccess,
        isDeleting: isDeleting.current,
    };

    return children({
        data,
        errors,
        status: statuses,
        action: mutateAsync,
        resetErrors: () => setErrors(undefined),
    });
}
