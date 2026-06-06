# Project Scorecard

Project: Jingci
Date: 2026-06-06
Owner: Hermes Orchestrator
Mode: Project Takeover

## Summary

Overall Score: 78 / 100
Confidence: Medium-High

Jingci has a clear product direction and a working V2 DirectorKit loop. It is no longer a generic prompt toy; it is moving toward an AI short-film director workbench. The strongest assets are product clarity, contract discipline, and browser E2E coverage. The main risks are frontend component concentration and projectization still being represented as local execution notes instead of a durable project workspace.

## Dimension Scores

| Dimension | Score | Evidence | Main Risk | Owner Agent |
| --- | ---: | --- | --- | --- |
| Product Clarity | 18 / 20 | `README.md`, `PRODUCT-ROADMAP.md`, V2 DirectorKit flow | Next phase needs project workspace definition | Product Agent |
| UE Quality | 15 / 20 | Input -> diagnosis -> reconstruction -> result flow; execution controls and copy actions exist | Workbench layout is still a long single-page surface | UEAgent |
| Architecture Health | 13 / 20 | Explicit `DirectorKit` contract, API client, session manager | `ChatBox.tsx` is 1718 lines and mixes flow state, formatting, UI, analytics, and copy builders | Architecture Agent |
| Test Confidence | 17 / 20 | Vitest, smoke, V2 API E2E, Playwright browser E2E; 35 unit tests and 4 browser E2E recently passed | E2E uses mocked DirectorKit for browser path; live model quality remains separately verified | Test Agent |
| Release Readiness | 15 / 20 | Cloudflare Worker smoke verified by user terminal; release docs exist | Release gate still depends on external provider and environment discipline | DevOps Agent |

## Product Reading

Jingci's product shape is clear: a professional AI short-film director execution workbench for creators who already use AI video platforms but suffer from unstable prompts, unclear shot planning, and high trial-and-error cost.

Current workflow:

```text
Creative idea
  -> feasibility diagnosis
  -> three reconstruction options
  -> DirectorKit
  -> per-shot prompt/platform feed
  -> shot execution tracking
  -> feedback insight
  -> project snapshot
```

Product maturity: Phase 0 and Phase 1 are mostly in place. Phase 2 feedback analytics has a backend path. Phase 3 projectized creation has started through shot notes and project snapshot copy, but not yet as a real persisted project workspace.

## UE Reading

The experience has moved beyond prompt generation. The page now supports a real creation sequence: diagnose, choose, execute, track, copy, and review. This matches the product direction.

UE risks:
- The result page is accumulating many actions in a long vertical surface.
- `复制执行清单`, `复制项目快照`, `复制镜头 Prompt`, and `复制平台投喂包` are useful, but they need stronger grouping as the workflow grows.
- A future professional workbench should likely separate source/project context, DirectorKit work surface, and execution/feedback side panel.

UEAgent recommendation:
- Next UE slice should define a project workspace layout before adding more result-page actions.

## Architecture Reading

Architecture strengths:
- `lib/director-kit-contract.ts` centralizes the V2 contract.
- `lib/api-client.ts` isolates backend calls.
- Tests cover contract and browser flow.
- The backend has D1 feedback analytics and smoke coverage.

Architecture risks:
- `app/components/ChatBox.tsx` is 1718 lines. It currently owns V2 flow state, analytics rendering, copy text builders, shot execution state, result UI, feedback controls, and reset behavior.
- The next several features will likely be project-space features. Continuing to add them to `ChatBox.tsx` will slow development and increase regression risk.

Architecture Agent recommendation:
- Before adding persisted project workspace, extract pure DirectorKit export builders into a domain module.
- Then split result sections into smaller components only where there is active change pressure.
- Avoid a generic workflow engine; the real pressure is DirectorKit result composition and project state boundaries.

## Test Reading

Available quality gates:
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:smoke`
- `npm run test:e2e:v2`
- `npm run test:e2e:browser`
- `npm run qa:v2`
- `npm run release:v2:check`

Current confidence is good for the V2 UI path. Browser E2E covers desktop Chromium and mobile Chrome. The test suite should grow around project workspace behavior once persistence or cross-session retrieval appears.

## Release Reading

Release discipline exists through deploy docs, Cloudflare Worker smoke checks, and rollback notes. User-side terminal smoke has verified `/api/health` and `/api/feedback/analytics`.

Remaining release risk is mostly external-provider and environment related, not current frontend UI behavior.

## Top Risks

1. `ChatBox.tsx` is becoming the main architecture bottleneck.
2. Projectized creation is not yet a durable data model.
3. Professional workbench UX may degrade if more actions are added to the same vertical result page.

## Recommended Next Slice

Do a small architecture-first slice:

```text
Extract DirectorKit export builders
  -> buildExecutionChecklist
  -> buildProjectSnapshot
  -> buildPlatformFeedPack
  -> buildShotPrompt
```

Put them in a typed domain module such as `lib/director-kit-export.ts` with focused unit tests.

Reason:
- It reduces `ChatBox.tsx` pressure.
- It creates a clean seam for future project workspace export/persistence.
- It improves Agent Team OS's own Architecture Agent case evidence.

## Validation Evidence

- Repository status checked: frontend and backend clean.
- Recent frontend commits show execution tracking, copy packs, shot notes, project snapshot, and Team OS pointer.
- `README.md` and `PRODUCT-ROADMAP.md` reviewed.
- `package.json` quality gates reviewed.
- Code size check: `ChatBox.tsx` 1718 lines, `lib/api-client.ts` 647 lines, DirectorKit contract 91 lines.
- Existing E2E assertions cover platform feed pack, execution progress, shot result note, project snapshot, and feedback insight.

## Follow-Up Owners

- Product Agent: define Phase 3 project workspace MVP.
- UEAgent: design project workspace layout and action grouping.
- Architecture Agent: extract DirectorKit export builders before persistence.
- Engineering Agent: implement extraction with tests.
- Test Agent: add unit coverage for export builders and keep browser E2E stable.
