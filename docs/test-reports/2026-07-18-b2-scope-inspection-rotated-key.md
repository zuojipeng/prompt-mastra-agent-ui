# Test Report: B2 Scope Inspection With Rotated Key

Status: REWORK - AUTHENTICATED, SCOPE REJECTED

Date: 2026-07-18

| Check | Result |
| --- | --- |
| New human authorization limited to one request | PASS |
| Rotated config regular, owner-only, mode 0600, one link | PASS |
| v4 authentication | PASS |
| Bucket scope returned in inspectable shape | PASS |
| Deny-by-default capability policy | FAIL - extra capability present |
| Passing scope attestation written | PASS - absent |
| Automatic retry | PASS - zero retries |
| Key/token/response body persisted or printed | PASS - none |
| B2 object read/write/delete | PASS - none |
| Temporary checker retained | PASS - removed |

The exact extra capability names were not retained because the temporary checker validated before publishing. No policy change may be inferred from this run. A new explicit request authorization is required to collect a private rejected-scope report.
