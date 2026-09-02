"""Tests for the reconciliation engine."""

import pytest
import pandas as pd
from datetime import date

from src.ingestion import load_all_data
from src.reconciler import (
    detect_duplicates,
    match_by_reference,
    compare_amounts,
    compare_dates,
    compute_merchant_similarity,
    reconcile,
    measure_accuracy,
)
from src.config import (
    STATUS_MATCH,
    STATUS_AMOUNT_MISMATCH,
    STATUS_DATE_MISMATCH,
    STATUS_MISSING_INVOICE,
    STATUS_DUPLICATE,
)


# Load data once for all tests
@pytest.fixture(scope="module")
def data():
    bank, invoices, payments, ground_truth = load_all_data(verbose=False)
    return bank, invoices, payments, ground_truth


@pytest.fixture(scope="module")
def results(data):
    bank, invoices, payments, _ = data
    return reconcile(bank, invoices, payments, verbose=False)


class TestDuplicateDetection:

    def test_detects_all_duplicates(self, data):
        bank = data[0]
        clean, dups = detect_duplicates(bank)
        assert len(dups) == 10

    def test_all_duplicates_have_correct_status(self, data):
        bank = data[0]
        _, dups = detect_duplicates(bank)
        for d in dups:
            assert d.status == STATUS_DUPLICATE

    def test_clean_bank_has_no_dups(self, data):
        bank = data[0]
        clean, _ = detect_duplicates(bank)
        assert len(clean) == 150
        assert not clean["transaction_id"].str.contains("_DUP").any()


class TestAmountComparison:

    def test_exact_match(self):
        match, delta = compare_amounts(1000, 1000)
        assert match is True
        assert delta == 0

    def test_mismatch(self):
        match, delta = compare_amounts(1000, 1500)
        assert match is False
        assert delta == -500

    def test_tolerance_within(self):
        match, _ = compare_amounts(1000, 1010, tolerance=50)
        assert match is True

    def test_tolerance_exceeded(self):
        match, _ = compare_amounts(1000, 1100, tolerance=50)
        assert match is False


class TestDateComparison:

    def test_exact_match(self):
        d = date(2026, 8, 1)
        match, delta = compare_dates(d, d)
        assert match is True
        assert delta == 0

    def test_mismatch(self):
        d1 = date(2026, 8, 1)
        d2 = date(2026, 8, 3)
        match, delta = compare_dates(d1, d2)
        assert match is False
        assert delta == -2

    def test_tolerance_within(self):
        d1 = date(2026, 8, 1)
        d2 = date(2026, 8, 2)
        match, _ = compare_dates(d1, d2, tolerance_days=1)
        assert match is True

    def test_tolerance_exceeded(self):
        d1 = date(2026, 8, 1)
        d2 = date(2026, 8, 5)
        match, _ = compare_dates(d1, d2, tolerance_days=2)
        assert match is False


class TestMerchantSimilarity:

    def test_exact_match(self):
        score = compute_merchant_similarity("Amazon India", "Amazon India")
        assert score == 100

    def test_fuzzy_match_alias(self):
        score = compute_merchant_similarity("AMZN PAY INDIA", "Amazon India")
        assert score >= 40  # Should have some similarity

    def test_completely_different(self):
        score = compute_merchant_similarity("Amazon India", "Flipkart")
        assert score < 50


class TestFullReconciliation:

    def test_total_result_count(self, results):
        # 150 clean + 10 duplicates = 160
        assert len(results) == 160

    def test_status_counts(self, results):
        counts = {}
        for r in results:
            counts[r.status] = counts.get(r.status, 0) + 1

        assert counts[STATUS_MATCH] == 110
        assert counts[STATUS_AMOUNT_MISMATCH] == 15
        assert counts[STATUS_DATE_MISMATCH] == 15
        assert counts[STATUS_MISSING_INVOICE] == 10
        assert counts[STATUS_DUPLICATE] == 10


class TestAccuracy:

    def test_100_percent_accuracy(self, results, data):
        ground_truth = data[3]
        metrics = measure_accuracy(results, ground_truth, verbose=False)
        assert metrics["accuracy"] == 100.0

    def test_all_categories_100_percent(self, results, data):
        ground_truth = data[3]
        metrics = measure_accuracy(results, ground_truth, verbose=False)
        for status, m in metrics["categories"].items():
            assert m["accuracy"] == 100.0, f"{status} accuracy is {m['accuracy']}%"

    def test_no_incorrect_predictions(self, results, data):
        ground_truth = data[3]
        metrics = measure_accuracy(results, ground_truth, verbose=False)
        assert len(metrics["incorrect_predictions"]) == 0


