from __future__ import annotations

import copy
import unittest

from jingci_spike.preview_source_live_plan import load_plan, validate_plan


class PreviewSourceLivePlanTest(unittest.TestCase):
    def setUp(self) -> None:
        self.plan = load_plan()

    def test_tracked_plan_is_strict_and_disabled(self) -> None:
        self.assertEqual(validate_plan(self.plan), [])
        self.assertFalse(any(self.plan["authorization"].values()))
        self.assertFalse(any(self.plan["execution"].values()))

    def test_execution_or_authorization_enablement_is_rejected(self) -> None:
        for section, name in (("execution", "network_enabled"), ("authorization", "write_b2")):
            changed = copy.deepcopy(self.plan)
            changed[section][name] = True
            with self.subTest(section=section, name=name):
                self.assertTrue(validate_plan(changed))

    def test_namespace_attempt_size_and_visibility_constraints_are_exact(self) -> None:
        for name, value in (
            ("source_namespace", "jingci-preview/"),
            ("maximum_source_bytes", 100_000_001),
            ("bucket_visibility", "public"),
            ("maximum_attempts", 2),
            ("automatic_retry", True),
        ):
            changed = copy.deepcopy(self.plan)
            changed["constraints"][name] = value
            with self.subTest(name=name):
                self.assertIn("live mutation constraints are invalid", validate_plan(changed))

    def test_stage_reordering_or_omission_is_rejected(self) -> None:
        changed = copy.deepcopy(self.plan)
        changed["before_approval_consumption"].reverse()
        self.assertIn("pre-consumption stages are missing or out of order", validate_plan(changed))
        changed = copy.deepcopy(self.plan)
        changed["after_approval_consumption"].pop()
        self.assertIn("post-consumption stages are missing or out of order", validate_plan(changed))

    def test_retry_delete_or_false_success_recovery_is_rejected(self) -> None:
        for field, value in (
            ("retry", True),
            ("object_action", "delete"),
            ("decision", "record_passed"),
        ):
            changed = copy.deepcopy(self.plan)
            changed["recovery_matrix"][3][field] = value
            with self.subTest(field=field):
                self.assertTrue(validate_plan(changed))

    def test_missing_prohibition_or_input_classification_is_rejected(self) -> None:
        changed = copy.deepcopy(self.plan)
        changed["prohibited_actions"].remove("automatic_retry")
        self.assertIn("prohibited actions are incomplete", validate_plan(changed))
        changed = copy.deepcopy(self.plan)
        changed["required_inputs"][-1]["classification"] = "plain-text-value"
        self.assertIn("required input names or classifications are invalid", validate_plan(changed))

    def test_values_urls_and_secret_carriers_are_rejected(self) -> None:
        for value in ("value", "https://signed.example", "Bearer abcdefghijklmnop", "sk-secret"):
            changed = copy.deepcopy(self.plan)
            changed["operation"] = value
            with self.subTest(value=value):
                self.assertTrue(validate_plan(changed))


if __name__ == "__main__":
    unittest.main()
