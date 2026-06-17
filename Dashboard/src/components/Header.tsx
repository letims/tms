import { useUIStore } from '../store/uiStore'
import { useQueryClient } from '@tanstack/react-query'
import type { PollingInterval } from '../types'

export function Header() {
  const connectionStatus = useUIStore((state) => state.connectionStatus)
  const pollingConfig = useUIStore((state) => state.pollingConfig)
  const setPollingInterval = useUIStore((state) => state.setPollingInterval)
  const darkMode = useUIStore((state) => state.darkMode)
  const toggleDarkMode = useUIStore((state) => state.toggleDarkMode)
  const queryClient = useQueryClient()

  const statusColor =
    connectionStatus === 'connected'
      ? 'bg-green-100 text-green-800'
      : connectionStatus === 'retrying'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'

  const statusText =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'retrying'
        ? 'Retrying...'
        : 'Disconnected'

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  const handlePollingChange = (
    endpoint: keyof typeof pollingConfig,
    interval: PollingInterval
  ) => {
    setPollingInterval(endpoint, interval)
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Fleet Telemetry Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Polling frequency controls */}
          <div className="flex items-center gap-2">
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Polling frequency:
            </span>
            <div className="flex gap-2">
              <select
                value={pollingConfig.anomalies}
                onChange={(e) =>
                  handlePollingChange('anomalies', parseInt(e.target.value) as PollingInterval)
                }
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                title="Anomalies polling frequency"
              >
                <option value={2000}>Anomalies: 2s</option>
                <option value={3000}>Anomalies: 3s</option>
                <option value={5000}>Anomalies: 5s</option>
              </select>
              <select
                value={pollingConfig.zones}
                onChange={(e) =>
                  handlePollingChange('zones', parseInt(e.target.value) as PollingInterval)
                }
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                title="Zones polling frequency"
              >
                <option value={2000}>Zones: 2s</option>
                <option value={3000}>Zones: 3s</option>
                <option value={5000}>Zones: 5s</option>
              </select>
              <select
                value={pollingConfig.vehicles}
                onChange={(e) =>
                  handlePollingChange('vehicles', parseInt(e.target.value) as PollingInterval)
                }
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                title="Vehicles polling frequency"
              >
                <option value={2000}>Vehicles: 2s</option>
                <option value={3000}>Vehicles: 3s</option>
                <option value={5000}>Vehicles: 5s</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {statusText}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded text-xs font-medium hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            Refresh
          </button>
        </div>
      </div>
    </header>
  )
}
