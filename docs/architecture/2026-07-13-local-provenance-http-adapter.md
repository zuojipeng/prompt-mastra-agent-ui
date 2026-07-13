# Architecture Note: Local Provenance HTTP Adapter

## Decision

Expose the deterministic Python Genblaze pipeline through a loopback-only standard-library HTTP server. Do not add a framework, queue, database, auth system, provider credential, or B2 network path yet.

## Boundary

- Bind address: `127.0.0.1` only.
- Routes: `GET /health`, `POST /v1/provenance-runs`, and preflight `OPTIONS`.
- Body: JSON only, maximum 64KB.
- CORS: echo only localhost or 127.0.0.1 origins.
- Request: `jingci.provenance-run-request.v1`.
- Response: `jingci.provenance-run.v1`.
- Storage: existing in-memory Genblaze `ObjectStorageSink` adapter.

The pure `dispatch_request` function owns routing and validation. `BaseHTTPRequestHandler` only translates HTTP bytes to and from that boundary, keeping most tests independent of sockets.

## Failure Rules

- Invalid JSON or contract: 400 with stable error code.
- Unsupported content type: 415.
- Body above 64KB or invalid/negative length: 413.
- Unknown route: 404.
- Unexpected pipeline exception: redacted 500 without exception text.

## Rejected Alternatives

- FastAPI or Flask: dependency and deployment shape are not justified by two local routes.
- Cloudflare Worker Python rewrite: violates the established runtime boundary.
- Public bind address: adds attack surface before authentication exists.
- Silent B2 fallback: would blur verified memory evidence with durable storage evidence.

## Test And Rollback

Pure dispatcher tests cover routing, CORS, lineage, pipeline execution, limits, and redacted failure. A separate loopback smoke starts an ephemeral server and performs real HTTP GET/POST. Rollback removes `http_service.py`; the existing CLI, pipeline, frontend fixture, and production app remain unchanged.
