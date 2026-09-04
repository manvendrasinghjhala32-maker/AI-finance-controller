"""
AI Finance Controller — FastAPI Backend Engine
Serves high-performance reconciliation, forensic AI diagnostics, GL generation,
and real-time Co-Pilot conversational assistance to the React Command Center.
"""

import os
import io
import json
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import pandas as pd

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.config import (
    GOOGLE_API_KEY,
    GEMINI_MODEL,
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
from src.ingestion import (
    load_all_data,
    read_tabular_file,
    normalize_dataframe_columns,
    synthesize_default_payments,
)
from src.reconciler import (
    reconcile,
    measure_accuracy,
    results_to_dataframe,
    compare_amounts,
    compare_dates,
    compute_merchant_similarity,
)
from src.reporter import (
    save_reconciliation_report,
    save_exception_report,
    save_duplicate_report,
    compute_cash_position,
)
from src.agent import (
    explain_exceptions,
    generate_executive_summary,
    ask_question,
    calculate_risk_scores,
    generate_journal_entries,
    forecast_forward_cash,
)

app = FastAPI(
    title="AI Finance Controller API",
    description="Autonomous Reconciliation & Cash Operations Command API",
    version="2.0.0",
)

# CORS middleware for local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path

SESSION_CACHE_DIR = Path(__file__).parent / "data" / ".session_cache"

# In-memory Global State Store
class StateStore:
    def __init__(self):
        self.bank_df: Optional[pd.DataFrame] = None
        self.invoices_df: Optional[pd.DataFrame] = None
        self.payments_df: Optional[pd.DataFrame] = None
        self.gt_df: Optional[pd.DataFrame] = None
        self.results = None
        self.metrics = None
        self.cash_position = None
        self.risk_assessment = None
        self.journal_entries = None
        self.cash_forecast = None
        self.explanations = None
        self.executive_summary = None
        self.dataset_label: Optional[str] = None
        self.ingestion_warnings: List[str] = []
        self.resolved_overrides: Dict[str, Dict[str, Any]] = {}
        self.tolerances = {
            "amount_tolerance": AMOUNT_TOLERANCE,
            "date_tolerance": DATE_TOLERANCE_DAYS,
            "fuzzy_threshold": FUZZY_MATCH_THRESHOLD,
        }
        self.elapsed_seconds: Optional[float] = None
        self.records_per_second: Optional[float] = None

store = StateStore()


def save_session_cache():
    """Persists active session DataFrames, dataset metadata, and overrides to disk."""
    try:
        SESSION_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        if store.bank_df is not None:
            store.bank_df.to_pickle(SESSION_CACHE_DIR / "bank_df.pkl")
        if store.invoices_df is not None:
            store.invoices_df.to_pickle(SESSION_CACHE_DIR / "invoices_df.pkl")
        if store.payments_df is not None:
            store.payments_df.to_pickle(SESSION_CACHE_DIR / "payments_df.pkl")
        if store.gt_df is not None:
            store.gt_df.to_pickle(SESSION_CACHE_DIR / "gt_df.pkl")
        
        meta = {
            "dataset_label": store.dataset_label or "Uploaded Custom Dataset",
            "resolved_overrides": store.resolved_overrides,
            "tolerances": store.tolerances,
            "saved_at": datetime.now().isoformat(),
        }
        with open(SESSION_CACHE_DIR / "meta.json", "w", encoding="utf-8") as f:
            json.dump(meta, f)
    except Exception as e:
        print(f"Warning: Failed to save session cache: {e}")


def load_session_cache() -> bool:
    """Restores active session from disk if previously cached."""
    try:
        if not SESSION_CACHE_DIR.exists():
            return False
        meta_file = SESSION_CACHE_DIR / "meta.json"
        bank_file = SESSION_CACHE_DIR / "bank_df.pkl"
        inv_file = SESSION_CACHE_DIR / "invoices_df.pkl"
        
        if not (meta_file.exists() and bank_file.exists() and inv_file.exists()):
            return False
            
        with open(meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
            
        store.bank_df = pd.read_pickle(bank_file)
        store.invoices_df = pd.read_pickle(inv_file)
        
        pay_file = SESSION_CACHE_DIR / "payments_df.pkl"
        if pay_file.exists():
            store.payments_df = pd.read_pickle(pay_file)
        else:
            store.payments_df = synthesize_default_payments(store.bank_df)
            
        gt_file = SESSION_CACHE_DIR / "gt_df.pkl"
        if gt_file.exists():
            store.gt_df = pd.read_pickle(gt_file)
            
        store.resolved_overrides = meta.get("resolved_overrides", {})
        store.tolerances = meta.get("tolerances", store.tolerances)
        store.dataset_label = meta.get("dataset_label", "Uploaded Custom Dataset")
        
        run_pipeline(skip_llm=True)
        return True
    except Exception as e:
        print(f"Warning: Failed to load session cache: {e}")
        return False


def clear_session_cache():
    """Removes active session cache from disk."""
    try:
        if SESSION_CACHE_DIR.exists():
            import shutil
            shutil.rmtree(SESSION_CACHE_DIR, ignore_errors=True)
    except Exception as e:
        print(f"Warning: Failed to clear session cache: {e}")


def compute_confidence_score(result_item, bank_amt, inv_amt, merchant_score, date_delta) -> int:
    """Computes an intuitive 0-100% confidence match score based on multi-factor heuristics."""
    status = result_item.status
    if status == STATUS_MATCH:
        return 98
    elif status == STATUS_DATE_MISMATCH:
        # High confidence in identity, minor timing offset
        drift = abs(date_delta) if date_delta is not None else 1
        score = max(70, 92 - (drift * 4))
        return int(score)
    elif status == STATUS_AMOUNT_MISMATCH:
        # Vendor and reference match, but amount variance exists
        delta = abs(result_item.amount_delta) if result_item.amount_delta is not None else 100
        base = max(bank_amt, inv_amt or bank_amt)
        pct = (delta / base * 100) if base > 0 else 10
        score = max(45, 80 - int(pct * 2))
        return int(score)
    elif status == STATUS_MISSING_INVOICE:
        # Reference unmatched
        return 28
    elif status == STATUS_DUPLICATE:
        return 12
    return 50


def run_pipeline(
    amount_tol: Optional[int] = None,
    date_tol: Optional[int] = None,
    fuzzy_thresh: Optional[int] = None,
    skip_llm: bool = False,
):
    """Executes the full automated reconciliation & AI intelligence pipeline."""
    if amount_tol is not None:
        store.tolerances["amount_tolerance"] = amount_tol
    if date_tol is not None:
        store.tolerances["date_tolerance"] = date_tol
    if fuzzy_thresh is not None:
        store.tolerances["fuzzy_threshold"] = fuzzy_thresh

    if store.bank_df is None or store.invoices_df is None or store.payments_df is None:
        store.bank_df, store.invoices_df, store.payments_df, store.gt_df = load_all_data(verbose=False)

    import time
    t0 = time.perf_counter()
    # Reconcile using active tolerances
    store.results = reconcile(
        store.bank_df,
        store.invoices_df,
        store.payments_df,
        verbose=False,
        amount_tolerance=float(store.tolerances.get("amount_tolerance", AMOUNT_TOLERANCE)),
        date_tolerance=int(store.tolerances.get("date_tolerance", DATE_TOLERANCE_DAYS)),
        fuzzy_threshold=float(store.tolerances.get("fuzzy_threshold", FUZZY_MATCH_THRESHOLD)),
    )
    elapsed = time.perf_counter() - t0
    store.elapsed_seconds = round(elapsed, 4)
    total_recs = len(store.bank_df) if store.bank_df is not None else len(store.results)
    store.records_per_second = round(total_recs / elapsed, 1) if elapsed > 0 else 0.0

    if store.gt_df is not None:
        store.metrics = measure_accuracy(store.results, store.gt_df, verbose=False)
        if store.metrics and isinstance(store.metrics, dict):
            store.metrics["elapsed_seconds"] = store.elapsed_seconds
            store.metrics["records_per_second"] = store.records_per_second
    else:
        store.metrics = None

    store.cash_position = compute_cash_position(store.results, store.bank_df, store.payments_df)
    store.risk_assessment = calculate_risk_scores(store.results, store.bank_df)
    store.journal_entries = generate_journal_entries(store.results, store.bank_df, store.invoices_df)
    store.cash_forecast = forecast_forward_cash(store.bank_df, store.payments_df, store.results, days_ahead=30)

    # Generate explanations and summary if needed
    if not skip_llm and GOOGLE_API_KEY and store.explanations is None:
        try:
            store.explanations = explain_exceptions(store.results, verbose=False)
            store.executive_summary = generate_executive_summary(store.results, verbose=False)
        except Exception:
            store.explanations = None
            store.executive_summary = None


# --- Models ---
class ReconcileParams(BaseModel):
    amount_tolerance: Optional[int] = None
    date_tolerance: Optional[int] = None
    fuzzy_threshold: Optional[int] = None

class ResolveAction(BaseModel):
    transaction_id: str
    action: str  # "post_fee_adjustment", "accept_date_drift", "request_bill_ap", "manual_override"
    note: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    focused_transaction_id: Optional[str] = None


# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "AI Finance Controller Engine",
        "gemini_active": bool(GOOGLE_API_KEY),
        "model": GEMINI_MODEL if GOOGLE_API_KEY else "Rules-Engine-Fallback",
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/load-demo")
def load_demo_dataset():
    store.tolerances = {
        "amount_tolerance": AMOUNT_TOLERANCE,
        "date_tolerance": DATE_TOLERANCE_DAYS,
        "fuzzy_threshold": FUZZY_MATCH_THRESHOLD,
    }
    store.bank_df, store.invoices_df, store.payments_df, store.gt_df = load_all_data(verbose=False)
    store.resolved_overrides.clear()
    store.explanations = None
    store.executive_summary = None
    run_pipeline(skip_llm=True)
    return get_dashboard_data()


@app.get("/api/data")
def get_dashboard_data():
    if store.results is None:
        return {
            "status": "awaiting_upload",
            "summary": None,
            "ground_truth_metrics": None,
            "recent_insights": [],
            "records": [],
        }

    bank_dict = store.bank_df.set_index("transaction_id").to_dict("index") if store.bank_df is not None else {}
    inv_map_by_ref = {str(row["invoice_reference"]): row.to_dict() for _, row in store.invoices_df.iterrows()} if store.invoices_df is not None else {}
    inv_map_by_id = {str(row["invoice_id"]): row.to_dict() for _, row in store.invoices_df.iterrows()} if store.invoices_df is not None else {}
    pay_map_by_ref = {str(row["reference"]): row.to_dict() for _, row in store.payments_df.iterrows()} if store.payments_df is not None else {}
    pay_map_by_id = {str(row["payment_id"]): row.to_dict() for _, row in store.payments_df.iterrows()} if store.payments_df is not None else {}

    ai_exp_map = {}
    if store.explanations:
        for item in store.explanations:
            ai_exp_map[item.get("transaction_id")] = item.get("explanation", "")

    risk_df = store.risk_assessment.get("risk_details") if store.risk_assessment else None
    risk_map = {}
    if risk_df is not None and len(risk_df) > 0:
        for _, r_row in risk_df.iterrows():
            risk_map[r_row["transaction_id"]] = {
                "risk_level": r_row.get("risk_level", "MEDIUM"),
                "risk_score": int(r_row.get("risk_score", 50)),
                "risk_factors": r_row.get("risk_factors", ""),
            }

    records = []
    total_count = len(store.results)
    status_counts = {}

    for r in store.results:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1
        b_info = bank_dict.get(r.transaction_id, {})
        b_amt = float(b_info.get("amount", 0.0))
        b_date = str(b_info.get("date", ""))
        b_desc = str(b_info.get("description", "Unknown Entity"))
        b_ref = str(b_info.get("reference", ""))

        inv_info = inv_map_by_id.get(str(r.invoice_id or "")) or inv_map_by_ref.get(b_ref) or {}
        i_id = r.invoice_id or inv_info.get("invoice_id")
        i_date = str(inv_info.get("date", "")) if inv_info.get("date") is not None else None
        i_customer = str(inv_info.get("customer", "")) if inv_info.get("customer") is not None else None
        i_amt = float(inv_info.get("amount", 0.0)) if inv_info.get("amount") is not None else None

        pay_info = pay_map_by_id.get(str(r.payment_id or "")) or pay_map_by_ref.get(b_ref) or {}
        p_id = r.payment_id or pay_info.get("payment_id")
        p_date = str(pay_info.get("date", "")) if pay_info.get("date") is not None else None
        p_merchant = str(pay_info.get("merchant", "")) if pay_info.get("merchant") is not None else None
        p_status = r.payment_status or pay_info.get("status", "unknown")

        # Risk info
        r_meta = risk_map.get(r.transaction_id, {
            "risk_level": "LOW" if r.status == STATUS_MATCH else "MEDIUM",
            "risk_score": 10 if r.status == STATUS_MATCH else 40,
            "risk_factors": "Clean verified record" if r.status == STATUS_MATCH else "Standard discrepancy",
        })

        # Confidence score
        conf_score = compute_confidence_score(r, b_amt, i_amt, r.merchant_match_score, r.date_delta_days)

        # AI Explanation
        default_exp = (
            f"Autonomous Engine: {r.reason}. Recommend matching with tolerance or creating adjustment."
            if r.status != STATUS_MATCH else "Transaction fully verified across bank, ledger, and payment gateway."
        )
        exp = ai_exp_map.get(r.transaction_id, default_exp)

        # Resolution status
        res_info = store.resolved_overrides.get(r.transaction_id)
        is_resolved = res_info is not None

        records.append({
            "transaction_id": r.transaction_id,
            "date": b_date,
            "vendor": b_desc,
            "amount": b_amt,
            "reference": b_ref,
            "status": r.status,
            "invoice_id": i_id,
            "invoice_date": i_date,
            "invoice_customer": i_customer,
            "invoice_amount": i_amt,
            "amount_delta": r.amount_delta,
            "date_delta_days": r.date_delta_days,
            "merchant_match_score": r.merchant_match_score,
            "payment_id": p_id,
            "payment_date": p_date,
            "payment_merchant": p_merchant,
            "payment_status": p_status,
            "reason": r.reason,
            "risk_level": r_meta["risk_level"],
            "risk_score": r_meta["risk_score"],
            "risk_factors": r_meta["risk_factors"],
            "confidence_score": conf_score,
            "explanation": exp,
            "is_resolved": is_resolved,
            "resolution": res_info,
        })

    matched_count = status_counts.get(STATUS_MATCH, 0)
    dup_count = status_counts.get(STATUS_DUPLICATE, 0)
    clean_total = total_count - dup_count
    match_rate = round((matched_count / clean_total * 100), 1) if clean_total > 0 else 0.0
    exceptions_count = clean_total - matched_count

    # Recent insights for command center header feed
    recent_insights = []
    # Add prioritized actionable insight cards
    amt_mismatches = [rec for rec in records if rec["status"] == STATUS_AMOUNT_MISMATCH]
    missing_invs = [rec for rec in records if rec["status"] == STATUS_MISSING_INVOICE]
    date_mismatches = [rec for rec in records if rec["status"] == STATUS_DATE_MISMATCH]

    if amt_mismatches:
        top_amt = sorted(amt_mismatches, key=lambda x: abs(x["amount_delta"] or 0), reverse=True)[0]
        recent_insights.append({
            "id": "INS-01",
            "type": "AMOUNT_MISMATCH",
            "severity": "CRITICAL",
            "title": f"{top_amt['transaction_id']} flagged: Amount mismatch of ₹{abs(top_amt['amount_delta']):,.0f}",
            "subtitle": f"Bank ₹{top_amt['amount']:,.0f} vs Invoice ₹{top_amt['invoice_amount']:,.0f} ({top_amt['vendor']}). Suggesting fee journal review.",
            "transaction_id": top_amt["transaction_id"],
        })

    if missing_invs:
        top_miss = sorted(missing_invs, key=lambda x: x["amount"], reverse=True)[0]
        recent_insights.append({
            "id": "INS-02",
            "type": "MISSING_INVOICE",
            "severity": "HIGH",
            "title": f"{top_miss['transaction_id']} missing invoice: ₹{top_miss['amount']:,.0f} unbilled cash intake",
            "subtitle": f"Payment gateway state: {top_miss['payment_status']}. Recommend dispatching AP billing request.",
            "transaction_id": top_miss["transaction_id"],
        })

    if date_mismatches:
        top_date = date_mismatches[0]
        recent_insights.append({
            "id": "INS-03",
            "type": "DATE_MISMATCH",
            "severity": "MEDIUM",
            "title": f"{top_date['transaction_id']}: Timing drift offset of {top_date['date_delta_days']} days",
            "subtitle": f"Bank {top_date['date']} vs Invoice {top_date['invoice_date']}. Safe to accept timing offset.",
            "transaction_id": top_date["transaction_id"],
        })

    return {
        "summary": {
            "total_records": total_count,
            "matched_count": matched_count,
            "duplicate_count": dup_count,
            "clean_total": clean_total,
            "match_rate": match_rate,
            "exceptions_count": exceptions_count,
            "accuracy_percentage": store.metrics["accuracy"] if (store.metrics and store.metrics.get("matches_dataset", True) and "accuracy" in store.metrics) else match_rate,
            "elapsed_seconds": store.elapsed_seconds,
            "records_per_second": store.records_per_second,
            "cash_position": store.cash_position,
            "risk_summary": store.risk_assessment.get("risk_breakdown") if store.risk_assessment else {},
            "average_risk_score": store.risk_assessment.get("average_risk_score") if store.risk_assessment else 0,
            "executive_summary": store.executive_summary or (
                f"Reconciliation batch processed {total_count} records with {matched_count} verified matches. "
                f"Active exceptions total {exceptions_count} items with ₹{store.cash_position.get('total_variance', 0):,.0f} in variance "
                f"requiring automated adjustments and review."
            ),
            "tolerances": store.tolerances,
            "ingestion_warnings": store.ingestion_warnings,
        },
        "metrics": store.metrics,
        "ground_truth_metrics": store.metrics,
        "elapsed_seconds": store.elapsed_seconds,
        "records_per_second": store.records_per_second,
        "recent_insights": recent_insights,
        "records": records,
    }


@app.post("/api/reconcile")
def recompute_reconciliation(params: ReconcileParams):
    run_pipeline(
        amount_tol=params.amount_tolerance,
        date_tol=params.date_tolerance,
        fuzzy_thresh=params.fuzzy_threshold,
        skip_llm=True,
    )
    return get_dashboard_data()


@app.get("/api/session")
def get_current_session():
    if store.results is None:
        loaded = load_session_cache()
        if not loaded or store.results is None:
            return {"has_active_session": False}
    
    return {
        "has_active_session": True,
        "dataset_label": store.dataset_label or "Uploaded Custom Dataset",
        "data": get_dashboard_data()
    }


@app.post("/api/reset")
def reset_session():
    clear_session_cache()
    store.tolerances = {
        "amount_tolerance": AMOUNT_TOLERANCE,
        "date_tolerance": DATE_TOLERANCE_DAYS,
        "fuzzy_threshold": FUZZY_MATCH_THRESHOLD,
    }
    store.bank_df = None
    store.invoices_df = None
    store.payments_df = None
    store.gt_df = None
    store.results = None
    store.metrics = None
    store.cash_position = None
    store.risk_assessment = None
    store.journal_entries = None
    store.cash_forecast = None
    store.explanations = None
    store.executive_summary = None
    store.resolved_overrides.clear()
    store.dataset_label = None
    store.elapsed_seconds = None
    store.records_per_second = None
    return {"status": "success", "message": "Session reset successfully"}


@app.post("/api/resolve")
def resolve_transaction(action: ResolveAction):
    store.resolved_overrides[action.transaction_id] = {
        "action": action.action,
        "note": action.note or f"Resolved via {action.action}",
        "resolved_at": datetime.now().isoformat(),
    }
    save_session_cache()
    return {
        "status": "success",
        "transaction_id": action.transaction_id,
        "resolution": store.resolved_overrides[action.transaction_id],
    }


@app.post("/api/unresolve")
def unresolve_transaction(req: dict):
    tx_id = req.get("transaction_id")
    if tx_id in store.resolved_overrides:
        del store.resolved_overrides[tx_id]
        save_session_cache()
    return {"status": "success", "transaction_id": tx_id}


@app.post("/api/chat")
def ai_chat_copilot(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Empty prompt message.")

    if store.results is None:
        if not load_session_cache() or store.results is None:
            run_pipeline(skip_llm=True)

    reply = ask_question(
        question=req.message,
        results=store.results or [],
        bank_df=store.bank_df,
        invoices_df=store.invoices_df,
        payments_df=store.payments_df,
        metrics=store.metrics,
        history=req.history,
        resolved_overrides=store.resolved_overrides,
        focused_transaction_id=req.focused_transaction_id,
        verbose=False,
    )

    return {
        "reply": reply,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/gl-entries")
def get_gl_adjustment_entries():
    if store.journal_entries is None:
        run_pipeline(skip_llm=True)
    return store.journal_entries.to_dict("records")


@app.get("/api/forecast")
def get_liquidity_forecast():
    if store.cash_forecast is None:
        run_pipeline(skip_llm=True)
    return store.cash_forecast.to_dict("records")


@app.get("/api/export/{report_type}")
def export_csv_report(report_type: str):
    if store.results is None:
        run_pipeline(skip_llm=True)

    if report_type == "reconciliation":
        df = results_to_dataframe(store.results)
        filename = "reconciliation_report.csv"
    elif report_type == "exceptions":
        df = results_to_dataframe(store.results)
        df = df[~df["status"].isin([STATUS_MATCH, STATUS_DUPLICATE])]
        filename = "exceptions_report.csv"
    elif report_type == "duplicates":
        df = results_to_dataframe(store.results)
        df = df[df["status"] == STATUS_DUPLICATE]
        filename = "duplicates_report.csv"
    elif report_type == "adjustments":
        bank_lookup = {}
        if store.bank_df is not None and "transaction_id" in store.bank_df.columns:
            for _, b_row in store.bank_df.iterrows():
                bank_lookup[str(b_row["transaction_id"]).strip()] = b_row

        inv_lookup = {}
        if store.invoices_df is not None and "invoice_id" in store.invoices_df.columns:
            for _, i_row in store.invoices_df.iterrows():
                inv_lookup[str(i_row["invoice_id"]).strip()] = i_row

        rows = []
        for r in (store.results or []):
            tx_id = r.transaction_id
            if tx_id in store.resolved_overrides:
                b_row = bank_lookup.get(str(tx_id).strip())
                i_row = inv_lookup.get(str(r.invoice_id).strip()) if r.invoice_id else None
                
                b_amt = float(b_row["amount"]) if b_row is not None and "amount" in b_row else None
                b_date = str(b_row["date"]) if b_row is not None and "date" in b_row else ""
                i_amt = float(i_row["amount"]) if i_row is not None and "amount" in i_row else None
                
                res = store.resolved_overrides[tx_id]
                rows.append({
                    "transaction_id": tx_id,
                    "date": b_date,
                    "bank_amount": b_amt,
                    "invoice_id": r.invoice_id or "",
                    "invoice_amount": i_amt,
                    "amount_delta": r.amount_delta,
                    "status": r.status,
                    "reason": r.reason,
                    "resolution_action": res.get("action", ""),
                    "resolution_note": res.get("note", ""),
                    "resolved_at": res.get("resolved_at", ""),
                })
        df = pd.DataFrame(rows) if rows else pd.DataFrame(columns=[
            "transaction_id", "date", "bank_amount", "invoice_id", "invoice_amount", 
            "amount_delta", "status", "reason", "resolution_action", "resolution_note", "resolved_at"
        ])
        filename = "dataset_adjustments_audit_log.csv"
    elif report_type == "gl_entries":
        df = store.journal_entries if store.journal_entries is not None else pd.DataFrame()
        filename = "gl_journal_entries.csv"
    elif report_type == "forecast":
        df = store.cash_forecast if store.cash_forecast is not None else pd.DataFrame()
        filename = "cash_forecast_30d.csv"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.post("/api/upload")
async def upload_custom_files(
    bank_file: UploadFile = File(...),
    invoices_file: UploadFile = File(...),
    payments_file: Optional[UploadFile] = File(None),
    ground_truth_file: Optional[UploadFile] = File(None),
):
    try:
        b_content = await bank_file.read()
        i_content = await invoices_file.read()

        raw_b = read_tabular_file(b_content, bank_file.filename)
        bank_df = normalize_dataframe_columns(raw_b, "bank", source_name=bank_file.filename)

        raw_i = read_tabular_file(i_content, invoices_file.filename)
        invoices_df = normalize_dataframe_columns(raw_i, "invoice", source_name=invoices_file.filename)

        if payments_file:
            p_content = await payments_file.read()
            raw_p = read_tabular_file(p_content, payments_file.filename)
            payments_df = normalize_dataframe_columns(raw_p, "payment", source_name=payments_file.filename)
        else:
            payments_df = synthesize_default_payments(bank_df)

        gt_df = None
        if ground_truth_file:
            gt_content = await ground_truth_file.read()
            raw_gt = read_tabular_file(gt_content, ground_truth_file.filename)
            gt_df = raw_gt.copy()
            if "expected_invoice_id" in gt_df.columns:
                gt_df["expected_invoice_id"] = gt_df["expected_invoice_id"].fillna("")

        warnings = []
        if "ingestion_warning" in getattr(bank_df, "attrs", {}):
            warnings.append(bank_df.attrs["ingestion_warning"])
        if "ingestion_warning" in getattr(invoices_df, "attrs", {}):
            warnings.append(invoices_df.attrs["ingestion_warning"])
        if payments_file and "ingestion_warning" in getattr(payments_df, "attrs", {}):
            warnings.append(payments_df.attrs["ingestion_warning"])

        store.bank_df = bank_df
        store.invoices_df = invoices_df
        store.payments_df = payments_df
        store.gt_df = gt_df
        store.ingestion_warnings = warnings
        store.resolved_overrides.clear()
        store.explanations = None
        store.executive_summary = None
        store.dataset_label = f"{bank_file.filename} & {invoices_file.filename}"

        run_pipeline(skip_llm=True)
        save_session_cache()
        return get_dashboard_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded files: {str(e)}")


@app.post("/api/upload/ground_truth")
async def upload_ground_truth_file(
    ground_truth_file: UploadFile = File(...),
):
    try:
        if store.bank_df is None or store.invoices_df is None:
            raise HTTPException(status_code=400, detail="Please upload bank statements and invoices first.")
        
        gt_content = await ground_truth_file.read()
        raw_gt = read_tabular_file(gt_content, ground_truth_file.filename)
        gt_df = raw_gt.copy()
        if "expected_invoice_id" in gt_df.columns:
            gt_df["expected_invoice_id"] = gt_df["expected_invoice_id"].fillna("")

        store.gt_df = gt_df
        run_pipeline(skip_llm=True)
        save_session_cache()
        return get_dashboard_data()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse ground truth file: {str(e)}")


# Restore session cache on startup if exists
load_session_cache()


# --- Static Files & SPA Routing ---
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DIST_DIR = Path(__file__).parent / "frontend" / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    print("\nStarting AI Finance Controller Command Hub on http://localhost:8000 ...")
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)

