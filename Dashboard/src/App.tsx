import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUIStore } from './store/uiStore'
import { Header } from './components/Header'
import { VehicleGrid } from './components/VehicleGrid'
import { ZonePanel } from './components/ZonePanel'
import { AnomalyFeed } from './components/AnomalyFeed'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BackendOffline } from './components/BackendOffline'
import { useConnectionGuard } from './hooks/useConnectionGuard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    },
  },
})

function AppContent() {
  const darkMode = useUIStore((state) => state.darkMode)
  useConnectionGuard()

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <VehicleGrid />
            <ZonePanel />
          </div>
          <div>
            <AnomalyFeed />
          </div>
        </main>
        <BackendOffline />
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
