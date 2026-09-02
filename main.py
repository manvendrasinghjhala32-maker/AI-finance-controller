"""
AI Finance Controller — Entry Point

Usage:
    python main.py
"""

from src.config import (
    BANK_TRANSACTIONS_FILE,
    INVOICES_FILE,
    PAYMENTS_FILE,
    GROUND_TRUTH_FILE,
    GOOGLE_API_KEY,
)
from src.ingestion import load_all_data
from src.reconciler import reconcile, measure_accuracy
from src.agent import explain_exceptions, generate_executive_summary, ask_question
from src.reporter import (
    save_reconciliation_report,
    save_exception_report,
    save_duplicate_report,
    compute_cash_position,
    print_final_report,
)


def main():
    print("=" * 50)
    print("  AI Finance Controller")
    print("=" * 50)

    # --------------------------------------------------
    # Phase 1: Verify data files exist
    # --------------------------------------------------

    files = {
        "Bank Transactions": BANK_TRANSACTIONS_FILE,
        "Invoices": INVOICES_FILE,
        "Payments": PAYMENTS_FILE,
        "Ground Truth": GROUND_TRUTH_FILE,
    }

    print("\n--- Data Files ---")
    all_found = True
    for name, path in files.items():
        exists = path.exists()
        status = "[OK]" if exists else "[MISSING]"
        print(f"  {status}  {name}")
        if not exists:
            all_found = False

    if not all_found:
        print("\n[ERROR] Some data files are missing. Cannot proceed.")
        return

    # --------------------------------------------------
    # Phase 2: Data Ingestion & Validation
    # --------------------------------------------------

    bank, invoices, payments, ground_truth = load_all_data(verbose=True)

    # --------------------------------------------------
    # Phase 3: Reconciliation Engine
    # --------------------------------------------------

    results = reconcile(bank, invoices, payments, verbose=True)
    metrics = measure_accuracy(results, ground_truth, verbose=True)

    # --------------------------------------------------
    # Phase 4: AI Agent Layer
    # --------------------------------------------------

    explanations = None
    executive_summary = None

    if not GOOGLE_API_KEY:
        print("\n--- Phase 4: AI Agent Layer ---")
        print("  [SKIP] No GOOGLE_API_KEY found in .env")
        print("  Copy .env.example to .env and add your Gemini API key.")
        print("  Get one free at: https://aistudio.google.com/apikey")
    else:
        # 4a. Explain exceptions
        explanations = explain_exceptions(results, verbose=True)

        # 4b. Executive summary
        executive_summary = generate_executive_summary(results, verbose=True)

        # 4c. Sample Q&A
        print("\n--- Settlement Q&A ---")
        sample_questions = [
            "Which transactions have pending payments and also have exceptions?",
            "What is the total amount variance from amount mismatches?",
        ]
        for q in sample_questions:
            ask_question(q, results, verbose=True)

    # --------------------------------------------------
    # Phase 5: Reporting & Metrics
    # --------------------------------------------------

    # 5a. Save CSV reports
    rec_path = save_reconciliation_report(results)
    exc_path = save_exception_report(results, explanations)
    dup_path = save_duplicate_report(results)

    report_paths = {
        "Full Reconciliation CSV": rec_path,
        "Exceptions CSV": exc_path,
        "Duplicates CSV": dup_path,
    }

    # 5b. Compute Cash Position
    cash_position = compute_cash_position(results, bank, payments)

    # 5c. Print Final Structured Console Report
    print_final_report(
        results=results,
        metrics=metrics,
        cash_position=cash_position,
        executive_summary=executive_summary,
        report_paths=report_paths,
        verbose=True,
    )


if __name__ == "__main__":
    main()
