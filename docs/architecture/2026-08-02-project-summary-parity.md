# Architecture: Project Evidence Summary Parity

Date: 2026-08-02
Status: Accepted

## Decision

Use the persisted project workspace as the source of truth for summary evidence in both runtimes. The frontend derives local summaries; the Worker derives cloud summaries from the same conceptual fields. No shared package is introduced because the browser and Worker live in separate repositories and runtimes.

The additive summary contract includes feedback iteration, platform calibration, handoff readiness, and explicitly selected shot attempt evidence. Old cloud responses are normalized to `0` and `null` so rolling deployment does not break the dashboard.

## UI Boundary

The Project Dashboard adds one compact evidence line inside the existing project row. It does not add a new card, state manager, route, or provider adapter. Provider and model join the existing search surface.

## Failure Policy

Missing or stale selection must not fall back to the newest attempt. The backend validates malformed payload records; the frontend only presents complete provider/model/status triples.
