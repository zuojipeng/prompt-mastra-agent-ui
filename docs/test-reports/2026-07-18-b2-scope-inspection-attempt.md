# Test Report: B2 Scope Inspection Attempt

Status: BLOCKED - HTTP 401

Date: 2026-07-18

| Check | Result |
| --- | --- |
| Human authorization limited to one read-only request | PASS |
| Config regular, owner-only, mode 0600, one link | PASS |
| Required B2 variable names present | PASS |
| Redirects disabled and response bounded | PASS |
| `b2_authorize_account` v4 | FAIL - HTTP 401 |
| Automatic retry | PASS - zero retries |
| Scope attestation written | PASS - absent after failed inspection |
| Application key/token/response body persisted or printed | PASS - none |
| B2 object read/write/delete | PASS - none |
| Temporary checker retained | PASS - removed |

The failure does not identify whether the Key ID/application key pair is invalid or the key is unsupported by the requested API version. No second request was made to distinguish those cases.
