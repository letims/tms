import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '../api/telemetry';
import { useUIStore } from '../store/uiStore';
export function useAnomalies() {
    const pollingConfig = useUIStore((state) => state.pollingConfig);
    return useQuery({
        queryKey: ['anomalies'],
        queryFn: () => telemetryApi.getAnomalies({ limit: 100 }),
        refetchInterval: pollingConfig.anomalies,
        staleTime: pollingConfig.anomalies / 2,
        retry: 3,
        retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
    });
}
export function useLatestAnomaliesPerVehicle() {
    const { data = [] } = useAnomalies();
    const dismissedAnomalies = useUIStore((state) => state.dismissedAnomalies);
    const filtered = data.filter((a) => !dismissedAnomalies.has(a.id));
    const latestPerVehicle = {};
    for (const anomaly of filtered) {
        if (!latestPerVehicle[anomaly.vehicle_id] ||
            new Date(anomaly.detected_at) >
                new Date(latestPerVehicle[anomaly.vehicle_id].detected_at)) {
            latestPerVehicle[anomaly.vehicle_id] = anomaly;
        }
    }
    return latestPerVehicle;
}
export function useAnomalyTimeline() {
    const { data = [] } = useAnomalies();
    const dismissedAnomalies = useUIStore((state) => state.dismissedAnomalies);
    return [...data]
        .filter((a) => !dismissedAnomalies.has(a.id))
        .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
}
