import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSortedZones, useZones } from '../hooks/useZones';
import { useUIStore } from '../store/uiStore';
import { LoadingSpinner } from './LoadingSpinner';
export function ZonePanel() {
    const { isLoading, error } = useZones();
    const darkMode = useUIStore((state) => state.darkMode);
    const zones = useSortedZones();
    return (_jsxs("div", { className: `${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm p-4 relative`, children: [error && (_jsx("div", { className: "absolute top-4 right-4 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium z-10", children: "\u274C Failed to load zones" })), _jsx("h2", { className: `text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`, children: "Zone Activity" }), isLoading && !zones.length ? (_jsx(LoadingSpinner, {})) : (_jsx("div", { className: "grid grid-cols-3 gap-3", children: zones.map((zone) => {
                    const isHotspot = zone.entry_count > 5;
                    return (_jsxs("div", { className: `p-3 rounded-lg border text-center transition ${isHotspot
                            ? darkMode
                                ? 'bg-yellow-900/20 border-yellow-700/50'
                                : 'bg-yellow-50 border-yellow-200'
                            : darkMode
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-gray-50 border-gray-200'}`, children: [_jsx("div", { className: `text-2xl font-bold ${isHotspot
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : darkMode
                                        ? 'text-blue-400'
                                        : 'text-blue-600'}`, children: zone.entry_count }), _jsx("p", { className: `text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} truncate`, children: zone.zone_id
                                    .replace(/_/g, ' ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ') }), isHotspot && (_jsx("p", { className: `text-xs font-semibold mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`, children: "\uD83D\uDD25 Hotspot" }))] }, zone.zone_id));
                }) }))] }));
}
