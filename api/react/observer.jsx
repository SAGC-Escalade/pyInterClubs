const { useState, useEffect, useRef, useCallback } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

const eventSource = new EventSource('/events/', { withCredentials: true });
eventSource.onerror = () => { console.log("Erreur de connexion avec le canal temps réel..."); };
eventSource.onmessage = (event) => { console.log("message non traité :", event); };

export default function Observer({ endpoint, children, id = undefined, initialData = undefined, csrf = undefined }) {
    const queryClient = useQueryClient();       // Le gestionnaire de requêtes
    const [errors, setErrors] = useState(null);
    const isDeleting = useRef(false);
    const isSingle = !!id;
    endpoint = endpoint + (isSingle && id ? `/${id}` : '');
    const apiEndpoint = `/api/${endpoint}/`;

    // Gestion des requêtes
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

    // Gestion des erreurs
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

    // Initialisation
    const { data, error: queryError, status, isFetching } = useQuery(
        endpoint,
        () => {
            if (id === undefined) return Promise.resolve(initialData);
            return send({ method: 'GET', url: apiEndpoint })
        },
        {
            initialData,
            enabled: id !== undefined,
            onError: (error) => handleErrors(error),
            refetchOnWindowFocus: false,    // NOTE: Supprimer une fois en Production
        }
    );

    // Gestion des mises à jour (utilisateur => modèle)
    const mutation = useMutation(
        async ({ method, data, action }) => {
            setErrors(undefined);
            isDeleting.current = (method === 'DELETE');

            const url = apiEndpoint + (action ?? '');
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
                            return oldData.map((oldItem) => (oldItem.id === 0 ? responseData : oldItem));
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map((oldItem) => (oldItem.id === responseData.id ? responseData : oldItem));
                        } else if (method === 'DELETE') {
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
                //queryClient.invalidateQueries(endpoint, { refetchInactive: false });
            },
            onSettled: () => {
                isDeleting.current = false;
            },
        }
    );

    const mutateAsync = useCallback((action = 'read', data = null) => {
        const methods = { create: "POST", read: "GET", update: "PUT", delete: "DELETE", patch: "PATCH" };
        return mutation.mutateAsync({
            method: methods[action] ?? (data ? "POST" : "GET"),
            data,
            action: methods[action] === undefined ? action : undefined,
        });
    }, [mutation]);

    // Gestion des mises à jour (modèle => utilisateur)
    useEffect(() => {
        const handleSSEMessage = (event) => {
            if (event.type === endpoint) {
                console.log(event);
                const newData = event.data ? JSON.parse(event.data) : null;
                if (newData) {
                    queryClient.setQueryData(endpoint, (oldData) => {
                        if (Array.isArray(oldData)) {
                            if (oldData.findIndex((item) => item.id === newData.id) !== -1) {
                                return oldData.map((item) => (item.id === newData.id ? newData : item));
                            } else {
                                return [...oldData, newData];
                            }
                        } else if (oldData && oldData.id === newData.id) {
                            return { ...oldData, ...newData };
                        }
                        return oldData;
                    });
                } else {
                    queryClient.invalidateQueries(endpoint);
                }
            }
        };

        eventSource.addEventListener(endpoint, handleSSEMessage);

        return () => {
            eventSource.removeEventListener(endpoint, handleSSEMessage);
        };
    }, [endpoint, queryClient]);

    // Gestion du rendu
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
