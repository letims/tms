import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUIStore } from '../store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
export function Header() {
    const connectionStatus = useUIStore((state) => state.connectionStatus);
    const pollingConfig = useUIStore((state) => state.pollingConfig);
    const setPollingInterval = useUIStore((state) => state.setPollingInterval);
    const darkMode = useUIStore((state) => state.darkMode);
    const toggleDarkMode = useUIStore((state) => state.toggleDarkMode);
    const queryClient = useQueryClient();
    const statusColor = connectionStatus === 'connected'
        ? 'bg-green-100 text-green-800'
        : connectionStatus === 'retrying'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800';
    const statusText = connectionStatus === 'connected'
        ? 'Connected'
        : connectionStatus === 'retrying'
            ? 'Retrying...'
            : 'Disconnected';
    const handleRefresh = () => {
        queryClient.invalidateQueries();
    };
    const handlePollingChange = (endpoint, interval) => {
        setPollingInterval(endpoint, interval);
    };
    return (_jsx("header", { className: "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { className: "flex-1", children: _jsx("h1", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Fleet Telemetry Dashboard" }) }), _jsxs("div", { className: "flex items-center gap-3 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`, children: "Polling frequency:" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: pollingConfig.anomalies, onChange: (e) => handlePollingChange('anomalies', parseInt(e.target.value)), className: "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white", title: "Anomalies polling frequency", children: [_jsx("option", { value: 2000, children: "Anomalies: 2s" }), _jsx("option", { value: 3000, children: "Anomalies: 3s" }), _jsx("option", { value: 5000, children: "Anomalies: 5s" })] }), _jsxs("select", { value: pollingConfig.zones, onChange: (e) => handlePollingChange('zones', parseInt(e.target.value)), className: "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white", title: "Zones polling frequency", children: [_jsx("option", { value: 2000, children: "Zones: 2s" }), _jsx("option", { value: 3000, children: "Zones: 3s" }), _jsx("option", { value: 5000, children: "Zones: 5s" })] }), _jsxs("select", { value: pollingConfig.vehicles, onChange: (e) => handlePollingChange('vehicles', parseInt(e.target.value)), className: "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white", title: "Vehicles polling frequency", children: [_jsx("option", { value: 2000, children: "Vehicles: 2s" }), _jsx("option", { value: 3000, children: "Vehicles: 3s" }), _jsx("option", { value: 5000, children: "Vehicles: 5s" })] })] })] }), _jsx("div", { className: `inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`, children: statusText }), _jsx("button", { onClick: toggleDarkMode, className: "px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600", title: "Toggle dark mode", children: darkMode ? '☀️' : '🌙' }), _jsx("button", { onClick: handleRefresh, className: "px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-800", children: "Refresh" })] })] }) }));
}
