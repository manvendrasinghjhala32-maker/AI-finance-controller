"""
Data Ingestion & Universal Auto-Schema Ingestion Engine

Loads tabular files in ANY format, delimiter, encoding, and schema (including messy,
non-standard, and custom ERP exports), normalizes dates, currencies, and column aliases,
and validates rows into clean standard DataFrames.
"""

import re
import io
import csv
import logging
import pandas as pd
from datetime import datetime, date
from typing import Tuple, Optional, Union, Dict, Any, List

logger = logging.getLogger(__name__)

from src.models import BankTransaction, Invoice, Payment
from src.config import (
    BANK_TRANSACTIONS_FILE,
    INVOICES_FILE,
    PAYMENTS_FILE,
    GROUND_TRUTH_FILE,
)

# -------------------------------------------------------------------------
# 1. Universal Multi-Format Tabular Reader
# -------------------------------------------------------------------------

def read_tabular_file(
    file_source: Union[str, bytes, io.BytesIO],
    filename: Optional[str] = None
) -> pd.DataFrame:
    """
    Reads tabular data from CSV, TSV, TXT, or Excel in any encoding and delimiter.
    """
    is_excel = False
    if filename:
        fn_lower = filename.lower()
        if fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls"):
            is_excel = True
    elif isinstance(file_source, str):
        fn_lower = file_source.lower()
        if fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls"):
            is_excel = True

    if is_excel:
        if isinstance(file_source, bytes):
            return pd.read_excel(io.BytesIO(file_source))
        return pd.read_excel(file_source)

    # Convert bytes to string buffer with encoding detection
    raw_bytes = None
    if isinstance(file_source, bytes):
        raw_bytes = file_source
    elif isinstance(file_source, io.BytesIO):
        raw_bytes = file_source.getvalue()
    elif isinstance(file_source, str):
        try:
            with open(file_source, "rb") as f:
                raw_bytes = f.read()
        except Exception:
            raw_bytes = None

    if raw_bytes is not None:
        encodings = ["utf-8", "utf-8-sig", "latin1", "cp1252", "iso-8859-1"]
        decoded_text = None
        for enc in encodings:
            try:
                decoded_text = raw_bytes.decode(enc)
                break
            except Exception:
                continue

        if decoded_text is None:
            decoded_text = raw_bytes.decode("utf-8", errors="replace")

        # Detect delimiter from first few lines
        sample_lines = "\n".join([line for line in decoded_text.splitlines()[:15] if line.strip()])
        delimiter = ","
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample_lines)
            delimiter = dialect.delimiter
        except Exception:
            # Fallback delimiter counting
            comma_count = sample_lines.count(",")
            semi_count = sample_lines.count(";")
            tab_count = sample_lines.count("\t")
            pipe_count = sample_lines.count("|")
            max_c = max(comma_count, semi_count, tab_count, pipe_count)
            if max_c == semi_count and semi_count > 0:
                delimiter = ";"
            elif max_c == tab_count and tab_count > 0:
                delimiter = "\t"
            elif max_c == pipe_count and pipe_count > 0:
                delimiter = "|"

        df = pd.read_csv(io.StringIO(decoded_text), sep=delimiter, skipinitialspace=True, on_bad_lines="skip")
    else:
        df = pd.read_csv(file_source, on_bad_lines="skip")

    # Drop entirely empty rows and columns
    df = df.dropna(how="all").dropna(axis=1, how="all")
    # Clean whitespace in string column headers
    df.columns = [str(c).strip() for c in df.columns]
    return df


# -------------------------------------------------------------------------
# 2. Smart Currency and Date Cleaners
# -------------------------------------------------------------------------

