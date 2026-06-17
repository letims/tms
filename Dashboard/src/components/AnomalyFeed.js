import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useLatestAnomaliesPerVehicle, useAnomalyTimeline, useAnomalies, } from '../hooks/useAnomalies';
import { AnomalyBadge } from './AnomalyBadge';
import { LoadingSpinner } from './LoadingSpinner';
import { Pagination } from './Pagination';
import { SortableHeader } from './SortableHeader';
import { anomalySummary, anomalyRows } from '../utils/anomalyFormat';
// ─── Details cell + tooltip ───────────────────────────────────────────────────
function DetailsCell({ anomalyType, details, darkMode, }) {
    const d = details;
    const summary = anomalySummary(anomalyType, d);
    const rows = anomalyRows(anomalyType, d);
    return (_jsxs("td", { className: "px-4 py-2 relative group/cell min-w-[160px] max-w-[200px]", children: [_jsx("span", { className: `text-xs truncate block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`, children: summary }), _jsx("div", { role: "tooltip", className: `
          invisible group-hover/cell:visible opacity-0 group-hover/cell:opacity-100
          transition-opacity duration-150 delay-150
          absolute z-50 left-0 top-full mt-1 w-64
          rounded-lg border shadow-xl overflow-hidden
          ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}
        `, children: _jsx("table", { className: "w-full text-xs border-collapse", children: _jsx("tbody", { children: rows.map(({ label, value }) => (_jsxs("tr", { className: `border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`, children: [_jsx("td", { className: `px-3 py-1.5 font-medium whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: label }), _jsx("td", { className: `px-3 py-1.5 text-right font-mono ${darkMode ? 'text-gray-200' : 'text-gray-800'}`, children: value })] }, label))) }) }) })] }));
}
function sortAnomalies(list, key, dir) {
    return [...list].sort((a, b) => {
        let cmp = 0;
        if (key === 'vehicle_id' || key === 'anomaly_type') {
            cmp = a[key].localeCompare(b[key]);
        }
        else {
            cmp = new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime();
        }
        return dir === 'asc' ? cmp : -cmp;
    });
}
function useColumnSort(defaultKey, defaultDir) {
    const [sortKey, setSortKey] = useState(defaultKey);
    const [sortDir, setSortDir] = useState(defaultDir);
    function handleSort(key) {
        const k = key;
        setSortDir(k === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc');
        setSortKey(k);
    }
    return { sortKey, sortDir, handleSort };
}
// ─── Dismiss button ───────────────────────────────────────────────────────────
function DismissBtn({ id, darkMode, onDismiss }) {
    return (_jsx("td", { className: "px-4 py-2 text-center", children: _jsx("button", { onClick: onDismiss, className: `text-xs ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'}`, "aria-label": `Dismiss anomaly ${id}`, children: "\u2715" }) }));
}
// ─── Per-vehicle sub-view ─────────────────────────────────────────────────────
function PerVehicleAnomalies({ isLoading, dismissAnomaly, darkMode, page, pageSize, onPageChange, onPageSizeChange }) {
    const latestPerVehicle = useLatestAnomaliesPerVehicle();
    const { sortKey, sortDir, handleSort } = useColumnSort('vehicle_id', 'asc');
    const all = sortAnomalies(Object.values(latestPerVehicle), sortKey, sortDir);
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    if (!total) {
        return (_jsx("div", { className: `px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: isLoading ? _jsx(LoadingSpinner, {}) : 'No anomalies detected' }));
    }
    const shProps = { activeKey: sortKey, activeDir: sortDir, onSort: handleSort, darkMode };
    return (_jsxs(_Fragment, { children: [_jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { className: `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`, children: _jsxs("tr", { children: [_jsx(SortableHeader, { label: "Vehicle", sortKey: "vehicle_id", ...shProps }), _jsx(SortableHeader, { label: "Type", sortKey: "anomaly_type", ...shProps }), _jsx("th", { className: `px-4 py-2 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`, children: "Details" }), _jsx(SortableHeader, { label: "Time", sortKey: "detected_at", ...shProps }), _jsx("th", {})] }) }), _jsx("tbody", { children: items.map((anomaly) => (_jsxs("tr", { className: `border-b ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`, children: [_jsx("td", { className: `px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-900'}`, children: anomaly.vehicle_id }), _jsx("td", { className: "px-4 py-2", children: _jsx(AnomalyBadge, { anomalyType: anomaly.anomaly_type }) }), _jsx(DetailsCell, { anomalyType: anomaly.anomaly_type, details: anomaly.details, darkMode: darkMode }), _jsx("td", { className: `px-4 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: new Date(anomaly.detected_at).toLocaleTimeString() }), _jsx(DismissBtn, { id: anomaly.id, darkMode: darkMode, onDismiss: () => dismissAnomaly(anomaly.id) })] }, anomaly.id))) })] }), _jsx(Pagination, { page: page, pageSize: pageSize, total: total, onPageChange: onPageChange, onPageSizeChange: onPageSizeChange, darkMode: darkMode })] }));
}
// ─── Timeline sub-view ────────────────────────────────────────────────────────
function TimelineAnomalies({ isLoading, dismissAnomaly, darkMode, page, pageSize, onPageChange, onPageSizeChange }) {
    const raw = useAnomalyTimeline();
    // useAnomalyTimeline already returns newest-first; we re-sort based on user choice.
    const { sortKey, sortDir, handleSort } = useColumnSort('detected_at', 'desc');
    const all = sortAnomalies(raw, sortKey, sortDir);
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize);
    if (!total) {
        return (_jsx("div", { className: `px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: isLoading ? _jsx(LoadingSpinner, {}) : 'No anomalies detected' }));
    }
    const shProps = { activeKey: sortKey, activeDir: sortDir, onSort: handleSort, darkMode };
    return (_jsxs(_Fragment, { children: [_jsxs("table", { className: "w-full text-xs", children: [_jsx("thead", { className: `${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`, children: _jsxs("tr", { children: [_jsx(SortableHeader, { label: "Time", sortKey: "detected_at", ...shProps }), _jsx(SortableHeader, { label: "Vehicle", sortKey: "vehicle_id", ...shProps }), _jsx(SortableHeader, { label: "Type", sortKey: "anomaly_type", ...shProps }), _jsx("th", { className: `px-4 py-2 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`, children: "Details" }), _jsx("th", {})] }) }), _jsx("tbody", { children: items.map((anomaly) => (_jsxs("tr", { className: `border-b ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`, children: [_jsx("td", { className: `px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: new Date(anomaly.detected_at).toLocaleTimeString() }), _jsx("td", { className: `px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-900'}`, children: anomaly.vehicle_id }), _jsx("td", { className: "px-4 py-2", children: _jsx(AnomalyBadge, { anomalyType: anomaly.anomaly_type }) }), _jsx(DetailsCell, { anomalyType: anomaly.anomaly_type, details: anomaly.details, darkMode: darkMode }), _jsx(DismissBtn, { id: anomaly.id, darkMode: darkMode, onDismiss: () => dismissAnomaly(anomaly.id) })] }, anomaly.id))) })] }), _jsx(Pagination, { page: page, pageSize: pageSize, total: total, onPageChange: onPageChange, onPageSizeChange: onPageSizeChange, darkMode: darkMode })] }));
}
// ─── Root component ───────────────────────────────────────────────────────────
export function AnomalyFeed() {
    const selectedTab = useUIStore((state) => state.selectedAnomalyTab);
    const setSelectedTab = useUIStore((state) => state.setSelectedAnomalyTab);
    const dismissAnomaly = useUIStore((state) => state.dismissAnomaly);
    const darkMode = useUIStore((state) => state.darkMode);
    const { isLoading, error } = useAnomalies();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    useEffect(() => { setPage(1); }, [selectedTab]);
    const btnCls = (active) => `px-3 py-1 text-xs font-medium rounded transition ${active
        ? 'bg-blue-600 text-white'
        : darkMode
            ? 'text-gray-300 hover:bg-gray-700'
            : 'text-gray-700 hover:bg-gray-100'}`;
    const subProps = {
        isLoading,
        dismissAnomaly: (id) => { dismissAnomaly(id); setPage(1); },
        darkMode,
        page,
        pageSize,
        onPageChange: setPage,
        onPageSizeChange: (s) => { setPageSize(s); setPage(1); },
    };
    return (_jsxs("div", { className: `${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm relative`, children: [error && (_jsx("div", { className: "absolute top-4 right-4 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium z-10", children: "\u274C Failed to load anomalies" })), _jsxs("div", { className: `px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex items-center justify-between`, children: [_jsx("h2", { className: `text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`, children: "Recent Anomalies" }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { className: btnCls(selectedTab === 'vehicle'), onClick: () => setSelectedTab('vehicle'), children: "Vehicle" }), _jsx("button", { className: btnCls(selectedTab === 'timeline'), onClick: () => setSelectedTab('timeline'), children: "Timeline" })] })] }), _jsx("div", { className: "overflow-x-auto", children: selectedTab === 'vehicle'
                    ? _jsx(PerVehicleAnomalies, { ...subProps })
                    : _jsx(TimelineAnomalies, { ...subProps }) })] }));
}
