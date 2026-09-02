"""Tests for the advanced AI financial intelligence agent layer."""

import pytest
import pandas as pd

from src.ingestion import load_all_data
from src.reconciler import reconcile
from src.agent import (
    calculate_risk_scores,
    generate_journal_entries,
    forecast_forward_cash,
)
from src.config import (
    STATUS_MATCH,
    STATUS_AMOUNT_MISMATCH,
    STATUS_DATE_MISMATCH,
    STATUS_MISSING_INVOICE,
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


class TestRiskAssessment:

    def test_calculate_risk_scores_structure(self, results, data):
        bank = data[0]
        risk_info = calculate_risk_scores(results, bank)

        assert "average_risk_score" in risk_info
        assert "risk_breakdown" in risk_info
        assert "risk_details" in risk_info

        assert 0 <= risk_info["average_risk_score"] <= 100
        rb = risk_info["risk_breakdown"]
        assert "CRITICAL" in rb
        assert "HIGH" in rb
        assert "MEDIUM" in rb
        assert "LOW" in rb
        assert sum(rb.values()) == 50  # 40 exceptions + 10 duplicates

    def test_risk_details_dataframe(self, results, data):
        bank = data[0]
        risk_info = calculate_risk_scores(results, bank)
        df = risk_info["risk_details"]
        assert len(df) == 50
        assert "transaction_id" in df.columns
        assert "risk_level" in df.columns
        assert "risk_score" in df.columns


class TestJournalEntries:

    def test_generate_journal_entries(self, results, data):
        bank, invoices, _, _ = data
        gl_df = generate_journal_entries(results, bank, invoices)

        assert len(gl_df) > 0
        assert "Journal_ID" in gl_df.columns
        assert "Date" in gl_df.columns
        assert "Account_Code" in gl_df.columns
        assert "Debit (₹)" in gl_df.columns
        assert "Credit (₹)" in gl_df.columns

        # Verify double-entry accounting identity: Sum of Debits == Sum of Credits for each Journal_ID
        for j_id, group in gl_df.groupby("Journal_ID"):
            total_debit = group["Debit (₹)"].sum()
            total_credit = group["Credit (₹)"].sum()
            assert abs(total_debit - total_credit) < 0.01, f"Journal {j_id} is out of balance: {total_debit} vs {total_credit}"


class TestCashForecast:

    def test_forecast_forward_cash(self, results, data):
        bank, _, payments, _ = data
        forecast = forecast_forward_cash(bank, payments, results, days_ahead=30)

        assert len(forecast) == 30
        assert "Day" in forecast.columns
        assert "Date" in forecast.columns
        assert "Projected_Cash_Base (₹)" in forecast.columns
        assert "Projected_Cash_Optimistic (₹)" in forecast.columns
        assert "Projected_Cash_Conservative (₹)" in forecast.columns

        # Optimistic should be >= Base, and Base >= Conservative
        last_row = forecast.iloc[-1]
        assert last_row["Projected_Cash_Optimistic (₹)"] >= last_row["Projected_Cash_Base (₹)"]
        assert last_row["Projected_Cash_Base (₹)"] >= last_row["Projected_Cash_Conservative (₹)"]