def clean_currency_series(series: pd.Series) -> pd.Series:
    """
    Normalizes any currency string, accounting format, or float into a clean numeric float.
    Handles ₹, $, €, £, Rs., INR, commas, parentheses negative numbers (1,500.00) -> -1500.0.
    """
    def _parse_val(val):
        if pd.isna(val):
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).strip()
        if not s:
            return 0.0
        
        is_negative = False
        # Parentheses indicate negative in accounting: (100.00) -> -100.00
        if s.startswith("(") and s.endswith(")"):
            is_negative = True
            s = s[1:-1]
        elif s.endswith("-"):
            is_negative = True
            s = s[:-1]
        elif s.startswith("-"):
            is_negative = True
            s = s[1:]

        # Strip common currency prefixes with dots e.g. "Rs.", "rs.", "INR", "USD"
        s = re.sub(r"^(rs\.|rs|inr|usd|eur|gbp|aud|cad|jpy|cny|chf|sek|nzd)\s*", "", s, flags=re.IGNORECASE)
        # Remove currency symbols and non-numeric formatting characters except decimal dot
        s = re.sub(r"[^\d.]", "", s)
        if s.count(".") > 1:
            parts = s.split(".")
            s = "".join(parts[:-1]) + "." + parts[-1]

        try:
            num = float(s)
            return -num if is_negative else num
        except ValueError:
            return 0.0

    return series.apply(_parse_val)


