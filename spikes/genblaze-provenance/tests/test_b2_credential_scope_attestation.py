from __future__ import annotations

import hashlib
import json
import stat
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from jingci_spike.b2_credential_scope_attestation import (
    ALLOWED_CAPABILITIES,
    ATTESTATION_SCHEMA,
    AUTHORITY,
    CAMPAIGN_ID,
    INSPECTION_SCHEMA,
    REQUIRED_CAPABILITIES,
    SOURCE_PREFIX,
    build_b2_scope_inspection_record,
    parse_b2_credential_scope_attestation,
    write_private_b2_scope_inspection,
)


NOW = datetime(2026, 7, 18, 9, 0, 0, tzinfo=timezone.utc)
BUCKET = "fixture-bucket"
REGION = "us-east-005"
KEY_ID = "fixture-key"


def attestation_bytes(**changes: object) -> bytes:
    value = {
        "schema_version": ATTESTATION_SCHEMA,
        "campaign_id": CAMPAIGN_ID,
        "review_id": "scope-review-001",
        "reviewer": "Security Reviewer",
        "inspected_at": "2026-07-18T08:50:00Z",
        "expires_at": "2026-07-18T09:30:00Z",
        "inspection_method": "b2_authorize_account_allowed",
        "bucket": BUCKET,
        "region": REGION,
        "name_prefix": SOURCE_PREFIX,
        "capabilities": sorted(ALLOWED_CAPABILITIES),
        "key_id_sha256": hashlib.sha256(KEY_ID.encode()).hexdigest(),
        "secret_value_recorded": False,
        "authority": AUTHORITY,
        "execution_authorized": False,
    }
    value.update(changes)
    return (json.dumps(value, indent=2, separators=(",", ": ")) + "\n").encode("ascii")


class B2CredentialScopeAttestationTest(unittest.TestCase):
    def parse(self, raw: bytes | None = None, *, at: datetime = NOW):
        return parse_b2_credential_scope_attestation(
            raw or attestation_bytes(),
            expected_bucket=BUCKET,
            expected_region=REGION,
            expected_key_id=KEY_ID,
            at=at,
        )

    def test_accepts_canonical_short_lived_least_privilege_attestation(self) -> None:
        attestation = self.parse()
        self.assertEqual(attestation.name_prefix, SOURCE_PREFIX)
        self.assertTrue(REQUIRED_CAPABILITIES <= set(attestation.capabilities))
        self.assertEqual(len(attestation.document_sha256), 64)

    def test_rejects_target_prefix_and_key_mismatch(self) -> None:
        for changes, message in (
            ({"bucket": "another-bucket"}, "target storage"),
            ({"name_prefix": ""}, "campaign preview prefix"),
            ({"key_id_sha256": "0" * 64}, "configured key"),
        ):
            with self.subTest(changes=changes), self.assertRaisesRegex(PermissionError, message):
                self.parse(attestation_bytes(**changes))

    def test_rejects_missing_or_dangerous_capabilities(self) -> None:
        missing = sorted(REQUIRED_CAPABILITIES - {"deleteFiles"})
        with self.assertRaisesRegex(PermissionError, "missing required"):
            self.parse(attestation_bytes(capabilities=missing))
        dangerous = sorted(ALLOWED_CAPABILITIES | {"writeKeys"})
        with self.assertRaisesRegex(PermissionError, "dangerous"):
            self.parse(attestation_bytes(capabilities=dangerous))

    def test_rejects_execution_authority_and_secret_recording(self) -> None:
        for changes in ({"execution_authorized": True}, {"secret_value_recorded": True}):
            with self.subTest(changes=changes), self.assertRaisesRegex(
                PermissionError, "cannot authorize execution or carry secrets"
            ):
                self.parse(attestation_bytes(**changes))

    def test_rejects_expired_or_long_lived_review(self) -> None:
        with self.assertRaisesRegex(PermissionError, "not active"):
            self.parse(at=NOW + timedelta(hours=1))
        with self.assertRaisesRegex(PermissionError, "exceeds 24 hours"):
            self.parse(attestation_bytes(expires_at="2026-07-19T09:30:01Z"))

    def test_rejects_noncanonical_capability_order_and_extra_fields(self) -> None:
        with self.assertRaisesRegex(ValueError, "sorted unique"):
            self.parse(attestation_bytes(capabilities=list(reversed(sorted(ALLOWED_CAPABILITIES)))))
        value = json.loads(attestation_bytes())
        value["application_key"] = "must-not-exist"
        raw = (json.dumps(value, indent=2, separators=(",", ": ")) + "\n").encode("ascii")
        with self.assertRaisesRegex(ValueError, "shape"):
            self.parse(raw)

    def test_rejected_scope_is_preserved_as_non_authorizing_private_evidence(self) -> None:
        capabilities = sorted(ALLOWED_CAPABILITIES | {"shareFiles"})
        record = build_b2_scope_inspection_record(
            inspection_id="scope-inspection-001",
            inspected_at=NOW,
            bucket=BUCKET,
            region=REGION,
            name_prefix=SOURCE_PREFIX,
            capabilities=capabilities,
            key_id=KEY_ID,
        )
        self.assertEqual(record["schema_version"], INSPECTION_SCHEMA)
        self.assertEqual(record["policy_status"], "rejected")
        self.assertEqual(record["policy_errors"], ["dangerous_or_unnecessary_capabilities"])
        self.assertFalse(record["execution_authorized"])
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            directory = Path(root) / "private"
            directory.mkdir(mode=0o700)
            output = directory / "inspection.json"
            write_private_b2_scope_inspection(output, record)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o600)
            persisted = json.loads(output.read_text())
            self.assertEqual(persisted["capabilities"], capabilities)
            self.assertNotIn("application_key", persisted)
            self.assertNotIn("authorization_token", persisted)
            with self.assertRaises(FileExistsError):
                write_private_b2_scope_inspection(output, record)

    def test_inspection_record_rejects_authority_widening(self) -> None:
        record = build_b2_scope_inspection_record(
            inspection_id="scope-inspection-001",
            inspected_at=NOW,
            bucket=BUCKET,
            region=REGION,
            name_prefix=SOURCE_PREFIX,
            capabilities=sorted(ALLOWED_CAPABILITIES),
            key_id=KEY_ID,
        )
        record["execution_authorized"] = True
        with tempfile.TemporaryDirectory(dir="/private/tmp") as root:
            directory = Path(root) / "private"
            directory.mkdir(mode=0o700)
            with self.assertRaisesRegex(ValueError, "integrity"):
                write_private_b2_scope_inspection(directory / "inspection.json", record)


if __name__ == "__main__":
    unittest.main()
