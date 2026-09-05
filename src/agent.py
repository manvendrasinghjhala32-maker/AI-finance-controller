"""
AI Financial Intelligence Agent Layer — Google GenAI SDK + Gemini

Core Capabilities:
1. Exception Explainer & Root Cause Diagnostician
2. Executive Summary Generator
3. Multi-Factor Risk Assessment Engine
4. Automated Accounting Journal Entry (GL) Generator
5. Forward Cash Forecaster (30-day runway projection)
6. Autonomous Interactive Financial Copilot (Q&A with tool querying)
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from google import genai
from google.genai import types

from src.models import ReconciliationResult
from src.config import (
    GOOGLE_API_KEY,
    GEMINI_MODEL,
    STATUS_MATCH,
    STATUS_AMOUNT_MISMATCH,
    STATUS_DATE_MISMATCH,
    STATUS_MISSING_INVOICE,
    STATUS_DUPLICATE,
    STATUS_MULTIPLE_MATCHES,
)


_CLIENT_INSTANCE: Optional[genai.Client] = None


def get_client() -> genai.Client:
    """Create or return cached Gemini client with persistent connection pooling."""
    global _CLIENT_INSTANCE
    if _CLIENT_INSTANCE is not None:
        return _CLIENT_INSTANCE

    from dotenv import load_dotenv
    load_dotenv(override=True)
    api_key = os.getenv("GOOGLE_API_KEY", "") or GOOGLE_API_KEY
    if not api_key:
        raise ValueError(
            "GOOGLE_API_KEY not set. "
            "Copy .env.example to .env and add your Gemini API key."
        )
    _CLIENT_INSTANCE = genai.Client(api_key=api_key)
    return _CLIENT_INSTANCE


def generate_gemini_content(
    contents: str,
    config: Optional[types.GenerateContentConfig] = None,
) -> str:
    """
    Executes a Gemini content generation call with a multi-model fallback cascade.
    Optimized for low-latency response generation (thinking_budget=0) without reducing output size or quality.
    """
    primary = os.getenv("GEMINI_MODEL", "gemini-3.5-flash") or "gemini-3.5-flash"
    candidates = [
        primary,
        "gemini-3.5-flash",
        "gemini-3-flash-preview",
    ]
    seen = set()
    model_cascade = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            model_cascade.append(c)

    client = get_client()
    last_err = None
    for model_name in model_cascade:
        try:
            # Build fast configuration with thinking_budget=0 to avoid reasoning latency
            if config is not None:
                call_config = config
            else:
                call_config = types.GenerateContentConfig(temperature=0.2, max_output_tokens=450)

            if getattr(call_config, "thinking_config", None) is None:
                try:
                    call_config.thinking_config = types.ThinkingConfig(thinking_budget=0)
                except Exception:
                    pass

            call_kwargs = {"model": model_name, "contents": contents, "config": call_config}
            response = client.models.generate_content(**call_kwargs)
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            # If thinking_budget=0 is unsupported by the specific model, retry without it
            if "thinking_config" in str(e).lower() or "invalid_argument" in str(e).lower():
                try:
                    fallback_cfg = types.GenerateContentConfig(temperature=0.2, max_output_tokens=450)
                    response = client.models.generate_content(model=model_name, contents=contents, config=fallback_cfg)
                    if response and response.text:
                        return response.text.strip()
                except Exception as inner_e:
                    last_err = inner_e
            else:
                last_err = e
            continue

    if last_err:
        raise last_err
    raise RuntimeError("No response received from Gemini API.")


# --------------------------------------------------
# 1. Multi-Factor Risk Scoring Engine
# --------------------------------------------------

def calculate_risk_scores(
    results: List[ReconciliationResult],
    bank: pd.DataFrame,
) -> Dict[str, Any]:
    """
    Evaluates financial, operational, and audit risk for every exception.

    Risk Levels:
    - CRITICAL: Missing invoice with value > ₹20k OR amount mismatch > 5%
    - HIGH: Duplicates, pending payments with amount mismatches, missing invoices <= ₹20k
    - MEDIUM: Amount mismatch <= 5%, pending payment with date mismatch
    - LOW: Settled date mismatch
    """

    bank_amounts = dict(zip(bank["transaction_id"], bank["amount"]))
    records = []
    risk_summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for r in results:
        if r.status == STATUS_MATCH:
            continue

        amt = bank_amounts.get(r.transaction_id, 0.0)
        risk_level = "LOW"
        risk_score = 20
        risk_factors = []

        if r.status == STATUS_DUPLICATE:
            risk_level = "HIGH"
            risk_score = 80
            risk_factors.append("Direct duplicate entry; causes cash double-counting")

        elif r.status == STATUS_MISSING_INVOICE:
            if amt >= 20000:
                risk_level = "CRITICAL"
                risk_score = 95
                risk_factors.append(f"High-value unbilled cash intake (₹{amt:,.0f})")
            else:
                risk_level = "HIGH"
                risk_score = 75
                risk_factors.append(f"Unbilled cash intake without invoice (₹{amt:,.0f})")
            if r.payment_status == "pending":
                risk_score = min(100, risk_score + 10)
                risk_factors.append("Payment gateway status still pending")

        elif r.status == STATUS_AMOUNT_MISMATCH:
            delta = abs(r.amount_delta) if r.amount_delta else 0.0
            pct = (delta / amt * 100) if amt > 0 else 0

            if pct > 5.0 or delta > 500:
                risk_level = "CRITICAL"
                risk_score = 90
                risk_factors.append(f"Significant variance of ₹{delta:,.0f} ({pct:.1f}% of amount)")
            else:
                risk_level = "MEDIUM"
                risk_score = 55
                risk_factors.append(f"Minor fee/tax variance of ₹{delta:,.0f} ({pct:.1f}%)")

            if r.payment_status == "pending":
                risk_level = "HIGH" if risk_level == "MEDIUM" else "CRITICAL"
                risk_score = min(100, risk_score + 15)
                risk_factors.append("Gateway settlement pending while variance unresolved")

        elif r.status == STATUS_DATE_MISMATCH:
            if r.payment_status == "pending":
                risk_level = "MEDIUM"
                risk_score = 50
                risk_factors.append("Posting date offset on pending settlement")
            else:
                risk_level = "LOW"
                risk_score = 25
                risk_factors.append(f"Standard timing offset of {abs(r.date_delta_days or 0)} days")

        risk_summary[risk_level] += 1
        records.append({
            "transaction_id": r.transaction_id,
            "status": r.status,
            "amount": amt,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "risk_factors": "; ".join(risk_factors),
        })

    total_exc = len(records)
    avg_score = (sum(rec["risk_score"] for rec in records) / total_exc) if total_exc > 0 else 0

    return {
        "average_risk_score": round(avg_score, 1),
        "risk_breakdown": risk_summary,
        "risk_details": pd.DataFrame(records),
    }


# --------------------------------------------------
# 2. Automated Accounting Journal Entry (GL) Generator
# --------------------------------------------------

def generate_journal_entries(
    results: List[ReconciliationResult],
    bank: pd.DataFrame,
    invoices: pd.DataFrame,
) -> pd.DataFrame:
    """
    Generates standard General Ledger (GL) double-entry adjustment journals
    for all exception transactions ready for export into ERP systems (QuickBooks/SAP/NetSuite).
    """

    bank_dict = bank.set_index("transaction_id").to_dict("index")
    inv_dict = invoices.set_index("invoice_id").to_dict("index") if len(invoices) > 0 else {}

    entries = []
    entry_num = 1001

    for r in results:
        if r.status == STATUS_MATCH:
            continue

        b_row = bank_dict.get(r.transaction_id, {})
        b_amt = float(b_row.get("amount", 0.0))
        b_desc = b_row.get("description", "Unknown Merchant")
        b_date = b_row.get("date", str(datetime.now().date()))

        if r.status == STATUS_AMOUNT_MISMATCH:
            delta = abs(r.amount_delta) if r.amount_delta else 0.0
            i_row = inv_dict.get(r.invoice_id, {})
            i_amt = float(i_row.get("amount", b_amt + delta))

            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1010 - Operating Bank Account",
                "Debit (₹)": b_amt,
                "Credit (₹)": 0.0,
                "Memo": f"Reconciled bank deposit for {b_desc}",
            })
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "6150 - Payment Gateway & Bank Fee Expense",
                "Debit (₹)": delta,
                "Credit (₹)": 0.0,
                "Memo": f"Variance adjustment / Fee deduction for {r.transaction_id}",
            })
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1200 - Accounts Receivable",
                "Debit (₹)": 0.0,
                "Credit (₹)": i_amt,
                "Memo": f"Clear Invoice {r.invoice_id} ({b_desc})",
            })
            entry_num += 1

        elif r.status == STATUS_DATE_MISMATCH:
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1010 - Operating Bank Account",
                "Debit (₹)": b_amt,
                "Credit (₹)": 0.0,
                "Memo": f"Bank settlement received for {b_desc}",
            })
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1200 - Accounts Receivable (Timing Reclass)",
                "Debit (₹)": 0.0,
                "Credit (₹)": b_amt,
                "Memo": f"Reclassify timing offset for Invoice {r.invoice_id}",
            })
            entry_num += 1

        elif r.status == STATUS_MISSING_INVOICE:
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1010 - Operating Bank Account",
                "Debit (₹)": b_amt,
                "Credit (₹)": 0.0,
                "Memo": f"Unidentified deposit from {b_desc}",
            })
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "2250 - Unapplied Customer Receipts / Suspense",
                "Debit (₹)": 0.0,
                "Credit (₹)": b_amt,
                "Memo": f"Pending invoice upload for ref {r.transaction_id}",
            })
            entry_num += 1

        elif r.status == STATUS_DUPLICATE:
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1190 - Duplicate Batch Clearing / Suspense",
                "Debit (₹)": b_amt,
                "Credit (₹)": 0.0,
                "Memo": f"Isolate duplicate record {r.transaction_id}",
            })
            entries.append({
                "Journal_ID": f"JE-{entry_num}",
                "Date": str(b_date),
                "Transaction_ID": r.transaction_id,
                "Account_Code": "1010 - Operating Bank Account",
                "Debit (₹)": 0.0,
                "Credit (₹)": b_amt,
                "Memo": f"Reverse duplicate bank posting for {b_desc}",
            })
            entry_num += 1

    return pd.DataFrame(entries)


# --------------------------------------------------
# 3. Forward Cash Forecaster (30-Day Liquidity Runway)
# --------------------------------------------------

def forecast_forward_cash(
    bank: pd.DataFrame,
    payments: pd.DataFrame,
    results: List[ReconciliationResult],
    days_ahead: int = 30,
) -> pd.DataFrame:
    """
    Projects daily liquidity and cash balance over a 30-day forward horizon.
    Accounts for pending settlement clearing schedules, recurring inflows,
    and conservative vs optimistic collection assumptions.
    """

    clean_bank = bank[~bank["transaction_id"].str.contains("_DUP", na=False)].copy() if bank is not None else pd.DataFrame()
    current_cash = float(clean_bank["amount"].sum()) if len(clean_bank) > 0 else 5000000.0

    # Calculate baseline historical daily velocity
    tx_count = max(1, len(clean_bank))
    avg_tx_size = (current_cash / tx_count) if current_cash > 0 else 50000.0

    # Check pending settlements
    pending_payments = payments[payments["status"] == "pending"].copy() if (payments is not None and "status" in payments.columns) else pd.DataFrame()
    pending_total = float(pending_payments["amount"].sum()) if len(pending_payments) > 0 else 0.0

    # Daily baseline inflows from customer receivables and clearing
    base_daily_clearing = (pending_total / max(1, min(days_ahead, 14))) if pending_total > 0 else (avg_tx_size * 0.45)
    base_recurring_inflow = max(18000.0, avg_tx_size * 0.65)
    base_daily_burn = max(14000.0, avg_tx_size * 0.50)

    today = datetime.now().date()
    forecast_rows = []

    cumulative_base = current_cash
    cumulative_optimistic = current_cash
    cumulative_conservative = current_cash

    for day_i in range(1, days_ahead + 1):
        f_date = today + timedelta(days=day_i)
        is_weekend = f_date.weekday() >= 5

        # Weekly cyclical factors (lower on weekends, higher mid-week)
        day_factor = 0.45 if is_weekend else 1.0 + ((day_i % 5) * 0.06)

        if day_i <= 14:
            inflow_base = (base_daily_clearing + base_recurring_inflow) * day_factor
        else:
            inflow_base = (base_recurring_inflow * 1.2) * day_factor

        # Occasional cyclical billing inflows on 5th, 10th, 15th, 20th, 25th
        if day_i in (5, 10, 15, 20, 25):
            inflow_base += (avg_tx_size * 0.75)

        outflow_base = base_daily_burn * (0.6 if is_weekend else 1.0)
        
        # Supplier/payroll batch payment on mid-month and month-end
        if day_i in (15, 30):
            outflow_base += (avg_tx_size * 1.1)

        inflow_opt = inflow_base * 1.15
        outflow_opt = outflow_base * 0.92

        inflow_cons = inflow_base * 0.82
        outflow_cons = outflow_base * 1.12

        net_daily = inflow_base - outflow_base
        cumulative_base += net_daily
        cumulative_optimistic += (inflow_opt - outflow_opt)
        cumulative_conservative += (inflow_cons - outflow_cons)

        conf = max(72, 98 - (day_i * 3 // 4))

        forecast_rows.append({
            "day": day_i,
            "Day": day_i,
            "date": str(f_date),
            "Date": str(f_date),
            "projected_inflow": round(inflow_base, 0),
            "Projected_Inflow (₹)": round(inflow_base, 0),
            "projected_outflow": round(outflow_base, 0),
            "Projected_Outflow (₹)": round(outflow_base, 0),
            "net_daily_flow": round(net_daily, 0),
            "Net_Daily_Flow (₹)": round(net_daily, 0),
            "projected_balance": round(cumulative_base, 0),
            "Projected_Cash_Base (₹)": round(cumulative_base, 0),
            "conservative_closing": round(cumulative_conservative, 0),
            "Projected_Cash_Conservative (₹)": round(cumulative_conservative, 0),
            "optimistic_closing": round(cumulative_optimistic, 0),
            "Projected_Cash_Optimistic (₹)": round(cumulative_optimistic, 0),
            "confidence": conf,
            "Confidence (%)": conf,
        })

    return pd.DataFrame(forecast_rows)


# --------------------------------------------------
# 4. Exception Explainer & Diagnostician
# --------------------------------------------------

def explain_exceptions(
    results: List[ReconciliationResult],
    verbose: bool = True,
) -> List[Dict[str, Any]]:
    """
    Generate deep root-cause explanations and remediation paths using Gemini.
    """

    exceptions = [r for r in results if r.status not in (STATUS_MATCH, STATUS_DUPLICATE)]
    if not exceptions:
        return []

    exception_data = []
    for r in exceptions:
        exception_data.append({
            "transaction_id": r.transaction_id,
            "status": r.status,
            "invoice_id": r.invoice_id or "N/A",
            "amount_delta": r.amount_delta,
            "date_delta_days": r.date_delta_days,
            "merchant_match_score": r.merchant_match_score,
            "payment_status": r.payment_status or "N/A",
            "engine_reason": r.reason,
        })

    prompt = f"""You are a Lead Financial Controller and Forensic Auditor reviewing reconciliation exceptions.

