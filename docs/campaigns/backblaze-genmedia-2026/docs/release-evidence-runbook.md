# Release Evidence Runbook

Status: local rehearsal only. This runbook does not authorize deployment, credentials, publication, or submission.

## Generate

From the repository root:

```bash
npm run hackathon:evidence
```

The collector writes a mode-`0600` snapshot to:

```text
artifacts/hackathon/backblaze-genmedia-2026/release-evidence.json
```

`artifacts/` is Git-ignored. The snapshot is regenerated for review and must not be committed as a permanent claim.

## Contents

- Current branch, full commit SHA, and worktree cleanliness.
- Submission and deployment structure, status, strict readiness, and blockers.
- Redacted claims, control states, access model, and provenance mode.
- Sorted SHA-256 and byte size for every declared evidence artifact.
- Secret-scan metadata for Git-tracked text files.
- Explicit binary, oversized, or symlink exclusions without file contents.
- Optional redacted live-attestation hash and validation state; private source evidence is never copied into release evidence.
- Narrow claims-promotion approval bound to the claims packet and redacted attestation hashes, including explicit false authorizations.

The collector never reads process environment variables. Secret findings contain only path, line, and rule; matched values are never copied into the output. A live attestation must be owner-owned, single-link, non-symlink, mode `0600`, commit-bound, and structurally valid.

## Interpret

`release_candidate=true` requires all of the following:

1. A clean Git worktree pinned to a 40-character commit.
2. Submission status `ready` or `submitted`, structural validity, and zero blockers.
3. Deployment status `preview-ready` or `deployed`, structural validity, and zero blockers.
4. Zero secret findings.
5. No unscanned symlink or oversized tracked file. Declared binary exclusions are listed and allowed.
6. A separately approved claims-promotion contract bound to a valid redacted live attestation.

Condition 6 is implemented by `claims-promotion-approval.json` and `check-hackathon-claims-promotion.mjs`. It promotes only the reviewed Runway generation and Genblaze-to-B2 recovery wording for Devpost draft and final demo copy. Deployment, video publication, final submission, new paid calls, and private evidence disclosure remain false. Editing readiness JSON or the approval file cannot bypass packet/attestation hash validation.

Use the strict command for a release-candidate rehearsal:

```bash
npm run hackathon:evidence:strict
```

Validate the claims boundary independently with:

```bash
npm run hackathon:claims:check
```

An expected nonzero exit while real blockers remain is evidence that the gate is working. Do not delete blockers or change statuses merely to make it green.

## Review

1. Confirm commit and branch match the candidate under review.
2. Confirm `clean=true` after all candidate commits are pushed.
3. Review every blocker and scan exclusion.
4. Recompute at least one artifact hash independently when closing the release gate.
5. Store only a redacted summary in reports; never paste environment output or secret values.
