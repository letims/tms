import { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import {
  useLatestAnomaliesPerVehicle,
  useAnomalyTimeline,
  useAnomalies,
} from '../hooks/useAnomalies'
import { AnomalyBadge } from './AnomalyBadge'
import { LoadingSpinner } from './LoadingSpinner'
import { Pagination } from './Pagination'
import { SortableHeader } from './SortableHeader'
import type { PageSize } from './Pagination'
import type { SortDir } from './SortableHeader'
import type { Anomaly } from '../types'
import { anomalySummary, anomalyRows } from '../utils/anomalyFormat'
import type { AnomalyDetail } from '../utils/anomalyFormat'

// ─── Details cell + tooltip ───────────────────────────────────────────────────

function DetailsCell({
  anomalyType,
  details,
  darkMode,
}: {
  anomalyType: string
  details: Record<string, unknown>
  darkMode: boolean
}) {
  const d = details as AnomalyDetail
  const summary = anomalySummary(anomalyType, d)
  const rows = anomalyRows(anomalyType, d)

  return (
    <td className="px-4 py-2 relative group/cell min-w-[160px] max-w-[200px]">
      <span className={`text-xs truncate block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {summary}
      </span>
      {/* Tooltip */}
      <div
        role="tooltip"
        className={`
          invisible group-hover/cell:visible opacity-0 group-hover/cell:opacity-100
          transition-opacity duration-150 delay-150
          absolute z-50 left-0 top-full mt-1 w-64
          rounded-lg border shadow-xl overflow-hidden
          ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}
        `}
      >
        <table className="w-full text-xs border-collapse">
          <tbody>
            {rows.map(({ label, value }) => (
              <tr key={label} className={`border-b last:border-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <td className={`px-3 py-1.5 font-medium whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {label}
                </td>
                <td className={`px-3 py-1.5 text-right font-mono ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </td>
  )
}

// ─── Sorting helpers ──────────────────────────────────────────────────────────

type AnomalySortKey = 'vehicle_id' | 'anomaly_type' | 'detected_at'

function sortAnomalies(list: Anomaly[], key: AnomalySortKey, dir: SortDir): Anomaly[] {
  return [...list].sort((a, b) => {
    let cmp = 0
    if (key === 'vehicle_id' || key === 'anomaly_type') {
      cmp = a[key].localeCompare(b[key])
    } else {
      cmp = new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

function useColumnSort(defaultKey: AnomalySortKey, defaultDir: SortDir) {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  function handleSort(key: string) {
    const k = key as AnomalySortKey
    setSortDir(k === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortKey(k)
  }

  return { sortKey, sortDir, handleSort }
}

// ─── Sub-view shared props ────────────────────────────────────────────────────

interface SubViewProps {
  isLoading: boolean
  dismissAnomaly: (id: number) => void
  darkMode: boolean
  page: number
  pageSize: PageSize
  onPageChange: (p: number) => void
  onPageSizeChange: (s: PageSize) => void
}

// ─── Dismiss button ───────────────────────────────────────────────────────────

function DismissBtn({ id, darkMode, onDismiss }: { id: number; darkMode: boolean; onDismiss: () => void }) {
  return (
    <td className="px-4 py-2 text-center">
      <button
        onClick={onDismiss}
        className={`text-xs ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
        aria-label={`Dismiss anomaly ${id}`}
      >
        ✕
      </button>
    </td>
  )
}

// ─── Per-vehicle sub-view ─────────────────────────────────────────────────────

function PerVehicleAnomalies({ isLoading, dismissAnomaly, darkMode, page, pageSize, onPageChange, onPageSizeChange }: SubViewProps) {
  const latestPerVehicle = useLatestAnomaliesPerVehicle()
  const { sortKey, sortDir, handleSort } = useColumnSort('vehicle_id', 'asc')

  const all = sortAnomalies(Object.values(latestPerVehicle), sortKey, sortDir)
  const total = all.length
  const items = all.slice((page - 1) * pageSize, page * pageSize)

  if (!total) {
    return (
      <div className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {isLoading ? <LoadingSpinner /> : 'No anomalies detected'}
      </div>
    )
  }

  const shProps = { activeKey: sortKey, activeDir: sortDir, onSort: handleSort, darkMode }

  return (
    <>
      <table className="w-full text-xs">
        <thead className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
          <tr>
            <SortableHeader label="Vehicle" sortKey="vehicle_id"   {...shProps} />
            <SortableHeader label="Type"    sortKey="anomaly_type" {...shProps} />
            <th className={`px-4 py-2 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              Details
            </th>
            <SortableHeader label="Time"    sortKey="detected_at"  {...shProps} />
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((anomaly) => (
            <tr
              key={anomaly.id}
              className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <td className={`px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                {anomaly.vehicle_id}
              </td>
              <td className="px-4 py-2">
                <AnomalyBadge anomalyType={anomaly.anomaly_type} />
              </td>
              <DetailsCell anomalyType={anomaly.anomaly_type} details={anomaly.details} darkMode={darkMode} />
              <td className={`px-4 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date(anomaly.detected_at).toLocaleTimeString()}
              </td>
              <DismissBtn id={anomaly.id} darkMode={darkMode} onDismiss={() => dismissAnomaly(anomaly.id)} />
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} darkMode={darkMode} />
    </>
  )
}

// ─── Timeline sub-view ────────────────────────────────────────────────────────

function TimelineAnomalies({ isLoading, dismissAnomaly, darkMode, page, pageSize, onPageChange, onPageSizeChange }: SubViewProps) {
  const raw = useAnomalyTimeline()
  // useAnomalyTimeline already returns newest-first; we re-sort based on user choice.
  const { sortKey, sortDir, handleSort } = useColumnSort('detected_at', 'desc')

  const all = sortAnomalies(raw, sortKey, sortDir)
  const total = all.length
  const items = all.slice((page - 1) * pageSize, page * pageSize)

  if (!total) {
    return (
      <div className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {isLoading ? <LoadingSpinner /> : 'No anomalies detected'}
      </div>
    )
  }

  const shProps = { activeKey: sortKey, activeDir: sortDir, onSort: handleSort, darkMode }

  return (
    <>
      <table className="w-full text-xs">
        <thead className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
          <tr>
            <SortableHeader label="Time"    sortKey="detected_at"  {...shProps} />
            <SortableHeader label="Vehicle" sortKey="vehicle_id"   {...shProps} />
            <SortableHeader label="Type"    sortKey="anomaly_type" {...shProps} />
            <th className={`px-4 py-2 text-left font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              Details
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((anomaly) => (
            <tr
              key={anomaly.id}
              className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <td className={`px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date(anomaly.detected_at).toLocaleTimeString()}
              </td>
              <td className={`px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                {anomaly.vehicle_id}
              </td>
              <td className="px-4 py-2">
                <AnomalyBadge anomalyType={anomaly.anomaly_type} />
              </td>
              <DetailsCell anomalyType={anomaly.anomaly_type} details={anomaly.details} darkMode={darkMode} />
              <DismissBtn id={anomaly.id} darkMode={darkMode} onDismiss={() => dismissAnomaly(anomaly.id)} />
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} darkMode={darkMode} />
    </>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

export function AnomalyFeed() {
  const selectedTab = useUIStore((state) => state.selectedAnomalyTab)
  const setSelectedTab = useUIStore((state) => state.setSelectedAnomalyTab)
  const dismissAnomaly = useUIStore((state) => state.dismissAnomaly)
  const darkMode = useUIStore((state) => state.darkMode)
  const { isLoading, error } = useAnomalies()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(20)

  useEffect(() => { setPage(1) }, [selectedTab])

  const btnCls = (active: boolean) =>
    `px-3 py-1 text-xs font-medium rounded transition ${
      active
        ? 'bg-blue-600 text-white'
        : darkMode
          ? 'text-gray-300 hover:bg-gray-700'
          : 'text-gray-700 hover:bg-gray-100'
    }`

  const subProps: SubViewProps = {
    isLoading,
    dismissAnomaly: (id) => { dismissAnomaly(id); setPage(1) },
    darkMode,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: (s) => { setPageSize(s); setPage(1) },
  }

  return (
    <div className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm relative`}>
      {error && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium z-10">
          ❌ Failed to load anomalies
        </div>
      )}

      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex items-center justify-between`}>
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Anomalies
        </h2>
        <div className="flex gap-1">
          <button className={btnCls(selectedTab === 'vehicle')}  onClick={() => setSelectedTab('vehicle')}>Vehicle</button>
          <button className={btnCls(selectedTab === 'timeline')} onClick={() => setSelectedTab('timeline')}>Timeline</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {selectedTab === 'vehicle'
          ? <PerVehicleAnomalies {...subProps} />
          : <TimelineAnomalies  {...subProps} />}
      </div>
    </div>
  )
}
