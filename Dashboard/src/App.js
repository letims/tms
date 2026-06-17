import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './store/uiStore';
import { Header } from './components/Header';
import { VehicleGrid } from './components/VehicleGrid';
import { ZonePanel } from './components/ZonePanel';
import { AnomalyFeed } from './components/AnomalyFeed';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackendOffline } from './components/BackendOffline';
import { useConnectionGuard } from './hooks/useConnectionGuard';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
        },
    },
});
function AppContent() {
    const darkMode = useUIStore((state) => state.darkMode);
    useConnectionGuard();
    return (_jsx("div", { className: darkMode ? 'dark' : '', children: _jsxs("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-950", children: [_jsx(Header, {}), _jsxs("main", { className: "p-3 space-y-3", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(VehicleGrid, {}), _jsx(ZonePanel, {})] }), _jsx("div", { children: _jsx(AnomalyFeed, {}) })] }), _jsx(BackendOffline, {})] }) }));
}
function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ErrorBoundary, { children: _jsx(AppContent, {}) }) }));
}
export default App;
