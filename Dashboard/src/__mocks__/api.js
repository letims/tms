const _vehicles = Array.from({ length: 50 }, (_, i) => ({
    vehicle_id: `v-${String(i + 1).padStart(2, '0')}`,
    status: ['idle', 'moving', 'charging', 'fault'][i % 4],
    battery_pct: 20 + Math.random() * 80,
    lat: 40.7128 + Math.random() * 0.1,
    lon: -74.006 + Math.random() * 0.1,
    speed_mps: Math.random() * 5,
    last_seen: new Date(Date.now() - Math.random() * 30000).toISOString(),
}));
export const mockVehicles = _vehicles;
export const mockVehicleList = {
    vehicles: _vehicles.slice(0, 5),
    total: 50,
    limit: 5,
    offset: 0,
};
export const mockZones = [
    'inbound_dock_a',
    'inbound_dock_b',
    'receiving_staging',
    'aisle_a',
    'aisle_b',
    'aisle_c',
    'high_bay_1',
    'high_bay_2',
    'bulk_storage',
    'pick_zone_1',
    'pick_zone_2',
    'pack_station',
    'sort_belt',
    'outbound_dock_a',
    'outbound_dock_b',
    'shipping_staging',
    'charging_bay_1',
    'charging_bay_2',
    'charging_bay_3',
    'maintenance_bay',
].map((zone_id) => ({
    zone_id,
    entry_count: Math.floor(Math.random() * 10),
}));
export const mockAnomalies = [
    {
        id: 1,
        vehicle_id: 'v-01',
        detected_at: new Date(Date.now() - 5000).toISOString(),
        anomaly_type: 'low_battery',
        details: { battery_pct: 12.0, threshold: 15.0 },
        telemetry_event_id: 100,
    },
    {
        id: 2,
        vehicle_id: 'v-02',
        detected_at: new Date(Date.now() - 10000).toISOString(),
        anomaly_type: 'overspeed',
        details: { speed_mps: 6.5, threshold: 5.0 },
        telemetry_event_id: 101,
    },
    {
        id: 3,
        vehicle_id: 'v-03',
        detected_at: new Date(Date.now() - 15000).toISOString(),
        anomaly_type: 'critical_battery',
        details: { battery_pct: 3.5, threshold: 5.0 },
        telemetry_event_id: 102,
    },
];
export const mockFleetState = {
    counts: {
        idle: 15,
        moving: 20,
        charging: 10,
        fault: 5,
    },
    total: 50,
    as_of: new Date().toISOString(),
};
