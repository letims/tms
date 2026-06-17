**Architecture Decision Record — Fleet Telemetry Monitoring System**
*June 2026*

## 1. Most important decisions

**Polling over WebSockets / SSE.**
The dashboard polls every 2–5 seconds depending on the entity. Polling is the natural fit for a standard REST API: REST is built on the HTTP request-response model, and a standard REST server has no native mechanism to push events to clients. WebSockets require a special server setup — persistent connections, a pub/sub layer, and connection-aware load balancing — none of which are justified at 50 vehicles polling every few seconds. Polling is operationally simple, trivially compatible with any HTTP infrastructure, and sufficient for the current scale. The migration path to SSE or WebSockets is straightforward if latency requirements tighten.

**Single-process SQLite over a hosted database.**
A managed database (RDS, Cloud SQL) would have added operational dependencies, credentials management, and network hops. SQLite with WAL mode handles the stated workload (50 vehicles, warehouse LAN) with no external services. The decision buys simplicity now with a clear, well-understood migration path when the constraints change.

**Anomaly detection inside the ingest transaction.**
Anomalies are detected and persisted atomically with the telemetry event that triggered them. There is no window in which an event exists in the database without its anomalies. The alternative — async post-processing via a queue — would reduce ingest latency but introduce eventual consistency: a consumer reading anomalies immediately after a POST could observe none. For a safety-critical monitoring system, that gap is unacceptable without explicit product sign-off.

**BEGIN IMMEDIATE on every transaction, including reads.**
SQLite serialises all writes through a single writer lock. Issuing `BEGIN IMMEDIATE` at the start of every session — reads included — means a read of fleet state reflects a fully committed, consistent snapshot rather than a partially-written intermediate. The cost is higher tail latency under concurrency (measured at ~4 s p99 under 80 users in load tests). The alternative — restricting `BEGIN IMMEDIATE` to write sessions — would allow reads to observe state mid-transaction (e.g. a vehicle marked `fault` before its maintenance record exists). Given that fleet state drives dispatch decisions, correctness was prioritized over throughput.

---

## 2. Unclear constraints and assumptions made

**Fleet size was treated as a soft ceiling, not a hard one.** The spec states "50 vehicles" but doesn't say whether that is fixed or representative. The `/vehicles` endpoint is paginated and the telemetry ingest has no per-vehicle guard, so growth is handled without code changes.

**Authentication was absent from the spec.** Assumed internal network deployment (warehouse LAN) with no public exposure. Every endpoint is unauthenticated. This is the single largest assumption — it is not safe to expose this API beyond a trusted network boundary without adding auth.

**"Recent anomalies" has no defined retention window.** Assumed unlimited: telemetry events and anomalies accumulate indefinitely with no cleanup job. A real deployment would need a stated retention period (e.g. 90 days) to avoid unbounded storage growth.

**Zone definitions were fixed in code.** The spec listed zone_entered as a validated field but said nothing about how zones are administered. Assumed a static, pre-known set of 20 warehouse zones. Adding or renaming zones currently requires a code change and redeployment.

**Input validation** Took a guess on what the proper validation for the input would be as the server is responsible to persist correct data.

---

## 3. What would need to change at significant scale

"Significant" here means ≥ 500 vehicles and ≥ 200 concurrent ingest requests per second sustained.

SQLite's serialized writer becomes the hard ceiling first. Migration to PostgreSQL (or similar) removes this and enables multiple API workers. The `BEGIN IMMEDIATE` strategy has a direct equivalent in Postgres (`BEGIN` at `SERIALIZABLE` or advisory locks on the fault-transition path).

The in-process fleet state cache must become a shared cache (Redis or Memcached) — it currently lives in one Python process's memory and is invisible to any other worker replica.

Anomaly detection should be extracted to an async worker (Celery, RQ, or a Kafka consumer) so ingest latency is decoupled from detection complexity. This introduces eventual consistency on anomaly reads, which would need explicit product alignment.

The `telemetry_events` table will degrade without partitioning or archival once it contains tens of millions of rows. Time-based partitioning (monthly) and a retention policy are pre-conditions for operating at that scale. Also would need to index some DB tables, specially the events table.

Load balancing so the server can be available during outbursts.

---

## 4. What was deliberately left out

**Authentication and authorization.** Adding OAuth2/JWT adds a non-trivial operational surface (token issuance, rotation, JWKS). Not justified until the deployment boundary is defined.

**Observability infrastructure.** No structured logging, no Prometheus metrics endpoint, no distributed tracing. Stdout logging and the `/health` endpoint are the only signals. A production deployment would need these before going live.

**Data retention and archival.** No TTL, no soft-delete, no cold storage tier. Left out because retention policy is a product and compliance decision that should not be embedded in code without explicit requirements.