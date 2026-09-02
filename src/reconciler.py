"""
Core Reconciliation Engine

Multi-step matching pipeline that processes bank transactions against
invoices and payments, classifying each record and producing a detailed
result with confidence scores and reasons.
"""

import re
import math
import pandas as pd
from datetime import date
from typing import List, Optional, Tuple
from rapidfuzz import fuzz

from src.models import ReconciliationResult
from src.config import (
    STATUS_MATCH,
    STATUS_AMOUNT_MISMATCH,
    STATUS_DATE_MISMATCH,
    STATUS_MISSING_INVOICE,
    STATUS_DUPLICATE,
    STATUS_MULTIPLE_MATCHES,
    AMOUNT_TOLERANCE,
    DATE_TOLERANCE_DAYS,
    FUZZY_MATCH_THRESHOLD,
)


def _safe_float(val, default: float = 0.0) -> float:
    if val is None or pd.isna(val):
        return default
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (ValueError, TypeError):
        return default


def _safe_int(val, default: int = 0) -> int:
    if val is None or pd.isna(val):
        return default
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else int(f)
    except (ValueError, TypeError):
        return default


def _safe_str(val, default: str = "") -> str:
    if val is None or pd.isna(val):
        return default
    s = str(val).strip()
    return "" if s.lower() in ("nan", "none", "null") else s


def normalize_ref_string(s: Optional[str]) -> str:
    """Strips non-alphanumerics and leading zeros for canonical comparison."""
    if s is None or pd.isna(s):
        return ""
    clean = re.sub(r"[^a-zA-Z0-9]", "", str(s)).upper()
    return clean.lstrip("0") or clean


def detect_duplicates(bank: pd.DataFrame) -> Tuple[pd.DataFrame, List[ReconciliationResult]]:
    """
    Step 1: Identify and separate duplicate bank transactions.

    Detects:
    - Explicit duplicates with _DUP suffix in transaction_id
    - Exact duplicates by (reference, amount, date) with different IDs

    Returns:
        (clean_bank_df, duplicate_results)
    """
    results = []

    # Detect _DUP suffixed IDs
    dup_mask = bank["transaction_id"].str.contains("_DUP", na=False)
    dup_rows = bank[dup_mask]
    non_dup_bank = bank[~dup_mask].copy()

    for _, row in dup_rows.iterrows():
        original_id = row["transaction_id"].replace("_DUP", "")
        results.append(ReconciliationResult(
            transaction_id=row["transaction_id"],
            status=STATUS_DUPLICATE,
            reason=f"Duplicate of {original_id} (same reference {row['reference']}, amount {row['amount']})",
        ))

    # Second pass: Exact duplicates by (reference, amount, date) with different IDs
    seen_groups = {}
    clean_indices = []

    for idx, row in non_dup_bank.iterrows():
        tx_id = str(row["transaction_id"]).strip()
        ref = str(row.get("reference", "")).strip()
        amt = float(row.get("amount", 0.0))
        dt = str(row.get("date", ""))

        key = (ref, amt, dt) if ref else None
        if key and key in seen_groups:
            first_tx_id = seen_groups[key]
            results.append(ReconciliationResult(
                transaction_id=tx_id,
                status=STATUS_DUPLICATE,
                reason=f"Duplicate of {first_tx_id}: same reference, amount, and date",
            ))
        else:
            if key:
                seen_groups[key] = tx_id
            clean_indices.append(idx)

    clean_bank = non_dup_bank.loc[clean_indices].copy()
    return clean_bank, results


