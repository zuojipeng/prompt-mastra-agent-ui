# ADR: Project API Client Boundary

Date: 2026-06-25

## Status

Accepted

## Context

`lib/api-client.ts` already owns DirectorKit generation, history, feedback, analytics, and user data sync. The project cloud-sync slice added project persistence calls there as well, increasing coupling around a module that is already broad.

Project sync is now a distinct product boundary: it maps local project workspaces to the backend Projects API. It should be testable without loading the full prompt/feedback API surface.

## Decision

Create `lib/project-api-client.ts` for project cloud sync.

- Move project summary normalization into the new module.
- Move cloud project save, list, fetch, and delete helpers into the new module.
- Keep `lib/api-client.ts` focused on prompt generation, DirectorKit, feedback, history, and user data.
- Update `ChatBox` to import project sync helpers from `project-api-client`.
- Add unit tests for project API URL behavior, summary normalization, safe degradation, and encoded project ids.

## Consequences

Project persistence now has a smaller, explicit boundary. Future account/auth changes, project pagination, or cloud conflict handling can evolve inside this module without expanding the general API client.

The module duplicates the base API URL derivation for now. This is intentional: a shared config abstraction is not justified until more API clients need the same configuration behavior.

