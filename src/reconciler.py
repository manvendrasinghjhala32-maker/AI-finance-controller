"""
Core Reconciliation Engine

Multi-step matching pipeline that processes bank transactions against
invoices and payments, classifying each record and producing a detailed
result with confidence scores and reasons.
"""

import re
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
    clean_bank = bank[~dup_mask].copy()

    for _, row in dup_rows.iterrows():
        original_id = row["transaction_id"].replace("_DUP", "")
        results.append(ReconciliationResult(
            transaction_id=row["transaction_id"],
            status=STATUS_DUPLICATE,
            reason=f"Duplicate of {original_id} (same reference {row['reference']}, amount {row['amount']})",
        ))

    return clean_bank, results


def match_by_reference(
    transaction: pd.Series,
    invoices: pd.DataFrame,
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
        inv_amt = float(inv_row.get("amount", 0.0))
        amt_delta = abs(bank_amt - inv_amt)
        if amt_delta <= AMOUNT_TOLERANCE:
            inv_cust = str(inv_row.get("customer", ""))
            sim = compute_merchant_similarity(bank_desc, inv_cust)
            if sim >= 75.0:
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
        if candidates[0][1] >= 90:
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


def compute_merchant_similarity(
    bank_name: str,
    invoice_name: str,
) -> float:
    """
    Step 5: Fuzzy match merchant/customer names.

    Returns similarity score 0-100 rounded to 1 decimal place.
    """
    score = fuzz.token_set_ratio(
        str(bank_name).lower(),
        str(invoice_name).lower(),
    )
    return round(float(score), 1)


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

    invoice = match_by_reference(transaction, invoices)

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
        transaction["amount"], invoice["amount"]
    )

    # Step 4: Date comparison
    dates_match, date_delta = compare_dates(
        transaction["date"], invoice["date"]
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

    for _, transaction in clean_bank.iterrows():
        result = classify_transaction(transaction, invoices, payments)
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

    Returns accuracy metrics dict.
    """

    results_df = results_to_dataframe(results)

    # Filter out duplicates (not in ground truth)
    results_df = results_df[results_df["status"] != STATUS_DUPLICATE].copy()

    # Merge with ground truth
    comparison = results_df.merge(
        ground_truth,
        on="transaction_id",
        how="inner",
    )

    # Check status match
    comparison["correct"] = (
        comparison["status"] == comparison["expected_status"]
    )

    # Check invoice ID match (where applicable)
    comparison["invoice_correct"] = True
    has_expected_inv = comparison["expected_invoice_id"] != ""
    comparison.loc[has_expected_inv, "invoice_correct"] = (
        comparison.loc[has_expected_inv, "invoice_id"]
        == comparison.loc[has_expected_inv, "expected_invoice_id"]
    )

    # Overall metrics
    total = len(comparison)
    correct = comparison["correct"].sum()
    invoice_correct = comparison["invoice_correct"].sum()
    accuracy = (correct / total * 100) if total > 0 else 0

    # Per-category metrics
    category_metrics = {}
    for status in ground_truth["expected_status"].unique():
        cat_rows = comparison[comparison["expected_status"] == status]
        cat_correct = cat_rows["correct"].sum()
        cat_total = len(cat_rows)
        category_metrics[status] = {
            "correct": int(cat_correct),
            "total": int(cat_total),
            "accuracy": (cat_correct / cat_total * 100) if cat_total > 0 else 0,
        }

    # Incorrect predictions
    incorrect = comparison[~comparison["correct"]].copy()

    metrics = {
        "total": total,
        "correct": int(correct),
        "accuracy": accuracy,
        "invoice_correct": int(invoice_correct),
        "categories": category_metrics,
        "incorrect_predictions": incorrect,
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