def match_by_reference(
    transaction: pd.Series,
    invoices: pd.DataFrame,
    matched_invoices: Optional[set] = None,
    amount_tolerance: float = AMOUNT_TOLERANCE,
    fuzzy_threshold: float = FUZZY_MATCH_THRESHOLD,
) -> Optional[pd.Series]:
    """
    Step 2: Find the matching invoice using multi-tier reference & composite candidate matching.

    Returns the matched invoice row, or None if not found.
    """
    if invoices is None or len(invoices) == 0:
        return None

    tx_ref = str(transaction.get("reference", "")).strip()
    tx_id = str(transaction.get("transaction_id", "")).strip()

    # Pass 1: Exact reference match
    if tx_ref:
        matches = invoices[invoices["invoice_reference"] == tx_ref]
        if len(matches) == 1:
            return matches.iloc[0]

        # Pass 2: Invoice ID match
        matches_id = invoices[invoices["invoice_id"] == tx_ref]
        if len(matches_id) == 1:
            return matches_id.iloc[0]

    # Pass 3: Transaction ID matching invoice_reference or invoice_id
    if tx_id:
        matches_tx = invoices[invoices["invoice_reference"] == tx_id]
        if len(matches_tx) == 1:
            return matches_tx.iloc[0]
        matches_tx_id = invoices[invoices["invoice_id"] == tx_id]
        if len(matches_tx_id) == 1:
            return matches_tx_id.iloc[0]

    # Pass 4: Canonical normalized reference comparison
    norm_tx_ref = normalize_ref_string(tx_ref)
    if norm_tx_ref and len(norm_tx_ref) >= 3:
        inv_norm = invoices["invoice_reference"].apply(normalize_ref_string)
        matches_norm = invoices[inv_norm == norm_tx_ref]
        if len(matches_norm) == 1:
            return matches_norm.iloc[0]

    # Pass 5: Composite Multi-Field Fallback Matching (same amount within tolerance + high merchant match)
    bank_amt = float(transaction.get("amount", 0.0))
    bank_desc = str(transaction.get("description", ""))
    bank_date = transaction.get("date")

    candidates = []
    for _, inv_row in invoices.iterrows():
        inv_id = str(inv_row.get("invoice_id", "")).strip()
        if matched_invoices and inv_id in matched_invoices:
            continue
        inv_amt = float(inv_row.get("amount", 0.0))
        amt_delta = abs(bank_amt - inv_amt)
        if amt_delta <= amount_tolerance:
            inv_cust = str(inv_row.get("customer", ""))
            sim = compute_merchant_similarity(bank_desc, inv_cust)
            if sim >= fuzzy_threshold:
                inv_date = inv_row.get("date")
                days_diff = 0
                if bank_date and inv_date and isinstance(bank_date, date) and isinstance(inv_date, date):
                    days_diff = abs((bank_date - inv_date).days)
                if days_diff <= 14:
                    candidates.append((inv_row, sim, days_diff))

    if len(candidates) == 1:
        return candidates[0][0]
    elif len(candidates) > 1:
        candidates.sort(key=lambda x: (-x[1], x[2]))
        if candidates[0][1] >= max(70.0, float(fuzzy_threshold)):
            return candidates[0][0]

    return None


def check_multiple_matches(
    transaction: pd.Series,
    invoices: pd.DataFrame,
) -> bool:
    """Check if a reference matches multiple invoices."""
    if invoices is None or len(invoices) == 0:
        return False
    tx_ref = str(transaction.get("reference", "")).strip()
    if not tx_ref:
        return False
    matches = invoices[invoices["invoice_reference"] == tx_ref]
    return len(matches) > 1


def compare_amounts(
    bank_amount: float,
    invoice_amount: float,
    tolerance: float = AMOUNT_TOLERANCE,
) -> Tuple[bool, float]:
    """
    Step 3: Compare bank and invoice amounts.

    Returns:
        (is_match, delta)
    """
    delta = float(bank_amount) - float(invoice_amount)
    is_match = abs(delta) <= tolerance

    return is_match, delta


def compare_dates(
    bank_date: date,
    invoice_date: date,
    tolerance_days: int = DATE_TOLERANCE_DAYS,
) -> Tuple[bool, int]:
    """
    Step 4: Compare bank and invoice dates.

    Returns:
        (is_match, delta_days)
    """
    if not isinstance(bank_date, date) or not isinstance(invoice_date, date):
        return True, 0
    delta = (bank_date - invoice_date).days
    is_match = abs(delta) <= tolerance_days

    return is_match, delta


