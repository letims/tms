export interface Vehicle {
  vehicle_id: string
  status: 'idle' | 'moving' | 'charging' | 'fault'
  battery_pct: number
  lat: number
  lon: number
  speed_mps: number
  last_seen: string
}

export interface VehicleList {
  vehicles: Vehicle[]
  total: number
  limit: number
  offset: number
}

export interface Zone {
  zone_id: string
  entry_count: number
}

export interface Anomaly {
  id: number
  vehicle_id: string
  detected_at: string
  anomaly_type: string
  details: Record<string, unknown>
  telemetry_event_id: number
}

export interface FleetState {
  counts: {
    idle: number
    moving: number
    charging: number
    fault: number
  }
  total: number
  as_of: string
}

export type PollingInterval = 2000 | 3000 | 5000

export interface PollingConfig {
  anomalies: PollingInterval
  zones: PollingInterval
  vehicles: PollingInterval
}

export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  anomalies: 2000,
  zones: 3000,
  vehicles: 5000,
}
