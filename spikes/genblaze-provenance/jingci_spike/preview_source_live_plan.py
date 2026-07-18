from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Mapping


PLAN_SCHEMA = "jingci.preview-source-promotion-live-plan.v1"
PLAN_PATH = (
    Path(__file__).resolve().parents[3]
    / "docs/campaigns/backblaze-genmedia-2026/preview-source-promotion-live-plan.json"
)
EXPECTED_INPUTS = {
    "commit": "tracked",
    "run_id": "operator-bound",
    "approval_file": "private-mode-0600",
    "approval_journal": "private-mode-0700",
    "source_media_file": "private-mode-0600",
    "private_result_file": "private-mode-0600",
    "B2_BUCKET": "protected-name-only",
    "B2_REGION": "non-secret-name-only",
    "B2_KEY_ID": "secret-name-only",
    "B2_APP_KEY": "secret-name-only",
}
BEFORE_STAGES = [
    "verify_clean_pinned_commit",
    "verify_private_paths_and_absent_result",
    "verify_canonical_active_approval",
    "verify_exact_source_key_digest_and_size",
    "verify_bucket_scoped_configuration_shape",
    "verify_exact_source_key_absent_by_read_only_lookup",
]
AFTER_STAGES = [
    "put_exact_source_key_once",
    "read_back_exact_bytes_digest_and_size",
    "close_backend",
    "write_immutable_private_terminal_result",
]
RECOVERY_MATRIX = [
    ("no_consumption_marker", "no_operation_authorized", "none"),
    ("marker_and_terminal_result", "accept_validated_terminal_state_only", "none"),
    ("marker_no_result_object_absent", "record_failed_compensated", "none"),
    ("marker_no_result_object_exact_match", "record_recovery_required", "preserve"),
    (
        "marker_no_result_object_mismatch_or_lookup_unknown",
        "record_recovery_required",
        "preserve",
    ),
]
PROHIBITED_ACTIONS = {
    "automatic_retry",
    "overwrite_existing_key",
    "delete_unowned_or_ambiguous_key",
    "bucket_visibility_or_lifecycle_change",
    "recursive_or_prefix_cleanup",
    "credential_or_signed_url_output",
    "deployment_publication_or_submission",
}
AUTHORIZATION_KEYS = {
    "create_or_change_cloud_resources",
    "load_credentials",
    "write_b2",
    "delete_b2",
    "deploy",
    "publish",
    "submit",
    "paid_api",
}


def load_plan(path: Path = PLAN_PATH) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 64 * 1024:
        raise ValueError("source-promotion live plan file is unsafe")
    try:
        value = json.loads(path.read_text(encoding="ascii"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("source-promotion live plan must be ASCII JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("source-promotion live plan must be an object")
    return value


def validate_plan(plan: Mapping[str, Any]) -> list[str]:
    errors: list[str] = []
    expected_keys = {
        "schema_version",
        "operation",
        "constraints",
        "execution",
        "required_inputs",
        "before_approval_consumption",
        "after_approval_consumption",
        "recovery_matrix",
        "prohibited_actions",
        "authorization",
    }
    if not isinstance(plan, dict) or set(plan) != expected_keys:
        return ["plan shape is invalid"]
    if plan["schema_version"] != PLAN_SCHEMA:
        errors.append("plan schema is invalid")
    if plan["operation"] != "retain_one_reviewed_source_in_private_b2":
        errors.append("operation is invalid")
    expected_constraints = {
        "source_namespace": "jingci-preview/source/",
        "maximum_source_bytes": 100_000_000,
        "bucket_visibility": "private",
        "maximum_attempts": 1,
        "automatic_retry": False,
        "credential_scope": "one-bucket-and-source-prefix",
        "terminal_evidence_mode": "live_private",
    }
    if plan["constraints"] != expected_constraints:
        errors.append("live mutation constraints are invalid")
    execution = plan["execution"]
    expected_execution = {
        "live_entrypoint": False,
        "network_enabled": False,
        "environment_read": False,
        "credentials_loaded": False,
        "approval_generated": False,
    }
    if execution != expected_execution:
        errors.append("execution must remain completely disabled")
    inputs = plan["required_inputs"]
    if not isinstance(inputs, list) or any(
        not isinstance(item, dict) or set(item) != {"name", "classification"} for item in inputs
    ):
        errors.append("required input declarations are invalid")
    else:
        declared = {str(item["name"]): item["classification"] for item in inputs}
        if len(declared) != len(inputs) or declared != EXPECTED_INPUTS:
            errors.append("required input names or classifications are invalid")
    if plan["before_approval_consumption"] != BEFORE_STAGES:
        errors.append("pre-consumption stages are missing or out of order")
    if plan["after_approval_consumption"] != AFTER_STAGES:
        errors.append("post-consumption stages are missing or out of order")
    recovery = plan["recovery_matrix"]
    if not isinstance(recovery, list) or len(recovery) != len(RECOVERY_MATRIX):
        errors.append("recovery matrix is incomplete")
    else:
        for item, expected in zip(recovery, RECOVERY_MATRIX, strict=True):
            if not isinstance(item, dict) or set(item) != {
                "condition",
                "decision",
                "object_action",
                "retry",
            }:
                errors.append("recovery matrix shape is invalid")
                break
            if (
                (item["condition"], item["decision"], item["object_action"]) != expected
                or item["retry"] is not False
            ):
                errors.append(f"recovery decision is unsafe: {item.get('condition', 'unknown')}")
    prohibited = plan["prohibited_actions"]
    if not isinstance(prohibited, list) or set(prohibited) != PROHIBITED_ACTIONS:
        errors.append("prohibited actions are incomplete")
    authorization = plan["authorization"]
    if (
        not isinstance(authorization, dict)
        or set(authorization) != AUTHORIZATION_KEYS
        or any(value is not False for value in authorization.values())
    ):
        errors.append("authorization must remain false")
    serialized = json.dumps(plan, separators=(",", ":"), sort_keys=True)
    if any(token in serialized.lower() for token in ('"value"', '://', 'bearer ', 'sk-')):
        errors.append("plan contains a value, URL, or secret carrier")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate the disabled source-promotion live plan")
    parser.add_argument("--check", action="store_true", required=True)
    args = parser.parse_args(argv)
    if not args.check:
        return 2
    try:
        plan = load_plan()
    except ValueError as error:
        print(str(error))
        return 1
    errors = validate_plan(plan)
    if errors:
        print("source-promotion live plan is invalid:\n- " + "\n- ".join(errors))
        return 1
    print("source-promotion live plan is valid; execution and every authorization remain disabled")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