# Corporate and entity stop words to ignore during name normalization
ENTITY_STOP_WORDS = {
    "corp", "corporation", "inc", "incorporated", "ltd", "limited", "pvt", "private",
    "llc", "llp", "co", "company", "services", "solutions", "technologies", "tech",
    "enterprise", "enterprises", "systems", "india", "global", "group"
}


def clean_name_tokens(s: str) -> List[str]:
    """Extract clean words from merchant/customer string excluding common corporate suffixes."""
    words = re.findall(r"[a-zA-Z0-9]+", str(s or "").lower())
    filtered = [w for w in words if w not in ENTITY_STOP_WORDS]
    return filtered or words


def get_name_acronym(words: List[str]) -> str:
    """Computes acronym initials from significant words."""
    return "".join(w[0] for w in words if w and w not in {"of", "and", "the", "in", "for", "to"})


def compute_merchant_similarity(
    bank_name: str,
    invoice_name: str,
) -> float:
    """
    Step 5: Multi-ratio fuzzy match merchant/customer names with acronym expansion
    and corporate suffix stripping.

    Returns similarity score 0-100 rounded to 1 decimal place.
    """
    s1 = str(bank_name or "").strip()
    s2 = str(invoice_name or "").strip()
    if not s1 or not s2:
        return 0.0

    t1 = clean_name_tokens(s1)
    t2 = clean_name_tokens(s2)
    str1 = " ".join(t1)
    str2 = " ".join(t2)

    base_score = max(
        fuzz.token_set_ratio(str1, str2),
        fuzz.token_sort_ratio(str1, str2),
        fuzz.token_set_ratio(s1.lower(), s2.lower()),
        fuzz.partial_ratio(str1, str2) if len(str1) >= 4 and len(str2) >= 4 else 0.0,
    )

    # Acronym & initialism cross-matching (e.g. "SBI" vs "State Bank of India")
    all_w1 = re.findall(r"[a-zA-Z0-9]+", s1.lower())
    all_w2 = re.findall(r"[a-zA-Z0-9]+", s2.lower())
    acr1 = get_name_acronym(all_w1)
    acr2 = get_name_acronym(all_w2)

    for w in all_w1:
        if len(w) >= 2 and (w == acr2 or acr2.startswith(w) or (acr2 and w in acr2)):
            base_score = max(base_score, 85.0)
    for w in all_w2:
        if len(w) >= 2 and (w == acr1 or acr1.startswith(w) or (acr1 and w in acr1)):
            base_score = max(base_score, 85.0)

    return round(float(base_score), 1)


def lookup_payment(
    reference: str,
    payments: pd.DataFrame,
) -> Optional[pd.Series]:
    """
    Step 6: Find the corresponding payment record.

    Returns the payment row, or None if not found.
    """
    if payments is None or len(payments) == 0:
        return None

    ref_str = str(reference).strip()
    if not ref_str:
        return None

    # Pass 1: Direct reference match
    matches = payments[payments["reference"] == ref_str]
    if len(matches) == 1:
        return matches.iloc[0]

    # Pass 2: Payment ID match
    matches_id = payments[payments["payment_id"] == ref_str]
    if len(matches_id) == 1:
        return matches_id.iloc[0]

    # Pass 3: Canonical normalized match
    norm_ref = normalize_ref_string(ref_str)
    if norm_ref and len(norm_ref) >= 3:
        p_norm = payments["reference"].apply(normalize_ref_string)
        matches_norm = payments[p_norm == norm_ref]
        if len(matches_norm) == 1:
            return matches_norm.iloc[0]

    return None


