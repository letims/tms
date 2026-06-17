import asyncio
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


def telemetry_payload(
    vehicle_id: str,
    zone_entered: str | None = None,
    status: str = "moving",
) -> dict:
    return {
        "vehicle_id": vehicle_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": 1.0,
        "lon": 2.0,
        "battery_pct": 80.0,
        "speed_mps": 1.0,
        "status": status,
        "error_codes": [],
        "zone_entered": zone_entered,
    }


async def test_concurrent_zone_entries_no_dropped_counts(client: AsyncClient):
    """20 concurrent telemetry events into the same zone must all be counted."""
    zone = "charging_bay_1"

    tasks = [
        client.post(
            "/telemetry",
            json=telemetry_payload(vehicle_id=f"v-{i:02d}", zone_entered=zone),
        )
        for i in range(20)
    ]
    responses = await asyncio.gather(*tasks)

    for response in responses:
        assert response.status_code == 200

    counts_response = await client.get("/zones/counts")
    assert counts_response.status_code == 200

    zones = {z["zone_id"]: z["entry_count"] for z in counts_response.json()["zones"]}
    assert zones[zone] == 20


async def test_zones_counts_includes_full_registry(client: AsyncClient):
    response = await client.get("/zones/counts")
    assert response.status_code == 200

    zone_ids = {z["zone_id"] for z in response.json()["zones"]}
    assert "charging_bay_1" in zone_ids
    assert "pack_station" in zone_ids
    assert len(zone_ids) == 20


async def test_shift_change_charging_convergence(client: AsyncClient):
    """Plausible end-of-shift scenario: 50 vehicles converge on charging zones
    simultaneously in the same second.  No zone_entered event must be dropped.

    Distribution mirrors a real warehouse: most vehicles target the three
    charging bays proportionally to their capacity."""
    charging_zones = ["charging_bay_1", "charging_bay_2", "charging_bay_3"]
    # Assign vehicles round-robin across the three zones
    assignments = [(f"shift-{i:02d}", charging_zones[i % 3]) for i in range(50)]

    tasks = [
        client.post(
            "/telemetry",
            json=telemetry_payload(vehicle_id=vid, zone_entered=zone, status="charging"),
        )
        for vid, zone in assignments
    ]
    responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses)

    counts_response = await client.get("/zones/counts")
    zones = {z["zone_id"]: z["entry_count"] for z in counts_response.json()["zones"]}

    # Verify each zone received exactly the right number of entries
    expected: dict[str, int] = {}
    for _, zone in assignments:
        expected[zone] = expected.get(zone, 0) + 1

    for zone_id, expected_count in expected.items():
        assert zones[zone_id] == expected_count, (
            f"{zone_id}: expected {expected_count} entries, got {zones[zone_id]}"
        )

    # Total entries across all charging zones must equal number of vehicles
    total_charging_entries = sum(zones[z] for z in charging_zones)
    assert total_charging_entries == 50


async def test_multi_zone_concurrent_no_cross_contamination(client: AsyncClient):
    """Concurrent writes to *different* zones must each be counted independently
    without cross-contamination between zone counters."""
    zone_vehicle_map = {
        "aisle_a": [f"az-{i}" for i in range(10)],
        "pick_zone_1": [f"pz-{i}" for i in range(10)],
        "pack_station": [f"ps-{i}" for i in range(10)],
    }

    tasks = [
        client.post(
            "/telemetry",
            json=telemetry_payload(vehicle_id=vid, zone_entered=zone),
        )
        for zone, vids in zone_vehicle_map.items()
        for vid in vids
    ]
    await asyncio.gather(*tasks)

    counts_response = await client.get("/zones/counts")
    zones = {z["zone_id"]: z["entry_count"] for z in counts_response.json()["zones"]}

    for zone_id, vids in zone_vehicle_map.items():
        assert zones[zone_id] == len(vids), (
            f"{zone_id}: expected {len(vids)}, got {zones[zone_id]}"
        )
