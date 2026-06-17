import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { VehicleGrid } from '../components/VehicleGrid';
import * as telemetryApi from '../api/telemetry';
import { mockVehicleList } from '../__mocks__/api';
vi.mock('../api/telemetry');
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});
const wrapper = ({ children }) => (_jsx(QueryClientProvider, { client: createTestQueryClient(), children: children }));
describe('VehicleGrid', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getVehicles).mockResolvedValue(mockVehicleList);
    });
    it('renders vehicle grid', async () => {
        render(_jsx(VehicleGrid, {}), { wrapper });
        expect(screen.getByText(/Vehicles/)).toBeInTheDocument();
    });
    it('displays vehicles', async () => {
        render(_jsx(VehicleGrid, {}), { wrapper });
        expect(await screen.findByText('v-01')).toBeInTheDocument();
    });
    it('filters by status', async () => {
        render(_jsx(VehicleGrid, {}), { wrapper });
        const statusSelect = await screen.findByDisplayValue('All');
        expect(statusSelect).toBeInTheDocument();
    });
    it('filters by search term', async () => {
        render(_jsx(VehicleGrid, {}), { wrapper });
        const searchInput = screen.getByPlaceholderText('Search by ID...');
        expect(searchInput).toBeInTheDocument();
    });
});
