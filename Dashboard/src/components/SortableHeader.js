import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SortableHeader({ label, sortKey, activeKey, activeDir, onSort, darkMode, className }) {
    const isActive = sortKey === activeKey;
    return (_jsx("th", { onClick: () => onSort(sortKey), className: `px-4 py-2 text-left font-semibold select-none cursor-pointer whitespace-nowrap
        ${isActive
            ? darkMode ? 'text-blue-400' : 'text-blue-600'
            : darkMode ? 'text-gray-200 hover:text-gray-100' : 'text-gray-900 hover:text-gray-700'}
        ${className ?? ''}`, children: _jsxs("span", { className: "inline-flex items-center gap-1", children: [label, _jsx("span", { className: "text-[10px] leading-none", children: isActive ? (activeDir === 'asc' ? '▲' : '▼') : _jsx("span", { className: "opacity-30", children: "\u21C5" }) })] }) }));
}
