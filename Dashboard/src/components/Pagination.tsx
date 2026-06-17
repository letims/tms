const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

interface Props {
  page: number
  pageSize: PageSize
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
  darkMode: boolean
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, darkMode }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const base = `px-2 py-1 text-xs rounded border transition disabled:opacity-40 ${
    darkMode
      ? 'border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:hover:bg-gray-800'
      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'
  }`

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-t text-xs ${
      darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
    }`}>
      <span>
        {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
      </span>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          Per page:
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value) as PageSize)
              onPageChange(1)
            }}
            className={`ml-1 px-1 py-0.5 rounded border text-xs ${
              darkMode
                ? 'bg-gray-800 border-gray-600 text-gray-300'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            className={base}
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            «
          </button>
          <button
            className={base}
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className={`px-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {page} / {totalPages}
          </span>
          <button
            className={base}
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            ›
          </button>
          <button
            className={base}
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

export { PAGE_SIZE_OPTIONS }
