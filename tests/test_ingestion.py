"""Tests for the data ingestion layer."""

import pytest
from src.ingestion import (
    load_bank_transactions,
    load_invoices,
    load_payments,
    load_ground_truth,
    load_all_data,
)


class TestBankTransactions:

    def test_loads_correct_row_count(self):
        df = load_bank_transactions()
        # 150 original + 10 duplicates = 160
        assert len(df) == 160

    def test_has_required_columns(self):
        df = load_bank_transactions()
        expected = {"transaction_id", "date", "description", "amount", "reference"}
        assert expected.issubset(set(df.columns))

    def test_no_null_transaction_ids(self):
        df = load_bank_transactions()
        assert df["transaction_id"].isnull().sum() == 0

    def test_no_null_references(self):
        df = load_bank_transactions()
        assert df["reference"].isnull().sum() == 0

    def test_contains_duplicate_ids(self):
        df = load_bank_transactions()
        dup_rows = df[df["transaction_id"].str.contains("_DUP", na=False)]
        assert len(dup_rows) == 10


class TestInvoices:

    def test_loads_correct_row_count(self):
        df = load_invoices()
        # 150 original - 10 missing (INV0031-INV0040) = 140
        assert len(df) == 140

    def test_has_required_columns(self):
        df = load_invoices()
        expected = {"invoice_id", "date", "customer", "amount", "invoice_reference"}
        assert expected.issubset(set(df.columns))

    def test_missing_invoices_are_gone(self):
        df = load_invoices()
        missing_ids = {f"INV{i:04d}" for i in range(31, 41)}
        present = set(df["invoice_id"].unique())
        assert missing_ids.isdisjoint(present), "Missing invoices should not be present"


class TestPayments:

    def test_loads_correct_row_count(self):
        df = load_payments()
        assert len(df) == 150

    def test_has_required_columns(self):
        df = load_payments()
        expected = {"payment_id", "date", "merchant", "amount", "reference", "status"}
        assert expected.issubset(set(df.columns))

    def test_valid_statuses(self):
        df = load_payments()
        valid = {"settled", "pending"}
        actual = set(df["status"].unique())
        assert actual.issubset(valid)


class TestGroundTruth:

    def test_loads_correct_row_count(self):
        df = load_ground_truth()
        assert len(df) == 150

    def test_expected_status_distribution(self):
        df = load_ground_truth()
        counts = df["expected_status"].value_counts().to_dict()
        assert counts["MATCH"] == 110
        assert counts["AMOUNT_MISMATCH"] == 15
        assert counts["DATE_MISMATCH"] == 15
        assert counts["MISSING_INVOICE"] == 10


class TestLoadAll:

    def test_returns_four_dataframes(self):
        result = load_all_data(verbose=False)
        assert len(result) == 4
        for df in result:
            assert len(df) > 0


class TestCustomNormalization:

    def test_normalizes_bank_aliases(self):
        from src.ingestion import normalize_dataframe_columns
        import pandas as pd

        raw_df = pd.DataFrame([
            {"TxnID": "T101", "Transaction Date": "2026-08-01", "Particulars": "Vendor A", "Value": "1500.50", "UTR": "REF999"}
        ])
        norm = normalize_dataframe_columns(raw_df, "bank")
        assert "transaction_id" in norm.columns
        assert "date" in norm.columns
        assert "description" in norm.columns
        assert "amount" in norm.columns
        assert "reference" in norm.columns
        assert norm.iloc[0]["amount"] == 1500.50

    def test_normalizes_invoice_aliases(self):
        from src.ingestion import normalize_dataframe_columns
        import pandas as pd

        raw_df = pd.DataFrame([
            {"Bill No": "B01", "Bill Date": "2026-08-02", "Client": "Customer X", "Bill Amount": 2500, "Ref No": "REF999"}
        ])
        norm = normalize_dataframe_columns(raw_df, "invoice")
        assert "invoice_id" in norm.columns
        assert "date" in norm.columns
        assert "customer" in norm.columns
        assert "amount" in norm.columns
        assert "invoice_reference" in norm.columns

    def test_synthesize_default_payments(self):
        from src.ingestion import synthesize_default_payments
        import pandas as pd

        bank_df = pd.DataFrame([
            {"transaction_id": "TX1", "date": "2026-08-01", "description": "Tata", "amount": 1000, "reference": "R1"}
        ])
        pay_df = synthesize_default_payments(bank_df)
        assert len(pay_df) == 1
        assert "payment_id" in pay_df.columns
        assert "reference" in pay_df.columns
        assert "status" in pay_df.columns
        assert pay_df.iloc[0]["status"] == "settled"

    def test_wrong_format_folder_ingestion(self):
        """Tests ingestion and normalization of the real data/wrong format/ folder files."""
        from src.ingestion import read_tabular_file, normalize_dataframe_columns
        from pathlib import Path

        bank_path = Path("data/wrong format/bank_statement.csv")
        inv_path = Path("data/wrong format/billing_ledger.csv")
        pay_path = Path("data/wrong format/gateway_settlements.csv")

        if bank_path.exists() and inv_path.exists() and pay_path.exists():
            b_df = normalize_dataframe_columns(read_tabular_file(str(bank_path)), "bank")
            i_df = normalize_dataframe_columns(read_tabular_file(str(inv_path)), "invoice")
            p_df = normalize_dataframe_columns(read_tabular_file(str(pay_path)), "payment")

            assert "transaction_id" in b_df.columns
            assert "description" in b_df.columns
            assert "amount" in b_df.columns
            assert "reference" in b_df.columns
            assert b_df.iloc[0]["transaction_id"] == "TRX-8001"
            assert b_df.iloc[0]["amount"] == 18500.0
            assert b_df.iloc[0]["reference"] == "PO-80001"

            assert "invoice_id" in i_df.columns
            assert "customer" in i_df.columns
            assert "amount" in i_df.columns
            assert "invoice_reference" in i_df.columns
            assert i_df.iloc[0]["invoice_id"] == "DOC-9001"
            assert i_df.iloc[0]["amount"] == 18500.0
            assert i_df.iloc[0]["invoice_reference"] == "PO-80001"

            assert "payment_id" in p_df.columns
            assert "merchant" in p_df.columns
            assert "amount" in p_df.columns
            assert "reference" in p_df.columns
            assert "status" in p_df.columns
            assert p_df.iloc[0]["payment_id"] == "PG-7001"
            assert p_df.iloc[0]["status"] == "settled"

    def test_semicolon_and_currency_cleaning(self):
        """Tests reading a semicolon-delimited CSV with currencies and parentheses."""
        from src.ingestion import read_tabular_file, normalize_dataframe_columns

        csv_content = b"Txn_ID;Post_Date;Party_Name;Net_Val;Ref_Code\nTRX-1;01/10/2026;Vendor Corp;Rs. 25,450.50;PO-999\nTRX-2;02/10/2026;Customer A;(1,200.00);PO-998\n"
        df = read_tabular_file(csv_content)
        norm = normalize_dataframe_columns(df, "bank")

        assert len(norm) == 2
        assert norm.iloc[0]["amount"] == 25450.50
        assert norm.iloc[1]["amount"] == -1200.00
        assert norm.iloc[0]["transaction_id"] == "TRX-1"
        assert norm.iloc[0]["reference"] == "PO-999"

