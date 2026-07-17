# Claims Promotion Review

Status: **APPROVED FOR DEVPOST DRAFT AND FINAL DEMO COPY ONLY**

Human decision recorded: 2026-07-17T14:37:59Z. The human owner approved the three recommended claims and mandatory qualification exactly within the scope defined below. This approval does not authorize deployment, video publication, final submission, new paid calls, or private evidence disclosure.

## Recommended Public Claims

If the human owner approves this packet, Devpost copy and the final demo may say:

1. **Runway `gen4.5` generated one five-second 1280x720 H.264 shot during an approved private verification.**
2. **In a separate recovery verification, Genblaze stored that generated MP4 and its provenance manifest in Backblaze B2, read both objects back, verified their digests and lineage, and deleted the two scoped test objects.**
3. **The redacted evidence is source-bound, secret-scanned, and preserves media and manifest hashes without exposing the provider task, signed output location, B2 keys, or credentials.**

## Mandatory Qualification

Use this sentence beside the claims above:

> The provider generation and Genblaze-to-B2 verification completed as two evidence-preserving phases, not as one uninterrupted atomic transaction. The B2 objects were intentionally removed after verification, so this does not claim public serving or durable retention.

## Unsupported Claims

Do not say or imply:

- the Runway create and B2 transaction were one atomic request;
- the evidence proves exactly one lifetime provider request or general provider reliability;
- the generated asset is currently hosted or publicly served from B2;
- B2 version-level erasure was proven;
- the campaign app is deployed, release-ready, submitted, or endorsed by Runway or Backblaze;
- the private attestation, task metadata, account screen, object keys, or signed URLs may be shown publicly.

## Evidence Basis

- Private recovered-result file and MP4: owner-only, Git-ignored.
- Redacted attestation: `jingci.hackathon-recovered-live-attestation.v1`, `claims_eligible=false` until human approval.
- Public-safe media digest: `ca8ea95388d2e2f943f628ec6ca8bf9386baad8862b54ce26764675fa2b438f6`.
- Automated review: 114 Python tests; 61 Vitest suites / 164 tests; zero tracked-secret findings in the release collector.

## Decision Gate

Human approval of this packet promotes only the three recommended claims with the mandatory qualification for Devpost draft and final demo copy. Deployment, publication of a video, Devpost submission, new provider spend, and disclosure of private evidence remain unauthorized.
