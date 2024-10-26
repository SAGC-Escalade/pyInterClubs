const { useState, useEffect, useRef, useCallback } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

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
        `${endpoint}${id ? id + '/' : ''}`,
        () => {
            if (id === undefined) return Promise.resolve(initialData);
            return send({ method: 'GET', endpoint: `${endpoint}${id ? id + '/' : ''}${queryString ? '?' + queryString : ''}` })
        },
        {
            initialData,
            enabled: id !== undefined,
            onError: (error) => handleErrors(error),
            refetchOnWindowFocus: false,    // NOTE: Supprimer une fois en Production
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

export const SSEProvider = ({ uri = '/events/', children }) => {
    const eventSourceRef = useRef(null);
    const subscriptions = useRef({});

    // Créer la connexion EventSource
    if (eventSourceRef.current === null) {
        eventSourceRef.current = new EventSource(uri, { withCredentials: true });
        eventSourceRef.current.onerror = () => {
            console.error('Erreur de connexion avec le canal SSE...');
        };
    }

    // TODO: Peut-être utiliser useLayoutEffect plutôt que useEffect ici.
    // Sinon, le canal risque d'être cloturé trop tôt.
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                console.log("SSE closed");
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
