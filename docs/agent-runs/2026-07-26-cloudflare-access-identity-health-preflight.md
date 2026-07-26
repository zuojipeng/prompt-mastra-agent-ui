# Agent Run: Cloudflare Access Identity Health Preflight

Date: 2026-07-26

Task: C-049 / C-054 / JC-T005

Orchestrator: Hermes

Agents: DevOps Agent, Security Agent, Test Agent, Code Review Agent, Claims Review Agent

## Goal

Prove that a temporary Cloudflare Access service identity can reach the pinned
preview health endpoint before requesting authority for another provenance
business POST.

## Execution

- Created one temporary service token.
- Created one reusable `Service Auth` policy containing only that token.
- Attached it to the exact wildcard Pages application.
- Saved the policy and outer application, then reloaded the application.
- Confirmed bidirectional policy/application membership and an application usage
  count of exactly one.
- Validated a mode-0600, short-lived, secret-free attachment attestation.
- Sent exactly one authorized identity-only
  `GET /api/provenance/health`, without retry.

## Result

The identity request returned HTTP 302 with `text/html` instead of the required
HTTP 200 JSON response. The Pages Function was not reached. No business POST or
B2 operation was attempted.

## Cleanup

The policy was detached and saved, the reusable policy and service token were
deleted, and all local credential, response, header, and attestation files were
removed.

## Decision

Stop at the Access boundary. Diagnose why a correctly persisted Service Auth
policy still redirects before requesting any new identity or business execution
authority.
