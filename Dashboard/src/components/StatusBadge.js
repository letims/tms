import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
const statusColors = {
    idle: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    moving: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    charging: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    fault: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
};
export function StatusBadge({ status }) {
    return (_jsx("span", { className: clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[status]), children: status.charAt(0).toUpperCase() + status.slice(1) }));
}