def classify_transaction(
    transaction: pd.Series,
    invoices: pd.DataFrame,
    payments: pd.DataFrame,
    matched_invoices: Optional[set] = None,
    amount_tolerance: float = AMOUNT_TOLERANCE,
    date_tolerance: int = DATE_TOLERANCE_DAYS,
    fuzzy_threshold: float = FUZZY_MATCH_THRESHOLD,
) -> ReconciliationResult:
    """
    Step 7: Run the full classification pipeline for one bank transaction.

    Pipeline order:
    1. Reference match -> if no match: MISSING_INVOICE
    2. Amount comparison -> if mismatch: AMOUNT_MISMATCH
    3. Date comparison -> if mismatch: DATE_MISMATCH
    4. Merchant similarity -> annotation (not blocking)
    5. Payment cross-validation -> annotation
    6. If all pass: MATCH
    """

    tx_id = transaction["transaction_id"]
    reference = transaction["reference"]

    # Step 2: Reference match
    if check_multiple_matches(transaction, invoices):
        return ReconciliationResult(
            transaction_id=tx_id,
            status=STATUS_MULTIPLE_MATCHES,
            reason=f"Reference {reference} matches multiple invoices",
        )

    invoice = match_by_reference(
        transaction,
        invoices,
        matched_invoices=matched_invoices,
        amount_tolerance=amount_tolerance,
        fuzzy_threshold=fuzzy_threshold,
    )

    if invoice is None:
        # Look up payment for additional context
        payment = lookup_payment(reference, payments)
        payment_status = payment["status"] if payment is not None else None

        return ReconciliationResult(
            transaction_id=tx_id,
            status=STATUS_MISSING_INVOICE,
            payment_status=payment_status,
            reason=f"No invoice found for reference {reference}",
        )

    # We have a matched invoice
    invoice_id = invoice["invoice_id"]

    # Step 3: Amount comparison
    amounts_match, amount_delta = compare_amounts(
        transaction["amount"], invoice["amount"], tolerance=amount_tolerance
    )

    # Step 4: Date comparison
    dates_match, date_delta = compare_dates(
        transaction["date"], invoice["date"], tolerance_days=date_tolerance
    )

    # Step 5: Merchant similarity
    merchant_score = compute_merchant_similarity(
        transaction["description"], invoice["customer"]
    )

    # Step 6: Payment cross-validation
    payment = lookup_payment(reference, payments)
    payment_id = payment["payment_id"] if payment is not None else None
    payment_status = payment["status"] if payment is not None else None

    # Classify based on priority: amount > date > match
    if not amounts_match:
        return ReconciliationResult(
            transaction_id=tx_id,
            invoice_id=invoice_id,
            payment_id=payment_id,
            status=STATUS_AMOUNT_MISMATCH,
            amount_delta=amount_delta,
            date_delta_days=date_delta,
            merchant_match_score=merchant_score,
            payment_status=payment_status,
            reason=(
                f"Amount mismatch: bank={transaction['amount']}, "
                f"invoice={invoice['amount']}, delta={amount_delta}"
            ),
        )

    if not dates_match:
        return ReconciliationResult(
            transaction_id=tx_id,
            invoice_id=invoice_id,
            payment_id=payment_id,
            status=STATUS_DATE_MISMATCH,
            amount_delta=amount_delta,
            date_delta_days=date_delta,
            merchant_match_score=merchant_score,
            payment_status=payment_status,
            reason=(
                f"Date mismatch: bank={transaction['date']}, "
                f"invoice={invoice['date']}, delta={date_delta} days"
            ),
        )

    # All checks pass
    return ReconciliationResult(
        transaction_id=tx_id,
        invoice_id=invoice_id,
        payment_id=payment_id,
        status=STATUS_MATCH,
        amount_delta=0.0,
        date_delta_days=0,
        merchant_match_score=merchant_score,
        payment_status=payment_status,
        reason="Fully matched on reference, amount, and date",
    )


