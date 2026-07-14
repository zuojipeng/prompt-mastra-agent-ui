# Code Review: Runway Provider Contract

Reviewer: Architecture Agent + Claims Review Agent + Code Review Agent + Test Agent
Producer reviewed: Product Agent + Engineering Agent
Decision: PASS FOR OFFLINE CONTRACT ONLY

## Strongest Rejection Reason

A provider abstraction can appear complete while silently selecting the wrong input modality, retrying a paid task, fetching an attacker-controlled URL, or persisting a signed output URL as provenance.

## Findings

1. P1, closed: Runway `gen4.5` replaces the initial `gen4_turbo` idea because the first slice is text-only.
2. P1, closed: Genblaze retries are disabled for task submission; a new paid generation requires a new approved attempt.
3. P1, closed: one monotonic deadline bounds create, poll, and download; timeout attempts one cancellation.
4. P1, closed: exact host matching rejects suffix tricks, credentials, non-HTTPS schemes, unexpected ports, and IP literals; final redirect URL is revalidated.
5. P1, closed: task IDs are restricted before use in local file names.
6. P1, closed: unsupported negative prompts, input assets, caller-selected models, and provider parameters fail before task creation.
7. P1, closed: MIME, byte limit, empty body, and ISO-BMFF signature are checked before a Genblaze asset is created.
8. P1, closed: provider output URLs and query signatures never enter the Step, manifest, or durable asset URL.
9. P2, closed: pinned API version and estimated cost are reviewable metadata.
10. P1, closed after independent review: non-video modalities fail before task creation.
11. P1, closed after independent review: cancellation uses a separate cleanup timeout capped at five seconds; docs no longer claim it shares an already-expired generation deadline.
12. P1, closed after independent review: the client contract receives the URL validator and the fake proves a rejected redirect is not fetched.
13. P2, closed after independent review: local output I/O becomes a stable redacted provider failure.

## Residual Risk

There is no live HTTP client. C-019 must prove that its redirect implementation honors the contract callback before every request, map official HTTP/task failure classes, enforce Content-Length and streamed byte limits, run `ffprobe`, verify actual dimensions/duration/streams, clean temporary files after sink completion, and discover the exact live output host under a separately approved one-attempt spend gate.