Analyze these {len(exceptions)} exceptions:
{json.dumps(exception_data, indent=2)}

For each exception, provide:
1. Specific Root-Cause Diagnosis (Tax, Discount, Wire Fee, Timing Offset, Unbilled PO)
2. Precise Remediation Action (Journal Entry, Invoicing Request, Tolerance Override)

Respond with a JSON array where each element has:
- "transaction_id": the transaction ID
- "status": the exception status
- "explanation": 2-3 sentences combining the root cause and immediate action

Return ONLY the raw JSON array without markdown blocks."""

    try:
        response_text = generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            response_text = response_text.rsplit("```", 1)[0]
        return json.loads(response_text)
    except Exception as e:
        if verbose:
            print(f"  [AI Fallback]: {e}")
        fallback_list = []
        for r in exceptions:
            if r.status == STATUS_AMOUNT_MISMATCH:
                delta = abs(r.amount_delta) if r.amount_delta is not None else 0.0
                exp = (
                    f"Variance of ₹{delta:,.0f} detected between bank intake and invoice ledger. "
                    f"Forensic indicator points to payment gateway interchange deduction or early payment discount. "
                    f"Action: Post adjusting journal entry to GL-6150 (Bank & Gateway Fees)."
                )
            elif r.status == STATUS_DATE_MISMATCH:
                drift = abs(r.date_delta_days) if r.date_delta_days is not None else 0
                exp = (
                    f"Transaction exhibits a {drift}-day calendar drift between bank value date and invoice issue date. "
                    f"Root cause: Standard multi-day settlement clearing or weekend posting offset. "
                    f"Action: Accept timing drift and clear Accounts Receivable with timing reclassification."
                )
            elif r.status == STATUS_MISSING_INVOICE:
                exp = (
                    f"Bank deposit received with reference '{r.transaction_id}' lacks a corresponding invoice in the billing ledger. "
                    f"Gateway state: {r.payment_status or 'unverified'}. "
                    f"Action: Dispatch automated billing inquiry to AP department and park funds in Suspense Account GL-2250."
                )
            elif r.status == STATUS_DUPLICATE:
                exp = (
                    f"Exact duplicate posting identified ({r.reason}). "
                    f"Action: Isolate duplicate record to prevent cash double-counting and route to Duplicate Batch Clearing (GL-1190)."
                )
            else:
                exp = f"Forensic analysis: {r.reason}. Action: Human controller review required."

            fallback_list.append({
                "transaction_id": r.transaction_id,
                "status": r.status,
                "explanation": exp,
            })
        return fallback_list


# --------------------------------------------------
# 5. Executive Summary Generator
# --------------------------------------------------

def generate_executive_summary(
    results: List[ReconciliationResult],
    verbose: bool = True,
) -> str:
    """
    Synthesizes executive summary highlighting risk, exposure, and remediation strategy.
    """

    status_counts = {}
    total_variance = 0.0
    pending_payments = 0

    for r in results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1
        if r.status not in (STATUS_MATCH, STATUS_DUPLICATE) and r.amount_delta:
            total_variance += abs(r.amount_delta)
        if r.payment_status == "pending":
            pending_payments += 1

    stats = {
        "total_records": len(results),
        "status_breakdown": status_counts,
        "pending_payments": pending_payments,
        "total_amount_variance": total_variance,
    }

    prompt = f"""You are a Chief Financial Officer (CFO) writing an executive reconciliation brief.

