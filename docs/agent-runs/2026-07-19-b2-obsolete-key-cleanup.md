# Agent Run: B2 Obsolete Key Cleanup

Date: 2026-07-19

Task: C-043 / JC-T005

Orchestrator: Hermes

## Authorization

The human owner authorized one administrator authorization and one key-list query, followed by deletion only if the rejected Key ID hash, `jingci-preview/` prefix, and broad dangerous scope produced exactly one candidate while the active minimal key was excluded. Successful revocation could remove the local Master Key file. Object operations, active-key deletion, deployment, and automatic retry were prohibited.

## Execution

- Administrator authorization and the complete single-page key listing succeeded.
- Exactly one candidate matched the prior rejected Key ID SHA-256, prefix, and bucket-configuration mutation capabilities.
- The first approved v4 delete call was rejected because Backblaze limits v4 deletion to Multi-Bucket keys; no key was deleted and the administrator file remained.
- Security and DevOps checked the official API contract, changed only the endpoint to v3 for the traditional single-Bucket key, and obtained a new exact approval.
- The v3 call deleted the obsolete key. The active minimal-key hash remained unchanged.
- `.env.b2-admin.local` was removed only after successful revocation.

## Result

Private mode-0600 evidence records only old and active Key ID hashes plus false secret/token/object/deployment fields. No B2 object, deployment, publication, submission, or paid media operation was touched.
