import { create } from 'zustand';
import { DEFAULT_POLLING_CONFIG } from '../types';
export const useUIStore = create((set) => ({
    pollingConfig: DEFAULT_POLLING_CONFIG,
    setPollingInterval: (endpoint, interval) => set((state) => ({
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
    dismissAnomaly: (id) => set((state) => {
        const newSet = new Set(state.dismissedAnomalies);
        newSet.add(id);
        return { dismissedAnomalies: newSet };
    }),
    connectionStatus: 'connected',
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    lastSyncTime: undefined,
    setLastSyncTime: (time) => set({ lastSyncTime: time }),
    darkMode: localStorage.getItem('darkMode') === 'true' || false,
    setDarkMode: (enabled) => {
        localStorage.setItem('darkMode', String(enabled));
        set({ darkMode: enabled });
    },
    toggleDarkMode: () => set((state) => {
        const newMode = !state.darkMode;
        localStorage.setItem('darkMode', String(newMode));
        return { darkMode: newMode };
    }),
}));
