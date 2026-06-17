import { apiClient, ApiError } from './client'
import type { VehicleList, Zone, Anomaly, FleetState } from '../types'

export const telemetryApi = {
  async getVehicles(): Promise<VehicleList> {
    try {
      const { data } = await apiClient.get<VehicleList>('/vehicles')
      return data
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(500, 'Failed to fetch vehicles', error)
      }
      throw error
    }
  },

  async getZoneCounts(): Promise<Zone[]> {
    try {
      const { data } = await apiClient.get<{ zones: Zone[] }>('/zones/counts')
      return data.zones || []
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(500, 'Failed to fetch zone counts', error)
      }
      throw error
    }
  },

  async getAnomalies(params?: {
    vehicle_id?: string
    limit?: number
    from_ts?: string
    to_ts?: string
  }): Promise<Anomaly[]> {
    try {
      const { data } = await apiClient.get<Anomaly[]>('/anomalies', { params })
      return data || []
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(500, 'Failed to fetch anomalies', error)
      }
      throw error
    }
  },

  async getFleetState(): Promise<FleetState> {
    try {
      const { data } = await apiClient.get<FleetState>('/fleet/state')
      return data
    } catch (error) {
      if (error instanceof Error) {
        throw new ApiError(500, 'Failed to fetch fleet state', error)
      }
      throw error
    }
  },
}
