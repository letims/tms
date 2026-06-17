import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '../api/telemetry';
import { useUIStore } from '../store/uiStore';
export function useVehicles() {
    const pollingConfig = useUIStore((state) => state.pollingConfig);
    const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);
    const setLastSyncTime = useUIStore((state) => state.setLastSyncTime);
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            try {
                setConnectionStatus('connected');
                const data = await telemetryApi.getVehicles();
                setLastSyncTime(new Date());
                return data;
            }
            catch (error) {
                setConnectionStatus('error');
                throw error;
            }
        },
        refetchInterval: pollingConfig.vehicles,
        staleTime: pollingConfig.vehicles / 2,
        retry: 3,
        retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    });
}
export function useFilteredVehicles(filter) {
    const { data } = useVehicles();
    const vehicles = data?.vehicles ?? [];
    return vehicles.filter((vehicle) => {
        if (filter?.status && vehicle.status !== filter.status) {
            return false;
        }
        if (filter?.searchTerm) {
            return vehicle.vehicle_id
                .toLowerCase()
                .includes(filter.searchTerm.toLowerCase());
        }
        return true;
    });
}
export function useVehicleTotal() {
    const { data } = useVehicles();
    return data?.total ?? 0;
}
