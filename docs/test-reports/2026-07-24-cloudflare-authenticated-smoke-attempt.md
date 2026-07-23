# Test Report: Cloudflare Authenticated Smoke Attempt

Status: DEPLOYED / SMOKE UNREACHED / BLOCKED

Date: 2026-07-24

## Scope

Re-upload the reviewed B2 Key ID and application key to Cloudflare Pages, enable the
guarded provenance runtime, deploy commit
`c8eb57cb04d9f1d66334623e7ebdf69258ae47f6`, and execute exactly one authenticated
B2 smoke. No Runway call, public release, paid call, or Devpost submission was
authorized.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Pages secret upload | PASS | `B2_KEY_ID`, `B2_APP_KEY`, and exact `YES` feature flag stored as encrypted Pages secrets |
| Pinned deployment | PASS | Deployment `97262b86-97fe-47ae-87f8-eefa9f0c20c9` |
| Deployment URL | PASS | `https://97262b86.jingci-genmedia-preview-2026.pages.dev` |
| Temporary Access service authentication | PASS | One scoped Service Auth policy and one temporary service token created for the smoke |
| Authenticated B2 smoke | UNREACHED | The single local `curl` exited with DNS resolution failure before an HTTP connection was established |
| Retry prohibition | PASS | Exactly one invocation; no retry |
| Temporary Access policy cleanup | PASS | Policy detached from the application and deleted |
| Temporary service token cleanup | PASS | Token deleted |
| Local temporary secret cleanup | PASS | Temporary Access/request files removed; no response file existed |
| Original owner policy preserved | PASS | `Jingci Owner Preview` remains the only application policy |

## Interpretation

The deployment succeeded, but the smoke produced no Cloudflare or application
response. A local DNS failure cannot be classified as an Access, Pages Function, or
B2 result. The prior HTTP 502 is therefore not resolved or reproduced by this run.

The one-attempt authorization is consumed. A future cloud smoke requires a new,
explicit authorization and should run from an environment that can resolve the
Pages hostname.

## Safety

- No B2 object operation was observed.
- No Runway request or spend occurred.
- No public publication or Devpost submission occurred.
- Temporary Cloudflare authorization was fully revoked after the failed attempt.