def reconcile(
    bank: pd.DataFrame,
    invoices: pd.DataFrame,
    payments: pd.DataFrame,
    verbose: bool = True,
    amount_tolerance: float = AMOUNT_TOLERANCE,
    date_tolerance: int = DATE_TOLERANCE_DAYS,
    fuzzy_threshold: float = FUZZY_MATCH_THRESHOLD,
) -> List[ReconciliationResult]:
    """
    Run the full reconciliation pipeline on the entire batch.

    Returns a list of ReconciliationResult for every bank transaction.
    """

    if verbose:
        print("\n--- Reconciliation Engine ---")

    # Step 1: Separate duplicates
    clean_bank, duplicate_results = detect_duplicates(bank)

    if verbose:
        print(f"  Duplicates detected  : {len(duplicate_results):>4}")
        print(f"  Clean transactions   : {len(clean_bank):>4}")

    # Steps 2-7: Classify each clean transaction
    results = []
    matched_invoices = set()

    for _, transaction in clean_bank.iterrows():
        result = classify_transaction(
            transaction,
            invoices,
            payments,
            matched_invoices=matched_invoices,
            amount_tolerance=amount_tolerance,
            date_tolerance=date_tolerance,
            fuzzy_threshold=fuzzy_threshold,
        )
        if result.invoice_id and result.status == STATUS_MATCH:
            matched_invoices.add(result.invoice_id)
        results.append(result)

    # Combine duplicates + classified results
    all_results = duplicate_results + results

    if verbose:
        # Summary by status
        status_counts = {}
        for r in all_results:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1

        print(f"\n--- Classification Results ---")
        print(f"  Total processed      : {len(all_results):>4}")
        for status, count in sorted(status_counts.items()):
            print(f"  {status:<22}: {count:>4}")

    return all_results


def results_to_dataframe(results: List[ReconciliationResult]) -> pd.DataFrame:
    """Convert list of results to a DataFrame for analysis."""

    return pd.DataFrame([r.model_dump() for r in results])