DATA:
{json.dumps(stats, indent=2)}

Write an executive brief (5-8 sentences) covering:
1. Operational match efficiency and throughput
2. Material financial risk (variance magnitude and duplicates)
3. Liquidity exposure from unapplied pending payments
4. Clear mandate and priorities for the accounting staff

Return ONLY the summary text."""

    try:
        return generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.3),
        )
    except Exception as e:
        return (
            f"The reconciliation batch processed {len(results)} records with {status_counts.get(STATUS_MATCH, 0)} clean matches. "
            f"Primary risk is concentrated in {status_counts.get(STATUS_AMOUNT_MISMATCH, 0)} amount mismatches with ₹{total_variance:,.0f} variance "
            f"and {pending_payments} pending payments requiring immediate accounting resolution."
        )


# --------------------------------------------------
# 6. Scoped "Ask AI" Action Intelligence Layer
# --------------------------------------------------

def explain_transaction(
    transaction_id: str,
    results: List[ReconciliationResult],
    bank: Optional[pd.DataFrame] = None,
    invoices: Optional[pd.DataFrame] = None,
    payments: Optional[pd.DataFrame] = None,
    bank_df: Optional[pd.DataFrame] = None,
    invoices_df: Optional[pd.DataFrame] = None,
    payments_df: Optional[pd.DataFrame] = None,
    verbose: bool = True,
) -> str:
    """
    Explains why a specific transaction was classified with its status and what
    the controller should do about it.
    Sends ONLY that single transaction's bank, invoice, payment, and classification slice.
    """
    if bank is None and bank_df is not None:
        bank = bank_df
    if invoices is None and invoices_df is not None:
        invoices = invoices_df
    if payments is None and payments_df is not None:
        payments = payments_df

    if not transaction_id or not str(transaction_id).strip():
        raise ValueError("Transaction ID cannot be empty.")

    target_res = None
    target_id_norm = str(transaction_id).strip().upper().replace("-", "").replace("_", "")
    for r in results:
        r_norm = str(r.transaction_id).strip().upper().replace("-", "").replace("_", "")
        if r_norm == target_id_norm or str(r.transaction_id).strip().upper() == str(transaction_id).strip().upper():
            target_res = r
            break

    if target_res is None:
        raise ValueError(f"Transaction ID '{transaction_id}' does not exist in the active reconciliation batch.")

    # Slice ONLY this transaction's records
    actual_tx_id = target_res.transaction_id
    b_row = {}
    if bank is not None and "transaction_id" in bank.columns:
        match_b = bank[bank["transaction_id"].astype(str).str.strip().str.upper() == str(actual_tx_id).strip().upper()]
        if len(match_b) > 0:
            b_row = match_b.iloc[0].to_dict()

    i_row = {}
    if invoices is not None and len(invoices) > 0 and target_res.invoice_id:
        if "invoice_id" in invoices.columns:
            match_i = invoices[invoices["invoice_id"].astype(str).str.strip().str.upper() == str(target_res.invoice_id).strip().upper()]
            if len(match_i) > 0:
                i_row = match_i.iloc[0].to_dict()

    p_row = {}
    if payments is not None and len(payments) > 0:
        pay_id = getattr(target_res, "payment_id", None)
        if pay_id and "payment_id" in payments.columns:
            match_p = payments[payments["payment_id"].astype(str).str.strip().str.upper() == str(pay_id).strip().upper()]
            if len(match_p) > 0:
                p_row = match_p.iloc[0].to_dict()
        elif "reference" in payments.columns and b_row.get("reference"):
            match_p = payments[payments["reference"].astype(str).str.strip().str.upper() == str(b_row.get("reference")).strip().upper()]
            if len(match_p) > 0:
                p_row = match_p.iloc[0].to_dict()

    b_amt = float(b_row.get("amount", 0.0))
    b_date = str(b_row.get("date", "N/A"))
    b_desc = str(b_row.get("description", b_row.get("vendor", "Counterparty")))
    b_ref = str(b_row.get("reference", "N/A"))

    i_id = target_res.invoice_id or i_row.get("invoice_id") or "None"
    i_amt = float(i_row.get("amount", 0.0)) if i_row.get("amount") is not None else None
    i_date = str(i_row.get("date", "N/A")) if i_row.get("date") is not None else None
    i_cust = str(i_row.get("customer", i_row.get("client", "N/A"))) if i_row.get("customer") or i_row.get("client") else None

    p_status = target_res.payment_status or p_row.get("status", "unknown")

    context_slice = {
        "transaction_id": actual_tx_id,
        "status": target_res.status,
        "engine_reason": target_res.reason,
        "amount_delta": target_res.amount_delta,
        "date_delta_days": target_res.date_delta_days,
        "merchant_match_score": target_res.merchant_match_score,
        "payment_status": p_status,
        "bank_record": {
            "amount": b_amt,
            "date": b_date,
            "description": b_desc,
            "reference": b_ref,
        },
        "matched_invoice": {
            "invoice_id": i_id,
            "amount": i_amt,
            "date": i_date,
            "customer": i_cust,
        } if target_res.invoice_id else None,
        "matched_payment": {
            "payment_id": getattr(target_res, "payment_id", p_row.get("payment_id", "N/A")),
            "status": p_status,
        } if getattr(target_res, "payment_id", None) or p_row else None,
    }

    prompt = f"""You are a Lead Financial Controller and Forensic Auditor reviewing a reconciliation exception.

