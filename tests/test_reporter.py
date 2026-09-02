"""Tests for the reporting and metrics layer."""

import pytest
import pandas as pd
from pathlib import Path

from src.ingestion import load_all_data
from src.reconciler import reconcile, measure_accuracy
from src.reporter import (
    save_reconciliation_report,
    save_exception_report,
    save_duplicate_report,
    compute_cash_position,
    print_final_report,
)
from src.config import (
    OUTPUT_DIR,
    STATUS_MATCH,
    STATUS_DUPLICATE,
)


@pytest.fixture(scope="module")
def data():
    bank, invoices, payments, ground_truth = load_all_data(verbose=False)
    return bank, invoices, payments, ground_truth


@pytest.fixture(scope="module")
def results(data):
    bank, invoices, payments, _ = data
    return reconcile(bank, invoices, payments, verbose=False)


class TestCSVReports:

    def test_save_reconciliation_report(self, results):
        path = save_reconciliation_report(results)
        assert Path(path).exists()
        df = pd.read_csv(path)
        assert len(df) == 160
        assert "transaction_id" in df.columns
        assert "status" in df.columns

    def test_save_exception_report_without_explanations(self, results):
        path = save_exception_report(results)
        assert Path(path).exists()
        df = pd.read_csv(path)
        # 160 total - 110 MATCH - 10 DUPLICATE = 40 exceptions
        assert len(df) == 40
        assert not df["status"].isin([STATUS_MATCH, STATUS_DUPLICATE]).any()

    def test_save_exception_report_with_explanations(self, results):
        mock_explanations = [
            {"transaction_id": "TX0001", "explanation": "Test explanation for TX0001"}
        ]
        path = save_exception_report(results, explanations=mock_explanations)
        df = pd.read_csv(path)
        assert "explanation" in df.columns
        tx1_row = df[df["transaction_id"] == "TX0001"]
        assert len(tx1_row) == 1
        assert tx1_row.iloc[0]["explanation"] == "Test explanation for TX0001"

    def test_save_duplicate_report(self, results):
        path = save_duplicate_report(results)
        assert Path(path).exists()
        df = pd.read_csv(path)
        assert len(df) == 10
        assert (df["status"] == STATUS_DUPLICATE).all()


class TestCashPosition:

    def test_compute_cash_position(self, results, data):
        bank, _, payments, _ = data
        pos = compute_cash_position(results, bank, payments)

        assert "total_bank_amount" in pos
        assert pos["total_bank_amount"] > 0
        assert "matched_amount" in pos
        assert "matched_percentage" in pos
        assert 0 <= pos["matched_percentage"] <= 100
        assert "settled_amount" in pos
        assert "pending_amount" in pos
        assert "total_variance" in pos
        # 15 amount mismatches variance should be positive
        assert pos["total_variance"] > 0
        # Settled + pending should equal total bank amount
        assert pos["settled_amount"] + pos["pending_amount"] == pos["total_bank_amount"]


class TestConsoleReport:

    def test_print_final_report_runs(self, results, data):
        bank, _, payments, ground_truth = data
        metrics = measure_accuracy(results, ground_truth, verbose=False)
        pos = compute_cash_position(results, bank, payments)

        # Should execute with verbose=False without error
        print_final_report(
            results=results,
            metrics=metrics,
            cash_position=pos,
            executive_summary="Sample summary",
            report_paths={"Test": "output/test.csv"},
            verbose=False,
        )