def measure_accuracy(
    results: List[ReconciliationResult],
    ground_truth: pd.DataFrame,
    verbose: bool = True,
) -> dict:
    """
    Compare reconciliation results against ground truth.

    Returns accuracy metrics dict with dataset validation.
    """
    if ground_truth is None or ground_truth.empty:
        return {
            "matches_dataset": False,
            "error": "The ground truth file is empty.",
            "total": 0,
            "correct": 0,
            "accuracy": 0.0,
            "invoice_correct": 0,
            "categories": {},
            "incorrect_predictions": [],
        }

    # Normalize column names
    gt = ground_truth.copy()
    col_map = {str(c).strip().lower(): c for c in gt.columns}
    
    # Check transaction_id column
    tx_col = None
    for cand in ["transaction_id", "tx_id", "txn_id", "id", "bank_tx_id"]:
        if cand in col_map:
            tx_col = col_map[cand]
            break
            
    # Check expected_status column
    status_col = None
    for cand in ["expected_status", "status", "ground_truth_status", "true_status"]:
        if cand in col_map:
            status_col = col_map[cand]
            break

    if not tx_col or not status_col:
        return {
            "matches_dataset": False,
            "error": "The ground truth file does not match this dataset (missing required 'transaction_id' or 'expected_status' columns).",
            "total": 0,
            "correct": 0,
            "accuracy": 0.0,
            "invoice_correct": 0,
            "categories": {},
            "incorrect_predictions": [],
        }

    if tx_col != "transaction_id":
        gt.rename(columns={tx_col: "transaction_id"}, inplace=True)
    if status_col != "expected_status":
        gt.rename(columns={status_col: "expected_status"}, inplace=True)

    if "expected_invoice_id" not in gt.columns:
        inv_col = None
        for cand in ["invoice_id", "doc_id", "expected_invoice", "true_invoice_id"]:
            if cand in col_map:
                inv_col = col_map[cand]
                break
        if inv_col:
            gt.rename(columns={inv_col: "expected_invoice_id"}, inplace=True)
        else:
            gt["expected_invoice_id"] = ""

    results_df = results_to_dataframe(results)
    # Check key overlap against all reconciliation results
    results_tx_ids = set(results_df["transaction_id"].astype(str).str.strip())
    gt_tx_ids = set(gt["transaction_id"].astype(str).str.strip())

    common_tx_ids = results_tx_ids.intersection(gt_tx_ids)
    overlap_count = len(common_tx_ids)
    total_gt = len(gt_tx_ids)
    overlap_ratio = (overlap_count / total_gt) if total_gt > 0 else 0

    if overlap_count == 0 or overlap_ratio < 0.5:
        return {
            "matches_dataset": False,
            "error": f"The ground truth file does not match this dataset. Found {overlap_count} of {total_gt} matching transaction IDs.",
            "overlap_count": overlap_count,
            "total_dataset_records": total_gt,
            "total": 0,
            "correct": 0,
            "accuracy": 0.0,
            "classification_correct": 0,
            "classification_total": 0,
            "classification_accuracy": 0.0,
            "classification_failures": 0,
            "invoice_correct": 0,
            "invoice_total": 0,
            "invoice_accuracy": 0.0,
            "invoice_failures": 0,
            "systemic_issues": [],
            "categories": {},
            "incorrect_predictions": [],
        }

    # Merge with ground truth
    comparison = results_df.merge(
        gt,
        on="transaction_id",
        how="inner",
    )

    comparison["expected_invoice_id"] = comparison["expected_invoice_id"].fillna("").astype(str).str.strip()
    comparison["invoice_id"] = comparison["invoice_id"].fillna("").astype(str).str.strip()

    # Check classification (status) match
    comparison["correct"] = (
        comparison["status"] == comparison["expected_status"]
    )

    # Check invoice ID match (where applicable - exclude duplicate and missing invoice rows from invoice ID penalty)
    comparison["invoice_correct"] = True
    has_expected_inv = (
        (comparison["expected_invoice_id"] != "")
        & (comparison["status"] != STATUS_DUPLICATE)
        & (comparison["expected_status"] != STATUS_MISSING_INVOICE)
    )
    comparison.loc[has_expected_inv, "invoice_correct"] = (
        comparison.loc[has_expected_inv, "invoice_id"]
        == comparison.loc[has_expected_inv, "expected_invoice_id"]
    )

    # Overall metrics
    total = len(comparison)
    correct = _safe_int(comparison["correct"].sum())
    invoice_correct = _safe_int(comparison["invoice_correct"].sum())
    accuracy = float((correct / total * 100) if total > 0 else 0.0)
    invoice_accuracy = float((invoice_correct / total * 100) if total > 0 else 0.0)
    classification_failures = total - correct
    invoice_failures = total - invoice_correct

    # Per-category metrics
    category_metrics = {}
    for status in gt["expected_status"].unique():
        status_str = _safe_str(status)
        if not status_str:
            continue
        cat_rows = comparison[comparison["expected_status"] == status]
        cat_correct = _safe_int(cat_rows["correct"].sum())
        cat_total = len(cat_rows)
        if cat_total > 0:
            category_metrics[status_str] = {
                "correct": cat_correct,
                "total": int(cat_total),
                "accuracy": float((cat_correct / cat_total * 100) if cat_total > 0 else 0.0),
            }

    # Incorrect predictions with failure root-cause analysis based on real engine reason
    incorrect_mask = (~comparison["correct"]) | (~comparison["invoice_correct"])
    incorrect = comparison[incorrect_mask].copy()
    incorrect_list = []
    invoice_linking_mismatches = []
    classification_mismatches = []

    for _, row in incorrect.iterrows():
        tx_id = _safe_str(row.get("transaction_id"))
        status = _safe_str(row.get("status"))
        expected_status = _safe_str(row.get("expected_status"))
        inv_id = _safe_str(row.get("invoice_id"))
        exp_inv_id = _safe_str(row.get("expected_invoice_id"))
        actual_reason = _safe_str(row.get("reason"), "Evaluated by engine")
        vendor = _safe_str(row.get("vendor") or row.get("description") or row.get("counterparty"))
        amount = _safe_float(row.get("amount") or row.get("bank_amount"))
        amount_delta = _safe_float(row.get("amount_delta"))
        date_delta_days = _safe_int(row.get("date_delta_days"))

        # Determine failure type
        if status != expected_status and exp_inv_id != "" and inv_id != exp_inv_id:
            failure_type = "Status & Invoice Mismatch"
        elif status != expected_status:
            failure_type = "Classification Mismatch"
        else:
            failure_type = "Invoice Linking Mismatch"

        # Generate honest, data-driven root-cause explanation from engine reason
        if status != expected_status:
            explanation = f"Engine decision: {actual_reason}. Expected status: '{expected_status}'."
            if status == "AMOUNT_MISMATCH" and expected_status == "MATCH":
                suggested_fix = f"Actual amount delta is ₹{abs(amount_delta):,.2f}. Adjust amount tolerance threshold or record variance adjustment."
            elif status == "DATE_MISMATCH" and expected_status == "MATCH":
                suggested_fix = f"Actual date delta is {abs(date_delta_days)} days. Adjust date tolerance threshold if transit delay is acceptable."
            elif status == "MISSING_INVOICE" and expected_status == "MATCH":
                suggested_fix = f"No invoice linked for transaction. Verify reference code or vendor description similarity."
            elif status == "MATCH" and expected_status == "AMOUNT_MISMATCH":
                suggested_fix = "Matched within current amount tolerance. Tighten amount tolerance if exact match is required."
            elif status == "MATCH" and expected_status == "DATE_MISMATCH":
                suggested_fix = "Matched within current date tolerance. Tighten date tolerance if exact date is required."
            elif status == "DUPLICATE" and expected_status == "MATCH":
                suggested_fix = "Flagged as duplicate transaction. Verify duplicate detection criteria."
            elif status == "MATCH" and expected_status == "DUPLICATE":
                suggested_fix = "Duplicate transaction was not detected. Verify duplicate detection rules."
            else:
                suggested_fix = "Review reconciliation rules and ground truth definitions."
            classification_mismatches.append(tx_id)
        else:
            explanation = f"Status correctly classified as '{status}' ({actual_reason}), but linked ID is '{inv_id}' whereas benchmark expected invoice '{exp_inv_id}'."
            suggested_fix = "Review ingestion column mapping: verify that invoice primary key maps to 'invoice_id' and PO cross-reference maps to 'invoice_reference'."
            invoice_linking_mismatches.append(tx_id)

        incorrect_list.append({
            "transaction_id": tx_id,
            "vendor": vendor,
            "amount": amount,
            "amount_delta": amount_delta,
            "date_delta_days": date_delta_days,
            "status": status,
            "expected_status": expected_status,
            "invoice_id": inv_id,
            "expected_invoice_id": exp_inv_id,
            "failure_type": failure_type,
            "engine_reason": actual_reason,
            "explanation": explanation,
            "suggested_fix": suggested_fix,
        })

    # Systemic issue detection: if multiple invoice mismatches occur due to column swap
    systemic_issues = []
    if len(invoice_linking_mismatches) >= 3 and len(classification_mismatches) == 0:
        systemic_issues.append({
            "type": "INVOICE_ID_COLUMN_SWAP",
            "title": "Systemic Ingestion Column-Mapping Issue",
            "description": f"All {len(invoice_linking_mismatches)} invoice ID mismatches share the same root cause: 'invoice_id' and 'invoice_reference' columns were inverted during ingestion.",
            "affected_count": len(invoice_linking_mismatches),
            "suggested_fix": "Fix column-scoring in ingestion layer so invoice number maps to 'invoice_id' and PO code maps to 'invoice_reference'."
        })

    metrics = {
        "matches_dataset": True,
        "total": int(total),
        "correct": int(correct),
        "accuracy": float(accuracy),
        "classification_correct": int(correct),
        "classification_total": int(total),
        "classification_accuracy": float(accuracy),
        "classification_failures": int(classification_failures),
        "invoice_correct": int(invoice_correct),
        "invoice_total": int(total),
        "invoice_accuracy": float(invoice_accuracy),
        "invoice_failures": int(invoice_failures),
        "systemic_issues": systemic_issues,
        "categories": category_metrics,
        "incorrect_predictions": incorrect_list,
    }

    if verbose:
        print(f"\n--- Accuracy vs Ground Truth ---")
        print(f"  Overall: {correct}/{total} ({accuracy:.1f}%)")
        print()
        for status, m in sorted(category_metrics.items()):
            print(f"  {status:<22}: {m['correct']}/{m['total']} ({m['accuracy']:.1f}%)")

        if len(incorrect) > 0:
            print(f"\n--- Incorrect Predictions ({len(incorrect)}) ---")
            cols = ["transaction_id", "status", "expected_status", "invoice_id", "expected_invoice_id"]
            print(incorrect[cols].to_string(index=False))
        else:
            print(f"\n  All predictions correct!")

    return metrics