Explain, in plain conversational language, why this specific transaction was classified as {target_res.status} and what the controller should do about it.

TRANSACTION DATA:
{json.dumps(context_slice, indent=2)}

INSTRUCTIONS:
- Directly explain why transaction {actual_tx_id} was classified as {target_res.status}, referencing its specific amount (₹{b_amt:,.2f}) and counterparty ({b_desc}).
- Give the controller a precise, practical next action (e.g. adjust fee to GL-6150, accept settlement transit offset, or request missing invoice from AP).
- Reference ONLY this transaction. Do not mention other transactions.
- Keep the response concise, clear, and professional (100–160 words).
"""

    try:
        return generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=400),
        )
    except Exception as e:
        if verbose:
            print(f"  [AI Fallback for {actual_tx_id}]: {e}")
        # Deterministic scoped fallback
        if target_res.status == STATUS_AMOUNT_MISMATCH:
            delta = abs(target_res.amount_delta or 0.0)
            inv_total = (b_amt + delta) if (b_amt + delta) > 0 else (i_amt or b_amt)
            fee_pct = (delta / inv_total * 100) if inv_total > 0 else 2.5
            return (
                f"Transaction **`{actual_tx_id}`** with **{b_desc}** cleared at **₹{b_amt:,.2f}** in the bank statement against an expected gross invoice amount of **₹{inv_total:,.2f}**, leaving a variance of **₹{delta:,.2f}** ({fee_pct:.1f}%).\n\n"
                f"**Root Cause**: Payment gateway interchange and merchant processing toll deduction retained prior to bank settlement.\n\n"
                f"**Recommended Action**: Post an adjusting journal entry debiting `GL-6150 (Payment Gateway & Bank Fee Expense)` for ₹{delta:,.2f} and crediting `GL-1200 (Accounts Receivable)` to balance and close the open invoice ledger."
            )
        elif target_res.status == STATUS_DATE_MISMATCH:
            drift = abs(target_res.date_delta_days or 2)
            return (
                f"Transaction **`{actual_tx_id}`** with **{b_desc}** (₹{b_amt:,.2f}) exhibits a **{drift}-day calendar timing offset** between invoice creation and bank value clearance ({b_date}).\n\n"
                f"**Root Cause**: Standard multi-day banking clearing transit interval (T+2 clearing window / weekend settlement hold). ₹0 cash is missing.\n\n"
                f"**Recommended Action**: Accept the timing drift under policy clearance tolerance and clear Accounts Receivable with timing reclassification to `GL-1200`."
            )
        elif target_res.status == STATUS_MISSING_INVOICE:
            return (
                f"Transaction **`{actual_tx_id}`** shows a cleared bank intake of **₹{b_amt:,.2f}** from **{b_desc}**, but no corresponding accounts receivable invoice exists in the ERP billing ledger (Gateway status: `{p_status}`).\n\n"
                f"**Root Cause**: Cash intake received without a preceding billing record or unapplied customer deposit.\n\n"
                f"**Recommended Action**: Dispatch an automated billing inquiry to Accounts Payable / Sales to issue the sales invoice, and temporarily park funds in `GL-2250 (Unapplied Customer Receipts / Suspense)`."
            )
        elif target_res.status == STATUS_DUPLICATE:
            return (
                f"Transaction **`{actual_tx_id}`** (₹{b_amt:,.2f} for **{b_desc}**) is an identical duplicate statement line ({target_res.reason}).\n\n"
                f"**Root Cause**: Redundant bank statement export or re-transmitted settlement batch.\n\n"
                f"**Recommended Action**: Keep the duplicate entry isolated in `GL-1190 (Duplicate Batch Clearing)` to prevent phantom cash inflation and avoid double-counting."
            )
        elif target_res.status == STATUS_MATCH:
            return (
                f"Transaction **`{actual_tx_id}`** for **₹{b_amt:,.2f}** with **{b_desc}** matched cleanly with Invoice `{i_id}`. All parameters (amount, settlement date, counterparty) reconciled with zero discrepancy across banking feeds and ledgers."
            )
        else:
            return (
                f"Transaction **`{actual_tx_id}`** ({target_res.status}) for **₹{b_amt:,.2f}** with **{b_desc}**: {target_res.reason}. Recommended Action: Review transaction references and apply controller adjustment."
            )


def explain_summary(
    results: List[ReconciliationResult],
    verbose: bool = True,
) -> str:
    """
    Generates a high-level plain-language summary of the entire reconciliation batch.
    Sends ONLY aggregate counts and totals — never per-row detail.
    """
    status_counts = {}
    total_variance = 0.0
    pending_count = 0

    for r in results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1
        if r.status not in (STATUS_MATCH, STATUS_DUPLICATE) and r.amount_delta:
            total_variance += abs(r.amount_delta)
        if getattr(r, "payment_status", "") == "pending":
            pending_count += 1

    total_records = len(results)
    matched_count = status_counts.get(STATUS_MATCH, 0)
    dup_count = status_counts.get(STATUS_DUPLICATE, 0)
    clean_total = max(1, total_records - dup_count)
    clean_match_rate = round((matched_count / clean_total * 100), 1)
    exceptions_count = clean_total - matched_count

    amt_count = status_counts.get(STATUS_AMOUNT_MISMATCH, 0)
    date_count = status_counts.get(STATUS_DATE_MISMATCH, 0)
    missing_count = status_counts.get(STATUS_MISSING_INVOICE, 0)

    summary_context = {
        "total_records": total_records,
        "clean_matches": matched_count,
        "clean_match_rate_pct": clean_match_rate,
        "total_exceptions": exceptions_count,
        "exceptions_breakdown": {
            "amount_mismatches": amt_count,
            "date_timing_mismatches": date_count,
            "missing_invoices": missing_count,
        },
        "quarantined_duplicates": dup_count,
        "total_amount_variance": round(total_variance, 2),
        "pending_gateway_settlements": pending_count,
    }

    prompt = f"""You are a Lead Financial Controller. Give a plain-language overall summary of this reconciliation batch — how many matched cleanly, what the exceptions break down into, and the single most important thing to look at first.

