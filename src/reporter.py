"""
Reporting & Metrics Layer

Produces structured output files and a final console summary:
1. Reconciliation report CSV (all records)
2. Exception list CSV (unresolved records + AI explanations)
3. Cash position summary
4. Final console report
"""

import pandas as pd
from typing import List, Optional
from datetime import datetime

from src.models import ReconciliationResult
from src.config import (
    OUTPUT_DIR,
    STATUS_MATCH,
    STATUS_DUPLICATE,
    STATUS_AMOUNT_MISMATCH,
    STATUS_DATE_MISMATCH,
    STATUS_MISSING_INVOICE,
)
from src.reconciler import results_to_dataframe


# --------------------------------------------------
# 1. CSV Exports
# --------------------------------------------------

def save_reconciliation_report(
    results: List[ReconciliationResult],
) -> str:
    """
    Save full reconciliation results to CSV.
    Returns the file path.
    """

    df = results_to_dataframe(results)

    # Reorder columns for readability
    col_order = [
        "transaction_id", "status", "invoice_id", "payment_id",
        "amount_delta", "date_delta_days", "merchant_match_score",
        "payment_status", "reason",
    ]
    df = df[[c for c in col_order if c in df.columns]]

    filepath = OUTPUT_DIR / "reconciliation_report.csv"
    df.to_csv(filepath, index=False)

    return str(filepath)


def save_exception_report(
    results: List[ReconciliationResult],
    explanations: Optional[List[dict]] = None,
) -> str:
    """
    Save exception-only records to CSV, with AI explanations if available.
    Returns the file path.
    """

    df = results_to_dataframe(results)

    # Filter to exceptions only
    exceptions_df = df[~df["status"].isin([STATUS_MATCH, STATUS_DUPLICATE])].copy()

    # Merge AI explanations if provided
    if explanations:
        exp_df = pd.DataFrame(explanations)
        if "explanation" in exp_df.columns:
            exceptions_df = exceptions_df.merge(
                exp_df[["transaction_id", "explanation"]],
                on="transaction_id",
                how="left",
            )

    col_order = [
        "transaction_id", "status", "invoice_id",
        "amount_delta", "date_delta_days", "merchant_match_score",
        "payment_status", "reason",
    ]
    if "explanation" in exceptions_df.columns:
        col_order.append("explanation")

    exceptions_df = exceptions_df[[c for c in col_order if c in exceptions_df.columns]]

    filepath = OUTPUT_DIR / "exception_report.csv"
    exceptions_df.to_csv(filepath, index=False)

    return str(filepath)


def save_duplicate_report(
    results: List[ReconciliationResult],
) -> str:
    """
    Save duplicate records to CSV.
    Returns the file path.
    """

    df = results_to_dataframe(results)
    dups_df = df[df["status"] == STATUS_DUPLICATE].copy()

    filepath = OUTPUT_DIR / "duplicate_report.csv"
    dups_df.to_csv(filepath, index=False)

    return str(filepath)


# --------------------------------------------------
# 2. Cash Position Analysis
# --------------------------------------------------

def compute_cash_position(
    results: List[ReconciliationResult],
    bank: pd.DataFrame,
    payments: pd.DataFrame,
) -> dict:
    """
    Compute a comprehensive cash position summary using reconciliation results,
    bank transactions, and payment data.

    Returns a dict with dynamically calculated cash position metrics.
    """
    results_df = results_to_dataframe(results)

    # Exclude duplicates from cash analysis
    clean_results = results_df[results_df["status"] != STATUS_DUPLICATE].copy()

    # Merge bank amounts
    bank_clean = bank[~bank["transaction_id"].str.contains("_DUP", na=False)].copy()
    merged = clean_results.merge(
        bank_clean[["transaction_id", "amount"]],
        on="transaction_id",
        how="left",
    )

    # Total bank amounts by reconciliation status
    amount_by_status = {}
    for status in [STATUS_MATCH, STATUS_AMOUNT_MISMATCH, STATUS_DATE_MISMATCH, STATUS_MISSING_INVOICE]:
        sub_df = merged[merged["status"] == status]
        amount_by_status[status] = float(sub_df["amount"].sum()) if len(sub_df) > 0 else 0.0

    total_bank = float(bank_clean["amount"].sum()) if len(bank_clean) > 0 else 0.0
    matched_amount = amount_by_status.get(STATUS_MATCH, 0.0)
    missing_invoice_amount = amount_by_status.get(STATUS_MISSING_INVOICE, 0.0)

    # Total variance from amount mismatches (|bank - invoice|)
    total_variance = sum(
        abs(r.amount_delta) for r in results
        if r.status == STATUS_AMOUNT_MISMATCH and r.amount_delta is not None
    )

    # Payment status breakdown
    settled_amount = 0.0
    pending_amount = 0.0
    has_pending_gateway = False

    for r in results:
        if r.status == STATUS_DUPLICATE:
            continue
        bank_row = bank_clean[bank_clean["transaction_id"] == r.transaction_id]
        if len(bank_row) > 0:
            amt = float(bank_row.iloc[0]["amount"])
            if r.payment_status == "settled":
                settled_amount += amt
            elif r.payment_status == "pending":
                pending_amount += amt
                has_pending_gateway = True

    # If pending_amount was 0 because no explicit payment gateway file was provided (2-file upload),
    # pending money reflects bank cash paid out without invoice verification (missing invoices)
    if pending_amount == 0.0 and missing_invoice_amount > 0:
        effective_pending_amount = missing_invoice_amount
        effective_settled_amount = max(0.0, total_bank - missing_invoice_amount)
    else:
        effective_pending_amount = pending_amount
        effective_settled_amount = settled_amount if settled_amount > 0 else max(0.0, total_bank - effective_pending_amount)

    matched_percentage = (
        (matched_amount / total_bank * 100) if total_bank > 0 else 0.0
    )

    return {
        "total_bank_amount": total_bank,
        "amount_by_status": amount_by_status,
        "settled_amount": effective_settled_amount,
        "pending_amount": effective_pending_amount,
        "missing_invoice_amount": missing_invoice_amount,
        "total_variance": total_variance,
        "matched_amount": matched_amount,
        "matched_percentage": matched_percentage,
    }


