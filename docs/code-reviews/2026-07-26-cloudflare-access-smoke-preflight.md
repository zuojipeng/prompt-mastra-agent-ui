# Code Review: Cloudflare Access Smoke Preflight

Date: 2026-07-26

Status: PASS OFFLINE / CLOUD GATE BLOCKED

## Strongest Rejection Reason

A static plan cannot prove Cloudflare's current remote policy attachment. Without
fresh post-save evidence, it could reproduce the same false confidence that caused
the HTTP 302 attempt.

## Repair Verified

1. The contract requires both the policy to list the target application and the
   application to list the policy.
2. The observation must occur after outer application save and reload.
3. Application usage must equal exactly one.
4. The attestation expires within 15 minutes and binds the pinned project,
   deployment, commit, method, and path.
5. Observer and reviewer must differ.
6. The health GET is configuration-only and expects no B2 operation.
7. Every cloud, business POST, B2, deployment, publication, and submission
   authority remains false.
8. HTTP 302, stale evidence, membership mismatch, target drift, secret material,
   or self-review fails closed.
9. Private attestation loading rejects permissive mode, hard links, symlink paths,
   ownership drift, and file identity changes during the read.

## Residual Risk

The offline validator proves the shape and freshness of supplied evidence, not
Cloudflare state by itself. A future attestation still requires real observation
under separate authority, and the one-shot business request still requires a
second explicit approval after identity preflight passes.

## Decision

PASS the offline prevention contract. Keep C-049 and release blocked.