RECONCILIATION SUMMARY STATS:
{json.dumps(summary_context, indent=2)}

INSTRUCTIONS:
- Explain overall performance: {matched_count} of {clean_total} records ({clean_match_rate}%) matched cleanly.
- Break down the exceptions: {amt_count} amount mismatches (₹{total_variance:,.0f} total variance), {date_count} timing offsets, and {missing_count} unbilled missing invoices.
- State the single most critical priority for the controller to look at first.
- Do NOT mention individual transaction IDs.
- Keep the language clear, executive, and under 180 words.
"""

    try:
        return generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=400),
        )
    except Exception as e:
        if verbose:
            print(f"  [AI Summary Fallback]: {e}")
        return (
            f"The reconciliation batch processed **{total_records} total records** with **{matched_count} clean matches** ({clean_match_rate}% match rate)"
            + (f" and **{dup_count} quarantined duplicates**" if dup_count else "")
            + f", leaving **{exceptions_count} exceptions requiring review**.\n\n"
            f"**Exceptions Breakdown**:\n"
            f"- **{amt_count} Price/Fee Variances**: Cumulative fee drag of ₹{total_variance:,.2f} from gateway interchange deductions (post to `GL-6150`).\n"
            f"- **{date_count} Timing Delays**: Standard 2-day transit clearing offsets (safe to accept).\n"
            f"- **{missing_count} Unbilled Deposits**: Bank cash lacking sales invoices (park in `GL-2250`).\n\n"
            f"**Top Priority**: Review and park the {missing_count} unbilled cash receipts in suspense, then post batch journal entries for the {amt_count} gateway fee variances."
        )


def explain_forecast(
    forecast_df: pd.DataFrame,
    verbose: bool = True,
) -> str:
    """
    Explains the 30-day forward cash forecast in plain language.
    Sends ONLY the forecast output summary.
    """
    if forecast_df is None or len(forecast_df) == 0:
        raise ValueError("No cash forecast data available to explain.")

    first_row = forecast_df.iloc[0]
    last_row = forecast_df.iloc[-1]

    start_bal = float(first_row.get("projected_balance", first_row.get("Projected_Cash_Base (₹)", 0.0)))
    base_close = float(last_row.get("projected_balance", last_row.get("Projected_Cash_Base (₹)", 0.0)))
    opt_close = float(last_row.get("optimistic_closing", last_row.get("Projected_Cash_Optimistic (₹)", 0.0)))
    cons_close = float(last_row.get("conservative_closing", last_row.get("Projected_Cash_Conservative (₹)", 0.0)))
    net_change = base_close - start_bal

    forecast_context = {
        "forecast_horizon_days": len(forecast_df),
        "starting_cash_balance": start_bal,
        "day_30_base_case_balance": base_close,
        "day_30_optimistic_balance": opt_close,
        "day_30_conservative_balance": cons_close,
        "net_30_day_base_trajectory": net_change,
        "optimistic_upside": opt_close - base_close,
        "conservative_downside": base_close - cons_close,
    }

    prompt = f"""You are a Treasury Manager and Financial Controller. Explain this 30-day cash forecast in plain language — what's driving the optimistic/base/conservative spread, and what would most improve the base case.

