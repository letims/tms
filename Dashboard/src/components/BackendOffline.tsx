import { useUIStore } from '../store/uiStore'

export function BackendOffline() {
  const connectionStatus = useUIStore((state) => state.connectionStatus)
  const lastSyncTime = useUIStore((state) => state.lastSyncTime)
  const darkMode = useUIStore((state) => state.darkMode)

  if (connectionStatus !== 'error') return null

  const lastSeenText = lastSyncTime
    ? `Last successful sync at ${lastSyncTime.toLocaleTimeString()}.`
    : 'No data has been received yet.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`mx-4 max-w-md w-full rounded-2xl border p-8 shadow-2xl text-center ${
        darkMode
          ? 'bg-gray-900 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        {/* Pulsing indicator */}
        <div className="flex justify-center mb-5">
          <span className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500" />
          </span>
        </div>

        <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Backend Unreachable
        </h2>
        <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          The fleet telemetry API is not responding. Retrying automatically…
        </p>
        <p className={`text-xs mt-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {lastSeenText}
        </p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-red-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
