import { apiClient, ApiError } from './client';
export const telemetryApi = {
    async getVehicles() {
        try {
            const { data } = await apiClient.get('/vehicles');
            return data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new ApiError(500, 'Failed to fetch vehicles', error);
            }
            throw error;
        }
    },
    async getZoneCounts() {
        try {
            const { data } = await apiClient.get('/zones/counts');
            return data.zones || [];
        }
        catch (error) {
            if (error instanceof Error) {
                throw new ApiError(500, 'Failed to fetch zone counts', error);
            }
            throw error;
        }
    },
    async getAnomalies(params) {
        try {
            const { data } = await apiClient.get('/anomalies', { params });
            return data || [];
        }
        catch (error) {
            if (error instanceof Error) {
                throw new ApiError(500, 'Failed to fetch anomalies', error);
            }
            throw error;
        }
    },
    async getFleetState() {
        try {
            const { data } = await apiClient.get('/fleet/state');
            return data;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new ApiError(500, 'Failed to fetch fleet state', error);
            }
            throw error;
        }
    },
};
