import { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import { useFilteredVehicles, useVehicles, useVehicleTotal } from '../hooks/useVehicles'
import { StatusBadge } from './StatusBadge'
import { LoadingSpinner } from './LoadingSpinner'
import { Pagination } from './Pagination'
import { SortableHeader } from './SortableHeader'
import type { PageSize } from './Pagination'
import type { SortDir } from './SortableHeader'
import type { Vehicle } from '../types'

type VehicleSortKey = 'vehicle_id' | 'status' | 'battery_pct' | 'speed_mps' | 'last_seen'

function sortVehicles(vehicles: Vehicle[], key: VehicleSortKey, dir: SortDir): Vehicle[] {
  return [...vehicles].sort((a, b) => {
    let cmp = 0
    if (key === 'vehicle_id' || key === 'status') {
      cmp = a[key].localeCompare(b[key])
    } else if (key === 'last_seen') {
      cmp = new Date(a.last_seen).getTime() - new Date(b.last_seen).getTime()
    } else {
      cmp = a[key] - b[key]
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

export function VehicleGrid() {
  const vehicleFilter = useUIStore((state) => state.vehicleFilter)
  const setVehicleFilter = useUIStore((state) => state.setVehicleFilter)
  const darkMode = useUIStore((state) => state.darkMode)
  const { isLoading, error } = useVehicles()
  const allFiltered = useFilteredVehicles(vehicleFilter)
  const serverTotal = useVehicleTotal()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(20)
  const [sortKey, setSortKey] = useState<VehicleSortKey>('vehicle_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Reset to page 1 when filters or sort change
  useEffect(() => { setPage(1) }, [vehicleFilter.status, vehicleFilter.searchTerm])

  function handleSort(key: string) {
    const k = key as VehicleSortKey
    setSortDir(k === sortKey ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortKey(k)
    setPage(1)
  }

  const sorted = sortVehicles(allFiltered, sortKey, sortDir)
  const total = sorted.length
  const vehicles = sorted.slice((page - 1) * pageSize, page * pageSize)
  const statuses = ['idle', 'moving', 'charging', 'fault']
  const showError = error && !allFiltered.length

  const shProps = { activeKey: sortKey, activeDir: sortDir, onSort: handleSort, darkMode }

  return (
    <div className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm relative`}>
      {showError && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium z-10">
          ❌ Failed to load vehicles
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Vehicles ({total}{serverTotal > total ? ` of ${serverTotal}` : ''})
          </h2>
          <div className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Search by ID..."
              value={vehicleFilter.searchTerm || ''}
              onChange={(e) => {
                setVehicleFilter({ ...vehicleFilter, searchTerm: e.target.value })
              }}
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            <select
              value={vehicleFilter.status || ''}
              onChange={(e) =>
                setVehicleFilter({ ...vehicleFilter, status: e.target.value || undefined })
              }
              className={`px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Body */}
      {isLoading && !allFiltered.length ? (
        <LoadingSpinner />
      ) : allFiltered.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className={`text-lg font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
              {vehicleFilter.status || vehicleFilter.searchTerm
                ? 'No vehicles match your filters'
                : 'No vehicles in the workspace right now'}
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {vehicleFilter.status || vehicleFilter.searchTerm
                ? 'Try adjusting your filters'
                : 'Waiting for telemetry data...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b`}>
                <tr>
                  <SortableHeader label="ID"        sortKey="vehicle_id"  {...shProps} />
                  <SortableHeader label="Status"    sortKey="status"      {...shProps} />
                  <SortableHeader label="Battery"   sortKey="battery_pct" {...shProps} />
                  <SortableHeader label="Speed"     sortKey="speed_mps"   {...shProps} />
                  <SortableHeader label="Last Seen" sortKey="last_seen"   {...shProps} />
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => {
                  const seconds = (Date.now() - new Date(vehicle.last_seen).getTime()) / 1000
                  const timeAgo = seconds < 3600
                    ? `${Math.floor(seconds / 60)}m ago`
                    : `${Math.floor(seconds / 3600)}h ago`

                  return (
                    <tr
                      key={vehicle.vehicle_id}
                      className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`px-4 py-2 font-mono text-xs ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {vehicle.vehicle_id}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={vehicle.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <div className={`w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-1.5`}>
                            <div
                              className={`h-1.5 rounded-full ${
                                vehicle.battery_pct > 50 ? 'bg-green-500'
                                  : vehicle.battery_pct > 15 ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${vehicle.battery_pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {vehicle.battery_pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {vehicle.speed_mps.toFixed(1)} m/s
                      </td>
                      <td className={`px-4 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {timeAgo}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
            darkMode={darkMode}
          />
        </>
      )}
    </div>
  )
}
