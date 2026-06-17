import { useSortedZones, useZones } from '../hooks/useZones'
import { useUIStore } from '../store/uiStore'
import { LoadingSpinner } from './LoadingSpinner'

export function ZonePanel() {
  const { isLoading, error } = useZones()
  const darkMode = useUIStore((state) => state.darkMode)
  const zones = useSortedZones()

  return (
    <div className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm p-4 relative`}>
      {error && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium z-10">
          ❌ Failed to load zones
        </div>
      )}
      <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
        Zone Activity
      </h2>

      {isLoading && !zones.length ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {zones.map((zone) => {
            const isHotspot = zone.entry_count > 5
            return (
              <div
                key={zone.zone_id}
                className={`p-3 rounded-lg border text-center transition ${
                  isHotspot
                    ? darkMode
                      ? 'bg-yellow-900/20 border-yellow-700/50'
                      : 'bg-yellow-50 border-yellow-200'
                    : darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`text-2xl font-bold ${
                  isHotspot
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : darkMode
                      ? 'text-blue-400'
                      : 'text-blue-600'
                }`}>
                  {zone.entry_count}
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} truncate`}>
                  {zone.zone_id
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </p>
                {isHotspot && (
                  <p className={`text-xs font-semibold mt-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    🔥 Hotspot
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
