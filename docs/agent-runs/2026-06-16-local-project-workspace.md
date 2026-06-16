# Agent Run: Local Project Workspace MVP

Date: 2026-06-16

## Product Agent

Goal: make Jingci behave more like a project workbench by preserving the current creative package and execution progress across refreshes.

Acceptance:

- User can save the current project from the workbench.
- Page reload restores the DirectorKit result.
- Shot execution status and result notes survive reload.
- User can manually restore or clear the local project.

## UEAgent

Placement: left rail Snapshot card.

Rationale: project persistence is a workbench-level control, not a deep result action. Keeping save, restore, and clear near project metadata makes the feature discoverable without interrupting the main generation path.

States:

- 本地项目尚未保存
- 项目已保存
- 已恢复最近项目
- 项目已清空
- 没有可恢复的项目
- 项目保存失败

## Architecture Agent

Added `lib/project-workspace.ts` as a small domain/storage boundary.

The UI passes current workbench state into `createLocalProjectWorkspace`; the module handles schema versioning, validation, save, load, and clear. This keeps future `/api/projects` sync from requiring a broad UI rewrite.

## Engineering Agent

Implemented:

- Local workspace type and validation.
- Save, restore, clear handlers in `ChatBox`.
- Automatic restore on initial mount.
- Snapshot card controls.
- E2E port override via `PLAYWRIGHT_PORT`.

## Test Agent

Validation evidence:

- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 44 tests
- `git diff --check`: PASS
- `PLAYWRIGHT_PORT=3200 npm run test:e2e:browser`: PASS, 6 tests

## DevOps Agent

During E2E, port `3100` was occupied by another local project at `/Users/edy/stackmind/frontend`, and that server was unresponsive. The test configuration now accepts `PLAYWRIGHT_PORT` so validation can use a clean port without stopping unrelated services.

