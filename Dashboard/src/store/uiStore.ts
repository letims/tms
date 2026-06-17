import { create } from 'zustand'
import type { PollingConfig, PollingInterval } from '../types'
import { DEFAULT_POLLING_CONFIG } from '../types'

interface UIState {
  pollingConfig: PollingConfig
  setPollingInterval: (endpoint: keyof PollingConfig, interval: PollingInterval) => void
  setPollingConfig: (config: PollingConfig) => void

  selectedAnomalyTab: 'vehicle' | 'timeline'
  setSelectedAnomalyTab: (tab: 'vehicle' | 'timeline') => void

  vehicleFilter: {
    status?: string
    searchTerm?: string
  }
  setVehicleFilter: (filter: { status?: string; searchTerm?: string }) => void

  dismissedAnomalies: Set<number>
  dismissAnomaly: (id: number) => void

  connectionStatus: 'connected' | 'retrying' | 'error'
  setConnectionStatus: (status: 'connected' | 'retrying' | 'error') => void

  lastSyncTime?: Date
  setLastSyncTime: (time: Date) => void

  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  toggleDarkMode: () => void
}

export const useUIStore = create<UIState>((set) => ({
  pollingConfig: DEFAULT_POLLING_CONFIG,
  setPollingInterval: (endpoint, interval) =>
    set((state) => ({
      pollingConfig: {
        ...state.pollingConfig,
        [endpoint]: interval,
      },
    })),
  setPollingConfig: (config) => set({ pollingConfig: config }),

  selectedAnomalyTab: 'vehicle',
  setSelectedAnomalyTab: (tab) => set({ selectedAnomalyTab: tab }),

  vehicleFilter: {},
  setVehicleFilter: (filter) => set({ vehicleFilter: filter }),

  dismissedAnomalies: new Set(),
  dismissAnomaly: (id) =>
    set((state) => {
      const newSet = new Set(state.dismissedAnomalies)
      newSet.add(id)
      return { dismissedAnomalies: newSet }
    }),

  connectionStatus: 'connected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  lastSyncTime: undefined,
  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  darkMode: localStorage.getItem('darkMode') === 'true' || false,
  setDarkMode: (enabled) => {
    localStorage.setItem('darkMode', String(enabled))
    set({ darkMode: enabled })
  },
  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode
      localStorage.setItem('darkMode', String(newMode))
      return { darkMode: newMode }
    }),
}))
