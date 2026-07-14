# Test Report: Runway Provider Contract

Date: 2026-07-14
Gate: Architecture / Engineering / Claims Review / Test
Status: PASS FOR OFFLINE CONTRACT ONLY

## Matrix

| Check | Result |
| --- | --- |
| Fixed Gen-4.5 request, API version, estimated cost, and one hashed local asset | PASS |
| Waiting states including `THROTTLED` then success | PASS |
| Overall timeout, fake clock, one cancellation, and no download | PASS |
| Download finishing at the deadline is rejected without writing an asset | PASS |
| Provider failure/cancellation and unknown state | PASS |
| Exact output host and deceptive URL rejection | PASS |
| Redirect target, MIME, empty, size, and MP4 signature checks | PASS |
| Redirect rejected by the fake before target fetch | PASS |
| Invalid prompt/model/modality/negative prompt/params rejected before task creation | PASS |
| Task-ID path traversal rejected | PASS |
| Local output I/O failure is stable and path-redacted | PASS |
| Signed output URL absent from serialized Genblaze Step | PASS |
| Real Genblaze Pipeline to ObjectStorageSink using no-network fake | PASS |
| Failed paid generation submitted once under Genblaze lifecycle | PASS |
| Full Python regression and compileall | PASS, 49 tests |
| Submission and deployment draft gates | PASS with 7 and 8 named live blockers |
| Frontend regression under Node 22 | PASS, 21 files / 128 tests |
| Production static build under Node 22 | PASS |
| Staged release evidence scan | PASS, 392 text files / 0 secret findings |

Focused result: 14 tests passed.

The first frontend test/build invocation used the system Node 18.12.1 and failed before application execution. The same commands passed under the project's validated Node 22.21.1; this is recorded as environment drift, not a product failure.

## Not Proven

Runway authentication, real HTTP status/error mapping, redirect implementation, valid encoded-video probing, provider output-host stability, live task cancellation, actual generation quality, actual billed cost, B2 persistence, or public deployment.
