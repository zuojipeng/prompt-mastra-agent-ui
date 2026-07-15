# Agent Run: Durable Approval and Recovery

## Goal

Close local replay and crash-evidence gaps without adding a live command, credentials, network access, or an exactly-once remote claim.

## Loop Board

Loop: 19
Decision: SHIP LOCAL CONTRACT, ESCALATE HUMAN GATES

| ID | From | To | Level | Request | Close Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DA1 | Architecture Agent | Engineering Agent | BLOCKER | Replace mutable append log with crash-safe immutable marker | temp sync, atomic hard link, directory sync, corrupt-marker denial | CLOSED |
| DA2 | Security Agent | Engineering Agent | BLOCKER | Prevent cross-process and approval-ID alias replay | 16-process spawn and independent 32-process fork races; same-ID drift denial | CLOSED |
| DA3 | Architecture Agent | Engineering Agent | BLOCKER | Reject symlinked ancestors and unsafe filesystem objects | component-wise `dir_fd` open, FIFO nonblocking rejection, owner/mode/link checks | CLOSED |
| DA4 | Security Agent | Engineering Agent | BLOCKER | Bind consumed failure to actual approval state | configured `DurableApprovalJournal` resolves marker internally; exact identity/hash/time checks | CLOSED |
| DA5 | Security Agent | Engineering Agent | BLOCKER | Bind recovery to an actual immutable failure | source file type/mode/hash/run/commit/storage/time verification | CLOSED |
| DA6 | Claims Review Agent | Engineering Agent | BLOCKER | Prevent false cleanup and recovered claims | exact owned-key partition, positive absence for every key, backend/local closure | CLOSED |
| DA7 | Architecture Agent | Engineering Agent | BLOCKER | Preserve provider uncertainty independently from cleanup | bounded task/cancellation state and `provider_recovery_required` | CLOSED |
| DA8 | Claims Review Agent | Hermes | HUMAN GATE | Do not convert local durability into live claims | non-attestable schemas rejected by C-022 | OPEN EXTERNAL |

## Result

- Provider create can occur only after a durable one-shot marker is published.
- Existing or damaged markers remain consumed forever; there is no stale-marker reclaim.
- A consumed run without terminal evidence becomes `execution_interrupted` and never retries automatically.
- Failure and recovery files form an immutable predecessor-bound chain.
- `recovered` means cleanup only, requires positive absence, and is impossible while provider state is uncertain.
- This is local POSIX at-most-once submission, not exactly-once Runway execution.

## Next Owner

The Human owner and Operator Agent close registration, account, credential, spend, output-host, and claims gates before any live composition root is introduced.
