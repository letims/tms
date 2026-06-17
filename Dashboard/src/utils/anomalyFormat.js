/** One-line summary shown in the truncated table cell. */
export function anomalySummary(type, d) {
    switch (type) {
        case 'zero_battery':
            return 'Battery at 0% — discharged or sensor failure';
        case 'critical_battery':
            return `Battery at ${d.battery_pct?.toFixed(1)}% (critical threshold: ${d.threshold}%)`;
        case 'low_battery':
            return `Battery at ${d.battery_pct?.toFixed(1)}% (low threshold: ${d.threshold}%)`;
        case 'boundary_coordinates':
            return `GPS at ${d.lat?.toFixed(4)}°, ${d.lon?.toFixed(4)}° — sentinel value`;
        case 'overspeed':
            return `Speed ${d.speed_mps?.toFixed(1)} m/s — limit ${d.threshold} m/s`;
        case 'moving_with_fault':
            return `Moving at ${d.speed_mps?.toFixed(1)} m/s while in fault state`;
        case 'unexpected_error_codes':
            return `Error codes while ${d.status}: ${(d.error_codes ?? []).join(', ')}`;
        case 'stale_vehicle':
            return `No signal for ${formatGap(d.gap_seconds)} (threshold: ${d.threshold_seconds}s)`;
        default:
            return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(' · ');
    }
}
/** Structured rows for the tooltip. Each row is { label, value }. */
export function anomalyRows(type, d) {
    switch (type) {
        case 'zero_battery':
            return [
                { label: 'Battery', value: '0%' },
                { label: 'Note', value: 'Completely discharged or sensor failure' },
            ];
        case 'critical_battery':
            return [
                { label: 'Battery', value: `${d.battery_pct?.toFixed(1)}%` },
                { label: 'Critical threshold', value: `${d.threshold}%` },
                { label: 'Margin', value: `${(d.battery_pct - d.threshold).toFixed(1)}%` },
            ];
        case 'low_battery':
            return [
                { label: 'Battery', value: `${d.battery_pct?.toFixed(1)}%` },
                { label: 'Low threshold', value: `${d.threshold}%` },
                { label: 'Margin', value: `${(d.battery_pct - d.threshold).toFixed(1)}%` },
            ];
        case 'boundary_coordinates':
            return [
                { label: 'Latitude', value: `${d.lat?.toFixed(6)}°` },
                { label: 'Longitude', value: `${d.lon?.toFixed(6)}°` },
                { label: 'Note', value: 'GPS sentinel value or calibration failure' },
            ];
        case 'overspeed':
            return [
                { label: 'Speed', value: `${d.speed_mps?.toFixed(2)} m/s` },
                { label: 'Limit', value: `${d.threshold} m/s` },
                { label: 'Excess', value: `+${(d.speed_mps - d.threshold).toFixed(2)} m/s` },
            ];
        case 'moving_with_fault':
            return [
                { label: 'Speed', value: `${d.speed_mps?.toFixed(2)} m/s` },
                { label: 'Max allowed', value: `${d.threshold} m/s while faulted` },
            ];
        case 'unexpected_error_codes':
            return [
                { label: 'Status', value: d.status ?? '—' },
                { label: 'Error codes', value: (d.error_codes ?? []).join(', ') || '(none)' },
                { label: 'Note', value: 'Error codes reported outside of fault status' },
            ];
        case 'stale_vehicle': {
            const lastSeen = d.previous_last_seen ? new Date(d.previous_last_seen) : null;
            return [
                { label: 'Gap', value: formatGap(d.gap_seconds) },
                { label: 'Threshold', value: `${d.threshold_seconds}s` },
                { label: 'Last seen', value: lastSeen ? lastSeen.toLocaleTimeString() : '—' },
                { label: 'Last seen date', value: lastSeen ? lastSeen.toLocaleDateString() : '—' },
            ];
        }
        default:
            return Object.entries(d).map(([k, v]) => ({ label: k, value: String(v) }));
    }
}
function formatGap(seconds) {
    if (seconds === undefined)
        return '—';
    if (seconds < 60)
        return `${Math.round(seconds)}s`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
