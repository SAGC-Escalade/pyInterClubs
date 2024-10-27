import { CRUDProvider, SSEProvider } from "/react/observer.jsx";
const { StrictMode } = window.React;
const { QueryClient, QueryClientProvider } = window.ReactQuery;

export default function App({ csrf, children }) {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <CRUDProvider csrf={csrf}>
                <SSEProvider>
                    {children}
                </SSEProvider>
            </CRUDProvider>
        </QueryClientProvider>
    );
}