# --------------------------------------------------
# 3. Final Console Report
# --------------------------------------------------

def print_final_report(
    results: List[ReconciliationResult],
    metrics: dict,
    cash_position: dict,
    executive_summary: Optional[str] = None,
    report_paths: Optional[dict] = None,
    elapsed: Optional[float] = None,
    verbose: bool = True,
):
    """Print a clean, structured final report to console."""

    if not verbose:
        return

    total = len(results)
    status_counts = {}
    for r in results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    print("\n")
    print("=" * 60)
    print("       RECONCILIATION REPORT")
    print(f"       {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Match rate
    match_count = status_counts.get(STATUS_MATCH, 0)
    non_dup_total = total - status_counts.get(STATUS_DUPLICATE, 0)
    match_rate = (match_count / non_dup_total * 100) if non_dup_total > 0 else 0

    print(f"\n  THROUGHPUT")
    if elapsed is not None and elapsed > 0:
        print(f"  Processed {total} records in {elapsed:.3f}s ({total / elapsed:.0f} records/sec)")
        print(f"  {'Reconciliation speed':<32}: {total / elapsed:,.0f} records/sec")
        print(f"  {'Elapsed execution time':<32}: {elapsed:.3f}s")
    print(f"  {'Total records processed':<32}: {total:>8}")
    print(f"  {'Duplicates detected & removed':<32}: {status_counts.get(STATUS_DUPLICATE, 0):>8}")
    print(f"  {'Clean records evaluated':<32}: {non_dup_total:>8}")

    print(f"\n  MATCH RATE")
    print(f"  {'Matched':<32}: {match_count:>8}  ({match_rate:.1f}%)")
    print(f"  {'Exceptions':<32}: {non_dup_total - match_count:>8}  ({100 - match_rate:.1f}%)")

    print(f"\n  ACCURACY vs GROUND TRUTH")
    print(f"  {'Overall':<32}: {metrics['correct']}/{metrics['total']}  ({metrics['accuracy']:.1f}%)")
    for status, m in sorted(metrics["categories"].items()):
        print(f"  {status:<32}: {m['correct']}/{m['total']}  ({m['accuracy']:.1f}%)")

    print(f"\n  EXCEPTION BREAKDOWN")
    for status in [STATUS_AMOUNT_MISMATCH, STATUS_DATE_MISMATCH, STATUS_MISSING_INVOICE]:
        count = status_counts.get(status, 0)
        print(f"  {status:<32}: {count:>8}")

    print(f"\n  CASH POSITION")
    print(f"  {'Total bank amount':<32}: Rs.{cash_position['total_bank_amount']:>12,.0f}")
    print(f"  {'Matched (reconciled)':<32}: Rs.{cash_position['matched_amount']:>12,.0f}  ({cash_position['matched_percentage']:.1f}%)")
    print(f"  {'Settled payments':<32}: Rs.{cash_position['settled_amount']:>12,.0f}")
    print(f"  {'Pending payments':<32}: Rs.{cash_position['pending_amount']:>12,.0f}")
    print(f"  {'Amount variance (mismatches)':<32}: Rs.{cash_position['total_variance']:>12,.0f}")

    if executive_summary:
        print(f"\n  EXECUTIVE SUMMARY")
        # Normalize non-ASCII currency symbol for Windows console compatibility
        safe_summary = executive_summary.replace("₹", "Rs.")
        words = safe_summary.split()
        line = "  "
        for word in words:
            if len(line) + len(word) + 1 > 70:
                print(line)
                line = "  " + word
            else:
                line += " " + word if line.strip() else "  " + word
        if line.strip():
            print(line)

    if report_paths:
        print(f"\n  OUTPUT FILES")
        for name, path in report_paths.items():
            print(f"  {name:<32}: {path}")

    print("\n" + "=" * 60)
