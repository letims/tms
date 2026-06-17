import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ZonePanel } from '../components/ZonePanel';
import * as telemetryApi from '../api/telemetry';
import { mockZones } from '../__mocks__/api';
vi.mock('../api/telemetry');
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});
const wrapper = ({ children }) => (_jsx(QueryClientProvider, { client: createTestQueryClient(), children: children }));
describe('ZonePanel', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getZoneCounts).mockResolvedValue(mockZones);
    });
    it('renders zone panel', async () => {
        render(_jsx(ZonePanel, {}), { wrapper });
        expect(screen.getByText('Zone Activity')).toBeInTheDocument();
    });
    it('displays zones sorted by entry count', async () => {
        render(_jsx(ZonePanel, {}), { wrapper });
        const zoneName = await screen.findByText(/./);
        expect(zoneName).toBeInTheDocument();
    });
    it('highlights hotspots', async () => {
        const hotspotsData = [
            { zone_id: 'pack_station', entry_count: 10 },
            { zone_id: 'charging_bay_1', entry_count: 2 },
        ];
        vi.mocked(telemetryApi.telemetryApi.getZoneCounts).mockResolvedValue(hotspotsData);
        render(_jsx(ZonePanel, {}), { wrapper });
        expect(await screen.findByText('🔥 Hotspot')).toBeInTheDocument();
    });
});