def smart_parse_dates(series: pd.Series) -> pd.Series:
    """
    Intelligently parses dates in any international, ISO, US, or Indian format.
    Automatically detects dayfirst and aligns mixed-format dates (MM/DD vs DD/MM) to the dominant dataset period.
    """
    sample = series.dropna().astype(str).head(60)
    dayfirst = False
    
    # Inspect sample for numbers > 12 in the first vs second token
    for val in sample:
        m = re.search(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", val.strip())
        if m:
            n1, n2 = int(m.group(1)), int(m.group(2))
            if n1 > 12 and n2 <= 12:
                dayfirst = True
                break
            elif n2 > 12 and n1 <= 12:
                dayfirst = False
                break
        elif re.search(r"^\d{4}[/-]\d{1,2}[/-]\d{1,2}", val.strip()):
            dayfirst = False
            break

    # Parse with auto-detected dayfirst
    parsed = pd.to_datetime(series, dayfirst=dayfirst, errors="coerce")
    
    # If substantial failures (>25% NaT), retry with inverse dayfirst
    if parsed.isna().sum() > len(parsed) * 0.25:
        parsed_alt = pd.to_datetime(series, dayfirst=not dayfirst, errors="coerce")
        if parsed_alt.isna().sum() < parsed.isna().sum():
            parsed = parsed_alt

    # Align mixed single-entry date format anomalies to the dominant month
    valid_dates = parsed.dropna()
    if len(valid_dates) >= 3:
        mode_month = valid_dates.dt.month.mode()[0]
        mode_year = valid_dates.dt.year.mode()[0]
        
        aligned = []
        for orig_val, parsed_dt in zip(series, parsed):
            if pd.isna(parsed_dt):
                aligned.append(parsed_dt)
                continue
            if parsed_dt.month != mode_month and parsed_dt.year == mode_year:
                m = re.search(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", str(orig_val).strip())
                if m:
                    d1, d2, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                    if len(str(y)) == 2:
                        y += 2000
                    if d1 == mode_month and 1 <= d2 <= 31:
                        try:
                            aligned.append(pd.Timestamp(year=mode_year, month=mode_month, day=d2))
                            continue
                        except Exception:
                            pass
            aligned.append(parsed_dt)
        parsed = pd.Series(aligned, index=series.index)

    # Fallback any remaining NaT to today
    today_date = datetime.now().date()
    return parsed.dt.date.fillna(today_date)


# -------------------------------------------------------------------------
# 3. Universal Semantic Auto-Schema Ingestion Engine
# -------------------------------------------------------------------------

SLOT_PATTERNS: Dict[str, List[Tuple[str, int]]] = {
    # Bank Transaction ID
    "transaction_id": [
        (r"^(transaction_id|txn_id|tx_id|trans_id|txn_identifier|transaction_identifier|tx_identifier|identifier|stmt_line_no|stmt_line|statement_line_no|statement_line)$", 100),
        (r"(txn_id|tx_id|transaction_id|trans_id|identifier|trx_id|trans_num|txn_num|txnid|txid|stmt_line|statement_line|line_no)", 85),
        (r"^(id|txn|trx|tx|entry_id|record_id|voucher_no|doc_no|document_id|belnr|line)$", 75),
    ],
    # Invoice ID / Bill Number (Primary Key of Invoice)
    "invoice_id": [
        (r"^(invoice_id|inv_id|bill_id|bill_no|invoice_no|inv_no|bill_ref|bill_reference|inv_ref|invoice_ref|document_number|doc_no|doc_num|document_no|doc_id|bill_code|invoice_code|document_ref|bill_num|invoice_num)$", 100),
        (r"(invoice_id|inv_id|bill_id|bill_no|invoice_no|inv_no|bill_ref|bill_reference|inv_ref|invoice_ref|doc_no|doc_num|document_number|document_no|bill_num|invid|bill_code|inv_code|doc_id|bill_number|invoice_number)", 85),
        (r"^(id|inv|bill|doc|voucher_no|ebeln|vbeln)$", 75),
    ],
    # Payment ID
    "payment_id": [
        (r"^(payment_id|pay_id|gateway_txn_id|gateway_id|payment_txn_id|pg_txn_id|capture_id|order_id)$", 100),
        (r"(payment_id|pay_id|gateway_txn|gateway_id|pg_id|capture_id|settlement_id|payid)", 85),
        (r"^(id|pay|pg|order)$", 75),
    ],
    # Date (all schemas)
    "date": [
        (r"^(date|posting_date|billing_date|capture_date|transaction_date|txn_date|invoice_date|bill_date|bill_dt|value_date|timestamp|created_at|issue_date|due_date|post_date)$", 100),
        (r"(posting_date|billing_date|capture_date|txn_date|trans_date|value_date|val_dt|bldat|timestamp|issue_date|due_date|settled_date|post_date|bill_dt)", 90),
        (r"(date|dt|period|time|day)", 70),
    ],
    # Bank Counterparty / Description
    "description": [
        (r"^(counterparty_description|description|narration|narrative|merchant|vendor|payee|particulars|party|counterparty|payee_name|beneficiary|account_name|party_name|vendor_name|merchant_name|remarks|details)$", 100),
        (r"(counterparty|merchant|vendor|particulars|narration|narrative|payee|beneficiary|description|account_name|party|remarks)", 85),
        (r"^(name|customer|client|entity|sgtxt)$", 70),
    ],
    # Invoice Customer / Client Entity
    "customer": [
        (r"^(client_entity|customer|client|buyer|entity|party|customer_name|client_name|account_name|company|debtor|bill_to|party_name|buyer_name)$", 100),
        (r"(client_entity|customer|client|buyer|entity|party|debtor|company|supplier|buyer_name)", 85),
        (r"^(name|merchant|vendor|description)$", 70),
    ],
    # Payment Merchant
    "merchant": [
        (r"^(merchant_account|merchant|vendor|client|seller|business|party|payee|account_name|party_name|merchant_name)$", 100),
        (r"(merchant_account|merchant|seller|business|vendor|party)", 85),
        (r"^(name|customer|description)$", 70),
    ],
    # Amount (all schemas)
    "amount": [
        (r"^(net_debit_amount|gross_invoice_amount|settled_amount|amount|net_amount|gross_amount|total_amount|txn_amount|bill_amount|invoice_amount|debit|credit|total|value|price|net_val|gross_val|net_debit|debit_inr|credit_inr|bill_value)$", 100),
        (r"(net_debit|gross_invoice|settled_amount|gross_amount|net_amount|invoice_amount|bill_amount|txn_amount|total_amount|paid_amount|net_val|gross_val|bill_value|debit_inr)", 90),
        (r"(amount|debit|credit|total|value|price|wrbtr|dmbtr|val|sum|balance|charge|fee)", 75),
    ],
    # Bank Reference (PO / UTR / Order)
    "reference": [
        (r"^(client_po_reference|po_number|order_ref_code|reference|ref|po_ref|order_ref|utr|ref_no|ref_num|invoice_ref|po|order_id|cheque_no|check_no|tracking_id|ref_code|cust_ref_code|cust_ref|client_ref_code)$", 100),
        (r"(po_reference|client_po|order_ref|ref_code|po_number|ref_no|ref_num|utr|order_no|tracking_no|external_id|ref|cust_ref|client_ref)", 85),
        (r"(reference|ref|po|order|memo|note|zuonr)", 70),
    ],
    # Invoice Reference (PO / Order / Join Key with Bank)
    "invoice_reference": [
        (r"^(po_match_code|po_match|po_number|po_no|po_code|po_ref|client_po_reference|client_po|customer_po|cust_po|order_ref_code|order_ref|order_no|order_id|match_code|invoice_reference|ref_code|cust_ref)$", 100),
        (r"(po_match|po_number|po_no|po_code|po_ref|client_po|cust_po|order_ref|ref_code|ref_no|ref_num|order_no|match_code|po)", 85),
        (r"(reference|ref|po|order|memo|note|zuonr)", 70),
    ],
    # Payment Status
    "status": [
        (r"^(settlement_state|settlement_status|payment_status|state|status|stage|flag|result)$", 100),
        (r"(settlement_state|settlement_status|payment_status|state|status)", 85),
    ]
}


def normalize_dataframe_columns(df: pd.DataFrame, schema_type: str, source_name: Optional[str] = None) -> pd.DataFrame:
    """
    Intelligently maps and normalizes user-uploaded CSV/Excel columns to standard engine schema.
    Uses multi-tier semantic regex scoring and data-type inspection.
    """
    if df is None or len(df) == 0:
        return df

    df = df.copy()
    col_map = {}
    used_original_cols = set()

    # Determine required slots for schema
    if schema_type == "bank":
        target_slots = ["transaction_id", "date", "description", "amount", "reference"]
    elif schema_type == "invoice":
        target_slots = ["invoice_id", "date", "customer", "amount", "invoice_reference"]
    elif schema_type == "payment":
        target_slots = ["payment_id", "date", "merchant", "amount", "reference", "status"]
    else:
        target_slots = []

    # Step 1: Semantic Regex Pattern Scoring
    for slot in target_slots:
        best_col = None
        best_score = 0
        patterns = SLOT_PATTERNS.get(slot, [])
        for col in df.columns:
            if col in used_original_cols:
                continue
            clean_col = re.sub(r"[^a-z0-9]", "_", str(col).strip().lower()).strip("_")
            for pat, score in patterns:
                if re.search(pat, clean_col):
                    if score > best_score:
                        best_score = score
                        best_col = col
        if best_col and best_score >= 60:
            col_map[best_col] = slot
            used_original_cols.add(best_col)

    # Step 2: Data-Type Inspection Fallback for any unmapped critical slots
    unmapped_slots = [s for s in target_slots if s not in col_map.values()]
    remaining_cols = [c for c in df.columns if c not in used_original_cols]

    if unmapped_slots and remaining_cols:
        for slot in unmapped_slots:
            best_col = None
            if slot == "amount":
                # Look for column with high float parse rate
                for col in remaining_cols:
                    try:
                        numeric = pd.to_numeric(df[col].astype(str).str.replace(r"[^\d.-]", "", regex=True), errors="coerce")
                        if numeric.notna().sum() / len(df) > 0.6:
                            best_col = col
                            break
                    except Exception:
                        continue
            elif slot == "date":
                # Look for column with high date parse rate
                for col in remaining_cols:
                    try:
                        dt = pd.to_datetime(df[col], errors="coerce")
                        if dt.notna().sum() / len(df) > 0.6:
                            best_col = col
                            break
                    except Exception:
                        continue
            elif slot in ("description", "customer", "merchant"):
                # Look for string column with multi-word or text content
                for col in remaining_cols:
                    if df[col].dtype == object:
                        best_col = col
                        break
            elif slot in ("transaction_id", "invoice_id", "payment_id"):
                # Look for unique identifier column
                for col in remaining_cols:
                    if df[col].nunique() > len(df) * 0.8:
                        best_col = col
                        break

            if best_col and best_col in remaining_cols:
                col_map[best_col] = slot
                used_original_cols.add(best_col)
                remaining_cols.remove(best_col)

    # Apply Column Renaming
    df = df.rename(columns=col_map)

    # Step 3: Schema-Specific Normalization & Type Standardization
    if schema_type == "bank":
        if "transaction_id" not in df.columns:
            df["transaction_id"] = [f"TX{i+1:04d}" for i in range(len(df))]
        else:
            df["transaction_id"] = df["transaction_id"].astype(str).str.strip()

        if "reference" not in df.columns:
            df["reference"] = df["transaction_id"]
        else:
            df["reference"] = df["reference"].astype(str).str.strip()

        if "description" not in df.columns:
            msg = f"No description/narration column detected in {source_name or 'bank statement'}; composite fuzzy matching will be degraded for this file."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["description"] = "Generic Merchant"
        else:
            df["description"] = df["description"].astype(str).str.strip()

        if "amount" in df.columns:
            df["amount"] = clean_currency_series(df["amount"])
        else:
            msg = f"Missing mandatory 'amount' column in {source_name or 'bank statement'}; defaulting to 0.0 with warning."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["amount"] = 0.0

        if "date" in df.columns:
            df["date"] = smart_parse_dates(df["date"])
        else:
            msg = f"Missing mandatory 'date' column in {source_name or 'bank statement'}; defaulting to current date with warning."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["date"] = datetime.now().date()

    elif schema_type == "invoice":
        if "invoice_id" not in df.columns:
            df["invoice_id"] = [f"INV{i+1:04d}" for i in range(len(df))]
        else:
            df["invoice_id"] = df["invoice_id"].astype(str).str.strip()

        if "invoice_reference" not in df.columns:
            if "reference" in df.columns:
                df["invoice_reference"] = df["reference"].astype(str).str.strip()
            else:
                df["invoice_reference"] = df["invoice_id"]
        else:
            df["invoice_reference"] = df["invoice_reference"].astype(str).str.strip()

        # Semantic content validation: check if invoice_id and invoice_reference were inverted
        # e.g. invoice_id contains PO-9001 and invoice_reference contains INV-9001
        inv_vals = df["invoice_id"].astype(str).str.upper()
        ref_vals = df["invoice_reference"].astype(str).str.upper()

        po_in_id = inv_vals.str.match(r"^(PO|ORD|ORDER|REF)[-_]?\d+", na=False).sum()
        inv_in_ref = ref_vals.str.match(r"^(INV|BILL|DOC|INVOICE)[-_]?\d+", na=False).sum()

        if po_in_id > 0 and inv_in_ref > 0 and po_in_id >= len(df) * 0.4 and inv_in_ref >= len(df) * 0.4:
            df["invoice_id"], df["invoice_reference"] = df["invoice_reference"].copy(), df["invoice_id"].copy()

        if "customer" not in df.columns:
            df["customer"] = "Generic Customer"
        else:
            df["customer"] = df["customer"].astype(str).str.strip()

        if "amount" in df.columns:
            df["amount"] = clean_currency_series(df["amount"])
        else:
            msg = f"Missing mandatory 'amount' column in {source_name or 'invoice ledger'}; defaulting to 0.0 with warning."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["amount"] = 0.0

        if "date" in df.columns:
            df["date"] = smart_parse_dates(df["date"])
        else:
            msg = f"Missing mandatory 'date' column in {source_name or 'invoice ledger'}; defaulting to current date with warning."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["date"] = datetime.now().date()

    elif schema_type == "payment":
        if "payment_id" not in df.columns:
            df["payment_id"] = [f"PAY{i+1:04d}" for i in range(len(df))]
        else:
            df["payment_id"] = df["payment_id"].astype(str).str.strip()

        if "reference" not in df.columns:
            df["reference"] = df["payment_id"]
        else:
            df["reference"] = df["reference"].astype(str).str.strip()

        if "merchant" not in df.columns:
            df["merchant"] = "Generic Merchant"
        else:
            df["merchant"] = df["merchant"].astype(str).str.strip()

        if "amount" in df.columns:
            df["amount"] = clean_currency_series(df["amount"])
        else:
            msg = f"Missing mandatory 'amount' column in {source_name or 'payment settlement file'}; defaulting to 0.0 with warning."
            logger.warning(msg)
            df.attrs["ingestion_warning"] = msg
            df["amount"] = 0.0

        if "status" not in df.columns:
            df["status"] = "settled"
        else:
            # Normalize status strings (SUCCESS -> settled, PENDING -> pending, FAILED -> failed)
            def _clean_status(st_val):
                s = str(st_val).strip().lower()
                if any(w in s for w in ["success", "settled", "paid", "captured", "completed", "ok"]):
                    return "settled"
                elif any(w in s for w in ["pending", "processing", "authorized", "transit", "unsettled"]):
                    return "pending"
                elif any(w in s for w in ["fail", "decline", "reject", "cancel", "error"]):
                    return "failed"
                return s or "settled"
            df["status"] = df["status"].apply(_clean_status)

        if "date" in df.columns:
            df["date"] = smart_parse_dates(df["date"])
        else:
            df["date"] = datetime.now().date()

    return df


# -------------------------------------------------------------------------
# 4. Default Synthesizer & Load Helpers
# -------------------------------------------------------------------------

def synthesize_default_payments(bank_df: pd.DataFrame) -> pd.DataFrame:
    """Creates a corresponding payment gateway stub if payments CSV is omitted."""
    payments = []
    for idx, row in bank_df.iterrows():
        payments.append({
            "payment_id": f"PAY{idx+1:04d}",
            "date": row.get("date", datetime.now().date()),
            "merchant": row.get("description", "Merchant"),
            "amount": row.get("amount", 0.0),
            "reference": row.get("reference", f"REF{idx+1:05d}"),
            "status": "settled"
        })
    return pd.DataFrame(payments)


def load_bank_transactions(filepath=None) -> pd.DataFrame:
    """Load and validate bank transactions."""
    filepath = filepath or BANK_TRANSACTIONS_FILE
    df = read_tabular_file(filepath)
    return normalize_dataframe_columns(df, "bank")


def load_invoices(filepath=None) -> pd.DataFrame:
    """Load and validate invoices."""
    filepath = filepath or INVOICES_FILE
    df = read_tabular_file(filepath)
    return normalize_dataframe_columns(df, "invoice")


def load_payments(filepath=None) -> pd.DataFrame:
    """Load and validate payments."""
    filepath = filepath or PAYMENTS_FILE
    df = read_tabular_file(filepath)
    return normalize_dataframe_columns(df, "payment")


def load_ground_truth(filepath=None) -> pd.DataFrame:
    """Load the ground truth for accuracy measurement."""
    filepath = filepath or GROUND_TRUTH_FILE
    df = read_tabular_file(filepath)
    if "expected_invoice_id" in df.columns:
        df["expected_invoice_id"] = df["expected_invoice_id"].fillna("")
    return df


def load_all_data(
    verbose: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load and validate all three data sources plus ground truth.

    Returns:
        (bank_df, invoices_df, payments_df, ground_truth_df)
    """
    if verbose:
        print("\n--- Loading Data ---")

    bank = load_bank_transactions()
    invoices = load_invoices()
    payments = load_payments()
    ground_truth = load_ground_truth()

    if verbose:
        print(f"\n--- Dataset Summary ---")
        print(f"  Bank transactions : {len(bank):>4} rows")
        print(f"  Invoices          : {len(invoices):>4} rows")
        print(f"  Payments          : {len(payments):>4} rows")
        print(f"  Ground truth      : {len(ground_truth):>4} rows")

    return bank, invoices, payments, ground_truth
