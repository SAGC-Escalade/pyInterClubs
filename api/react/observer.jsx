const { useState, useEffect, useRef } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

const eventSource = new EventSource('/events/', { withCredentials: true });
eventSource.onerror = () => { console.log("Erreur de connexion avec le canal temps réel..."); };
eventSource.onmessage = (event) => { console.log("message non traité :", event); };

export default function Observer({ endpoint, children, csrf=undefined }) {
    const queryClient = useQueryClient();
    const isSingleInstance = endpoint.includes('/');
    const apiEndpoint = `/api/${endpoint}/`;
    const [errors, setErrors] = useState(null);
    const isDeleting = useRef(false);

    async function send(config) {
        const url = config.url + ((!isSingleInstance && config.id) ? `${config.id}/` : '') + (config.action ? `${config.action}/` : '');
        const options = {
            method: config.method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': csrf,
            },
            body: JSON.stringify(config.item),
        };
        if (config.method === 'GET') {
            delete options.body;
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            if (response.status == 400) {
                throw new Error(JSON.stringify(await response.json()));
            } else {
                throw new Error(JSON.stringify({
                    non_field_errors: "Une erreur est survenue, réessayez ou contactez un administrateur.",
                    message: "Erreur " + response.status + ": " + response.statusText,
                    debug: await response.text(),
                }));
            }
        }
        let responseData = null;
        if (config.method !== 'DELETE') responseData = await response.json();
        return responseData;
    }

    // Initialisation
    const { data, error: queryError, status, isFetching } = useQuery(endpoint, () => send({ method: 'GET', url: apiEndpoint }), {
        onError: (error) => {
            setErrors(JSON.parse(error.message));
        },
        refetchOnWindowFocus: false,    // NOTE: Supprimer une fois en Production
    });

    // Gestion des mise à jour (utilisateur => modèle)
    const mutateData = useMutation(
        async ({ method, item, id, action }) => {
            setErrors(undefined);
            isDeleting.current = (method === 'DELETE');
            return send({ method, id, action, item, url: apiEndpoint });
        },
        {
            onMutate: async ({ method, item, id }) => {
                await queryClient.cancelQueries(endpoint);
                const previousData = queryClient.getQueryData(endpoint);

                // Optimistic update
                if (method !== 'DELETE') {
                    queryClient.setQueryData(endpoint, (oldData) => {
                        if (Array.isArray(oldData)) {
                            if (method === 'POST') {
                                return [...oldData, { ...item, id: 0 }];
                            } else if (method === 'PUT' || method === 'PATCH') {
                                return oldData.map((oldItem) => (oldItem.id === id ? { ...oldItem, ...item } : oldItem));
                            //} else if (method === 'DELETE') {
                            //    return oldData.filter((oldItem) => oldItem.id !== id);
                            }
                        } else {
                            if (method === 'PUT' || method === 'PATCH') {
                                return { ...oldData, ...item };
                            //} else if (method === 'DELETE') {
                            //    return null;
                            }
                        }
                        return oldData;
                    });
                }

                return { previousData };
            },
            onError: (error, variables, context) => {
                // Display error
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
                // Rollback
                queryClient.setQueryData(endpoint, context.previousData);
            },
            onSuccess: (responseData, { method, item, id }, context) => {
                // Real update
                queryClient.setQueryData(endpoint, (oldData) => {
                    if (Array.isArray(oldData)) {
                        if (method === 'POST') {
                            return oldData.map((oldItem) => (oldItem.id === 0 ? responseData : oldItem));
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map((oldItem) => (oldItem.id === responseData.id ? responseData : oldItem));
                        } else if (method === 'DELETE') {
                            return oldData.filter((oldItem) => oldItem.id !== id);
                        }
                    } else {
                        if (method === 'PUT' || method === 'PATCH') {
                            return { ...oldData, ...responseData };
                        } else if (method === 'DELETE') {
                            return null;
                        }
                    }
                    return responseData;
                });

                //queryClient.invalidateQueries(endpoint, { refetchInactive: false });
            },
            onSettled: () => {
                isDeleting.current = false
            },
        }
    );

    // Gestion des mise à jour (modèle => utilisateur)
    useEffect(() => {
        const handleSSEMessage = (event) => {
            if (event.type === endpoint) {
                const newData = event.data ? JSON.parse(event.data) : null;
                if (newData) {
                    queryClient.setQueryData(endpoint, (oldData) => {
                        if (Array.isArray(oldData)) {
                            const newItems = [...oldData];
                            const index = newItems.findIndex((item) => item.id === newData.id);
                            if (index !== -1) {
                                newItems[index] = newData;
                            } else {
                                newItems.push(newData);
                            }
                            return newItems;
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

    //if (isLoading) return children({ data: undefined, errors: undefined });
    const statuses = {
        isLoading: status === 'loading' || mutateData.isLoading || isFetching,
        isError: status === 'error' || mutateData.isError,
        isSuccess: status === 'success' || mutateData.isSuccess,
        isDeleting: isDeleting.current,
    }

    return children({
        data,
        errors,
        status: statuses,
        action: (action, item) => mutateData.mutateAsync({ method: item?'POST':'GET', action, item }),
        create: (item) => mutateData.mutateAsync({ method: 'POST', item }),
        partial_update: (id, updatedItem) => mutateData.mutateAsync({ method: 'PATCH', id, item: updatedItem }),
        update: (id, updatedItem) => mutateData.mutateAsync({ method: 'PUT', id, item: updatedItem }),
        destroy: (id) => mutateData.mutateAsync({ method: 'DELETE', id }),
    });
}
