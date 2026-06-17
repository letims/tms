# Fleet Telemetry Dashboard

A real-time React + TypeScript dashboard for monitoring a fleet of autonomous warehouse vehicles.

## Features

- **Live vehicle table** — status, battery level, speed, last-seen; sortable on every column, paginated (20 / 50 / 100 per page), filterable by status and searchable by ID
- **Zone monitoring** — real-time entry counts for all 20 warehouse zones, sorted alphabetically, with hotspot highlighting
- **Anomaly feed** — two views (per-vehicle latest and full timeline), both sortable and paginated; details column shows a human-readable summary with a structured tooltip on hover
- **Fleet state header** — live aggregate counts (idle / moving / charging / fault) with per-endpoint polling controls (2 s / 3 s / 5 s)
- **Offline overlay** — full-screen standby message when the backend is unreachable, with auto-retry and last-sync timestamp
- **Dark mode** — toggle in the header, persisted to localStorage
- **Error recovery** — auto-retry with exponential backoff; error boundary for render failures

## Tech stack

| | |
|---|---|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite | Build tool |
| TanStack Query | Data fetching and polling |
| Zustand | UI state (filters, polling config, dark mode) |
| Tailwind CSS | Styling |
| Vitest + React Testing Library | Testing |

## Setup

### Prerequisites

- Node.js 18+
- The API running on `http://127.0.0.1:8000` (see `API/README.md`)

### Install

```bash
cd Dashboard
npm install
```

### Configure

```bash
cat .env
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

Copy `.env.example` if the file is missing.

### Run

```bash
npm run dev
# → http://localhost:3000
```

### Test

```bash
npm run test       # headless
npm run test:ui    # browser UI
```

### Production build

```bash
npm run build
# output → dist/
```

Set `VITE_API_BASE_URL` to your production backend URL before building, then deploy `dist/` to any static host (Vercel, Netlify, S3 + CloudFront, etc.).

---

## Dashboard layout

```
Header
├── Fleet state counts (idle / moving / charging / fault)
├── Polling interval controls (per endpoint)
├── Connection status · Refresh button · Dark mode toggle

Main
├── VehicleGrid
│   ├── Search input · Status filter
│   ├── Sortable table (ID, Status, Battery, Speed, Last Seen)
│   └── Pagination (20 / 50 / 100 per page)
├── ZonePanel
│   └── 20 zones, alphabetical, hotspot highlight (> 5 entries)
└── AnomalyFeed
    ├── Vehicle tab — latest anomaly per vehicle, sortable
    └── Timeline tab — all anomalies newest-first, sortable
        Both tabs: paginated · details tooltip on hover
```

---

## Anomaly details tooltip

Hovering the Details column on any anomaly row shows a structured card instead of raw JSON:

| Anomaly type | Tooltip fields |
|---|---|
| `zero_battery` | Battery · Note |
| `critical_battery` / `low_battery` | Battery · Threshold · Margin |
| `boundary_coordinates` | Latitude · Longitude · Note |
| `overspeed` / `moving_with_fault` | Speed · Limit / Max allowed |
| `unexpected_error_codes` | Status · Error codes · Note |
| `stale_vehicle` | Gap · Threshold · Last seen |

---

## Filtering and sorting

Filters and sorting are applied client-side over the full fetched dataset before pagination, so they interact correctly:

1. All vehicles are fetched from the server (up to the configured limit)
2. Status filter and search are applied
3. The filtered set is sorted by the active column
4. The sorted set is paginated

Changing a filter or sort column resets to page 1 automatically.

---

## Polling

Each data source polls independently. Intervals are configurable in the header at runtime:

| Endpoint | Default |
|---|---|
| `/anomalies` | 2 s |
| `/zones/counts` | 3 s |
| `/vehicles` | 5 s |

The connection guard monitors all three queries and shows the offline overlay only when every endpoint has failed simultaneously.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Backend base URL |
