# Test Plan · V2 DirectorKit

Owner: Test Agent
Scope: V2 DirectorKit flow and contract

## Scope

In scope:
- Frontend contract constants and type usage
- Backend DirectorKit response validation
- Static build and smoke coverage
- API E2E contract check for `/api/v2/director-kit`
- Regression checks for existing `/api/optimize` flow

Out of scope for Slice 1:
- Full browser journey automation
- Visual regression
- Load testing
- LLM output quality scoring

## Test Environment

Local:
- Node `>=20.12.0`; verified with Node 22.21.1
- Frontend repo: `my-mastra-agent`
- Backend repo: `my-prompt-mastra-agent`

Remote:
- Worker base URL defaults to `https://prompt-optimizer.hahazuo460.workers.dev`
- Override with `API_BASE_URL`

## Acceptance Criteria Mapping

| Requirement | Test |
| --- | --- |
| Frontend V2 duration/type constants are explicit | `director-kit-contract.test.ts` |
| Frontend compiles with extracted contract types | `npx tsc --noEmit` |
| Backend validates DirectorKit structure | backend `npm test` TypeScript check plus zod schema |
| Static export still contains core V2 UI strings | `npm run test:smoke` |
| Deployed V2 API returns frontend-compatible DirectorKit | `npm run test:e2e:v2` |
| Empty V2 message fails safely | `npm run test:e2e:v2` |

## Automated Test Cases

### Unit / Contract

TC-V2-001: Duration constants
- Given the frontend contract module
- When tests read `DIRECTOR_KIT_TARGET_DURATIONS`
- Then it equals `['30s', '60s', '90s']`

TC-V2-002: Target type constants
- Given the frontend contract module
- When tests read target type ids
- Then ids are unique and equal the supported UI list

TC-V2-003: Frontend TypeScript
- Given the extracted contract types
- When `npx tsc --noEmit` runs
- Then no type errors occur

TC-V2-004: Backend TypeScript and schema imports
- Given the backend DirectorKit schema
- When `npm test` runs in the backend repo
- Then `tsc --noEmit -p tsconfig.worker.json` passes

### Static Smoke

TC-V2-005: Static export content
- Given a successful `next build`
- When `npm run test:smoke` scans output
- Then required V2 strings are present

### API E2E

TC-V2-006: DirectorKit happy path
- Given a valid V2 creative input
- When `POST /api/v2/director-kit` is called
- Then HTTP 200 returns `success: true`
- And `data` contains diagnosis, 3 versions, story setting, shot cards, prompt, platform advice, post-production advice, and risk remediation

TC-V2-007: Empty message validation
- Given an empty V2 message
- When `POST /api/v2/director-kit` is called
- Then HTTP 400 returns `success: false`

## Manual Exploratory Cases

ME-V2-001:
- Desktop browser
- Input creative
- Confirm diagnosis page renders
- Confirm reconstruct page renders 3 versions
- Confirm selected version leads to DirectorKit result

ME-V2-002:
- Mobile viewport
- Confirm target duration/type controls wrap cleanly
- Confirm version cards and shot cards are readable

ME-V2-003:
- Simulate network failure
- Confirm error state is visible and user can retry

## Exit Criteria

Release cannot proceed unless:
- Backend `npm test` passes
- Frontend `npm test` passes
- Frontend `npx tsc --noEmit` passes
- Frontend `npm run build` passes
- Frontend `npm run test:smoke` passes
- V2 E2E is either passed against the target environment or explicitly waived by Hermes with reason

