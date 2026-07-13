# Code Review: Preview Service Hardening

Reviewer: Code Review Agent + Test Agent + DevOps Agent + Claims Review Agent
Producer reviewed: Architecture Agent + Engineering Agent
Decision: PASS FOR LOCAL PREVIEW HARDENING ONLY

## Strongest Rejection Reason

Adding a bearer and CORS could create false confidence while still leaking secrets in logs, letting unauthenticated slow requests consume workers, or being described as reviewer authentication.

## Findings

1. P1, closed: public bind requires exact opt-in configuration; loopback remains the default.
2. P1, closed: unauthorized preview requests are rejected before body read or generation concurrency acquisition.
3. P1, closed: exact HTTPS origin comparison rejects suffix origins and denied preflights receive no CORS permission.
4. P1, closed after review: query strings are stripped from structured logs and public validation errors no longer echo attacker-controlled values.
5. P1, closed after review: process health bypasses the generation semaphore; overload returns bounded `503` and the gate recovers.
6. P1, closed: the 10-second socket read timeout, 64KB body cap, feature disablement, request IDs, and generic execution errors are locally proven.
7. P1, accepted residual: the bearer is only an upstream service secret. Reviewer identity, edge rate limiting, daily quota, dependency checks, and deployment remain missing.

## Residual Risk

The standard-library server has not faced internet traffic and cannot prove proxy behavior, distributed rate limiting, identity assertions, provider/B2 latency, process termination of long generation, monitoring, or production recovery.
