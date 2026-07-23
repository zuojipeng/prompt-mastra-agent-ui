# Agent Run: Cloudflare Preview Deployment Smoke

Status: ROLLED BACK / HUMAN GATE

Date: 2026-07-23

Task: C-048 / JC-T005

Orchestrator: Hermes

Agents: DevOps Agent, Engineering Agent, Test Agent, Code Review Agent, Claims Review Agent

## Goal

Deploy the guarded campaign preview, prove Access and the B2 retained-source path,
and roll back safely if the live cloud transaction does not pass.

## Result

Cloudflare Access protected both production and hash deployment hostnames. The
Pages Function health route passed, while the authenticated B2 transaction returned
HTTP 502. A one-shot no-retry local invocation of the same gateway and local
credential passed source digest verification plus manifest write/readback. The team
therefore rejected promotion of the cloud claim, disabled the feature, removed the
temporary smoke surface, and deployed rollback commit
`3189164f55480afff0bf972f732c66095854aff5`.

## Next Gate

The human owner must explicitly reapprove sending the local B2 Key ID and
application key to Cloudflare Pages after being informed that this is a repeated
third-party credential transfer. No workaround is permitted.
