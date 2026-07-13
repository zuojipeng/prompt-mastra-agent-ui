# Genblaze Provenance Spike

This isolated spike verifies the smallest Jingci-to-Genblaze contract without provider credentials, B2 access, paid generation, UI changes, or production deployment.

It accepts one completed shot asset with a SHA-256 digest and builds a verified Genblaze provenance manifest. It does not claim that media generation or B2 upload has occurred.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
PYTHONPATH=. .venv/bin/python -m unittest discover -s tests -v
PYTHONPATH=. .venv/bin/python -m jingci_spike.cli fixtures/shot-job.json
```

Use explicit imports from `genblaze_core`. A wildcard import loads optional components and may fail when unrelated extras such as `pyarrow` are not installed.

## Boundary

- Input: one `jingci.shot-provenance.v1` JSON job.
- Output: one verified Genblaze manifest envelope.
- Next adapter: execute one provider pipeline and replace the fixture asset URL/digest.
- Later adapter: persist asset and manifest through `genblaze-s3` to an explicitly authorized B2 bucket.
