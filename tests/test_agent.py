"""Tests for the advanced AI financial intelligence agent layer."""

import pytest
import pandas as pd

from src.ingestion import load_all_data
from src.reconciler import reconcile
from src.agent import (
    calculate_risk_scores,
    generate_journal_entries,
    forecast_forward_cash,
    explain_transaction,
    explain_summary,
    explain_forecast,
    explain_journal_entry,
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
        assert "Projected_Inflow (₹)" in forecast.columns
        assert "Projected_Outflow (₹)" in forecast.columns
        assert "Net_Daily_Flow (₹)" in forecast.columns
        assert "Projected_Cash_Base (₹)" in forecast.columns
        assert "Projected_Cash_Conservative (₹)" in forecast.columns
        assert "Projected_Cash_Optimistic (₹)" in forecast.columns


class TestExplainTransaction:

    def test_explain_transaction_distinct_ids(self, results, data, monkeypatch):
        bank, invoices, payments, _ = data

        def mock_generate(contents, config=None):
            return f"LLM Diagnosis: {contents}"

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        # Test at least 3 distinct IDs from the dataset
        tx_ids = ["TX0001", "TX0002", "TX0003"]
        replies = {}
        for tx_id in tx_ids:
            reply = explain_transaction(
                transaction_id=tx_id,
                results=results,
                bank_df=bank,
                invoices_df=invoices,
                payments_df=payments,
                verbose=False,
            )
            assert isinstance(reply, str)
            assert len(reply) > 10
            replies[tx_id] = reply

        # Each distinct transaction ID must yield a distinct, tailored prompt/explanation
        assert replies["TX0001"] != replies["TX0002"]
        assert replies["TX0002"] != replies["TX0003"]

    def test_explain_transaction_nonexistent_id_raises_value_error(self, results, data):
        bank, invoices, payments, _ = data
        with pytest.raises(ValueError, match="does not exist|not found"):
            explain_transaction(
                transaction_id="TX-NONEXISTENT-9999",
                results=results,
                bank_df=bank,
                invoices_df=invoices,
                payments_df=payments,
                verbose=False,
            )

    def test_explain_transaction_fallback_when_llm_fails(self, results, data, monkeypatch):
        bank, invoices, payments, _ = data

        def mock_generate(*args, **kwargs):
            raise RuntimeError("Gemini API Offline")

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_transaction(
            transaction_id="TX0002",
            results=results,
            bank_df=bank,
            invoices_df=invoices,
            payments_df=payments,
            verbose=False,
        )
        assert isinstance(reply, str)
        assert "TX0002" in reply
        assert len(reply) > 20


class TestExplainSummary:

    def test_explain_summary_aggregate_only(self, results, monkeypatch):
        def mock_generate(contents, config=None):
            return f"LLM Summary: {contents[:40]}"

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_summary(results=results, verbose=False)
        assert isinstance(reply, str)
        assert len(reply) > 10

    def test_explain_summary_fallback_when_llm_fails(self, results, monkeypatch):
        def mock_generate(*args, **kwargs):
            raise RuntimeError("Gemini API Offline")

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_summary(results=results, verbose=False)
        assert isinstance(reply, str)
        assert "total records" in reply.lower() or "clean matches" in reply.lower()
        assert "exceptions" in reply.lower()


class TestExplainForecast:

    def test_explain_forecast_valid_data(self, results, data, monkeypatch):
        bank, _, payments, _ = data
        forecast = forecast_forward_cash(bank, payments, results, days_ahead=30)

        def mock_generate(contents, config=None):
            return f"LLM Forecast: {contents[:40]}"

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_forecast(forecast_df=forecast, verbose=False)
        assert isinstance(reply, str)
        assert len(reply) > 10

    def test_explain_forecast_empty_raises_value_error(self):
        empty_df = pd.DataFrame()
        with pytest.raises(ValueError, match="No cash forecast data available"):
            explain_forecast(forecast_df=empty_df, verbose=False)

    def test_explain_forecast_fallback_when_llm_fails(self, results, data, monkeypatch):
        bank, _, payments, _ = data
        forecast = forecast_forward_cash(bank, payments, results, days_ahead=30)

        def mock_generate(*args, **kwargs):
            raise RuntimeError("Gemini API Offline")

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_forecast(forecast_df=forecast, verbose=False)
        assert isinstance(reply, str)
        assert "30-day" in reply.lower()
        assert "optimistic" in reply.lower()


class TestExplainJournalEntry:

    def test_explain_journal_entry_valid(self, results, data, monkeypatch):
        bank, invoices, _, _ = data
        gl_df = generate_journal_entries(results, bank, invoices)
        assert len(gl_df) > 0

        first_j_id = str(gl_df.iloc[0]["Journal_ID"])

        def mock_generate(contents, config=None):
            return f"LLM Journal Explanation: {contents[:40]}"

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_journal_entry(entry_id=first_j_id, journal_entries_df=gl_df, verbose=False)
        assert isinstance(reply, str)
        assert len(reply) > 10

    def test_explain_journal_entry_nonexistent_raises_value_error(self, results, data):
        bank, invoices, _, _ = data
        gl_df = generate_journal_entries(results, bank, invoices)
        with pytest.raises(ValueError, match="not found"):
            explain_journal_entry(entry_id="JE-NONEXISTENT-9999", journal_entries_df=gl_df, verbose=False)

    def test_explain_journal_entry_fallback_when_llm_fails(self, results, data, monkeypatch):
        bank, invoices, _, _ = data
        gl_df = generate_journal_entries(results, bank, invoices)
        first_j_id = str(gl_df.iloc[0]["Journal_ID"])

        def mock_generate(*args, **kwargs):
            raise RuntimeError("Gemini API Offline")

        monkeypatch.setattr("src.agent.generate_gemini_content", mock_generate)

        reply = explain_journal_entry(entry_id=first_j_id, journal_entries_df=gl_df, verbose=False)
        assert isinstance(reply, str)
        assert first_j_id in reply
        assert "Debit" in reply or "Credit" in reply or "Journal Entry" in reply
