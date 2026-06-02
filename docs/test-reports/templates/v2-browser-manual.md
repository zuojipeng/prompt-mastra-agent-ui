# Manual Test Report Template · V2 Browser Journey

Date:
Tester:
Commit:
Environment URL:
API base URL:
Browser and version:
Desktop viewport:
Mobile viewport:

## Automated Baseline

| Command | Result | Notes |
| --- | --- | --- |
| `npm test` |  |  |
| `npx tsc --noEmit` |  |  |
| `npm run lint` |  |  |
| `npm run build` |  |  |
| `npm run test:smoke` |  |  |
| `npm run test:e2e:v2` |  |  |
| `npm run test:e2e:browser:check` |  |  |

## Desktop Happy Path

| Step | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Load app | Page loads, no console error |  |  |
| Enter creative | Input accepts text |  |  |
| Choose duration/type | Controls update |  |  |
| Submit | `正在生成导演执行包` appears |  |  |
| Diagnosis | `创意体检报告` appears |  |  |
| Reconstruct | 3 version options appear |  |  |
| Select version | `aria-checked=true`, confirm enabled |  |  |
| Result | `导演执行包` and core sections appear |  |  |
| Restart | Returns to initial input state |  |  |

## Failure Recovery

| Step | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Empty submit | Alert shows `请输入视频创意` |  |  |
| Forced API failure | Input remains, `重试生成` visible |  |  |
| Retry | Request is attempted again |  |  |
| Return to edit | Input and selected target remain |  |  |

## Keyboard and Accessibility

| Step | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Tab to version card | Focus ring visible |  |  |
| Enter/Space | Selects focused version |  |  |
| Arrow keys | Moves selection |  |  |
| Error panel | Exposed as alert |  |  |
| Loading panel | Uses polite live region |  |  |

## Mobile Layout

| Step | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Input view | Controls wrap without overflow |  |  |
| Reconstruct view | Cards stack vertically |  |  |
| Result view | Long text wraps |  |  |

## Network Evidence

| Request | Expected | Result | Evidence |
| --- | --- | --- | --- |
| `POST /api/v2/director-kit` success | HTTP 200, `success: true` |  |  |
| `POST /api/v2/director-kit` failure | Recoverable UI error |  |  |

## Console Evidence

Console errors:

```text

```

## Open Issues

| Issue | Severity | Owner | Release impact |
| --- | --- | --- | --- |

## Waivers

| Waived item | Reason | Approver | Expiration |
| --- | --- | --- | --- |

