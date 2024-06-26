const { useState, useEffect } = React;
const { useQuery, useMutation, useQueryClient, QueryClient } = window.ReactQuery;

const eventSource = new EventSource('/events/', { withCredentials: true });
eventSource.onerror = () => { console.log("Erreur de connexion avec le canal temps réel..."); };
eventSource.onmessage = (event) => { console.log("message non traité :", event); };

export default function Observer({ endpoint, children, csrf=undefined }) {
    const queryClient = useQueryClient();
    const isSingleInstance = endpoint.includes('/');
    const apiEndpoint = `/api/${endpoint}/`;
    const [errors, setErrors] = useState(null);

    async function send(config) {
        try {
            const url = (!isSingleInstance && config.id) ? `${config.url}${config.id}/` : config.url;
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
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    const { data, error: queryError, isLoading } = useQuery(endpoint, () => send({ method: 'GET', url: apiEndpoint }), {
        onError: (error) => {
            setErrors(JSON.parse(error.message));
        },
        refetchOnWindowFocus: false,
    });

    const mutateData = useMutation(
        async ({ method, item, id }) => {
            const responseData = await send({ method, item, id, url: apiEndpoint });

            queryClient.setQueryData(endpoint, (oldData) => {
                if (Array.isArray(oldData)) {
                    if (method === 'POST') {
                        return [...oldData, { ...item, id: responseData.id }];
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

            return responseData;
        },
        {
            onMutate: async ({ method, item, id }) => {
                await queryClient.cancelQueries(endpoint);
                const previousData = queryClient.getQueryData(endpoint);

                queryClient.setQueryData(endpoint, (oldData) => {
                    if (Array.isArray(oldData)) {
                        if (method === 'POST') {
                            return [...oldData, { ...item, id: Date.now() }];
                        } else if (method === 'PUT' || method === 'PATCH') {
                            return oldData.map((oldItem) => (oldItem.id === id ? { ...oldItem, ...item } : oldItem));
                        } else if (method === 'DELETE') {
                            return oldData.filter((oldItem) => oldItem.id !== id);
                        }
                    } else {
                        if (method === 'PUT' || method === 'PATCH') {
                            return { ...oldData, ...item };
                        } else if (method === 'DELETE') {
                            return null;
                        }
                    }
                    return oldData;
                });

                return { previousData };
            },
            onError: (error, variables, context) => {
                setErrors(JSON.parse(error.message));
                queryClient.setQueryData(endpoint, context.previousData);
            },
            onSettled: () => {
                queryClient.invalidateQueries(endpoint, { refetchInactive: false });
            },
        }
    );

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

        console.log("Abonnement au flux " + endpoint);
        eventSource.addEventListener(endpoint, handleSSEMessage);

        return () => {
            eventSource.removeEventListener(endpoint, handleSSEMessage);
        };
    }, [endpoint, queryClient]);

    if (queryError) return <div>Error: {queryError.message}</div>;

    if (isLoading) return children({ data: undefined, errors: undefined });

    return children({
        data,
        create: (item) => mutateData.mutate({ method: 'POST', item }),
        patch: (id, updatedItem) => mutateData.mutate({ method: 'PATCH', id, item: updatedItem }),
        update: (id, updatedItem) => mutateData.mutate({ method: 'PUT', id, item: updatedItem }),
        remove: (id) => mutateData.mutate({ method: 'DELETE', id }),
        errors
    });
};
