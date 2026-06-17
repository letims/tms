export type SortDir = 'asc' | 'desc'

interface Props {
  label: string
  sortKey: string
  activeKey: string
  activeDir: SortDir
  onSort: (key: string) => void
  darkMode: boolean
  className?: string
}

export function SortableHeader({ label, sortKey, activeKey, activeDir, onSort, darkMode, className }: Props) {
  const isActive = sortKey === activeKey

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2 text-left font-semibold select-none cursor-pointer whitespace-nowrap
        ${isActive
          ? darkMode ? 'text-blue-400' : 'text-blue-600'
          : darkMode ? 'text-gray-200 hover:text-gray-100' : 'text-gray-900 hover:text-gray-700'}
        ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-[10px] leading-none">
          {isActive ? (activeDir === 'asc' ? '▲' : '▼') : <span className="opacity-30">⇅</span>}
        </span>
      </span>
    </th>
  )
}
