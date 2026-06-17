import { useEffect } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
/**
 * Monitors all active queries and sets connectionStatus to 'error' when every
 * tracked endpoint has a failed state (i.e. the backend is fully unreachable).
 * Clears back to 'connected' as soon as any query succeeds.
 *
 * Mount once at the AppContent level.
 */
export function useConnectionGuard() {
    const queryClient = useQueryClient();
    const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);
    // Re-run whenever any fetch starts or finishes
    useIsFetching();
    useEffect(() => {
        const cache = queryClient.getQueryCache();
        const tracked = ['vehicles', 'zones', 'anomalies'];
        const queries = tracked
            .map((key) => cache.find({ queryKey: [key] }))
            .filter(Boolean);
        if (queries.length === 0)
            return;
        const allFailed = queries.every((q) => q.state.status === 'error' && q.state.fetchStatus === 'idle');
        const anySuccess = queries.some((q) => q.state.status === 'success');
        if (allFailed) {
            setConnectionStatus('error');
        }
        else if (anySuccess) {
            setConnectionStatus('connected');
        }
    });
}
