import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AnomalyFeed } from '../components/AnomalyFeed';
import * as telemetryApi from '../api/telemetry';
import { mockAnomalies } from '../__mocks__/api';
vi.mock('../api/telemetry');
const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});
const wrapper = ({ children }) => (_jsx(QueryClientProvider, { client: createTestQueryClient(), children: children }));
describe('AnomalyFeed', () => {
    beforeEach(() => {
        vi.mocked(telemetryApi.telemetryApi.getAnomalies).mockResolvedValue(mockAnomalies);
    });
    it('renders anomaly feed', async () => {
        render(_jsx(AnomalyFeed, {}), { wrapper });
        expect(screen.getByText('Recent Anomalies')).toBeInTheDocument();
    });
    it('displays tabs', async () => {
        render(_jsx(AnomalyFeed, {}), { wrapper });
        expect(screen.getByRole('button', { name: 'Vehicle' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Timeline' })).toBeInTheDocument();
    });
    it('switches between tabs', async () => {
        render(_jsx(AnomalyFeed, {}), { wrapper });
        const timelineTab = screen.getByRole('button', { name: 'Timeline' });
        await userEvent.click(timelineTab);
        expect(timelineTab).toHaveClass('bg-blue-600');
    });
    it('displays anomalies', async () => {
        render(_jsx(AnomalyFeed, {}), { wrapper });
        const matches = await screen.findAllByText(/v-0[123]/);
        expect(matches.length).toBeGreaterThan(0);
    });
});
