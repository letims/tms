import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from '../store/uiStore';
import { useVehicles } from '../hooks/useVehicles';
import { useZones } from '../hooks/useZones';
import { useAnomalies } from '../hooks/useAnomalies';
import * as telemetryApi from '../api/telemetry';
import { mockVehicleList, mockZones, mockAnomalies } from '../__mocks__/api';
vi.mock('../api/telemetry');
const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});
const wrapper = ({ children }) => {
    const queryClient = createQueryClient();
    return (_jsx(QueryClientProvider, { client: queryClient, children: children }));
};
describe('useVehicles hook', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getVehicles).mockResolvedValue(mockVehicleList);
    });
    it('fetches vehicles', async () => {
        const { result } = renderHook(() => useVehicles(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data?.vehicles.length).toBeGreaterThan(0);
        expect(result.current.data?.total).toBe(50);
    });
    it('respects polling interval from store', () => {
        const { result: storeResult } = renderHook(() => useUIStore());
        expect(storeResult.current.pollingConfig.vehicles).toBe(5000);
    });
});
describe('useZones hook', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getZoneCounts).mockResolvedValue(mockZones);
    });
    it('fetches zones', async () => {
        const { result } = renderHook(() => useZones(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data?.length).toBeGreaterThan(0);
    });
    it('respects polling interval from store', () => {
        const { result: storeResult } = renderHook(() => useUIStore());
        expect(storeResult.current.pollingConfig.zones).toBe(3000);
    });
});
describe('useAnomalies hook', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getAnomalies).mockResolvedValue(mockAnomalies);
    });
    it('fetches anomalies', async () => {
        const { result } = renderHook(() => useAnomalies(), { wrapper });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.data?.length).toBeGreaterThan(0);
    });
    it('respects polling interval from store', () => {
        const { result: storeResult } = renderHook(() => useUIStore());
        expect(storeResult.current.pollingConfig.anomalies).toBe(2000);
    });
});
describe('Polling configuration', () => {
    it('allows changing polling intervals', () => {
        const { result } = renderHook(() => useUIStore());
        act(() => { result.current.setPollingInterval('anomalies', 5000); });
        expect(result.current.pollingConfig.anomalies).toBe(5000);
    });
    it('supports 2s, 3s, and 5s intervals', () => {
        const { result } = renderHook(() => useUIStore());
        [2000, 3000, 5000].forEach((interval) => {
            act(() => { result.current.setPollingInterval('vehicles', interval); });
            expect(result.current.pollingConfig.vehicles).toBe(interval);
        });
    });
    it('maintains independent polling intervals', () => {
        const { result } = renderHook(() => useUIStore());
        act(() => {
            result.current.setPollingInterval('anomalies', 5000);
            result.current.setPollingInterval('zones', 2000);
        });
        expect(result.current.pollingConfig.anomalies).toBe(5000);
        expect(result.current.pollingConfig.zones).toBe(2000);
    });
});
describe('Vehicle filtering', () => {
    it('allows filtering by status', () => {
        const { result } = renderHook(() => useUIStore());
        act(() => { result.current.setVehicleFilter({ status: 'fault' }); });
        expect(result.current.vehicleFilter.status).toBe('fault');
    });
    it('allows searching by vehicle ID', () => {
        const { result } = renderHook(() => useUIStore());
        act(() => { result.current.setVehicleFilter({ searchTerm: 'v-01' }); });
        expect(result.current.vehicleFilter.searchTerm).toBe('v-01');
    });
    it('allows combining filters', () => {
        const { result } = renderHook(() => useUIStore());
        act(() => { result.current.setVehicleFilter({ status: 'fault', searchTerm: 'v-' }); });
        expect(result.current.vehicleFilter.status).toBe('fault');
        expect(result.current.vehicleFilter.searchTerm).toBe('v-');
    });
});