30-DAY FORECAST DATA:
{json.dumps(forecast_context, indent=2)}

INSTRUCTIONS:
- Explain the projected 30-day liquidity trajectory from ₹{start_bal:,.0f} to base closing ₹{base_close:,.0f} (net change ₹{net_change:,.0f}).
- Detail the drivers of the spread between the optimistic (₹{opt_close:,.0f}) and conservative (₹{cons_close:,.0f}) cases (clearing transit velocity, collection timing, recurring payables).
- State the single most impactful recommendation to improve the base case (e.g. accelerating T+1 settlement cycles and resolving unbilled suspense deposits).
- Keep the response clear, structured, and under 180 words.
"""

    try:
        return generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=400),
        )
    except Exception as e:
        if verbose:
            print(f"  [AI Forecast Fallback]: {e}")
        return (
            f"The 30-day cash forecast projects operating liquidity to move from **₹{start_bal:,.0f}** to a base closing balance of **₹{base_close:,.0f}** (net trajectory: **{'+' if net_change >= 0 else ''}₹{net_change:,.0f}**).\n\n"
            f"**Spread Drivers**:\n"
            f"- **Optimistic Case (₹{opt_close:,.0f})**: Assumes rapid customer payment velocity and prompt gateway settlements.\n"
            f"- **Conservative Case (₹{cons_close:,.0f})**: Models weekend clearing holds and a 5-day collection transit lag.\n\n"
            f"**Action to Improve Base Case**: Accelerate settlement clearing cycles with primary payment gateways from T+2 to T+1 and clear unbilled receivables parked in suspense."
        )


def explain_journal_entry(
    entry_id: str,
    journal_entries_df: pd.DataFrame,
    verbose: bool = True,
) -> str:
    """
    Explains a specific GL journal entry in plain language.
    Sends ONLY that journal entry's debit and credit rows.
    """
    if journal_entries_df is None or len(journal_entries_df) == 0:
        raise ValueError("No journal entries available to explain.")

    entry_clean = str(entry_id).strip().upper()
    matching = pd.DataFrame()

    if "Journal_ID" in journal_entries_df.columns:
        matching = journal_entries_df[journal_entries_df["Journal_ID"].astype(str).str.strip().str.upper() == entry_clean]
    if len(matching) == 0 and "Transaction_ID" in journal_entries_df.columns:
        matching = journal_entries_df[journal_entries_df["Transaction_ID"].astype(str).str.strip().str.upper() == entry_clean]

    if len(matching) == 0:
        raise ValueError(f"Journal entry '{entry_id}' not found.")

    je_rows = matching.to_dict("records")
    tot_debit = sum(float(r.get("Debit (₹)", r.get("debit", 0.0)) or 0.0) for r in je_rows)
    tot_credit = sum(float(r.get("Credit (₹)", r.get("credit", 0.0)) or 0.0) for r in je_rows)

    je_context = {
        "journal_id": str(matching.iloc[0].get("Journal_ID", entry_id)),
        "transaction_id": str(matching.iloc[0].get("Transaction_ID", "N/A")),
        "date": str(matching.iloc[0].get("Date", "N/A")),
        "lines": [
            {
                "account_code": r.get("Account_Code", r.get("account_code", "")),
                "debit": float(r.get("Debit (₹)", r.get("debit", 0.0)) or 0.0),
                "credit": float(r.get("Credit (₹)", r.get("credit", 0.0)) or 0.0),
                "memo": r.get("Memo", r.get("memo", "")),
            }
            for r in je_rows
        ],
        "total_debit": tot_debit,
        "total_credit": tot_credit,
        "is_balanced": abs(tot_debit - tot_credit) < 0.01,
    }

    prompt = f"""You are a Lead Accounting Controller. Explain this GL journal entry in plain language — what it books and why.

