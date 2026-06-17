import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LoadingSpinner() {
    return (_jsx("div", { className: "flex items-center justify-center p-8", children: _jsx("div", { className: "animate-spin", children: _jsx("div", { className: "h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" }) }) }));
}
export function SkeletonRow() {
    return (_jsx("tr", { className: "border-b border-gray-200 bg-gray-50", children: _jsx("td", { colSpan: 4, className: "px-6 py-4", children: _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "h-4 bg-gray-300 rounded w-1/4 animate-pulse" }), _jsx("div", { className: "h-4 bg-gray-300 rounded w-1/4 animate-pulse" }), _jsx("div", { className: "h-4 bg-gray-300 rounded w-1/4 animate-pulse" })] }) }) }));
}