class TestWrongFormatReconciliation:

    def test_reconciles_wrong_format_folder_successfully(self):
        """Tests that datasets with non-standard column names, formats, and dates reconcile accurately."""
        from src.ingestion import read_tabular_file, normalize_dataframe_columns
        from pathlib import Path

        bank_path = Path("data/wrong format/bank_statement.csv")
        inv_path = Path("data/wrong format/billing_ledger.csv")
        pay_path = Path("data/wrong format/gateway_settlements.csv")

        if bank_path.exists() and inv_path.exists() and pay_path.exists():
            b_df = normalize_dataframe_columns(read_tabular_file(str(bank_path)), "bank")
            i_df = normalize_dataframe_columns(read_tabular_file(str(inv_path)), "invoice")
            p_df = normalize_dataframe_columns(read_tabular_file(str(pay_path)), "payment")

            results = reconcile(b_df, i_df, p_df, verbose=False)
            assert len(results) == 31

            counts = {}
            for r in results:
                counts[r.status] = counts.get(r.status, 0) + 1

            assert counts[STATUS_MATCH] == 19
            assert counts[STATUS_AMOUNT_MISMATCH] == 4
            assert counts[STATUS_DATE_MISMATCH] == 4
            assert counts[STATUS_MISSING_INVOICE] == 3
            assert counts[STATUS_DUPLICATE] == 1


class TestBug2DuplicateDetection:

    def test_exact_duplicate_without_dup_suffix(self):
        """Bug 2 regression test: two bank rows, same (ref, amt, date), different IDs without _DUP suffix."""
        bank_df = pd.DataFrame([
            {"transaction_id": "BL-002", "date": date(2026, 11, 1), "description": "Acme Textiles", "amount": 8000.0, "reference": "PO-9002"},
            {"transaction_id": "BL-002B", "date": date(2026, 11, 1), "description": "Acme Textiles", "amount": 8000.0, "reference": "PO-9002"},
        ])
        invoices_df = pd.DataFrame([
            {"invoice_id": "INV-9002", "date": date(2026, 11, 1), "customer": "Acme Textiles", "amount": 8000.0, "invoice_reference": "PO-9002"}
        ])
        payments_df = pd.DataFrame([
            {"payment_id": "PG-2", "date": date(2026, 11, 1), "merchant": "Acme Textiles", "amount": 8000.0, "reference": "PO-9002", "status": "settled"}
        ])

        results = reconcile(bank_df, invoices_df, payments_df, verbose=False)
        assert len(results) == 2

        res_by_id = {r.transaction_id: r for r in results}
        assert res_by_id["BL-002"].status == STATUS_MATCH
        assert res_by_id["BL-002"].invoice_id == "INV-9002"
        assert res_by_id["BL-002B"].status == STATUS_DUPLICATE
        assert "Duplicate of BL-002" in res_by_id["BL-002B"].reason


class TestHoldoutReconciliation:

    def test_holdout_15_row_benchmark(self):
        """Holdout dataset test: 15 rows with currency, date, duplication, and column edge cases."""
        from src.ingestion import read_tabular_file, normalize_dataframe_columns
        from pathlib import Path

        holdout_dir = Path("data/holdout")
        if not holdout_dir.exists():
            holdout_dir = Path("data/claude test")

        bank_df = normalize_dataframe_columns(read_tabular_file(str(holdout_dir / "bank_statement.csv")), "bank")
        inv_df = normalize_dataframe_columns(read_tabular_file(str(holdout_dir / "billing_ledger.csv")), "invoice")
        pay_df = normalize_dataframe_columns(read_tabular_file(str(holdout_dir / "gateway_settlements.csv")), "payment")
        gt_df = read_tabular_file(str(holdout_dir / "ground_truth.csv"))

        results = reconcile(bank_df, inv_df, pay_df, verbose=False)
        metrics = measure_accuracy(results, gt_df, verbose=False)

        assert metrics["matches_dataset"] is True
        assert metrics["accuracy"] > 73.3, f"Accuracy {metrics['accuracy']}% must be > 73.3%"
        assert metrics["invoice_correct"] == 15, f"Invoice correct {metrics['invoice_correct']}/15"

        res_map = {r.transaction_id: r for r in results}
        # BL-002B must be DUPLICATE
        assert res_map["BL-002B"].status == STATUS_DUPLICATE
        # BL-001 must have real invoice_id INV-9001 (not PO-9001)
        assert res_map["BL-001"].invoice_id == "INV-9001"
        assert res_map["BL-002"].invoice_id == "INV-9002"
        assert res_map["BL-004"].invoice_id == "INV-9004"
        assert res_map["BL-005"].invoice_id == "INV-9005"
        assert res_map["BL-006"].invoice_id == "INV-9006"
        assert res_map["BL-011"].invoice_id == "INV-9011"
        assert res_map["BL-014"].invoice_id == "INV-9014"
