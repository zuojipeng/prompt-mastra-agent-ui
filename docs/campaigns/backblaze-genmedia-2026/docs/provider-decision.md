# ADR: Campaign AI Video Provider

Status: accepted for offline implementation; live execution remains blocked
Date: 2026-07-14
Owners: Product Agent + Architecture Agent
Reviewers: Claims Review Agent + Test Agent

## Decision

Use Runway `gen4.5` as the first live AI video provider candidate for the campaign's selected-shot path. The campaign request is deliberately narrow:

- text-to-video, without a required first-frame image
- model `gen4.5`
- landscape `1280:720`
- duration 5 seconds
- one output MP4
- one task at a time

This matches the current DirectorKit output: a shot already has an execution prompt but does not necessarily have a reusable first-frame image. Runway `gen4_turbo` is not the primary candidate because its current documented contract requires an image input. It remains a later option for shots that already own an approved first frame.

## Official Constraints Reviewed

Official documentation was checked on 2026-07-14:

| Constraint | Campaign interpretation | Official source |
| --- | --- | --- |
| Gen-4.5 text-to-video | Use the image-to-video API/SDK operation with `promptImage` omitted | https://docs.dev.runwayml.com/guides/using-the-api/ |
| Model capability | `gen4.5` supports text-to-video; `gen4_turbo` is image-to-video | https://docs.dev.runwayml.com/guides/models/ |
| Price | 12 credits/second; credits cost $0.01 | https://docs.dev.runwayml.com/guides/pricing/ |
| Task lifecycle | Poll no more frequently than every 5 seconds; include `THROTTLED` as waiting | https://docs.dev.runwayml.com/api-details/sdks/ and https://docs.dev.runwayml.com/usage/tiers/ |
| API version | Pin `X-Runway-Version: 2024-11-06`; a version change requires contract review | https://docs.dev.runwayml.com/api-details/versioning/ |
| Terminal states | `SUCCEEDED`, `FAILED`, or `CANCELED` | https://docs.dev.runwayml.com/api-details/sdks/ |
| Output lifetime | Signed output URLs expire within 24-48 hours and must be copied to owned storage | https://docs.dev.runwayml.com/assets/outputs/ |
| HTTP retryability | Do not retry 400/401/404/405; 429/502/503/504 may use backoff and jitter | https://docs.dev.runwayml.com/errors/errors/ |
| Failure semantics | Safety failures and invalid input are not generic retry candidates | https://docs.dev.runwayml.com/errors/task-failures/ |

Runway can change these constraints. The live gate must re-check the endpoint schema and price on the execution date.

## Cost And Human Gate

A 5-second `gen4.5` run is estimated at 60 credits, or **$0.60 before tax**. No cost has been incurred by this decision or its tests.

The first live smoke is limited to one generation. A retry would raise the maximum to $1.20 and needs a separate operator decision after the first result is inspected. Registration approval is not spend approval. A future live command must require an exact confirmation, load the API secret only after that check, and report the planned maximum cost without printing credentials.

## Adapter Contract

`RunwayVideoProvider` is an official Genblaze `SyncProvider` with an injected `RunwayTaskClient`. The provider owns orchestration rules; a future HTTP/SDK transport owns authorization, redirect handling, bounded streaming, and retry/backoff.

1. Reject empty prompts and any model other than `gen4.5` before task creation.
2. Submit the fixed ratio and duration, then poll at intervals of at least five seconds.
3. Treat `PENDING`, `THROTTLED`, and `RUNNING` as waiting. Fail closed on unknown or malformed states.
4. Stop create, poll, and download at one overall deadline. On timeout, attempt cancellation once with a separate cleanup budget capped at five seconds, and never accept a late success.
5. Accept exactly one HTTPS output URL on an operator-approved exact host. Wildcards, suffix matching, user info, non-default ports, and IP literals are rejected.
6. Require the transport to invoke the same validator before following every redirect, then revalidate the final URL as defense in depth. Accept only a non-empty `video/mp4` body below the configured byte ceiling.
7. Require an ISO-BMFF `ftyp` signature. The live transport must additionally probe stream, dimensions, codec, and duration before it may claim valid generated video.
8. Write verified bytes to a private local handoff file. Persist only a file URI, digest, size, task ID, API version, and output host into Genblaze; never persist the signed provider URL.
9. Hand the file to Genblaze `ObjectStorageSink`; only a successful B2 read-back may become live campaign evidence.

The current module intentionally provides no real HTTP client and does not read `RUNWAYML_API_SECRET`. `FakeRunwayTaskClient` scripts the lifecycle without a socket, credential, or billable action.

## Failure Semantics

| Failure | Stable adapter result | Retry position |
| --- | --- | --- |
| Empty prompt or wrong model | `invalid_prompt` / `model_not_allowed` | Fix request; do not retry |
| Task creation or polling transport error | `task_creation_failed` / `task_poll_failed` | Future transport classifies official retryable HTTP codes |
| Deadline reached | `timeout`, cancel once | Human/operator decides whether to spend on a retry |
| Provider `FAILED` or `CANCELED` | `task_failed` / `task_canceled` | Preserve attempt lineage; no fixture downgrade |
| Unknown state or malformed payload | fail closed | Contract review required |
| Unapproved output URL | `output_url_not_allowed` | Security failure; do not fetch |
| Wrong type, empty body, or oversized body | media boundary failure | No Genblaze/B2 success record |

## Alternatives

- Runway `gen4_turbo`: lower cost at 5 credits/second, but the documented image input does not match the first prompt-only slice.
- OpenAI Sora: viable asynchronous video API, but would add a second campaign-specific contract without improving the already selected Runway/Genblaze/B2 judging story.
- Multi-provider routing: rejected for this campaign. One proven provider path is more valuable than an unverified abstraction.

## Claims Boundary

Provider **selection and offline adapter behavior are proven**. External AI media generation is still blocked. Submission text must continue to say that live Runway output, B2 persistence, and the public path are unproven until their separate gates pass.
