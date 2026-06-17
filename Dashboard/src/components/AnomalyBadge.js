import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
const anomalyColors = {
    critical_battery: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    moving_with_fault: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    low_battery: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    overspeed: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    unexpected_error_codes: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    stale_vehicle: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
};
const formatAnomalyType = (type) => {
    return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
export function AnomalyBadge({ anomalyType }) {
    const color = anomalyColors[anomalyType] || 'bg-gray-100 text-gray-800';
    return (_jsx("span", { className: clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', color), children: formatAnomalyType(anomalyType) }));
}