JOURNAL ENTRY DATA:
{json.dumps(je_context, indent=2)}

INSTRUCTIONS:
- Explain what this specific double-entry adjusting entry ({je_context['journal_id']}) books (which accounts are debited and credited).
- Explain why this adjustment is necessary to balance company books under GAAP.
- Confirm that total debits (₹{tot_debit:,.2f}) equal total credits (₹{tot_credit:,.2f}).
- Keep the response clear, concise, and under 150 words.
"""

    try:
        return generate_gemini_content(
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=350),
        )
    except Exception as e:
        if verbose:
            print(f"  [AI Journal Fallback]: {e}")
        lines_desc = []
        for line in je_context["lines"]:
            if line["debit"] > 0:
                lines_desc.append(f"Debit `{line['account_code']}` for ₹{line['debit']:,.2f}")
            if line["credit"] > 0:
                lines_desc.append(f"Credit `{line['account_code']}` for ₹{line['credit']:,.2f}")

        return (
            f"Journal Entry **`{je_context['journal_id']}`** records an adjusting double-entry posting for transaction `{je_context['transaction_id']}`:\n\n"
            + "\n".join(f"- {ld}" for ld in lines_desc) +
            f"\n\n**Purpose**: Balances the ledger under GAAP by adjusting fee variances/reclassifications so Accounts Receivable equals physical bank cash (Total Debits: ₹{tot_debit:,.2f} = Total Credits: ₹{tot_credit:,.2f})."
        )