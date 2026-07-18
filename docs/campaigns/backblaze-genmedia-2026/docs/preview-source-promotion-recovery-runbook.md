# Preview Source Promotion Recovery Runbook

Status: design only; no live adapter or mutation authority

## Purpose

Recover one consumed retained-source promotion without retrying, overwriting, or deleting an object whose ownership is ambiguous. The immutable approval marker is the recovery anchor.

## Preconditions

- Stop the promotion process and disable any future live entrypoint.
- Keep the approval marker, approval document, source media, and any terminal result private and unchanged.
- Pin the same clean commit and run ID named by the marker.
- Use read-only exact-key lookup first. Never list or recursively inspect the bucket.
- Do not create a new approval while the consumed run lacks a validated terminal state.

## Decision Matrix

| Marker | Terminal result | Exact-key lookup | Required decision | Object action | Retry |
| --- | --- | --- | --- | --- | --- |
| absent | any | any | No operation was authorized | none | forbidden |
| present | valid | any | Accept only the validated terminal state | none | forbidden |
| present | absent | absent | Record `failed_compensated` | none | forbidden |
| present | absent | exact key, bytes, size, and digest match | Record `recovery_required`; preserve for human review | preserve | forbidden |
| present | absent | mismatch, permission failure, timeout, or unknown | Record `recovery_required`; ownership is ambiguous | preserve | forbidden |

Matching bytes after a crash are not automatically promoted to `passed`: the original process may have failed before backend close or terminal evidence publication. A separate reviewed recovery attestation would be required to promote that state.

## Forbidden Recovery Actions

- automatic or manual retry under the consumed approval;
- overwrite or rename of the exact source key;
- deleting a matching, mismatched, or unknown object merely to clear the gate;
- prefix listing, recursive cleanup, lifecycle changes, bucket visibility changes, or version deletion;
- logging credentials, signed URLs, raw exceptions, source bytes, or private file paths;
- treating recovery evidence as deployment, publication, submission, or paid-API authorization.

## Evidence

Write one immutable mode-0600 result bound to the real marker. A recovery-required result names only the approved source key and non-secret stable failure code. Preserve hashes, timestamps, and redacted lookup outcome; never include credential values or signed URLs.

## Escalation

Escalate to the human owner when an exact object exists after interruption, lookup is unavailable, bytes differ, cleanup cannot be proven, or the configured credential scope is broader than the one bucket and `jingci-preview/source/` prefix. No recovery branch authorizes execution.
