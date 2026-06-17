import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '../api/telemetry';
import { useUIStore } from '../store/uiStore';
export function useZones() {
    const pollingConfig = useUIStore((state) => state.pollingConfig);
    return useQuery({
        queryKey: ['zones'],
        queryFn: () => telemetryApi.getZoneCounts(),
        refetchInterval: pollingConfig.zones,
        staleTime: pollingConfig.zones / 2,
        retry: 3,
        retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    });
}
export function useSortedZones() {
    const { data = [] } = useZones();
    return [...data].sort((a, b) => a.zone_id.localeCompare(b.zone_id));
}
